import { occupationOptions } from '@/constant/OCCUPATION';
import { midtransService } from '@/lib/midtrans';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Midtrans webhook received:', body);

    // Handle test notifications from Midtrans Dashboard
    if (body.order_id && body.order_id.includes('payment_notif_test')) {
      console.log('🧪 Test notification received from Midtrans Dashboard');
      return NextResponse.json({
        success: true,
        message: 'Test notification received successfully',
      });
    }

    // Verify the notification
    const _verifiedNotification = await midtransService.verifyNotification(body);

    // Use original notification body for field extraction (verified notification might have different structure)
    const orderId = body.order_id;
    const transactionId = body.transaction_id;
    const transactionStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;
    const paymentType = body.payment_type;
    const _grossAmount = body.gross_amount;

    console.log(`🔍 RAW BODY order_id: "${body.order_id}"`);
    console.log(`🔍 RAW BODY transaction_id: "${body.transaction_id}"`);
    console.log(`🔍 EXTRACTED orderId: "${orderId}"`);
    console.log(`🔍 EXTRACTED transactionId: "${transactionId}"`);
    console.log(`Transaction ${orderId} status: ${transactionStatus}, fraud: ${fraudStatus}`);
    console.log(`🔍 Looking for payment with orderId: "${orderId}"`);
    console.log(`🔍 Transaction ID: "${transactionId}"`);

    await dbConnect();

    // Find the payment record
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      console.error(`Payment record not found for order: "${orderId}"`);
      console.log(`🔍 Available payments in DB:`, await Payment.find({}).select('orderId').lean());
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Update payment status
    payment.transactionId = transactionId;
    payment.transactionStatus = transactionStatus;
    payment.fraudStatus = fraudStatus;
    payment.paymentType = paymentType;
    payment.transactionTime = new Date(body.transaction_time);
    payment.midtransResponse = body;

    let message = '';
    let shouldCreateUser = false;

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        message = 'Transaction is challenged by FDS';
        payment.processingError = 'Transaction challenged by fraud detection';
      } else if (fraudStatus === 'accept') {
        message = 'Transaction successful';
        shouldCreateUser = true;
        payment.settlementTime = new Date();
      }
    } else if (transactionStatus === 'settlement') {
      message = 'Transaction successful';
      shouldCreateUser = true;
      payment.settlementTime = new Date();
    } else if (transactionStatus === 'cancel' ||
               transactionStatus === 'deny' ||
               transactionStatus === 'expire') {
      message = 'Transaction failed';
      payment.processingError = `Transaction ${transactionStatus}`;
    } else if (transactionStatus === 'pending') {
      message = 'Transaction pending';
    }

    // Create user account if payment is successful and not already processed
    // Only for registration payments (REG-*), not investment payments (INV-*)
    if (shouldCreateUser && !payment.isProcessed && payment.customerData && orderId.startsWith('REG-')) {
      try {
        console.log('Creating user account for:', payment.customerData.email);
        console.log('🔍 Customer data received:', {
          email: payment.customerData.email,
          hasPassword: !!payment.customerData.password,
          passwordLength: payment.customerData.password?.length || 0,
          fullName: payment.customerData.fullName,
          phoneNumber: payment.customerData.phoneNumber
        });

        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [
            { email: payment.customerData.email },
            { phoneNumber: payment.customerData.phoneNumber }
          ]
        });

        if (existingUser) {
          console.log('User already exists, skipping creation');
          payment.processingError = 'User already exists';
        } else {
          // Password is already hashed from payment creation
          const hashedPassword = payment.customerData.password;

          // Get occupation code
          const occupationData = occupationOptions.find(opt => opt.value === payment.customerData.occupation);
          const occupationCode = occupationData?.code || '999';

          // Generate user code
          const currentYear = new Date().getFullYear().toString().slice(-2);
          const lastUserCode = await User.findOne({
            occupationCode: occupationCode,
            userCode: { $regex: `^IH-${occupationCode}-${currentYear}-` }
          })
          .sort({ userCode: -1 })
          .select('userCode');

          let sequential = 1;
          if (lastUserCode && lastUserCode.userCode) {
            const lastSequential = parseInt(lastUserCode.userCode.split('-')[3]);
            sequential = lastSequential + 1;
          }

          const userCode = `IH-${occupationCode}-${currentYear}-${sequential.toString().padStart(3, '0')}`;

          // Create user
          const user = new User({
            email: payment.customerData.email,
            password: hashedPassword,
            fullName: payment.customerData.fullName,
            phoneNumber: payment.customerData.phoneNumber,
            dateOfBirth: payment.customerData.dateOfBirth,
            address: payment.customerData.address,
            village: payment.customerData.village,
            city: payment.customerData.city,
            province: payment.customerData.province,
            postalCode: payment.customerData.postalCode,
            occupation: payment.customerData.occupation,
            occupationCode: occupationCode,
            userCode: userCode,
            ktpImageUrl: payment.customerData.ktpImageUrl,
            faceImageUrl: payment.customerData.faceImageUrl,
            role: 'user',
            isEmailVerified: false,
            isPhoneVerified: false,
            isActive: true,
          });

          await user.save();

          payment.userId = user._id;
          payment.isProcessed = true;
          message = `Transaction successful - User account created: ${userCode}`;

          console.log('User created successfully:', {
            id: user._id,
            email: user.email,
            userCode: user.userCode,
            orderId: orderId
          });
        }
      } catch (userCreationError) {
        console.error('Error creating user:', userCreationError);
        payment.processingError = `User creation failed: ${userCreationError instanceof Error ? userCreationError.message : 'Unknown error'}`;
        message = 'Transaction successful but user creation failed';
      }
    } else if (shouldCreateUser && orderId.startsWith('INV-')) {
      // Investment payments don't need user creation
      console.log('Investment payment - no user creation needed for:', payment.customerData?.email);
      payment.isProcessed = true;
      message = 'Investment payment successful';
    }

    await payment.save();
    console.log(`Processed transaction ${orderId}: ${message}`);

    return NextResponse.json({
      success: true,
      message,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}