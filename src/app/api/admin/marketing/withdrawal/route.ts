import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import CommissionWithdrawal from "@/models/CommissionWithdrawal";
import CommissionHistory from "@/models/CommissionHistory";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

// POST - Record a commission withdrawal
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has finance or admin role
    const user = await User.findOne({ email: session.user.email });
    if (
      !user ||
      (user.role !== "finance" &&
        user.role !== "staff_finance" &&
        user.role !== "admin")
    ) {
      return NextResponse.json(
        {
          error: "Access denied. Finance or Admin role required.",
        },
        { status: 403 }
      );
    }

    const { staffId, amount, notes } = await req.json();

    if (!staffId || !amount) {
      return NextResponse.json(
        {
          error: "Staff ID and amount are required",
        },
        { status: 400 }
      );
    }

    // Validate amount
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return NextResponse.json(
        {
          error: "Amount must be a positive number",
        },
        { status: 400 }
      );
    }

    // Find the marketing staff
    const marketingStaff = await User.findById(staffId);
    if (
      !marketingStaff ||
      (marketingStaff.role !== "marketing" &&
        marketingStaff.role !== "marketing_head")
    ) {
      return NextResponse.json(
        {
          error: "Marketing staff not found",
        },
        { status: 404 }
      );
    }

    if (!marketingStaff.referralCode) {
      return NextResponse.json(
        {
          error: "Marketing staff does not have a referral code",
        },
        { status: 400 }
      );
    }

    // Calculate total commission and total paid
    const commissionSummary = await CommissionHistory.aggregate([
      { $match: { marketingStaffId: marketingStaff._id } },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: "$commissionAmount" },
        },
      },
    ]);

    const totalCommission =
      commissionSummary.length > 0 ? commissionSummary[0].totalCommission : 0;

    const withdrawalSummary = await CommissionWithdrawal.aggregate([
      { $match: { marketingStaffId: marketingStaff._id } },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" },
        },
      },
    ]);

    const totalPaid =
      withdrawalSummary.length > 0 ? withdrawalSummary[0].totalPaid : 0;

    const unpaidCommission = totalCommission - totalPaid;

    // Check if withdrawal amount exceeds unpaid commission
    if (withdrawalAmount > unpaidCommission) {
      return NextResponse.json(
        {
          error: `Withdrawal amount (${withdrawalAmount.toLocaleString(
            "id-ID"
          )}) exceeds unpaid commission (${unpaidCommission.toLocaleString(
            "id-ID"
          )})`,
        },
        { status: 400 }
      );
    }

    // Create withdrawal record
    const withdrawal = await CommissionWithdrawal.create({
      marketingStaffId: marketingStaff._id,
      marketingStaffName: marketingStaff.fullName,
      referralCode: marketingStaff.referralCode,
      amount: withdrawalAmount,
      withdrawalDate: new Date(),
      processedBy: user._id,
      processedByName: user.fullName,
      notes: notes || "",
    });

    return NextResponse.json({
      success: true,
      message: "Commission withdrawal recorded successfully",
      data: {
        withdrawal,
        summary: {
          totalCommission,
          totalPaid: totalPaid + withdrawalAmount,
          unpaidCommission: unpaidCommission - withdrawalAmount,
        },
      },
    });
  } catch (error) {
    console.error("Error recording commission withdrawal:", error);
    return NextResponse.json(
      {
        error: "Failed to record commission withdrawal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET - Fetch withdrawal history for a staff member
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has appropriate role
    const user = await User.findOne({ email: session.user.email });
    if (
      !user ||
      (user.role !== "finance" &&
        user.role !== "staff_finance" &&
        user.role !== "admin" &&
        user.role !== "marketing_head" &&
        user.role !== "marketing_admin")
    ) {
      return NextResponse.json(
        {
          error: "Access denied.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");

    if (!staffId) {
      return NextResponse.json(
        {
          error: "Staff ID is required",
        },
        { status: 400 }
      );
    }

    // Fetch withdrawal history
    const withdrawals = await CommissionWithdrawal.find({
      marketingStaffId: staffId,
    })
      .sort({ withdrawalDate: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: withdrawals,
    });
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch withdrawal history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
