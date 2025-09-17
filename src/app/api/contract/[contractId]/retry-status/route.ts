import { authOptions } from '@/lib/auth';
import { ensureConnection } from '@/lib/utils/database';
import Contract from '@/models/Contract';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await ensureConnection();
    const { contractId } = await params;

    // Get user by email to find userId
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the contract
    const contract = await Contract.findOne({ contractId });

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Check if user owns this contract
    if (contract.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Unauthorized - Not your contract' },
        { status: 403 }
      );
    }

    // Get retry attempts from contract signatureAttempts array
    const signatureAttempts = contract.signatureAttempts || [];
    const currentAttempt = contract.currentAttempt || 0;
    const maxAttempts = contract.maxAttempts || 3;
    const canRetry = currentAttempt < maxAttempts && contract.adminApprovalStatus === 'rejected';

    // Get last rejection reason from the most recent attempt
    const lastRejectionReason = signatureAttempts.length > 0
      ? signatureAttempts[signatureAttempts.length - 1].rejectionReason
      : null;

    return NextResponse.json({
      success: true,
      currentAttempt,
      maxAttempts,
      canRetry,
      lastRejectionReason,
      contractStatus: contract.adminApprovalStatus,
      retryHistory: signatureAttempts.map((attempt: any) => ({
        attemptNumber: attempt.attemptNumber,
        submittedAt: attempt.submittedAt,
        reviewStatus: attempt.reviewStatus,
        rejectionReason: attempt.rejectionReason,
        adminNotes: attempt.adminNotes
      }))
    });

  } catch (error) {
    console.error('Error fetching retry status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}