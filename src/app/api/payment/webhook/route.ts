import { occupationOptions } from "@/constant/OCCUPATION";
import { midtransService } from "@/lib/midtrans";
import dbConnect from "@/lib/mongodb";
import { createCommissionRecord } from "@/lib/commission";
import { generateInvoiceNumber } from "@/lib/invoiceNumberGenerator";
import { getFirstAdminName } from "@/lib/utils/admin";
import { Investor } from "@/models";
import Contract from "@/models/Contract";
import Payment from "@/models/Payment";
import PlantInstance from "@/models/PlantInstance";
import User from "@/models/User";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// Helper function to extract tree count from product name
function extractTreeCount(productName: string): number {
  if (!productName) return 1; // Default fallback
  if (productName.includes("1 Pohon")) return 1;
  if (productName.includes("10 Pohon")) return 10;
  return 10;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Midtrans webhook received:", body);

    // Handle test notifications from Midtrans Dashboard
    if (body.order_id?.includes("payment_notif_test")) {
      console.log("🧪 Test notification received from Midtrans Dashboard");
      return NextResponse.json({
        success: true,
        message: "Test notification received successfully",
      });
    }

    // Verify the notification
    await midtransService.verifyNotification(body);

    const orderId = body.order_id;
    const transactionId = body.transaction_id;
    const transactionStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    console.log(`🔍 orderId: ${orderId}, transactionId: ${transactionId}`);
    console.log(
      `Transaction ${orderId} status: ${transactionStatus}, fraud: ${fraudStatus}`
    );

    await dbConnect();

    // Find the payment record
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      console.error(`Payment not found for order: "${orderId}"`);
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    // Update payment status
    payment.transactionId = transactionId;
    payment.transactionStatus = transactionStatus;
    payment.fraudStatus = fraudStatus;
    payment.transactionTime = new Date(body.transaction_time);
    payment.midtransResponse = body;
    payment.status = "completed";

    let message = "";
    let shouldCreateUser = false;

    // Transaction status handling
    if (transactionStatus === "capture") {
      if (fraudStatus === "challenge") {
        message = "Transaction is challenged by FDS";
        payment.processingError = "Transaction challenged by fraud detection";
      } else if (fraudStatus === "accept") {
        message = "Transaction successful";
        shouldCreateUser = true;
        payment.settlementTime = new Date();
      }
    } else if (transactionStatus === "settlement") {
      message = "Transaction successful";
      shouldCreateUser = true;
      payment.settlementTime = new Date();
    } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
      message = "Transaction failed";
      payment.processingError = `Transaction ${transactionStatus}`;
    } else if (transactionStatus === "pending") {
      message = "Transaction pending";
    }

    // REG user creation
    if (
      shouldCreateUser &&
      !payment.isProcessed &&
      payment.customerData &&
      orderId.startsWith("REG-")
    ) {
      const existingUser = await User.findOne({
        $or: [
          { email: payment.customerData.email },
          { phoneNumber: payment.customerData.phoneNumber },
        ],
      });

      if (existingUser) {
        console.log("User already exists, skipping creation");
        payment.processingError = "User already exists";
      } else {
        const hashedPassword = payment.customerData.password;
        const occupationData = occupationOptions.find(
          (opt) => opt.value === payment.customerData.occupation
        );
        const occupationCode = occupationData?.code || "999";
        const currentYear = new Date().getFullYear().toString().slice(-2);

        const lastUser = await User.findOne({})
          .sort({ userCode: -1 })
          .select("userCode");

        let sequential = 1;
        if (lastUser?.userCode) {
          const match = lastUser.userCode.match(/BMS-\d+\.(\d+)$/);
          if (match) sequential = parseInt(match[1]) + 1;
        }

        const userCode = `BMS-${currentYear}${occupationCode}.${sequential
          .toString()
          .padStart(4, "0")}`;

        const user = new User({
          ...payment.customerData,
          password: hashedPassword,
          occupationCode,
          userCode,
          role: "user",
          isEmailVerified: false,
          isPhoneVerified: false,
          isActive: true,
        });

        await user.save();

        payment.userId = user._id;
        payment.isProcessed = true;
        message = `Transaction successful - User created: ${userCode}`;
      }
    }

    // FULL INVESTMENT payments (INV-BMS format)
    if (
      (transactionStatus === "settlement" ||
        (transactionStatus === "capture" && fraudStatus === "accept")) &&
      orderId.startsWith("INV-BMS-")
    ) {
      const mongoSession = await mongoose.startSession();
      const txnId = `TXN-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      await mongoSession.withTransaction(async () => {
        const user = await User.findById(payment.userId).session(mongoSession);
        if (!user) throw new Error("User not found for investment payment");

        const getPlantType = (
          productName: string
        ): "gaharu" | "alpukat" | "jengkol" | "aren" => {
          const name = productName.toLowerCase();
          if (name.includes("gaharu")) return "gaharu";
          if (name.includes("alpukat")) return "alpukat";
          if (name.includes("jengkol")) return "jengkol";
          if (name.includes("aren")) return "aren";
          return "gaharu";
        };

        const getBaseROI = (plantType: "gaharu" | "alpukat" | "jengkol" | "aren") => {
          const roiMap = { gaharu: 0.15, alpukat: 0.12, jengkol: 0.1, aren: 0.18 };
          return roiMap[plantType] || 0.12;
        };

        // Use payment.contractId to find the actual contract
        const contractId = payment.contractId;

        let savedPlantInstance = await PlantInstance.findOne({
          contractNumber: contractId,
        }).session(mongoSession);

        if (!savedPlantInstance) {
          // Get contract to check approval status
          const contract = await Contract.findOne({ contractId: contractId }).session(mongoSession);
          const isContractApproved = contract?.adminApprovalStatus === 'approved';

          const plantInstanceId = `PLANT-${payment.orderId}-${orderId.slice(-8)}`;
          const productName = payment.productName || "gaharu";
          const plantType = getPlantType(productName);
          const instanceName = `${plantType.charAt(0).toUpperCase() + plantType.slice(1)} - ${
            user.fullName
          }`;
          const adminName = await getFirstAdminName();

          const deterministicHistoryId = `HISTORY-${orderId}-NEW`;

          // Set status based on contract approval
          const plantStatus = isContractApproved ? "Kontrak Baru" : "Pending";
          const historyAction = isContractApproved ? "Kontrak Baru" : "Pending Contract Approval";
          const historyDescription = isContractApproved
            ? `Tanaman baru dibuat dengan pembayaran full untuk user ${user.fullName}`
            : `Tanaman dibuat, menunggu persetujuan kontrak untuk user ${user.fullName}`;

          const plantInstance = new PlantInstance({
            id: plantInstanceId,
            plantType,
            instanceName,
            baseAnnualROI: getBaseROI(plantType),
            operationalCosts: [],
            incomeRecords: [],
            qrCode: `QR-${productName}`,
            owner: user.fullName,
            fotoGambar: null,
            memberId: user._id.toString(),
            contractNumber: orderId,
            location: "Musi Rawas Utara",
            kavling: "-",
            status: plantStatus,
            approvalStatus: "approved",
            lastUpdate: new Date().toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            }),
            history: [
              {
                id: deterministicHistoryId,
                action: historyAction,
                type: historyAction,
                date: new Date().toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                }),
                description: historyDescription,
                addedBy: adminName,
              },
            ],
          });

          savedPlantInstance = await plantInstance.save({ session: mongoSession });
        }

        const investmentRecord = {
          investmentId: orderId,
          productName: payment.productName,
          plantInstanceId: savedPlantInstance._id.toString(),
          totalAmount: payment.amount,
          amountPaid: payment.amount,
          paymentType: "full" as const,
          status: "completed" as const,
          investmentDate: new Date(),
          completionDate: new Date(),
        };

        let investor = await Investor.findOne({ userId: user._id }).session(mongoSession);
        if (investor) {
          const existingIndex = investor.investments.findIndex(
            (inv: any) => inv.investmentId === orderId
          );

          if (existingIndex !== -1) {
            const existingInvestment = investor.investments[existingIndex];
            existingInvestment.plantInstanceId = investmentRecord.plantInstanceId;
            existingInvestment.status = "approved";

            if (existingInvestment.amountPaid === 0) {
              existingInvestment.amountPaid = payment.amount;
              investor.totalPaid += payment.amount;
              investor.jumlahPohon += extractTreeCount(payment.productName);
            }
            
            existingInvestment.completionDate = new Date();
          } else {
            investor.investments.push(investmentRecord);
            investor.totalInvestasi += payment.amount;
            investor.totalPaid += payment.amount;
            investor.jumlahPohon += extractTreeCount(payment.productName);
          }
          await investor.save({ session: mongoSession });
        } else {
          investor = new Investor({
            userId: user._id,
            name: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            status: "active",
            investments: [investmentRecord],
            totalInvestasi: payment.amount,
            totalPaid: payment.amount,
            jumlahPohon: extractTreeCount(payment.productName),
          });
          await investor.save({ session: mongoSession });
        }

        // For new invoice format, contractId equals orderId
        const contract = await Contract.findOne({ contractId: orderId }).session(mongoSession);
        if (contract) {
          contract.paymentCompleted = true;
          await contract.save({ session: mongoSession });
          console.log(`📄 [${txnId}] Contract ${orderId} marked as paymentCompleted`);
        }

        payment.contractRedirectUrl = `/contract/${orderId}`;
        payment.isProcessed = true;
        payment.status = "completed";

        if (payment.referralCode && payment.paymentType === "full-investment") {
          const commissionResult = await createCommissionRecord(payment._id.toString());
          console.log(`Commission for ${orderId}: ${commissionResult.message}`);
        }

        await payment.save({ session: mongoSession });
      });

      await mongoSession.endSession();
      message = "Investment payment successful - Contract ready for signing";
    }

    // INSTALLMENT payments (cicilan) - CIC-INV-BMS format
    if (
      (transactionStatus === "settlement" ||
        (transactionStatus === "capture" && fraudStatus === "accept")) &&
      orderId.startsWith("CIC-INV-BMS-")
    ) {
      const mongoSession = await mongoose.startSession();
      const txnId = `TXN-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      await mongoSession.withTransaction(async () => {
        // Find the payment record by orderId directly (since it's unique)
        const installmentPayment = await Payment.findOne({
          orderId: orderId,
          paymentType: "cicilan-installment"
        }).session(mongoSession);

        if (!installmentPayment) {
          throw new Error(`Installment payment not found for ${orderId}`);
        }

        // Get values from the payment record
        const installmentNumber = installmentPayment.installmentNumber;
        const cicilanOrderId = installmentPayment.cicilanOrderId;

        console.log(`🔍 [${txnId}] Processing installment payment: ${orderId}`);
        console.log(`🔍 [${txnId}] CicilanOrderId: ${cicilanOrderId}, Installment: ${installmentNumber}`);

        // Update installment payment status
        installmentPayment.transactionId = transactionId;
        installmentPayment.transactionStatus = transactionStatus;
        installmentPayment.fraudStatus = fraudStatus;
        installmentPayment.transactionTime = new Date(body.transaction_time);
        installmentPayment.midtransResponse = body;
        installmentPayment.status = "completed";
        installmentPayment.adminStatus = "approved"; // Auto-approve Midtrans payments
        installmentPayment.adminReviewDate = new Date();
        installmentPayment.settlementTime = new Date();

        const user = await User.findById(installmentPayment.userId).session(mongoSession);
        if (!user) throw new Error("User not found for installment payment");

        // Helper functions (same as admin approval logic)
        const getPlantType = (
          productName: string
        ): "gaharu" | "alpukat" | "jengkol" | "aren" => {
          const name = productName.toLowerCase();
          if (name.includes("gaharu")) return "gaharu";
          if (name.includes("alpukat")) return "alpukat";
          if (name.includes("jengkol")) return "jengkol";
          if (name.includes("aren")) return "aren";
          return "gaharu";
        };

        const getBaseROI = (plantType: "gaharu" | "alpukat" | "jengkol" | "aren") => {
          const roiMap = { gaharu: 0.15, alpukat: 0.12, jengkol: 0.1, aren: 0.18 };
          return roiMap[plantType] || 0.12;
        };

        const extractTreeCount = (productName: string): number => {
          if (!productName) return 1;
          if (productName.includes("1 Pohon")) return 1;
          if (productName.includes("10 Pohon")) return 10;
          return 10;
        };

        // Process based on installment number
        if (installmentNumber === 1) {
          // FIRST INSTALLMENT: Create PlantInstance and Investor record with FULL amounts
          console.log(`📄 [${txnId}] First installment paid for cicilan ${cicilanOrderId} - creating PlantInstance and investor record`);

          // Check if PlantInstance already exists
          const existingPlantInstance = await PlantInstance.findOne({
            contractNumber: cicilanOrderId,
          }).session(mongoSession);

          let savedPlantInstance = existingPlantInstance;

          if (!savedPlantInstance) {
            // Get contract to check approval status
            const contract = await Contract.findOne({ contractId: cicilanOrderId }).session(mongoSession);
            const isContractApproved = contract?.adminApprovalStatus === 'approved';

            // Create new PlantInstance
            const plantInstanceId = `PLANT-${cicilanOrderId}-${Date.now()}`;
            const productName = installmentPayment.productName || "gaharu";
            const plantType = getPlantType(productName);
            const instanceName = `${plantType.charAt(0).toUpperCase() + plantType.slice(1)} - ${user.fullName}`;
            const adminName = await getFirstAdminName();

            const deterministicHistoryId = `HISTORY-${cicilanOrderId}-NEW`;

            // Set status based on contract approval
            const plantStatus = isContractApproved ? "Kontrak Baru" : "Pending";
            const historyAction = isContractApproved ? "Kontrak Baru" : "Pending Contract Approval";
            const historyDescription = isContractApproved
              ? `Tanaman baru dibuat dengan cicilan untuk user ${user.fullName}`
              : `Tanaman dibuat, menunggu persetujuan kontrak untuk user ${user.fullName}`;

            const plantInstance = new PlantInstance({
              id: plantInstanceId,
              plantType,
              instanceName,
              baseAnnualROI: getBaseROI(plantType),
              operationalCosts: [],
              incomeRecords: [],
              qrCode: `QR-${productName}`,
              owner: user.fullName,
              fotoGambar: null,
              memberId: user._id.toString(),
              contractNumber: cicilanOrderId,
              location: "Musi Rawas Utara",
              kavling: "-",
              status: plantStatus,
              approvalStatus: "approved",
              lastUpdate: new Date().toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              }),
              history: [
                {
                  id: deterministicHistoryId,
                  action: historyAction,
                  type: historyAction,
                  date: new Date().toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  }),
                  description: historyDescription,
                  addedBy: adminName,
                },
              ],
            });

            savedPlantInstance = await plantInstance.save({ session: mongoSession });
            console.log(`🌱 [${txnId}] PlantInstance created: ${plantInstanceId} for cicilan ${cicilanOrderId}`);
          }

          // Find or create Investor record
          let investor = await Investor.findOne({ userId: user._id }).session(mongoSession);

          if (investor) {
            // Update existing investor with FULL contract amounts
            const existingInvestmentIndex = investor.investments.findIndex(
              (inv: any) => inv.investmentId === cicilanOrderId
            );

            if (existingInvestmentIndex !== -1) {
              // Update existing investment
              const existingInvestment = investor.investments[existingInvestmentIndex];
              existingInvestment.plantInstanceId = savedPlantInstance._id.toString();
              existingInvestment.status = "active";

              // Only update if not already paid (prevent double-counting)
              if (existingInvestment.amountPaid === 0) {
                // Add FULL contract amount to totals (business logic requirement)
                const fullContractAmount = installmentPayment.installmentAmount * installmentPayment.totalInstallments;
                investor.totalInvestasi += fullContractAmount;
                investor.totalPaid += installmentPayment.amount; // Only actual payment
                investor.jumlahPohon += extractTreeCount(installmentPayment.productName);

                existingInvestment.totalAmount = fullContractAmount;
                existingInvestment.amountPaid = installmentPayment.amount; // Only actual payment
              }

              // Add/update first installment record
              if (!existingInvestment.installments) {
                existingInvestment.installments = [];
              }

              const installmentIndex = existingInvestment.installments.findIndex(
                (inst: any) => inst.installmentNumber === installmentNumber
              );

              const installmentRecord = {
                installmentNumber: installmentNumber,
                amount: installmentPayment.amount,
                dueDate: installmentPayment.dueDate,
                isPaid: true,
                paidDate: new Date(),
                status: "approved",
                proofImageUrl: null, // Midtrans payment, no proof needed
              };

              if (installmentIndex !== -1) {
                existingInvestment.installments[installmentIndex] = installmentRecord;
              } else {
                existingInvestment.installments.push(installmentRecord);
              }

              existingInvestment.completionDate = new Date();
            } else {
              // Create new investment record
              const fullContractAmount = installmentPayment.installmentAmount * installmentPayment.totalInstallments;

              const investmentRecord = {
                investmentId: cicilanOrderId,
                productName: installmentPayment.productName,
                plantInstanceId: savedPlantInstance._id.toString(),
                totalAmount: fullContractAmount, // FULL contract amount
                amountPaid: installmentPayment.amount, // Only actual payment
                paymentType: "cicilan" as const,
                status: "active" as const,
                investmentDate: new Date(),
                completionDate: new Date(),
                installments: [{
                  installmentNumber: installmentNumber,
                  amount: installmentPayment.amount,
                  dueDate: installmentPayment.dueDate,
                  isPaid: true,
                  paidDate: new Date(),
                  status: "approved",
                  proofImageUrl: null,
                }]
              };

              investor.investments.push(investmentRecord);
              investor.totalInvestasi += fullContractAmount; // FULL contract amount
              investor.totalPaid += installmentPayment.amount; // Only actual payment
              investor.jumlahPohon += extractTreeCount(installmentPayment.productName);
            }

            await investor.save({ session: mongoSession });
          } else {
            // Create new investor record
            const fullContractAmount = installmentPayment.installmentAmount * installmentPayment.totalInstallments;

            const investmentRecord = {
              investmentId: cicilanOrderId,
              productName: installmentPayment.productName,
              plantInstanceId: savedPlantInstance._id.toString(),
              totalAmount: fullContractAmount, // FULL contract amount
              amountPaid: installmentPayment.amount, // Only actual payment
              paymentType: "cicilan" as const,
              status: "active" as const,
              investmentDate: new Date(),
              completionDate: new Date(),
              installments: [{
                installmentNumber: installmentNumber,
                amount: installmentPayment.amount,
                dueDate: installmentPayment.dueDate,
                isPaid: true,
                paidDate: new Date(),
                status: "approved",
                proofImageUrl: null,
              }]
            };

            investor = new Investor({
              userId: user._id,
              name: user.fullName,
              email: user.email,
              phoneNumber: user.phoneNumber,
              status: "active",
              investments: [investmentRecord],
              totalInvestasi: fullContractAmount, // FULL contract amount
              totalPaid: installmentPayment.amount, // Only actual payment
              jumlahPohon: extractTreeCount(installmentPayment.productName),
            });

            await investor.save({ session: mongoSession });
          }

          console.log(`💰 [${txnId}] Investor record created/updated for first cicilan installment`);
        } else {
          // SUBSEQUENT INSTALLMENTS: Only update totalPaid and add installment record
          console.log(`📄 [${txnId}] Subsequent installment ${installmentNumber} paid for cicilan ${cicilanOrderId}`);

          const investor = await Investor.findOne({
            userId: installmentPayment.userId,
          }).session(mongoSession);

          if (investor) {
            // Find the investment and installment
            const investment = investor.investments.find(
              (inv: any) => inv.investmentId === cicilanOrderId
            );

            if (investment) {
              // Add/update installment record
              if (!investment.installments) {
                investment.installments = [];
              }

              const installmentIndex = investment.installments.findIndex(
                (inst: any) => inst.installmentNumber === installmentNumber
              );

              const installmentRecord = {
                installmentNumber: installmentNumber,
                amount: installmentPayment.amount,
                dueDate: installmentPayment.dueDate,
                isPaid: true,
                paidDate: new Date(),
                status: "approved",
                proofImageUrl: null,
              };

              if (installmentIndex !== -1) {
                investment.installments[installmentIndex] = installmentRecord;
              } else {
                investment.installments.push(installmentRecord);
              }

              // Update investment amount paid incrementally
              investment.amountPaid += installmentPayment.amount;
            }

            // Update total paid amount for the investor incrementally
            investor.totalPaid += installmentPayment.amount;
            await investor.save({ session: mongoSession });
          }

          console.log(`💰 [${txnId}] Investor record updated for subsequent installment`);
        }

        // Create next installment Payment record (sequential logic)
        if (installmentNumber < installmentPayment.totalInstallments) {
          const nextInstallmentNumber = installmentNumber + 1;

          // Check if next installment already exists
          const existingNextPayment = await Payment.findOne({
            cicilanOrderId: cicilanOrderId,
            installmentNumber: nextInstallmentNumber,
          }).session(mongoSession);

          if (!existingNextPayment) {
            // Calculate next installment due date
            const termToMonths = {
              monthly: 1,
              quarterly: 3,
              semiannual: 6,
              annual: 12,
            };
            const paymentTermMonths =
              termToMonths[
                installmentPayment.paymentTerm as keyof typeof termToMonths
              ] || 1;

            const nextDueDate = new Date(installmentPayment.dueDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + paymentTermMonths);

            // Create next installment payment record
            const nextInstallmentOrderId = await generateInvoiceNumber({
              productName: installmentPayment.productName || 'Investment',
              installmentNumber: nextInstallmentNumber,
              paymentType: 'cicilan-installment'
            });
            const nextInstallment = new Payment({
              orderId: nextInstallmentOrderId,
              userId: installmentPayment.userId,
              amount: installmentPayment.installmentAmount,
              currency: "IDR",
              paymentType: "cicilan-installment",
              cicilanOrderId: cicilanOrderId,
              installmentNumber: nextInstallmentNumber,
              totalInstallments: installmentPayment.totalInstallments,
              installmentAmount: installmentPayment.installmentAmount,
              paymentTerm: installmentPayment.paymentTerm,
              dueDate: nextDueDate,
              productName: installmentPayment.productName,
              productId: installmentPayment.productId,
              adminStatus: "pending",
              status: "pending",
              isProcessed: false,
              customerData: installmentPayment.customerData,
            });

            await nextInstallment.save({ session: mongoSession });
            console.log(`📅 [${txnId}] Next installment created: ${nextInstallmentOrderId} due ${nextDueDate.toISOString()}`);

            // Also add the next installment to the investor record
            const investorForNextInstallment = await Investor.findOne({
              userId: installmentPayment.userId,
            }).session(mongoSession);

            if (investorForNextInstallment) {
              const investmentForNextInstallment =
                investorForNextInstallment.investments.find(
                  (inv: any) => inv.investmentId === cicilanOrderId
                );

              if (
                investmentForNextInstallment &&
                investmentForNextInstallment.installments
              ) {
                // Check if this installment already exists in investor record
                const existingInstallmentInInvestor =
                  investmentForNextInstallment.installments.find(
                    (inst: any) =>
                      inst.installmentNumber === nextInstallmentNumber
                  );

                if (!existingInstallmentInInvestor) {
                  investmentForNextInstallment.installments.push({
                    installmentNumber: nextInstallmentNumber,
                    amount: installmentPayment.installmentAmount,
                    dueDate: nextDueDate,
                    isPaid: false,
                    paidDate: null,
                    status: "pending",
                    proofImageUrl: null,
                  });

                  await investorForNextInstallment.save({
                    session: mongoSession,
                  });
                  console.log(`📊 [${txnId}] Added installment ${nextInstallmentNumber} to investor record`);
                }
              }
            }
          }
        }

        // Create commission record if it's the first installment and has referral code
        if (installmentNumber === 1 && installmentPayment.referralCode) {
          try {
            const commissionResult = await createCommissionRecord(installmentPayment._id.toString());
            console.log(`💰 [${txnId}] Commission for installment ${orderId}: ${commissionResult.message}`);
          } catch (commissionError) {
            console.error(`❌ [${txnId}] Commission error for ${orderId}:`, commissionError);
            // Don't fail the payment for commission errors
          }
        }

        await installmentPayment.save({ session: mongoSession });
      });

      await mongoSession.endSession();
      message = "Installment payment successful - Investment updated";
    }

    await payment.save();
    console.log(`Processed transaction ${orderId}: ${message}`);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
