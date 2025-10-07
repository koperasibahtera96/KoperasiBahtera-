import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Get registration fee (public)
export async function GET() {
  try {
    await dbConnect();

    const settings = await Settings.findOne({ type: "system" });

    // Default to 1 if not set
    const registrationFee = settings?.config?.registrationFee || 1;

    return NextResponse.json({
      success: true,
      data: { registrationFee },
    });
  } catch (error: any) {
    console.error("Error fetching registration fee:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch registration fee" },
      { status: 500 }
    );
  }
}

// PUT - Update registration fee (admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await req.json();
    const { registrationFee } = body;

    if (typeof registrationFee !== "number" || registrationFee < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid registration fee. Must be a positive number.",
        },
        { status: 400 }
      );
    }

    // Update or create system settings
    const settings = await Settings.findOneAndUpdate(
      { type: "system" },
      {
        $set: {
          "config.registrationFee": registrationFee,
          updatedBy: session.user.id,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      data: { registrationFee: settings.config.registrationFee },
      message: "Registration fee updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating registration fee:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update registration fee" },
      { status: 500 }
    );
  }
}
