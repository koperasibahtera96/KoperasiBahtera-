import dbConnect from "@/lib/mongodb";
import CommissionHistory from "@/models/CommissionHistory";
import CommissionWithdrawal from "@/models/CommissionWithdrawal";
import Contract from "@/models/Contract";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch all marketing staff commissions
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has marketing_head, marketing_admin, or admin role
    const user = await User.findOne({ email: session.user.email });
    if (
      !user ||
      (user.role !== "marketing_head" &&
        user.role !== "marketing_admin" &&
        user.role !== "admin" &&
        user.role !== "finance" &&
        user.role !== "staff_finance")
    ) {
      return NextResponse.json(
        {
          error: "Access denied. Marketing Head, Marketing Admin, or Admin role required.",
        },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const staffId = url.searchParams.get("staffId");

    // Build query
    const query: any = {};

    if (startDate && endDate) {
      // Set start date to beginning of day (00:00:00.000)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      // Set end date to end of day (23:59:59.999)
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.earnedAt = {
        $gte: start,
        $lte: end,
      };
    }

    if (staffId) {
      query.marketingStaffId = staffId;
    }

    // Get all marketing staff, marketing_head, and mitra
    const marketingStaff = await User.find({
      role: { $in: ["marketing", "marketing_head", "mitra"] },
    }).select("_id fullName email referralCode");

    // Get commission history
    const commissions = await CommissionHistory.find(query)
      .populate("marketingStaffId", "fullName email referralCode")
      .populate("customerId", "fullName email phoneNumber")
      .sort({ earnedAt: -1 });

    // Build withdrawal query based on date filters
    const withdrawalQuery: any = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      withdrawalQuery.withdrawalDate = {
        $gte: start,
        $lte: end,
      };
    }

    // Get withdrawals filtered by date (if date filters are applied)
    const withdrawals = await CommissionWithdrawal.find(withdrawalQuery);

    // Calculate summary by staff
    const staffSummary = await Promise.all(
      marketingStaff.map(async (staff) => {
        const staffCommissions = commissions.filter(
          (c) => c.marketingStaffId._id.toString() === staff._id.toString()
        );

        const totalCommission = staffCommissions.reduce(
          (sum, c) => sum + c.commissionAmount,
          0
        );

        const totalReferrals = staffCommissions.length;

        const byType = {
          fullInvestment: staffCommissions.filter(
            (c) => c.paymentType === "full-investment"
          ).length,
          cicilan: staffCommissions.filter(
            (c) => c.paymentType === "cicilan-installment"
          ).length,
        };

        // Calculate paid/unpaid commissions based on date filters
        let totalPaidCommission = 0;
        if (startDate && endDate) {
          // If date filters are applied, only count withdrawals within that date range
          const staffWithdrawals = withdrawals.filter(
            (w) => w.marketingStaffId.toString() === staff._id.toString()
          );
          totalPaidCommission = staffWithdrawals.reduce(
            (sum, w) => sum + w.amount,
            0
          );
        } else {
          // If no date filters, get all-time withdrawals for this staff
          const allTimeWithdrawals = await CommissionWithdrawal.aggregate([
            { $match: { marketingStaffId: staff._id } },
            {
              $group: {
                _id: null,
                totalPaid: { $sum: "$amount" },
              },
            },
          ]);
          totalPaidCommission =
            allTimeWithdrawals.length > 0 ? allTimeWithdrawals[0].totalPaid : 0;
        }

        // Unpaid commission is the filtered commission total minus filtered paid amount
        // But we need to cap it - can't have negative unpaid
        const totalUnpaidCommission = Math.max(
          0,
          totalCommission - totalPaidCommission
        );

        return {
          staffId: staff._id,
          staffName: staff.fullName,
          staffEmail: staff.email,
          referralCode: staff.referralCode,
          totalCommission,
          totalReferrals,
          byType,
          commissions: staffCommissions,
          totalPaidCommission,
          totalUnpaidCommission,
        };
      })
    );

    // Overall summary
    // When date filters are applied, only count staff with commissions > 0
    const staffWithCommissions = staffSummary.filter(
      (s) => s.totalCommission > 0
    );
    const overallSummary = {
      totalStaff:
        startDate && endDate
          ? staffWithCommissions.length
          : marketingStaff.length,
      totalCommissions: commissions.reduce(
        (sum, c) => sum + c.commissionAmount,
        0
      ),
      totalReferrals: commissions.length,
      byType: {
        fullInvestment: commissions.filter(
          (c) => c.paymentType === "full-investment"
        ).length,
        cicilan: commissions.filter(
          (c) => c.paymentType === "cicilan-installment"
        ).length,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        staffSummary,
        overallSummary,
        commissions: staffId ? commissions : [], // Only return detailed commissions if specific staff requested
      },
    });
  } catch (error) {
    console.error("Error fetching marketing commissions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch commission data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Create commission record (typically called by payment webhook/approval)
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json(
        {
          error: "Payment ID is required",
        },
        { status: 400 }
      );
    }

    // Find the payment
    const payment = await Payment.findById(paymentId).populate(
      "userId",
      "fullName email phoneNumber"
    );

    if (!payment) {
      return NextResponse.json(
        {
          error: "Payment not found",
        },
        { status: 404 }
      );
    }

    // Check if commission already exists
    const existingCommission = await CommissionHistory.findOne({ paymentId });
    if (existingCommission) {
      return NextResponse.json(
        {
          error: "Commission already recorded for this payment",
        },
        { status: 400 }
      );
    }

    // Validate payment for commission eligibility
    let isEligible = false;
    let contractValue = 0;

    if (payment.paymentType === "full-investment") {
      // Full payment: commission when settlement/approved
      if (
        payment.transactionStatus === "settlement" ||
        payment.adminStatus === "approved"
      ) {
        isEligible = true;
        contractValue = payment.amount;
      }
    } else if (payment.paymentType === "cicilan-installment") {
      // Cicilan: commission only on first installment when approved
      if (
        payment.installmentNumber === 1 &&
        payment.adminStatus === "approved" &&
        payment.installmentAmount &&
        payment.totalInstallments
      ) {
        isEligible = true;
        contractValue = payment.installmentAmount * payment.totalInstallments;
      }
    }

    if (!isEligible) {
      return NextResponse.json(
        {
          error: "Payment not eligible for commission",
        },
        { status: 400 }
      );
    }

    if (!payment.referralCode) {
      return NextResponse.json(
        {
          error: "No referral code associated with this payment",
        },
        { status: 400 }
      );
    }

    // Find marketing staff, marketing_head, or mitra
    const marketingStaff = await User.findOne({
      referralCode: payment.referralCode,
      role: { $in: ["marketing", "marketing_head", "mitra"] },
    });

    if (!marketingStaff) {
      return NextResponse.json(
        {
          error: "Marketing staff not found for referral code",
        },
        { status: 400 }
      );
    }

    // For marketing/marketing_head: Only create commission for cicilan, NOT for full payments
    // For mitra: Create commission for both payment types
    if (payment.paymentType === "full-investment" &&
        (marketingStaff.role === "marketing" || marketingStaff.role === "marketing_head")) {
      return NextResponse.json(
        {
          error: "Commission not applicable for marketing/marketing_head referral codes on full payments",
        },
        { status: 400 }
      );
    }

    // Try to get locked rates from contract
    const contractLookupId = payment.paymentType === 'full-investment'
      ? payment.orderId || payment.contractId
      : payment.cicilanOrderId;
    const paymentContract = contractLookupId
      ? await Contract.findOne({ contractId: contractLookupId })
      : null;

    let commissionRate: number;
    let companyCutRate: number | undefined;
    let rateSource: string;

    if (paymentContract?.lockedCommissionRate !== undefined) {
      // Use locked rates from contract creation time
      commissionRate = paymentContract.lockedCommissionRate;
      companyCutRate = paymentContract.lockedCompanyCutRate;
      rateSource = "contract_locked";
    } else if (marketingStaff.customCommissionRate !== undefined) {
      // Use custom rate on marketing staff
      commissionRate = marketingStaff.customCommissionRate;
      companyCutRate = marketingStaff.companyCutRate;
      rateSource = "staff_custom";
    } else {
      return NextResponse.json(
        {
          error: "No commission rate configured for marketing staff and no global rate available",
        },
        { status: 400 }
      );
    }

    console.log(`📊 Admin commission rate selection: ${(commissionRate * 100).toFixed(1)}% (source: ${rateSource}, contractLookupId: ${contractLookupId}, contractFound: ${!!paymentContract})`);

    const isSppgTransaction = payment.isSppgDiscount === true;

    // For SPPG transactions, use ORIGINAL amount (before discount) for commission calculation
    const actualContractValue = isSppgTransaction && payment.originalAmount
      ? payment.originalAmount
      : contractValue;

    // Calculate commission amounts
    let commissionAmount: number;
    let companyCutAmount: number | undefined;

    if (isSppgTransaction && companyCutRate !== undefined) {
      // SPPG transaction: split commission between company and marketing staff
      const marketingCommissionRate = commissionRate - companyCutRate;
      commissionAmount = Math.round(actualContractValue * marketingCommissionRate);
      companyCutAmount = Math.round(actualContractValue * companyCutRate);
    } else {
      // Regular transaction: marketing staff gets full commission
      commissionAmount = Math.round(actualContractValue * commissionRate);
    }

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

      contractValue: actualContractValue,
      commissionRate,
      commissionAmount,

      // SPPG-specific fields
      ...(isSppgTransaction && {
        companyCutRate,
        companyCutAmount,
        isSppgTransaction: true,
      }),

      paymentType: payment.paymentType,
      earnedAt:
        payment.transactionStatus === "settlement"
          ? payment.settlementTime || payment.transactionTime || new Date()
          : payment.adminReviewDate || new Date(),
      calculatedAt: new Date(),

      contractId: payment.contractId,
      productName: payment.productName || "Unknown Product",
      ...(payment.paymentType === "cicilan-installment" && {
        installmentDetails: {
          installmentAmount: payment.installmentAmount!,
          totalInstallments: payment.totalInstallments!,
          installmentNumber: payment.installmentNumber!,
        },
      }),
    });

    await commissionRecord.save();

    return NextResponse.json({
      success: true,
      message: "Commission recorded successfully",
      commission: commissionRecord,
    });
  } catch (error) {
    console.error("Error creating commission record:", error);
    return NextResponse.json(
      {
        error: "Failed to create commission record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
