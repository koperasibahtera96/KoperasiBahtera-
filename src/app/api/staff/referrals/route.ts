import dbConnect from "@/lib/mongodb";
import CommissionHistory from "@/models/CommissionHistory";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the current user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has marketing role (marketing or marketing_head)
    if (!["marketing", "marketing_head"].includes(user.role)) {
      return NextResponse.json(
        {
          error: "Access denied. Marketing or Marketing Head role required.",
        },
        { status: 403 }
      );
    }

    // Get user's referral code
    if (!user.referralCode) {
      return NextResponse.json({
        success: true,
        data: {
          referralCode: null,
          message: "No referral code assigned. Contact admin.",
          referrals: [],
          totalCommission: 0,
          totalReferrals: 0,
          totalPages: 0,
          currentPage: 1,
        },
      });
    }

    // Get pagination, search, and sort params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "earnedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build filter for commission records
    const filter: any = { marketingStaffId: user._id };

    // If search query exists, we need to find matching customers first
    let customerIds: any[] = [];
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      const matchingCustomers = await User.find({
        $or: [
          { fullName: searchRegex },
          { email: searchRegex },
          { phoneNumber: searchRegex },
        ],
      }).select("_id");

      customerIds = matchingCustomers.map((c) => c._id);

      // Add customer filter to commission query
      if (customerIds.length > 0) {
        filter.customerId = { $in: customerIds };
      } else {
        // No matching customers, return empty result
        return NextResponse.json({
          success: true,
          data: {
            referralCode: user.referralCode,
            staffName: user.fullName,
            staffEmail: user.email,
            referrals: [],
            totalCommission: 0,
            totalReferrals: 0,
            summary: {
              fullPayments: 0,
              fullPaymentsCommission: 0,
              cicilanPayments: 0,
              cicilanPaymentsCommission: 0,
            },
            totalPages: 0,
            currentPage: page,
          },
        });
      }
    }

    // Get total count for pagination
    const totalCount = await CommissionHistory.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Build sort object
    const sortObj: any = {};
    if (sortBy === "customerName") {
      // Will need to sort after populating
      sortObj.customerName = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "amount") {
      sortObj.contractValue = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "commission") {
      sortObj.commissionAmount = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "status") {
      // Will need to sort after populating
      sortObj.status = sortOrder === "asc" ? 1 : -1;
    } else {
      // Default sort by earnedAt
      sortObj.earnedAt = sortOrder === "asc" ? 1 : -1;
    }

    // Find commission records for this staff member with pagination
    const commissionRecords = await CommissionHistory.find(filter)
      .populate("paymentId", "orderId transactionStatus adminStatus settlementTime adminReviewDate createdAt")
      .populate("customerId", "fullName email phoneNumber")
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    // Calculate total commission from ALL records (not just current page)
    const allCommissionRecords = await CommissionHistory.find({
      marketingStaffId: user._id,
    });
    const totalCommission = allCommissionRecords.reduce(
      (sum, record) => sum + record.commissionAmount,
      0
    );

    // Map commission records to referral format
    const referrals = commissionRecords.map((record) => {
      const payment = record.paymentId as any;
      const customer = record.customerId as any;

      return {
        commissionId: record._id,
        paymentId: payment?._id,
        orderId: payment?.orderId || record.contractId || "N/A",
        customerName: customer?.fullName || record.customerName,
        customerEmail: customer?.email || record.customerEmail,
        customerPhone: customer?.phoneNumber || "Unknown",
        productName: record.productName,
        paymentType: record.paymentType,
        contractValue: record.contractValue,
        amount: record.contractValue, // For compatibility with frontend
        commission: record.commissionAmount,
        commissionRate: record.commissionRate,
        isCommissionEligible: true, // All records in CommissionHistory are eligible
        installmentNumber: record.installmentDetails?.installmentNumber || null,
        totalInstallments: record.installmentDetails?.totalInstallments || null,
        installmentAmount: record.installmentDetails?.installmentAmount || null,
        status: payment?.transactionStatus || payment?.adminStatus || "approved",
        paymentDate: record.earnedAt,
        earnedAt: record.earnedAt,
        calculatedAt: record.calculatedAt,
        createdAt: record.createdAt,
      };
    });

    // Calculate summary statistics from ALL records
    const allFullPayments = allCommissionRecords.filter(
      (r) => r.paymentType === "full-investment"
    );
    const allCicilanPayments = allCommissionRecords.filter(
      (r) => r.paymentType === "cicilan-installment"
    );

    return NextResponse.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        staffName: user.fullName,
        staffEmail: user.email,
        referrals,
        totalCommission,
        totalReferrals: totalCount,
        summary: {
          fullPayments: allFullPayments.length,
          fullPaymentsCommission: allFullPayments.reduce(
            (sum, r) => sum + r.commissionAmount,
            0
          ),
          cicilanPayments: allCicilanPayments.length,
          cicilanPaymentsCommission: allCicilanPayments.reduce(
            (sum, r) => sum + r.commissionAmount,
            0
          ),
        },
        totalPages,
        currentPage: page,
      },
    });
  } catch (error) {
    console.error("Error fetching referral data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch referral data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
