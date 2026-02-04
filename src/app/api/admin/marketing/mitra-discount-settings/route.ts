import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const VALID_PAYMENT_TERMS = ["monthly", "annual"];

// GET mitra discount eligible payment terms
export async function GET() {
  try {
    await dbConnect();

    const settings = await Settings.findOne({ type: "system" });

    if (
      !settings ||
      settings.config.mitraDiscountEligiblePaymentTerms === undefined
    ) {
      // Return default if not set
      return NextResponse.json({
        success: true,
        data: {
          eligiblePaymentTerms: ["monthly", "annual"], // Default: both terms eligible
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        eligiblePaymentTerms:
          settings.config.mitraDiscountEligiblePaymentTerms,
      },
    });
  } catch (error) {
    console.error("Error fetching mitra discount settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch mitra discount settings",
      },
      { status: 500 }
    );
  }
}

// PUT update mitra discount eligible payment terms
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

    const { eligiblePaymentTerms } = await request.json();

    // Validate eligiblePaymentTerms
    if (
      eligiblePaymentTerms === undefined ||
      eligiblePaymentTerms === null ||
      !Array.isArray(eligiblePaymentTerms)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "eligiblePaymentTerms is required and must be an array",
        },
        { status: 400 }
      );
    }

    // Validate each term is valid
    const invalidTerms = eligiblePaymentTerms.filter(
      (term) => !VALID_PAYMENT_TERMS.includes(term)
    );

    if (invalidTerms.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid payment terms: ${invalidTerms.join(", ")}. Valid values are: ${VALID_PAYMENT_TERMS.join(", ")}`,
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
          "config.mitraDiscountEligiblePaymentTerms": eligiblePaymentTerms,
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
        eligiblePaymentTerms: settings.config.mitraDiscountEligiblePaymentTerms,
      },
      message: "Mitra discount settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating mitra discount settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update mitra discount settings",
      },
      { status: 500 }
    );
  }
}
