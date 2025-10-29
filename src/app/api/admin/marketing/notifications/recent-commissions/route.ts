import dbConnect from "@/lib/mongodb";
import CommissionHistory from "@/models/CommissionHistory";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch recent commission histories for all marketing staff
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has marketing_head, marketing_admin, or admin role
    const user = await User.findOne({ email: session.user.email });
    if (!user || (user.role !== "marketing_head" && user.role !== "marketing_admin" && user.role !== "admin")) {
      return NextResponse.json(
        {
          error: "Access denied. Marketing Head, Marketing Admin, or Admin role required.",
        },
        { status: 403 }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const hours = parseInt(url.searchParams.get("hours") || "24");

    // Calculate time threshold (default: last 24 hours)
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - hours);

    // Fetch recent commission histories for all marketing staff
    const recentCommissions = await CommissionHistory.find({
      createdAt: { $gte: timeThreshold },
    })
      .populate("marketingStaffId", "fullName email referralCode userCode")
      .populate("customerId", "fullName email")
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: {
        commissions: recentCommissions,
        count: recentCommissions.length,
        timeRange: {
          from: timeThreshold,
          to: new Date(),
          hours,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching recent commissions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch recent commissions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
