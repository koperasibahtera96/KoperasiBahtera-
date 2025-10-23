import { generateInvoiceNumber } from "@/lib/invoiceNumberGenerator";
import { getFirstAdminName } from "@/lib/utils/admin";
import { Investor } from "@/models";
import CommissionHistory from "@/models/CommissionHistory";
import Contract from "@/models/Contract";
import Payment from "@/models/Payment";
import PlantInstance from "@/models/PlantInstance";
import User from "@/models/User";
import mongoose from "mongoose";
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

// Helper function to get plant type from product name
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

// Helper function to get base ROI for plant type
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

/**
 * Process a full investment payment
 * This function handles creating PlantInstance, Investor records, and Commission
 * @param payment - The payment record to process
 * @param mongoSession - Active Mongoose session for transaction
 * @returns Transaction ID
 */
export async function processFullPayment(
  payment: any,
  mongoSession: mongoose.ClientSession
): Promise<string> {
  const txnId = `TXN-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  console.log(`🔍 [${txnId}] Processing full payment: ${payment.orderId}`);

  const user = await User.findById(payment.userId).session(mongoSession);
  if (!user) throw new Error("User not found for investment payment");

  // For new invoice format, contractId equals orderId
  const contractId = payment.orderId;

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

    const plantInstanceId = `PLANT-${payment.orderId}-${contractId.slice(-8)}`;
    const productName = payment.productName || "gaharu";
    const plantType = getPlantType(productName);
    const instanceName = `${
      plantType.charAt(0).toUpperCase() + plantType.slice(1)
    } - ${user.fullName}`;
    const adminName = await getFirstAdminName();

    const deterministicHistoryId = `HISTORY-${contractId}-NEW`;

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
      contractNumber: contractId,
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
    console.log(`🌱 [${txnId}] PlantInstance created: ${plantInstanceId}`);
  }

  const investmentRecord = {
    investmentId: contractId,
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
      (inv: any) => inv.investmentId === contractId
    );

    if (existingIndex !== -1) {
      const existingInvestment = investor.investments[existingIndex];
      existingInvestment.plantInstanceId = investmentRecord.plantInstanceId;
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

  // Mark contract as paymentCompleted
  const contract = await Contract.findOne({
    contractId: contractId,
  }).session(mongoSession);
  if (contract) {
    contract.paymentCompleted = true;
    await contract.save({ session: mongoSession });
    console.log(
      `📄 [${txnId}] Contract ${contractId} marked as paymentCompleted`
    );

    // Stamp contract with e-materai after successful full payment
    // Only stamp if admin has already approved the signature
    if (contract.adminApprovalStatus === "approved") {
      console.log(
        `📋 [${txnId}] Stamping contract ${contractId} with e-materai`
      );
      const stampedUrl = await stampContractAfterPayment(
        contractId,
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

  payment.contractRedirectUrl = `/contract/${contractId}`;
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
          // Calculate commission
          const commissionRate = 0.02; // 2%
          const contractValue = payment.amount;
          const commissionAmount = Math.round(contractValue * commissionRate);

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
              payment.settlementTime || payment.transactionTime || new Date(),
            calculatedAt: new Date(),

            contractId: contractId,
            productName: payment.productName || "Unknown Product",
          });

          await commissionRecord.save({ session: mongoSession });
          console.log(
            `💰 [${txnId}] Commission created: ${commissionAmount} for ${marketingStaff.fullName} (${payment.referralCode})`
          );
        } else {
          console.log(
            `⚠️ [${txnId}] Marketing staff not found for referral code: ${payment.referralCode}`
          );
        }
      } else {
        console.log(
          `ℹ️ [${txnId}] Commission already exists for payment ${contractId}`
        );
      }
    } catch (commissionError) {
      console.error(
        `❌ [${txnId}] Commission error for ${contractId}:`,
        commissionError
      );
      // Don't fail the payment for commission errors
    }
  }

  console.log(
    `✅ [${txnId}] Full payment processed successfully for ${contractId}`
  );
  return txnId;
}

/**
 * Process an installment payment (cicilan)
 * This function handles creating PlantInstance on first installment, updating Investor records,
 * creating next installment, and commission tracking
 * @param payment - The installment payment record to process
 * @param mongoSession - Active Mongoose session for transaction
 * @returns Transaction ID
 */
export async function processInstallmentPayment(
  payment: any,
  mongoSession: mongoose.ClientSession
): Promise<string> {
  const txnId = `TXN-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  const installmentNumber = payment.installmentNumber;
  const cicilanOrderId = payment.cicilanOrderId;

  console.log(`🔍 [${txnId}] Processing installment payment: ${payment.orderId}`);
  console.log(
    `🔍 [${txnId}] CicilanOrderId: ${cicilanOrderId}, Installment: ${installmentNumber}`
  );

  const user = await User.findById(payment.userId).session(mongoSession);
  if (!user) throw new Error("User not found for installment payment");

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
      const productName = payment.productName || "gaharu";
      const plantType = getPlantType(productName);
      const instanceName = `${
        plantType.charAt(0).toUpperCase() + plantType.slice(1)
      } - ${user.fullName}`;
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
        existingInvestment.plantInstanceId = savedPlantInstance._id.toString();
        existingInvestment.status = "active";

        // Only update if not already paid (prevent double-counting)
        if (existingInvestment.amountPaid === 0) {
          // Add FULL contract amount to totals (business logic requirement)
          const fullContractAmount =
            contract?.totalAmount ||
            payment.installmentAmount * payment.totalInstallments;

          existingInvestment.totalAmount = fullContractAmount;
          existingInvestment.amountPaid = payment.amount; // Only actual payment

          // Recalculate totals from investment records to prevent double-counting
          recalculateInvestorTotals(investor);
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
          amount: payment.amount,
          dueDate: payment.dueDate,
          isPaid: true,
          paidDate: new Date(),
          status: "approved",
          proofImageUrl: payment.proofImageUrl || null,
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
          payment.installmentAmount * payment.totalInstallments;

        const investmentRecord = {
          investmentId: cicilanOrderId,
          productName: payment.productName,
          plantInstanceId: savedPlantInstance._id.toString(),
          totalAmount: fullContractAmount, // FULL contract amount
          amountPaid: payment.amount, // Only actual payment
          paymentType: "cicilan" as const,
          status: "active" as const,
          investmentDate: new Date(),
          completionDate: new Date(),
          installments: [
            {
              installmentNumber: installmentNumber,
              amount: payment.amount,
              dueDate: payment.dueDate,
              isPaid: true,
              paidDate: new Date(),
              status: "approved",
              proofImageUrl: payment.proofImageUrl || null,
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
        payment.installmentAmount * payment.totalInstallments;

      const investmentRecord = {
        investmentId: cicilanOrderId,
        productName: payment.productName,
        plantInstanceId: savedPlantInstance._id.toString(),
        totalAmount: fullContractAmount, // FULL contract amount
        amountPaid: payment.amount, // Only actual payment
        paymentType: "cicilan" as const,
        status: "active" as const,
        investmentDate: new Date(),
        completionDate: new Date(),
        installments: [
          {
            installmentNumber: installmentNumber,
            amount: payment.amount,
            dueDate: payment.dueDate,
            isPaid: true,
            paidDate: new Date(),
            status: "approved",
            proofImageUrl: payment.proofImageUrl || null,
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
        totalPaid: payment.amount, // Only actual payment
        jumlahPohon: extractTreeCount(payment.productName),
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
      userId: payment.userId,
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
          amount: payment.amount,
          dueDate: payment.dueDate,
          isPaid: true,
          paidDate: new Date(),
          status: "approved",
          proofImageUrl: payment.proofImageUrl || null,
        };

        if (installmentIndex !== -1) {
          investment.installments[installmentIndex] = installmentRecord;
        } else {
          investment.installments.push(installmentRecord);
        }

        // Update investment amount paid incrementally
        investment.amountPaid += payment.amount;
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
  if (installmentNumber < payment.totalInstallments) {
    const nextInstallmentNumber = installmentNumber + 1;

    // Check if next installment already exists
    const existingNextPayment = await Payment.findOne({
      cicilanOrderId: cicilanOrderId,
      installmentNumber: nextInstallmentNumber,
    }).session(mongoSession);

    if (!existingNextPayment) {
      // Calculate next installment due date based on payment term
      const termToMonths = {
        monthly: 1,
        quarterly: 3,
        semiannual: 6,
        annual: 12,
      };
      const paymentTermMonths =
        termToMonths[payment.paymentTerm as keyof typeof termToMonths] || 1;

      const nextDueDate = new Date(payment.dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + paymentTermMonths);

      // Create next installment payment record
      const nextInstallmentOrderId = await generateInvoiceNumber({
        productName: payment.productName || "Investment",
        installmentNumber: nextInstallmentNumber,
        paymentType: "cicilan-installment",
      });
      const nextInstallment = new Payment({
        orderId: nextInstallmentOrderId,
        userId: payment.userId,
        amount: payment.installmentAmount,
        currency: "IDR",
        paymentType: "cicilan-installment",
        cicilanOrderId: cicilanOrderId,
        installmentNumber: nextInstallmentNumber,
        totalInstallments: payment.totalInstallments,
        installmentAmount: payment.installmentAmount,
        paymentTerm: payment.paymentTerm,
        dueDate: nextDueDate,
        productName: payment.productName,
        productId: payment.productId,
        adminStatus: "pending",
        transactionStatus: "pending",
        status: "pending",
        isProcessed: false,
        customerData: payment.customerData,
        referralCode: payment.referralCode, // Preserve referral code for commission tracking
        paymentMethod: payment.paymentMethod, // Preserve payment method from previous installment
      });

      await nextInstallment.save({ session: mongoSession });
      console.log(
        `📅 [${txnId}] Next installment created: ${nextInstallmentOrderId} due ${nextDueDate.toISOString()}`
      );

      // Also add the next installment to the investor record
      const investorForNextInstallment = await Investor.findOne({
        userId: payment.userId,
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
              (inst: any) => inst.installmentNumber === nextInstallmentNumber
            );

          if (!existingInstallmentInInvestor) {
            investmentForNextInstallment.installments.push({
              installmentNumber: nextInstallmentNumber,
              amount: payment.installmentAmount,
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
  if (payment.referralCode) {
    try {
      // Check if commission already exists for this specific installment
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
          // Calculate commission based on THIS installment amount only (2% per installment)
          const installmentAmount = payment.amount;
          const commissionRate = 0.02; // 2%
          const commissionAmount = Math.round(
            installmentAmount * commissionRate
          );

          // Create commission record for this specific installment
          const commissionRecord = new CommissionHistory({
            marketingStaffId: marketingStaff._id,
            marketingStaffName: marketingStaff.fullName,
            referralCodeUsed: payment.referralCode,

            paymentId: payment._id,
            cicilanOrderId: payment.cicilanOrderId,
            customerId: user._id,
            customerName: user.fullName,
            customerEmail: user.email,

            contractValue: installmentAmount, // This installment's amount only
            commissionRate,
            commissionAmount,

            paymentType: payment.paymentType,
            earnedAt: payment.adminReviewDate || new Date(),
            calculatedAt: new Date(),

            contractId: cicilanOrderId,
            productName: payment.productName || "Unknown Product",
            installmentDetails: {
              installmentAmount: payment.installmentAmount,
              totalInstallments: payment.totalInstallments,
              installmentNumber: payment.installmentNumber,
            },
          });

          await commissionRecord.save({ session: mongoSession });
          console.log(
            `💰 [${txnId}] Commission created for installment ${installmentNumber}: ${commissionAmount} for ${marketingStaff.fullName} (${payment.referralCode})`
          );
        } else {
          console.log(
            `⚠️ [${txnId}] Marketing staff not found for referral code: ${payment.referralCode}`
          );
        }
      } else {
        console.log(
          `ℹ️ [${txnId}] Commission already exists for installment ${payment.orderId}`
        );
      }
    } catch (commissionError) {
      console.error(
        `❌ [${txnId}] Commission error for ${payment.orderId}:`,
        commissionError
      );
      // Don't fail the payment for commission errors
    }
  }

  payment.isProcessed = true;
  payment.status = "completed";
  await payment.save({ session: mongoSession });

  console.log(
    `✅ [${txnId}] Installment payment processed successfully for ${cicilanOrderId}`
  );
  return txnId;
}
