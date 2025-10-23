import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";
import CommissionHistory from "@/models/CommissionHistory";
import { generateReferralCode, validateReferralCode } from "@/lib/referral";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

// GET - Fetch all marketing staff
export async function GET(_req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has marketing_head or admin role
    const user = await User.findOne({ email: session.user.email });
    if (
      !user ||
      (user.role !== "marketing_head" &&
        user.role !== "admin" &&
        user.role !== "finance" &&
        user.role !== "staff_finance")
    ) {
      return NextResponse.json(
        {
          error: "Access denied. Marketing Head or Admin role required.",
        },
        { status: 403 }
      );
    }

    // Get all marketing staff and marketing_head with their commission summary
    const marketingStaff = await User.find({
      role: { $in: ["marketing", "marketing_head"] },
    }).select("_id fullName email phoneNumber referralCode isActive createdAt");

    // Get commission summary for each staff
    const staffWithCommissions = await Promise.all(
      marketingStaff.map(async (staff) => {
        const commissionSummary = await CommissionHistory.aggregate([
          { $match: { marketingStaffId: staff._id } },
          {
            $group: {
              _id: null,
              totalCommission: { $sum: "$commissionAmount" },
              totalReferrals: { $sum: 1 },
              fullInvestments: {
                $sum: {
                  $cond: [{ $eq: ["$paymentType", "full-investment"] }, 1, 0],
                },
              },
              cicilanInvestments: {
                $sum: {
                  $cond: [
                    { $eq: ["$paymentType", "cicilan-installment"] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]);

        const summary = commissionSummary[0] || {
          totalCommission: 0,
          totalReferrals: 0,
          fullInvestments: 0,
          cicilanInvestments: 0,
        };

        return {
          ...staff.toObject(),
          commissionSummary: summary,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: staffWithCommissions,
    });
  } catch (error) {
    console.error("Error fetching marketing staff:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch marketing staff",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - Update marketing staff referral code
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has marketing_head or admin role
    const user = await User.findOne({ email: session.user.email });
    if (!user || (user.role !== "marketing_head" && user.role !== "admin")) {
      return NextResponse.json(
        {
          error: "Access denied. Marketing Head or Admin role required.",
        },
        { status: 403 }
      );
    }

    const { staffId, newReferralCode, transferCommissions } = await req.json();

    if (!staffId || !newReferralCode) {
      return NextResponse.json(
        {
          error: "Staff ID and new referral code are required",
        },
        { status: 400 }
      );
    }

    // Validate new referral code format
    if (!validateReferralCode(newReferralCode)) {
      return NextResponse.json(
        {
          error:
            "Invalid referral code format. Must be 6 alphanumeric characters.",
        },
        { status: 400 }
      );
    }

    // Check if new referral code already exists
    const existingUser = await User.findOne({
      referralCode: newReferralCode,
      _id: { $ne: staffId },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Referral code already in use by another user",
        },
        { status: 400 }
      );
    }

    // Find the marketing staff
    const marketingStaff = await User.findById(staffId);
    if (!marketingStaff || marketingStaff.role !== "marketing") {
      return NextResponse.json(
        {
          error: "Marketing staff not found",
        },
        { status: 404 }
      );
    }

    const oldReferralCode = marketingStaff.referralCode;

    // Start transaction for safe referral code update
    const mongoSession = await mongoose.startSession();

    try {
      await mongoSession.withTransaction(async () => {
        // Update user's referral code
        await User.findByIdAndUpdate(
          staffId,
          { $set: { referralCode: newReferralCode } },
          { session: mongoSession }
        );

        // If transferCommissions is true, update all related payments and commission history
        if (transferCommissions && oldReferralCode) {
          // Update all payments with old referral code
          await Payment.updateMany(
            { referralCode: oldReferralCode },
            { $set: { referralCode: newReferralCode } },
            { session: mongoSession }
          );

          // Update commission history records
          await CommissionHistory.updateMany(
            { referralCodeUsed: oldReferralCode },
            { $set: { referralCodeUsed: newReferralCode } },
            { session: mongoSession }
          );
        }
      });

      await mongoSession.commitTransaction();

      // Get updated staff data
      const updatedStaff = await User.findById(staffId).select(
        "_id fullName email phoneNumber referralCode isActive"
      );

      return NextResponse.json({
        success: true,
        message: transferCommissions
          ? "Referral code updated and commissions transferred successfully"
          : "Referral code updated successfully (commissions not transferred)",
        data: updatedStaff,
      });
    } catch (transactionError) {
      await mongoSession.abortTransaction();
      throw transactionError;
    } finally {
      await mongoSession.endSession();
    }
  } catch (error) {
    console.error("Error updating referral code:", error);
    return NextResponse.json(
      {
        error: "Failed to update referral code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Generate new referral code for staff
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has marketing_head or admin role
    const user = await User.findOne({ email: session.user.email });
    if (!user || (user.role !== "marketing_head" && user.role !== "admin")) {
      return NextResponse.json(
        {
          error: "Access denied. Marketing Head or Admin role required.",
        },
        { status: 403 }
      );
    }

    const { staffId } = await req.json();

    if (!staffId) {
      return NextResponse.json(
        {
          error: "Staff ID is required",
        },
        { status: 400 }
      );
    }

    // Find the marketing staff
    const marketingStaff = await User.findById(staffId);
    if (!marketingStaff || marketingStaff.role !== "marketing") {
      return NextResponse.json(
        {
          error: "Marketing staff not found",
        },
        { status: 404 }
      );
    }

    // Generate unique referral code
    let newReferralCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      newReferralCode = generateReferralCode();
      const existing = await User.findOne({ referralCode: newReferralCode });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        {
          error: "Failed to generate unique referral code. Please try again.",
        },
        { status: 500 }
      );
    }

    // Update user with new referral code
    const updatedStaff = await User.findByIdAndUpdate(
      staffId,
      { $set: { referralCode: newReferralCode } },
      { new: true }
    ).select("_id fullName email phoneNumber referralCode isActive");

    return NextResponse.json({
      success: true,
      message: "New referral code generated successfully",
      data: updatedStaff,
    });
  } catch (error) {
    console.error("Error generating referral code:", error);
    return NextResponse.json(
      {
        error: "Failed to generate referral code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
