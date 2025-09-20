import { midtransService } from "@/lib/midtrans";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { amount, customerDetails, orderId, itemDetails, registrationData } =
      body;

    // Debug: Log received data
    console.log("🔍 Payment API received:", { amount, customerDetails, orderId, itemDetails });
    console.log("🔍 Registration data received:", registrationData);

    // Validate required fields
    if (!amount || !customerDetails || !orderId) {
      return NextResponse.json(
        {
          error: "Missing required fields: amount, customerDetails, or orderId",
        },
        { status: 400 }
      );
    }

    // Validate customer details
    if (
      !customerDetails.first_name ||
      !customerDetails.email ||
      !customerDetails.phone
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required customer details: first_name, email, or phone",
        },
        { status: 400 }
      );
    }

    const paymentData = {
      orderId,
      amount,
      customerDetails,
      itemDetails,
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
        error: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/error`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/pending`,
      },
    };

    const transaction = await midtransService.createTransaction(paymentData);

    // Store payment data in database
    await dbConnect();

    // Hash password before storing
    const hashedPassword = registrationData?.password
      ? await bcrypt.hash(registrationData.password, 12)
      : null;

    const payment = new Payment({
      orderId,
      amount,
      currency: "IDR",
      paymentType: "registration", // Set payment type for registration
      userId: new mongoose.Types.ObjectId(), // Temporary ObjectId, will be updated after user creation
      transactionStatus: "pending",
      customerData: registrationData
        ? {
            ...registrationData,
            password: hashedPassword, // Store hashed password
          }
        : null,
      midtransResponse: transaction,
      isProcessed: false,
      status: "pending", // Set default status
    });

    await payment.save();
    console.log("Payment record created:", orderId);

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Payment creation error:", error);

    return NextResponse.json(
      {
        error: "Failed to create payment transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
