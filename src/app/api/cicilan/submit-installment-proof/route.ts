import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import User from '@/models/User';
import { validateReferralCode } from '@/lib/referral';
import { getServerSession } from 'next-auth/next';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId, proofImageUrl, proofDescription, referralCode } = await req.json();

    if (!paymentId || !proofImageUrl) {
      return NextResponse.json({ 
        error: 'Missing required fields: paymentId, proofImageUrl' 
      }, { status: 400 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find payment record and verify ownership
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Verify that this payment belongs to the user
    if (payment.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify it's a cicilan installment payment
    if (payment.paymentType !== 'cicilan-installment') {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    if (payment.status === 'approved') {
      return NextResponse.json({ 
        error: 'This installment has already been approved' 
      }, { status: 400 });
    }

    if (payment.proofImageUrl && payment.adminStatus === 'pending') {
      return NextResponse.json({ 
        error: 'There is already a pending submission for this installment' 
      }, { status: 400 });
    }

    // Update payment with proof and referral code
    payment.proofImageUrl = proofImageUrl;
    payment.proofDescription = proofDescription || '';
    payment.adminStatus = 'pending';

    // Validate and save referral code if provided
    if (referralCode) {
      console.log('Validating referral code:', referralCode);

      if (!validateReferralCode(referralCode)) {
        console.log('Referral code format validation failed');
        return NextResponse.json({
          error: 'Format kode referral tidak valid'
        }, { status: 400 });
      }

      // Verify the referral code exists (belongs to a marketing staff)
      const marketingUser = await User.findOne({
        referralCode: referralCode,
        role: 'marketing'
      });

      console.log('Marketing user found:', marketingUser ? 'Yes' : 'No');

      if (!marketingUser) {
        return NextResponse.json({
          error: 'Kode referral tidak valid atau tidak ditemukan'
        }, { status: 400 });
      }

      payment.referralCode = referralCode;
    }

    await payment.save();

    return NextResponse.json({
      success: true,
      message: 'Payment proof submitted successfully',
      payment: {
        _id: payment._id,
        cicilanOrderId: payment.cicilanOrderId,
        installmentNumber: payment.installmentNumber,
        proofImageUrl: payment.proofImageUrl,
        status: payment.status,
        adminStatus: payment.adminStatus,
      }
    });

  } catch (error) {
    console.error('Error submitting installment proof:', error);
    return NextResponse.json({ error: 'Failed to submit payment proof' }, { status: 500 });
  }
}