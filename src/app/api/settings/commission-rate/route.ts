import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET commission rate
export async function GET() {
  try {
    await dbConnect();

    const settings = await Settings.findOne({ type: "system" });

    if (!settings || settings.config.commissionRate === undefined) {
      // Return default if not set
      return NextResponse.json({
        success: true,
        data: {
          commissionRate: 0.02, // Default 2%
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        commissionRate: settings.config.commissionRate,
      },
    });
  } catch (error) {
    console.error("Error fetching commission rate:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch commission rate",
      },
      { status: 500 }
    );
  }
}

// PUT update commission rate
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { commissionRate } = await request.json();

    // Validate commission rate
    if (
      commissionRate === undefined ||
      commissionRate === null ||
      typeof commissionRate !== "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Commission rate is required and must be a number",
        },
        { status: 400 }
      );
    }

    if (commissionRate < 0 || commissionRate > 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Commission rate must be between 0 and 1 (0% to 100%)",
        },
        { status: 400 }
      );
    }

    await dbConnect();

    // Update or create system settings
    const settings = await Settings.findOneAndUpdate(
      { type: "system" },
      {
        $set: {
          "config.commissionRate": commissionRate,
          updatedBy: session.user.id,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        commissionRate: settings.config.commissionRate,
      },
      message: "Commission rate updated successfully",
    });
  } catch (error) {
    console.error("Error updating commission rate:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update commission rate",
      },
      { status: 500 }
    );
  }
}
