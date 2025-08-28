import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
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

    const { orderId, proofImageUrl, proofDescription } = await req.json();

    if (!orderId || !proofImageUrl) {
      return NextResponse.json({ 
        error: 'Missing required fields: orderId, proofImageUrl' 
      }, { status: 400 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find cicilan payment
    const cicilanPayment = await CicilanPayment.findOne({ 
      orderId,
      userId: user._id 
    });

    if (!cicilanPayment) {
      return NextResponse.json({ error: 'Cicilan payment not found' }, { status: 404 });
    }

    if (cicilanPayment.status !== 'active') {
      return NextResponse.json({ 
        error: 'Cannot submit proof for inactive cicilan payment' 
      }, { status: 400 });
    }

    // Check if there's already a pending submission
    if (cicilanPayment.adminStatus === 'pending' && cicilanPayment.proofImageUrl) {
      return NextResponse.json({ 
        error: 'There is already a pending payment proof submission' 
      }, { status: 400 });
    }

    // Update with payment proof
    cicilanPayment.proofImageUrl = proofImageUrl;
    cicilanPayment.proofDescription = proofDescription || '';
    cicilanPayment.submissionDate = new Date();
    cicilanPayment.adminStatus = 'pending';

    await cicilanPayment.save();

    return NextResponse.json({
      success: true,
      message: 'Payment proof submitted successfully',
      submission: {
        orderId: cicilanPayment.orderId,
        submissionDate: cicilanPayment.submissionDate,
        adminStatus: cicilanPayment.adminStatus,
      }
    });

  } catch (error) {
    console.error('Error submitting payment proof:', error);
    return NextResponse.json({ error: 'Failed to submit payment proof' }, { status: 500 });
  }
}