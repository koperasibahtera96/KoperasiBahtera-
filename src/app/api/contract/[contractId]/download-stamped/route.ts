import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Contract from "@/models/Contract";
import { CONFIG } from "@/lib/ematerai-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const contractId = (await params).contractId;

    if (!contractId) {
      return NextResponse.json(
        { success: false, error: "Contract ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find contract
    const contract = await Contract.findOne({ contractId }).populate("userId");

    if (!contract) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      );
    }

    // Verify this contract belongs to the current user
    const user = contract.userId;
    if (!user || user.email !== session.user.email) {
      return NextResponse.json(
        { success: false, error: "Not authorized to access this contract" },
        { status: 403 }
      );
    }

    // Check if contract has been stamped
    if (!contract.emateraiStamped || !contract.emateraiStampedUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Contract has not been stamped with e-materai yet",
        },
        { status: 400 }
      );
    }

    console.log(
      `[Download Stamped] Fetching stamped contract for: ${contractId} from ${contract.emateraiStampedUrl}`
    );

    // Fetch the stamped document from MeteraIku with API key
  
    const apiKey = CONFIG.apiKey;

    if (!apiKey) {
      console.error(
        "[Download Stamped] No MeteraIku API key found. Please set STAMPED_API_KEY environment variable."
      );
      return NextResponse.json(
        {
          success: false,
          error: "MeteraIku API key not found",
        },
        { status: 500 }
      );
    }

    const emateraiResponse = await fetch(contract.emateraiStampedUrl, {
      headers: {
        "X-API-KEY": apiKey,
      },
    });

    if (!emateraiResponse.ok) {
      console.error(
        `[Download Stamped] Failed to fetch from MeteraIku: ${emateraiResponse.status} ${emateraiResponse.statusText}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch stamped document from e-materai service",
        },
        { status: 500 }
      );
    }

    // Get the PDF as buffer
    const pdfBuffer = await emateraiResponse.arrayBuffer();

    // Return the PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contract-${contractId}-stamped.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("[Download Stamped] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to download stamped contract",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
