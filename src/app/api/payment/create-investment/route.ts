import { midtransService } from '@/lib/midtrans';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Investor from '@/models/Investor';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { plan, user } = await req.json();

    if (!plan || !user || !user.email) {
      return NextResponse.json({ error: 'Missing plan or user data' }, { status: 400 });
    }

    const dbUser = await User.findOne({ email: user.email });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const orderId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const transaction = await midtransService.createTransaction({
      orderId,
      amount: plan.price,
      customerDetails: {
        first_name: dbUser.fullName,
        email: dbUser.email,
        phone: dbUser.phoneNumber,
      },
      itemDetails: [
        {
          id: plan.name,
          price: plan.price,
          quantity: 1,
          name: plan.name,
        },
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL}?status=success&orderId=${orderId}`,
        error: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/error`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/pending`,
      },
    });

    const payment = new Payment({
      orderId,
      amount: plan.price,
      currency: 'IDR',
      transactionStatus: 'pending',
      customerData: {
        fullName: dbUser.fullName,
        email: dbUser.email,
        phoneNumber: dbUser.phoneNumber,
        dateOfBirth: dbUser.dateOfBirth,
        address: dbUser.address,
        village: dbUser.village,
        city: dbUser.city,
        province: dbUser.province,
        postalCode: dbUser.postalCode,
        occupation: dbUser.occupation,
        password: '', // Not needed for investment payments
        ktpImageUrl: '',
        faceImageUrl: '',
      },
      midtransResponse: transaction,
      isProcessed: false,
    });

    await payment.save();
    console.log('Investment payment record created:', orderId);

    // Add investment record for full payment (will be marked as completed when payment webhook confirms)
    const investmentRecord = {
      investmentId: orderId,
      productName: plan.name,
      plantInstanceId: null, // Will be assigned when plant is allocated
      totalAmount: plan.price,
      amountPaid: 0, // Will be updated when payment webhook confirms
      paymentType: 'full' as const,
      status: 'pending' as const, // Will be updated to completed when payment succeeds
      installments: undefined,
      fullPaymentProofUrl: null, // Midtrans handles the payment proof
      investmentDate: new Date()
    };

    // Use upsert to handle existing investors - don't update email to avoid unique constraint issues
    await Investor.findOneAndUpdate(
      { userId: dbUser._id },
      {
        $set: {
          name: dbUser.fullName,
          phoneNumber: dbUser.phoneNumber,
          status: 'active'
        },
        $setOnInsert: {
          email: dbUser.email, // Only set email when creating new document
          totalPaid: 0,
          jumlahPohon: 0
        },
        $push: { investments: investmentRecord },
        $inc: { totalInvestasi: plan.price }
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error creating investment payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
