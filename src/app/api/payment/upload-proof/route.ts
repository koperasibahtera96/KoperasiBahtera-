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

    const { paymentId, proofImageUrl, proofDescription, paymentMethod } = await req.json();

    if (!paymentId || !proofImageUrl) {
      return NextResponse.json(
        { error: "Payment ID and proof image URL are required" },
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

    // If payment already has a method set and it's not manual-bca, reject
    if (payment.paymentMethod && payment.paymentMethod !== "manual-bca") {
      return NextResponse.json(
        { error: "This payment is not a manual BCA payment" },
        { status: 400 }
      );
    }

    // Update payment with proof
    payment.proofImageUrl = proofImageUrl;
    payment.proofDescription = proofDescription || "";
    payment.adminStatus = "pending"; // Set to pending for finance review
    payment.status = "pending";

    // Set payment method if provided or if not already set
    if (paymentMethod && paymentMethod === "manual-bca") {
      payment.paymentMethod = "manual-bca";
    } else if (!payment.paymentMethod) {
      // Default to manual-bca if uploading proof without explicit method
      payment.paymentMethod = "manual-bca";
    }

    await payment.save();

    return NextResponse.json({
      success: true,
      message: "Payment proof uploaded successfully. Waiting for finance approval.",
      payment: {
        _id: payment._id,
        orderId: payment.orderId,
        proofImageUrl: payment.proofImageUrl,
        adminStatus: payment.adminStatus,
      },
    });
  } catch (error) {
    console.error("Error uploading payment proof:", error);
    return NextResponse.json(
      {
        error: "Failed to upload payment proof",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
