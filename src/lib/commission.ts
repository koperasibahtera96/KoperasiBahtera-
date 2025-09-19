import dbConnect from "@/lib/mongodb";
import CommissionHistory from "@/models/CommissionHistory";
import Payment from "@/models/Payment";
import User from "@/models/User";

export async function createCommissionRecord(paymentId: string): Promise<{
  success: boolean;
  message: string;
  commission?: any;
}> {
  try {
    await dbConnect();

    // Check if commission already exists
    const existingCommission = await CommissionHistory.findOne({ paymentId });
    if (existingCommission) {
      return {
        success: false,
        message: "Commission already recorded for this payment"
      };
    }

    // Find the payment
    const payment = await Payment.findById(paymentId)
      .populate('userId', 'fullName email phoneNumber');

    if (!payment) {
      return {
        success: false,
        message: "Payment not found"
      };
    }

    // Validate payment for commission eligibility
    let isEligible = false;
    let contractValue = 0;

    if (payment.paymentType === 'full-investment') {
      // Full payment: commission when settlement/approved
      if (payment.transactionStatus === 'settlement' || payment.adminStatus === 'approved') {
        isEligible = true;
        contractValue = payment.amount;
      }
    } else if (payment.paymentType === 'cicilan-installment') {
      // Cicilan: commission only on first installment when approved
      if (payment.installmentNumber === 1 &&
          payment.adminStatus === 'approved' &&
          payment.installmentAmount &&
          payment.totalInstallments) {
        isEligible = true;
        contractValue = payment.installmentAmount * payment.totalInstallments;
      }
    }

    if (!isEligible) {
      return {
        success: false,
        message: "Payment not eligible for commission"
      };
    }

    if (!payment.referralCode) {
      return {
        success: false,
        message: "No referral code associated with this payment"
      };
    }

    // Find marketing staff
    const marketingStaff = await User.findOne({
      referralCode: payment.referralCode,
      role: 'marketing'
    });

    if (!marketingStaff) {
      return {
        success: false,
        message: "Marketing staff not found for referral code"
      };
    }

    // Calculate commission
    const commissionRate = 0.02; // 2%
    const commissionAmount = Math.round(contractValue * commissionRate);

    // Create commission record
    const commissionRecord = new CommissionHistory({
      marketingStaffId: marketingStaff._id,
      marketingStaffName: marketingStaff.fullName,
      referralCodeUsed: payment.referralCode,

      paymentId: payment._id,
      cicilanOrderId: payment.cicilanOrderId,
      customerId: payment.userId._id,
      customerName: payment.userId.fullName,
      customerEmail: payment.userId.email,

      contractValue,
      commissionRate,
      commissionAmount,

      paymentType: payment.paymentType,
      earnedAt: payment.transactionStatus === 'settlement'
        ? payment.settlementTime || payment.transactionTime || new Date()
        : payment.adminReviewDate || new Date(),
      calculatedAt: new Date(),

      contractId: payment.contractId,
      productName: payment.productName || 'Unknown Product',
      ...(payment.paymentType === 'cicilan-installment' && {
        installmentDetails: {
          installmentAmount: payment.installmentAmount!,
          totalInstallments: payment.totalInstallments!,
          installmentNumber: payment.installmentNumber!
        }
      })
    });

    await commissionRecord.save();

    console.log(`Commission created: ${commissionAmount} for marketing staff ${marketingStaff.fullName} (${payment.referralCode})`);

    return {
      success: true,
      message: "Commission recorded successfully",
      commission: commissionRecord
    };

  } catch (error) {
    console.error("Error creating commission record:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create commission record"
    };
  }
}

export async function recalculateCommissionsForStaff(marketingStaffId: string): Promise<{
  success: boolean;
  message: string;
  summary?: {
    totalCommissions: number;
    commissionsCreated: number;
    errors: string[];
  };
}> {
  try {
    await dbConnect();

    // Find marketing staff
    const marketingStaff = await User.findById(marketingStaffId);
    if (!marketingStaff || marketingStaff.role !== 'marketing') {
      return {
        success: false,
        message: "Marketing staff not found"
      };
    }

    if (!marketingStaff.referralCode) {
      return {
        success: false,
        message: "Marketing staff has no referral code"
      };
    }

    // Find all eligible payments for this referral code
    const eligiblePayments = await Payment.find({
      referralCode: marketingStaff.referralCode,
      $or: [
        {
          paymentType: 'full-investment',
          $or: [
            { transactionStatus: 'settlement' },
            { adminStatus: 'approved' }
          ]
        },
        {
          paymentType: 'cicilan-installment',
          installmentNumber: 1,
          adminStatus: 'approved'
        }
      ]
    }).populate('userId', 'fullName email phoneNumber');

    let commissionsCreated = 0;
    let totalCommissions = 0;
    const errors: string[] = [];

    for (const payment of eligiblePayments) {
      const result = await createCommissionRecord(payment._id.toString());
      if (result.success) {
        commissionsCreated++;
        if (result.commission) {
          totalCommissions += result.commission.commissionAmount;
        }
      } else {
        // Only log errors that aren't "already exists"
        if (!result.message.includes("already recorded")) {
          errors.push(`Payment ${payment._id}: ${result.message}`);
        }
      }
    }

    return {
      success: true,
      message: `Recalculation completed for ${marketingStaff.fullName}`,
      summary: {
        totalCommissions,
        commissionsCreated,
        errors
      }
    };

  } catch (error) {
    console.error("Error recalculating commissions:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to recalculate commissions"
    };
  }
}