import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { paymentId, paymentMethod } = await req.json();

    if (!paymentId || !paymentMethod) {
      return NextResponse.json(
        { error: "Payment ID and payment method are required" },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!["midtrans", "manual-bca"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method. Must be 'midtrans' or 'manual-bca'" },
        { status: 400 }
      );
    }

    // Find the payment record
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify the payment belongs to the user
    if (payment.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to update this payment" },
        { status: 403 }
      );
    }

    // If payment method is already set and different, reject
    if (payment.paymentMethod && payment.paymentMethod !== paymentMethod) {
      return NextResponse.json(
        { error: "Payment method is already set and cannot be changed" },
        { status: 400 }
      );
    }

    // Set payment method
    payment.paymentMethod = paymentMethod;
    await payment.save();

    return NextResponse.json({
      success: true,
      message: "Payment method set successfully",
      payment: {
        _id: payment._id,
        orderId: payment.orderId,
        paymentMethod: payment.paymentMethod,
      },
    });
  } catch (error) {
    console.error("Error setting payment method:", error);
    return NextResponse.json(
      {
        error: "Failed to set payment method",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
