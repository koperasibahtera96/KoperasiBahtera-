import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CicilanInstallment from '@/models/CicilanInstallment';
import CicilanPayment from '@/models/CicilanPayment';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { installmentId, proofImageUrl, proofDescription } = await req.json();

    if (!installmentId || !proofImageUrl) {
      return NextResponse.json({ 
        error: 'Missing required fields: installmentId, proofImageUrl' 
      }, { status: 400 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find installment and verify ownership
    const installment = await CicilanInstallment.findById(installmentId)
      .populate('cicilanPaymentId');

    if (!installment) {
      return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    }

    // Verify that this installment belongs to the user
    if (installment.cicilanPaymentId.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (installment.status === 'approved') {
      return NextResponse.json({ 
        error: 'This installment has already been approved' 
      }, { status: 400 });
    }

    if (installment.status === 'submitted' && installment.adminStatus === 'pending') {
      return NextResponse.json({ 
        error: 'There is already a pending submission for this installment' 
      }, { status: 400 });
    }

    // Update installment with payment proof
    installment.proofImageUrl = proofImageUrl;
    installment.proofDescription = proofDescription || '';
    installment.submissionDate = new Date();
    installment.status = 'submitted';
    installment.adminStatus = 'pending';

    await installment.save();

    return NextResponse.json({
      success: true,
      message: 'Payment proof submitted successfully',
      installment: {
        _id: installment._id,
        installmentNumber: installment.installmentNumber,
        submissionDate: installment.submissionDate,
        status: installment.status,
        adminStatus: installment.adminStatus,
      }
    });

  } catch (error) {
    console.error('Error submitting installment proof:', error);
    return NextResponse.json({ error: 'Failed to submit payment proof' }, { status: 500 });
  }
}