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

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { contractId } = await params;
    const { rejectionReason, adminNotes } = await request.json();

    if (!rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Find contract
    const contract = await Contract.findOne({ contractId });
    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Validate contract state
    if (contract.adminApprovalStatus !== 'pending') {
      return NextResponse.json(
        {
          error: `Contract is already ${contract.adminApprovalStatus}`,
          currentStatus: contract.adminApprovalStatus
        },
        { status: 409 }
      );
    }

    if (contract.status !== 'signed') {
      return NextResponse.json(
        {
          error: "Contract must be signed before rejection",
          currentStatus: contract.status
        },
        { status: 400 }
      );
    }

    // Check if this rejection would exceed retry limits
    // User should have maxAttempts chances total, so only permanently reject
    // if they've already used all their retry attempts
    const willExceedLimit = contract.currentAttempt >= contract.maxAttempts;

    // Update contract status based on retry limit
    if (willExceedLimit) {
      contract.adminApprovalStatus = 'permanently_rejected';
      contract.status = 'permanently_rejected';
    } else {
      contract.adminApprovalStatus = 'rejected';
      contract.status = 'rejected';
    }

    // Update the last signature attempt
    if (contract.signatureAttempts.length > 0) {
      const lastAttempt = contract.signatureAttempts[contract.signatureAttempts.length - 1];
      lastAttempt.reviewStatus = 'rejected';
      lastAttempt.reviewedBy = adminUser._id;
      lastAttempt.reviewedAt = new Date();
      lastAttempt.rejectionReason = rejectionReason;
      if (adminNotes) {
        lastAttempt.adminNotes = adminNotes;
      }
    }

    await contract.save();

    console.log("Contract rejected:", {
      contractId: contract.contractId,
      adminId: adminUser._id,
      adminEmail: adminUser.email,
      rejectionReason,
      isPermanent: willExceedLimit,
      currentAttempt: contract.currentAttempt,
      maxAttempts: contract.maxAttempts
    });

    return NextResponse.json({
      success: true,
      data: {
        contractId: contract.contractId,
        contractNumber: contract.contractNumber,
        status: contract.status,
        adminApprovalStatus: contract.adminApprovalStatus,
        rejectionReason,
        adminNotes,
        isPermanentRejection: willExceedLimit,
        canRetry: !willExceedLimit,
        currentAttempt: contract.currentAttempt,
        maxAttempts: contract.maxAttempts,
        rejectedBy: adminUser.fullName || adminUser.email,
        rejectedAt: new Date()
      }
    });

  } catch (error) {
    console.error("Error rejecting contract:", error);

    return NextResponse.json(
      {
        error: "Failed to reject contract",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}