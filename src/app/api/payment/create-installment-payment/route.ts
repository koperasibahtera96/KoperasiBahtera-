import { midtransService } from "@/lib/midtrans";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
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

    // Verify the payment belongs to the current user
    const user = await User.findOne({ email: session.user.email });
    if (!user || payment.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: "Unauthorized access to payment" },
        { status: 403 }
      );
    }

    // Verify it's a cicilan installment payment
    if (payment.paymentType !== "cicilan-installment") {
      return NextResponse.json(
        { error: "Invalid payment type. Must be cicilan-installment" },
        { status: 400 }
      );
    }

    // Check if payment is still pending
    if (payment.status !== "pending") {
      return NextResponse.json(
        { error: "Payment is no longer pending" },
        { status: 400 }
      );
    }

    // Use the existing payment's orderId (already has correct invoice format)
    const orderId = payment.orderId;

    // Create Midtrans transaction
    const transaction = await midtransService.createTransaction({
      orderId,
      amount: payment.amount,
      customerDetails: {
        first_name: user.fullName || user.firstName || "User",
        last_name: user.lastName || "",
        email: user.email,
        phone: user.phoneNumber || "",
      },
      itemDetails: [
        {
          id: `${payment.productId}-installment-${payment.installmentNumber}`,
          price: payment.amount,
          quantity: 1,
          name: `Cicilan ${payment.installmentNumber}/${payment.totalInstallments} - ${payment.productName}`,
        },
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?paymentSuccess=${orderId}`,
        error: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?paymentError=${orderId}`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?paymentPending=${orderId}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentUrl: transaction.redirect_url,
        orderId: orderId,
        amount: payment.amount,
        installmentNumber: payment.installmentNumber,
        totalInstallments: payment.totalInstallments,
      },
    });
  } catch (error) {
    console.error("Error creating installment payment:", error);

    let errorMessage = "Failed to create installment payment";
    if (error instanceof Error) {
      if (error.message.includes("Midtrans")) {
        errorMessage = "Payment gateway error. Please try again.";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}