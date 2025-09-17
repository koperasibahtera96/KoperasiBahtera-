import dbConnect from "@/lib/mongodb";
import Contract from "@/models/Contract";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contractId } = await params;
    const { signatureData, isRetry = false } = await request.json();

    if (!signatureData) {
      return NextResponse.json(
        { error: "Signature data is required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find contract
    const contract = await Contract.findOne({
      contractId,
      userId: user._id
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Validate contract state for signing
    if (contract.status === 'permanently_rejected') {
      return NextResponse.json(
        {
          error: "Contract has been permanently rejected. Maximum retry attempts exceeded.",
          canRetry: false
        },
        { status: 403 }
      );
    }

    if (contract.status === 'approved') {
      return NextResponse.json(
        {
          error: "Contract is already approved",
          canRetry: false
        },
        { status: 409 }
      );
    }

    if (contract.status === 'paid') {
      return NextResponse.json(
        {
          error: "Contract is already completed with payment",
          canRetry: false
        },
        { status: 409 }
      );
    }

    // Check retry limits
    if (contract.currentAttempt >= contract.maxAttempts) {
      // Mark as permanently rejected if not already
      if (contract.status !== 'permanently_rejected') {
        contract.status = 'permanently_rejected';
        contract.adminApprovalStatus = 'permanently_rejected';
        await contract.save();
      }

      return NextResponse.json(
        {
          error: "Maximum retry attempts exceeded. Contract permanently rejected.",
          canRetry: false,
          maxAttempts: contract.maxAttempts
        },
        { status: 403 }
      );
    }

    // Create new signature attempt
    const attemptNumber = contract.currentAttempt + 1;
    const newAttempt = {
      attemptNumber,
      signatureData,
      submittedAt: new Date(),
      reviewStatus: 'pending' as const
    };

    // Add signature attempt to contract
    contract.signatureAttempts.push(newAttempt);
    contract.currentAttempt = attemptNumber;
    contract.status = 'signed';
    contract.adminApprovalStatus = 'pending';

    await contract.save();

    console.log("Contract signed successfully:", {
      contractId: contract.contractId,
      userId: user._id,
      attemptNumber,
      isRetry
    });

    return NextResponse.json({
      success: true,
      data: {
        contractId: contract.contractId,
        contractNumber: contract.contractNumber,
        status: contract.status,
        attemptNumber,
        maxAttempts: contract.maxAttempts,
        canRetry: attemptNumber < contract.maxAttempts,
        message: isRetry
          ? `Signature retry ${attemptNumber} submitted successfully`
          : "Contract signed successfully"
      }
    });

  } catch (error) {
    console.error("Error signing contract:", error);

    return NextResponse.json(
      {
        error: "Failed to sign contract",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check signing status and retry eligibility
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contractId } = await params;

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find contract
    const contract = await Contract.findOne({
      contractId,
      userId: user._id
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Get last attempt details
    const lastAttempt = contract.signatureAttempts[contract.signatureAttempts.length - 1];

    return NextResponse.json({
      success: true,
      data: {
        contractId: contract.contractId,
        contractNumber: contract.contractNumber,
        status: contract.status,
        adminApprovalStatus: contract.adminApprovalStatus,
        currentAttempt: contract.currentAttempt,
        maxAttempts: contract.maxAttempts,
        canRetry: contract.currentAttempt < contract.maxAttempts &&
                  contract.status !== 'permanently_rejected' &&
                  contract.status !== 'approved',
        lastAttempt: lastAttempt ? {
          attemptNumber: lastAttempt.attemptNumber,
          submittedAt: lastAttempt.submittedAt,
          reviewStatus: lastAttempt.reviewStatus,
          rejectionReason: lastAttempt.rejectionReason,
          adminNotes: lastAttempt.adminNotes
        } : null
      }
    });

  } catch (error) {
    console.error("Error getting contract signing status:", error);

    return NextResponse.json(
      {
        error: "Failed to get contract status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}