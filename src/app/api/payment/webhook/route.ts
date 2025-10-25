import { occupationOptions } from "@/constant/OCCUPATION";
import { midtransService } from "@/lib/midtrans";
import dbConnect from "@/lib/mongodb";
import { generateInvoiceNumber } from "@/lib/invoiceNumberGenerator";
import { getFirstAdminName } from "@/lib/utils/admin";
import generateUserCode from "@/lib/userCodeGenerator";
import { Investor } from "@/models";
import CommissionHistory from "@/models/CommissionHistory";
import Contract from "@/models/Contract";
import Payment from "@/models/Payment";
import PlantInstance from "@/models/PlantInstance";
import User from "@/models/User";
import Settings from "@/models/Settings";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { stampContractAfterPayment } from "@/lib/contract-stamping";

// Helper function to recalculate investor totals from investment records
const recalculateInvestorTotals = (investor: any) => {
  investor.totalInvestasi = investor.investments.reduce(
    (sum: number, inv: any) => sum + inv.totalAmount,
    0
  );
  investor.totalPaid = investor.investments.reduce(
    (sum: number, inv: any) => sum + inv.amountPaid,
    0
  );
  investor.jumlahPohon = investor.investments.reduce(
    (sum: number, inv: any) => sum + extractTreeCount(inv.productName),
    0
  );
};

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

    // Log payment processing status for debugging
    console.log(
      `🔍 Payment ${orderId} - isProcessed: ${payment.isProcessed}, currentStatus: ${payment.transactionStatus}`
    );

    // Early return if already processed for settlement/capture to prevent double processing
    if (
      payment.isProcessed &&
      (transactionStatus === "settlement" || transactionStatus === "capture")
    ) {
      console.log(
        `⚠️ Payment ${orderId} already processed, skipping duplicate webhook`
      );
      return NextResponse.json({
        success: true,
        message: "Payment already processed",
      });
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
        console.log(
          "🔍 Creating user with customerData:",
          payment.customerData
        );
        // Defensive: ensure password is present (already hashed when saved in Payment)
        const hashedPassword = payment.customerData.password ?? null;
        const occupationData = occupationOptions.find(
          (opt) => opt.value === payment.customerData.occupation
        );
        const occupationCode = occupationData?.code || "999";
        // Generate a unique userCode atomically
        const { userCode } = await generateUserCode(occupationCode);

        // Log beneficiary fields explicitly and normalize types
        console.log("🔍 Beneficiary fields from customerData:", {
          beneficiaryName: String(payment.customerData.beneficiaryName || ""),
          beneficiaryNik: String(payment.customerData.beneficiaryNik || ""),
          beneficiaryDateOfBirth: payment.customerData.beneficiaryDateOfBirth
            ? new Date(
                payment.customerData.beneficiaryDateOfBirth
              ).toISOString()
            : null,
          beneficiaryRelationship: String(
            payment.customerData.beneficiaryRelationship || ""
          ),
        });

        // Build user data explicitly to avoid accidental extra properties
        const userData: any = {
          email: String(payment.customerData.email || "")
            .toLowerCase()
            .trim(),
          password: hashedPassword,
          fullName: String(payment.customerData.fullName || "").trim(),
          nik: String(payment.customerData.nik || "").trim(),
          phoneNumber: String(payment.customerData.phoneNumber || "").trim(),
          dateOfBirth: payment.customerData.dateOfBirth
            ? new Date(payment.customerData.dateOfBirth)
            : null,
          ktpAddress: String(payment.customerData.ktpAddress || "").trim(),
          ktpVillage: String(payment.customerData.ktpVillage || "").trim(),
          ktpCity: String(payment.customerData.ktpCity || "").trim(),
          ktpProvince: String(payment.customerData.ktpProvince || "").trim(),
          ktpPostalCode: String(
            payment.customerData.ktpPostalCode || ""
          ).trim(),
          domisiliAddress: String(
            payment.customerData.domisiliAddress || ""
          ).trim(),
          domisiliVillage: String(
            payment.customerData.domisiliVillage || ""
          ).trim(),
          domisiliCity: String(payment.customerData.domisiliCity || "").trim(),
          domisiliProvince: String(
            payment.customerData.domisiliProvince || ""
          ).trim(),
          domisiliPostalCode: String(
            payment.customerData.domisiliPostalCode || ""
          ).trim(),
          occupation: String(payment.customerData.occupation || "").trim(),
          beneficiaryName: String(
            payment.customerData.beneficiaryName || ""
          ).trim(),
          beneficiaryNik: String(
            payment.customerData.beneficiaryNik || ""
          ).trim(),
          beneficiaryDateOfBirth: payment.customerData.beneficiaryDateOfBirth
            ? new Date(payment.customerData.beneficiaryDateOfBirth)
            : null,
          beneficiaryRelationship: String(
            payment.customerData.beneficiaryRelationship || ""
          ).trim(),
          ktpImageUrl: String(payment.customerData.ktpImageUrl || "").trim(),
          faceImageUrl: String(payment.customerData.faceImageUrl || "").trim(),
          occupationCode,
          userCode,
          role: "user",
          isEmailVerified: false,
          isPhoneVerified: false,
          isActive: true,
        };

        // Attempt to save and capture any validation errors to payment.processingError
        let createdUser;
        try {
          const user = new User(userData);
          createdUser = await user.save();
        } catch (userCreateError: any) {
          console.error(
            "Error creating user from payment.customerData:",
            userCreateError
          );
          payment.processingError = `User creation failed: ${
            userCreateError.message || String(userCreateError)
          }`;
          await payment.save();
          // mark as processed to avoid retry loops, but surface the error
          payment.isProcessed = false;
          message = "Transaction successful but user creation failed";
        }

        if (createdUser) {
          payment.userId = createdUser._id;
          payment.isProcessed = true;
          message = `Transaction successful - User created: ${
            createdUser.userCode || userCode
          }`;
        }
      }
    }

    // FULL INVESTMENT payments (INV-BMS format)
    if (
      (transactionStatus === "settlement" ||
        (transactionStatus === "capture" && fraudStatus === "accept")) &&
      orderId.startsWith("INV-BMS-") &&
      !payment.isProcessed // Add idempotency check
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
        ): "gaharu" | "alpukat" | "jengkol" | "aren" | "kelapa" => {
          const name = productName.toLowerCase();
          if (name.includes("gaharu")) return "gaharu";
          if (name.includes("alpukat")) return "alpukat";
          if (name.includes("jengkol")) return "jengkol";
          if (name.includes("aren")) return "aren";
          if (name.includes("kelapa")) return "kelapa";
          return "gaharu";
        };

        const getBaseROI = (
          plantType: "gaharu" | "alpukat" | "jengkol" | "aren" | "kelapa"
        ) => {
          const roiMap = {
            gaharu: 0.15,
            alpukat: 0.12,
            jengkol: 0.1,
            aren: 0.18,
            kelapa: 0.12,
          };
          return roiMap[plantType] || 0.12;
        };

        // For new invoice format, contractId equals orderId
        const contractId = orderId;

        let savedPlantInstance = await PlantInstance.findOne({
          contractNumber: contractId,
        }).session(mongoSession);

        if (!savedPlantInstance) {
          // Get contract to check approval status
          const contract = await Contract.findOne({
            contractId: contractId,
          }).session(mongoSession);
          const isContractApproved =
            contract?.adminApprovalStatus === "approved" &&
            contract?.status === "approved";

          const plantInstanceId = `PLANT-${payment.orderId}-${orderId.slice(
            -8
          )}`;
          const productName = payment.productName || "gaharu";
          console.log(productName, "produk nama");
          const plantType = getPlantType(productName);
          console.log(plantType, "jenis plant");
          const instanceName = `${
            plantType.charAt(0).toUpperCase() + plantType.slice(1)
          } - ${user.fullName}`;
          console.log(instanceName, "nama instance");
          const adminName = await getFirstAdminName();

          const deterministicHistoryId = `HISTORY-${orderId}-NEW`;

          // Set status based on contract approval
          const plantStatus = isContractApproved ? "Kontrak Baru" : "Pending";
          const historyAction = isContractApproved
            ? "Kontrak Baru"
            : "Pending Contract";
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
            blok: "-",
            status: plantStatus,
            approvalStatus: "approved",
            lastUpdate: new Date().toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
            history: [
              {
                id: deterministicHistoryId,
                action: historyAction,
                type: historyAction,
                date: new Date().toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }),
                description: historyDescription,
                addedBy: adminName,
              },
            ],
          });

          savedPlantInstance = await plantInstance.save({
            session: mongoSession,
          });
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

        let investor = await Investor.findOne({ userId: user._id }).session(
          mongoSession
        );
        if (investor) {
          const existingIndex = investor.investments.findIndex(
            (inv: any) => inv.investmentId === orderId
          );

          if (existingIndex !== -1) {
            const existingInvestment = investor.investments[existingIndex];
            existingInvestment.plantInstanceId =
              investmentRecord.plantInstanceId;
            existingInvestment.status = "approved";

            // Only update amounts if this payment hasn't been processed yet
            if (existingInvestment.amountPaid === 0) {
              existingInvestment.amountPaid = payment.amount;
              // Recalculate totals from investment records to prevent double-counting
              recalculateInvestorTotals(investor);
            }

            existingInvestment.completionDate = new Date();
          } else {
            investor.investments.push(investmentRecord);
            // Recalculate totals from investment records to prevent double-counting
            recalculateInvestorTotals(investor);
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
        const contract = await Contract.findOne({
          contractId: orderId,
        }).session(mongoSession);
        if (contract) {
          contract.paymentCompleted = true;
          await contract.save({ session: mongoSession });
          console.log(
            `📄 [${txnId}] Contract ${orderId} marked as paymentCompleted`
          );

          // Stamp contract with e-materai after successful full payment
          // Only stamp if admin has already approved the signature
          if (contract.adminApprovalStatus === "approved") {
            console.log(
              `📋 [${txnId}] Stamping contract ${orderId} with e-materai`
            );
            const stampedUrl = await stampContractAfterPayment(
              orderId,
              mongoSession
            );
            if (stampedUrl) {
              console.log(
                `✅ [${txnId}] Contract stamped successfully: ${stampedUrl}`
              );
            } else {
              console.log(
                `⚠️ [${txnId}] Contract stamping failed, but payment succeeded`
              );
            }
          } else {
            console.log(
              `ℹ️ [${txnId}] Contract not yet approved by admin, stamping will occur after admin approval`
            );
          }
        }

        payment.contractRedirectUrl = `/contract/${orderId}`;
        payment.isProcessed = true;
        payment.status = "completed";

        await payment.save({ session: mongoSession });

        // Create commission record inside transaction
        if (payment.referralCode && payment.paymentType === "full-investment") {
          try {
            // Check if commission already exists
            const existingCommission = await CommissionHistory.findOne({
              paymentId: payment._id,
            }).session(mongoSession);

            if (!existingCommission) {
              // Find marketing staff or marketing head
              const marketingStaff = await User.findOne({
                referralCode: payment.referralCode,
                role: { $in: ["marketing", "marketing_head"] },
              }).session(mongoSession);

              if (marketingStaff) {
                // Get commission rate from settings
                const settings = await Settings.findOne({ type: "system" }).session(mongoSession);
                const commissionRate = settings?.config?.commissionRate ?? 0.02; // Default to 2% if not set
                const contractValue = payment.amount;
                const commissionAmount = Math.round(
                  contractValue * commissionRate
                );

                // Create commission record
                const commissionRecord = new CommissionHistory({
                  marketingStaffId: marketingStaff._id,
                  marketingStaffName: marketingStaff.fullName,
                  referralCodeUsed: payment.referralCode,

                  paymentId: payment._id,
                  customerId: user._id,
                  customerName: user.fullName,
                  customerEmail: user.email,

                  contractValue,
                  commissionRate,
                  commissionAmount,

                  paymentType: payment.paymentType,
                  earnedAt:
                    payment.settlementTime ||
                    payment.transactionTime ||
                    new Date(),
                  calculatedAt: new Date(),

                  contractId: orderId,
                  productName: payment.productName || "Unknown Product",
                });

                await commissionRecord.save({ session: mongoSession });
                console.log(
                  `💰 Commission created: ${commissionAmount} for ${marketingStaff.fullName} (${payment.referralCode})`
                );
              } else {
                console.log(
                  `⚠️ Marketing staff not found for referral code: ${payment.referralCode}`
                );
              }
            } else {
              console.log(
                `ℹ️ Commission already exists for payment ${orderId}`
              );
            }
          } catch (commissionError) {
            console.error(
              `❌ Commission error for ${orderId}:`,
              commissionError
            );
            // Don't fail the payment for commission errors
          }
        }
      });

      await mongoSession.endSession();
      message = "Investment payment successful - Contract ready for signing";
    }

    // INSTALLMENT payments (cicilan) - CIC-INV-BMS format
    if (
      (transactionStatus === "settlement" ||
        (transactionStatus === "capture" && fraudStatus === "accept")) &&
      orderId.startsWith("CIC-INV-BMS-") &&
      !payment.isProcessed // Add idempotency check
    ) {
      const mongoSession = await mongoose.startSession();
      const txnId = `TXN-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      await mongoSession.withTransaction(async () => {
        // Find the payment record by orderId directly (since it's unique)
        const installmentPayment = await Payment.findOne({
          orderId: orderId,
          paymentType: "cicilan-installment",
        }).session(mongoSession);

        if (!installmentPayment) {
          throw new Error(`Installment payment not found for ${orderId}`);
        }

        // Get values from the payment record
        const installmentNumber = installmentPayment.installmentNumber;
        const cicilanOrderId = installmentPayment.cicilanOrderId;

        console.log(`🔍 [${txnId}] Processing installment payment: ${orderId}`);
        console.log(
          `🔍 [${txnId}] CicilanOrderId: ${cicilanOrderId}, Installment: ${installmentNumber}`
        );

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

        const user = await User.findById(installmentPayment.userId).session(
          mongoSession
        );
        if (!user) throw new Error("User not found for installment payment");

        // Helper functions (same as admin approval logic)
        const getPlantType = (
          productName: string
        ): "gaharu" | "alpukat" | "jengkol" | "aren" | "kelapa" => {
          const name = productName.toLowerCase();
          if (name.includes("gaharu")) return "gaharu";
          if (name.includes("alpukat")) return "alpukat";
          if (name.includes("jengkol")) return "jengkol";
          if (name.includes("aren")) return "aren";
          if (name.includes("kelapa")) return "kelapa";
          return "gaharu";
        };

        const getBaseROI = (
          plantType: "gaharu" | "alpukat" | "jengkol" | "aren" | "kelapa"
        ) => {
          const roiMap = {
            gaharu: 0.15,
            alpukat: 0.12,
            jengkol: 0.1,
            aren: 0.18,
            kelapa: 0.12,
          };
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
          console.log(
            `📄 [${txnId}] First installment paid for cicilan ${cicilanOrderId} - creating PlantInstance and investor record`
          );

          // Get contract for approval status and totalAmount
          const contract = await Contract.findOne({
            contractId: cicilanOrderId,
          }).session(mongoSession);

          // Check if PlantInstance already exists
          const existingPlantInstance = await PlantInstance.findOne({
            contractNumber: cicilanOrderId,
          }).session(mongoSession);

          let savedPlantInstance = existingPlantInstance;

          if (!savedPlantInstance) {
            const isContractApproved =
              contract?.adminApprovalStatus === "approved" &&
              contract?.status === "approved";

            // Create new PlantInstance
            const plantInstanceId = `PLANT-${cicilanOrderId}-${Date.now()}`;
            const productName = installmentPayment.productName || "gaharu";
            console.log(productName, "produk nama");
            const plantType = getPlantType(productName);
            console.log(plantType, "jenis plant");
            const instanceName = `${
              plantType.charAt(0).toUpperCase() + plantType.slice(1)
            } - ${user.fullName}`;
            console.log(instanceName, "nama instance");
            const adminName = await getFirstAdminName();

            const deterministicHistoryId = `HISTORY-${cicilanOrderId}-NEW`;

            // Set status based on contract approval
            const plantStatus = isContractApproved ? "Kontrak Baru" : "Pending";
            const historyAction = isContractApproved
              ? "Kontrak Baru"
              : "Pending Contract";
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
              blok: "-",
              status: plantStatus,
              approvalStatus: "approved",
              lastUpdate: new Date().toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }),
              history: [
                {
                  id: deterministicHistoryId,
                  action: historyAction,
                  type: historyAction,
                  date: new Date().toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }),
                  description: historyDescription,
                  addedBy: adminName,
                },
              ],
            });

            savedPlantInstance = await plantInstance.save({
              session: mongoSession,
            });
            console.log(
              `🌱 [${txnId}] PlantInstance created: ${plantInstanceId} for cicilan ${cicilanOrderId}`
            );
          }

          // Find or create Investor record
          let investor = await Investor.findOne({ userId: user._id }).session(
            mongoSession
          );

          if (investor) {
            // Update existing investor with FULL contract amounts
            const existingInvestmentIndex = investor.investments.findIndex(
              (inv: any) => inv.investmentId === cicilanOrderId
            );

            if (existingInvestmentIndex !== -1) {
              // Update existing investment
              const existingInvestment =
                investor.investments[existingInvestmentIndex];
              existingInvestment.plantInstanceId =
                savedPlantInstance._id.toString();
              existingInvestment.status = "active";

              // Only update if not already paid (prevent double-counting)
              if (existingInvestment.amountPaid === 0) {
                // Add FULL contract amount to totals (business logic requirement)
                const fullContractAmount =
                  contract?.totalAmount ||
                  installmentPayment.installmentAmount *
                    installmentPayment.totalInstallments;

                existingInvestment.totalAmount = fullContractAmount;
                existingInvestment.amountPaid = installmentPayment.amount; // Only actual payment

                // Recalculate totals from investment records to prevent double-counting
                recalculateInvestorTotals(investor);
              }

              // Add/update first installment record
              if (!existingInvestment.installments) {
                existingInvestment.installments = [];
              }

              const installmentIndex =
                existingInvestment.installments.findIndex(
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
                existingInvestment.installments[installmentIndex] =
                  installmentRecord;
              } else {
                existingInvestment.installments.push(installmentRecord);
              }

              existingInvestment.completionDate = new Date();
            } else {
              // Create new investment record
              const fullContractAmount =
                contract?.totalAmount ||
                installmentPayment.installmentAmount *
                  installmentPayment.totalInstallments;

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
                installments: [
                  {
                    installmentNumber: installmentNumber,
                    amount: installmentPayment.amount,
                    dueDate: installmentPayment.dueDate,
                    isPaid: true,
                    paidDate: new Date(),
                    status: "approved",
                    proofImageUrl: null,
                  },
                ],
              };

              investor.investments.push(investmentRecord);
              // Recalculate totals from investment records to prevent double-counting
              recalculateInvestorTotals(investor);
            }

            await investor.save({ session: mongoSession });
          } else {
            // Create new investor record
            const fullContractAmount =
              contract?.totalAmount ||
              installmentPayment.installmentAmount *
                installmentPayment.totalInstallments;

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
              installments: [
                {
                  installmentNumber: installmentNumber,
                  amount: installmentPayment.amount,
                  dueDate: installmentPayment.dueDate,
                  isPaid: true,
                  paidDate: new Date(),
                  status: "approved",
                  proofImageUrl: null,
                },
              ],
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

          console.log(
            `💰 [${txnId}] Investor record created/updated for first cicilan installment`
          );

          // Stamp contract with e-materai after first installment payment
          // Only stamp if admin has already approved the signature
          const cicilanContract = await Contract.findOne({
            contractId: cicilanOrderId,
          }).session(mongoSession);

          if (
            cicilanContract &&
            cicilanContract.adminApprovalStatus === "approved"
          ) {
            console.log(
              `📋 [${txnId}] Stamping contract ${cicilanOrderId} with e-materai after first installment`
            );
            const stampedUrl = await stampContractAfterPayment(
              cicilanOrderId,
              mongoSession
            );
            if (stampedUrl) {
              console.log(
                `✅ [${txnId}] Contract stamped successfully: ${stampedUrl}`
              );
            } else {
              console.log(
                `⚠️ [${txnId}] Contract stamping failed, but payment succeeded`
              );
            }
          } else {
            console.log(
              `ℹ️ [${txnId}] Contract not yet approved by admin, stamping will occur after admin approval`
            );
          }
        } else {
          // SUBSEQUENT INSTALLMENTS: Only update totalPaid and add installment record
          console.log(
            `📄 [${txnId}] Subsequent installment ${installmentNumber} paid for cicilan ${cicilanOrderId}`
          );

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

            // Recalculate totals from investment records to prevent double-counting
            recalculateInvestorTotals(investor);
            await investor.save({ session: mongoSession });
          }

          console.log(
            `💰 [${txnId}] Investor record updated for subsequent installment`
          );
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
              productName: installmentPayment.productName || "Investment",
              installmentNumber: nextInstallmentNumber,
              paymentType: "cicilan-installment",
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
              transactionStatus: "pending",
              status: "pending",
              isProcessed: false,
              customerData: installmentPayment.customerData,
              referralCode: installmentPayment.referralCode, // Preserve referral code for commission tracking
              paymentMethod: installmentPayment.paymentMethod, // Preserve payment method from previous installment
            });

            await nextInstallment.save({ session: mongoSession });
            console.log(
              `📅 [${txnId}] Next installment created: ${nextInstallmentOrderId} due ${nextDueDate.toISOString()}`
            );

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
                  console.log(
                    `📊 [${txnId}] Added installment ${nextInstallmentNumber} to investor record`
                  );
                }
              }
            }
          }
        }

        // Create commission record for each installment payment (progressive commission)
        if (installmentPayment.referralCode) {
          try {
            // Check if commission already exists for this specific installment
            const existingCommission = await CommissionHistory.findOne({
              paymentId: installmentPayment._id,
            }).session(mongoSession);

            if (!existingCommission) {
              // Find marketing staff or marketing head
              const marketingStaff = await User.findOne({
                referralCode: installmentPayment.referralCode,
                role: { $in: ["marketing", "marketing_head"] },
              }).session(mongoSession);

              if (marketingStaff) {
                // Get commission rate and minConsecutiveTenor from settings
                const settings = await Settings.findOne({ type: "system" }).session(mongoSession);
                const commissionRate = settings?.config?.commissionRate ?? 0.02; // Default to 2% if not set
                const minConsecutiveTenor = settings?.config?.minConsecutiveTenor ?? 10; // Default to 10

                // Check if payment term is monthly (minConsecutiveTenor only applies to monthly payments)
                const isMonthlyPayment = installmentPayment.paymentTerm === "monthly";

                // Check if this installment triggers bulk commission payout (only for monthly)
                if (isMonthlyPayment && installmentNumber === minConsecutiveTenor) {
                  // At threshold: Calculate remaining commission (from this tenor onwards)
                  const totalInstallments = installmentPayment.totalInstallments;
                  const installmentAmount = installmentPayment.installmentAmount;
                  
                  // Total contract value
                  const totalContractValue = installmentAmount * totalInstallments;
                  const totalCommission = Math.round(totalContractValue * commissionRate);
                  
                  // Commission already paid (installments 1 to minConsecutiveTenor - 1)
                  const commissionsPaid = (minConsecutiveTenor - 1) * Math.round(installmentAmount * commissionRate);
                  
                  // Remaining commission to pay in bulk
                  const remainingCommission = totalCommission - commissionsPaid;

                  // Create bulk commission record
                  const commissionRecord = new CommissionHistory({
                    marketingStaffId: marketingStaff._id,
                    marketingStaffName: marketingStaff.fullName,
                    referralCodeUsed: installmentPayment.referralCode,

                    paymentId: installmentPayment._id,
                    cicilanOrderId: installmentPayment.cicilanOrderId,
                    customerId: user._id,
                    customerName: user.fullName,
                    customerEmail: user.email,

                    contractValue: totalContractValue - (minConsecutiveTenor - 1) * installmentAmount, // Remaining contract value
                    commissionRate,
                    commissionAmount: remainingCommission,

                    paymentType: installmentPayment.paymentType,
                    earnedAt: installmentPayment.adminReviewDate || new Date(),
                    calculatedAt: new Date(),

                    contractId: cicilanOrderId,
                    productName:
                      installmentPayment.productName || "Unknown Product",
                    installmentDetails: {
                      installmentAmount: installmentPayment.installmentAmount,
                      totalInstallments: installmentPayment.totalInstallments,
                      installmentNumber: installmentPayment.installmentNumber,
                    },
                  });

                  await commissionRecord.save({ session: mongoSession });
                  console.log(
                    `💰 [${txnId}] BULK commission created at tenor ${installmentNumber}: ${remainingCommission} for ${marketingStaff.fullName} (${installmentPayment.referralCode})`
                  );
                } else if (isMonthlyPayment && installmentNumber < minConsecutiveTenor) {
                  // Before threshold: Regular per-installment commission
                  const installmentAmount = installmentPayment.amount;
                  const commissionAmount = Math.round(installmentAmount * commissionRate);

                  // Create commission record for this specific installment
                  const commissionRecord = new CommissionHistory({
                    marketingStaffId: marketingStaff._id,
                    marketingStaffName: marketingStaff.fullName,
                    referralCodeUsed: installmentPayment.referralCode,

                    paymentId: installmentPayment._id,
                    cicilanOrderId: installmentPayment.cicilanOrderId,
                    customerId: user._id,
                    customerName: user.fullName,
                    customerEmail: user.email,

                    contractValue: installmentAmount, // This installment's amount only
                    commissionRate,
                    commissionAmount,

                    paymentType: installmentPayment.paymentType,
                    earnedAt: installmentPayment.adminReviewDate || new Date(),
                    calculatedAt: new Date(),

                    contractId: cicilanOrderId,
                    productName:
                      installmentPayment.productName || "Unknown Product",
                    installmentDetails: {
                      installmentAmount: installmentPayment.installmentAmount,
                      totalInstallments: installmentPayment.totalInstallments,
                      installmentNumber: installmentPayment.installmentNumber,
                    },
                  });

                  await commissionRecord.save({ session: mongoSession });
                  console.log(
                    `💰 [${txnId}] Commission created for installment ${installmentNumber}: ${commissionAmount} for ${marketingStaff.fullName} (${installmentPayment.referralCode})`
                  );
                } else if (isMonthlyPayment && installmentNumber > minConsecutiveTenor) {
                  // After threshold: No commission (already paid in bulk) - only for monthly
                  console.log(
                    `ℹ️ [${txnId}] Installment ${installmentNumber} after threshold ${minConsecutiveTenor}, no commission created (already paid in bulk)`
                  );
                } else {
                  // Non-monthly payments (yearly, quarterly, etc.): Regular per-installment commission
                  const installmentAmount = installmentPayment.amount;
                  const commissionAmount = Math.round(installmentAmount * commissionRate);

                  // Create commission record for this specific installment
                  const commissionRecord = new CommissionHistory({
                    marketingStaffId: marketingStaff._id,
                    marketingStaffName: marketingStaff.fullName,
                    referralCodeUsed: installmentPayment.referralCode,

                    paymentId: installmentPayment._id,
                    cicilanOrderId: installmentPayment.cicilanOrderId,
                    customerId: user._id,
                    customerName: user.fullName,
                    customerEmail: user.email,

                    contractValue: installmentAmount, // This installment's amount only
                    commissionRate,
                    commissionAmount,

                    paymentType: installmentPayment.paymentType,
                    earnedAt: installmentPayment.adminReviewDate || new Date(),
                    calculatedAt: new Date(),

                    contractId: cicilanOrderId,
                    productName:
                      installmentPayment.productName || "Unknown Product",
                    installmentDetails: {
                      installmentAmount: installmentPayment.installmentAmount,
                      totalInstallments: installmentPayment.totalInstallments,
                      installmentNumber: installmentPayment.installmentNumber,
                    },
                  });

                  await commissionRecord.save({ session: mongoSession });
                  console.log(
                    `💰 [${txnId}] Commission created for installment ${installmentNumber} (${installmentPayment.paymentTerm}): ${commissionAmount} for ${marketingStaff.fullName} (${installmentPayment.referralCode})`
                  );
                }
              } else {
                console.log(
                  `⚠️ [${txnId}] Marketing staff not found for referral code: ${installmentPayment.referralCode}`
                );
              }
            } else {
              console.log(
                `ℹ️ [${txnId}] Commission already exists for installment ${orderId}`
              );
            }
          } catch (commissionError) {
            console.error(
              `❌ [${txnId}] Commission error for ${orderId}:`,
              commissionError
            );
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
