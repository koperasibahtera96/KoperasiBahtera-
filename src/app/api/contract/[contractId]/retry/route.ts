import { authOptions } from '@/lib/auth';
import { ensureConnection } from '@/lib/utils/database';
import Contract from '@/models/Contract';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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
    const body = await request.json();
    const { signatureData } = body;

    if (!signatureData) {
      return NextResponse.json(
        { error: 'Signature data is required' },
        { status: 400 }
      );
    }

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

    // Check if contract is rejected and can retry
    if (contract.adminApprovalStatus !== 'rejected') {
      return NextResponse.json(
        { error: 'Contract is not in rejected status' },
        { status: 400 }
      );
    }

    // Check retry attempts limit
    const currentAttempt = contract.currentAttempt || 0;
    const maxAttempts = contract.maxAttempts || 3;

    if (currentAttempt >= maxAttempts) {
      return NextResponse.json(
        { error: 'Maximum retry attempts reached' },
        { status: 400 }
      );
    }

    // Add new signature attempt
    const newAttempt = {
      attemptNumber: currentAttempt + 1,
      submittedAt: new Date(),
      signatureData,
      reviewStatus: 'pending'
    };

    // Update contract with new attempt and reset to pending status
    const updatedContract = await Contract.findOneAndUpdate(
      { contractId },
      {
        $push: { signatureAttempts: newAttempt },
        $inc: { currentAttempt: 1 },
        $set: {
          adminApprovalStatus: 'pending',
          status: 'signed'
        }
      },
      { new: true }
    );

    if (!updatedContract) {
      return NextResponse.json(
        { error: 'Failed to update contract' },
        { status: 500 }
      );
    }

    console.log(`Contract ${contractId} retry attempt ${currentAttempt + 1} submitted by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Contract retry submitted successfully',
      attemptNumber: currentAttempt + 1,
      status: 'pending'
    });

  } catch (error) {
    console.error('Error submitting contract retry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}