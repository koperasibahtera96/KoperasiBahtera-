import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { sendWhatsAppMessage, whatsappTemplate } from "@/lib/whatsapp";
import Payment from "@/models/Payment";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.role ||
      !["admin", "staff"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId, userInfo } = await req.json();

    if (!paymentId || !userInfo) {
      return NextResponse.json(
        { error: "Payment ID and user info are required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json(
        { error: "Invalid payment ID format" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get payment details
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (!userInfo.phoneNumber) {
      return NextResponse.json(
        { error: "User phone number not found" },
        { status: 400 }
      );
    }

    // Generate WhatsApp message
    const investorName = userInfo.fullName || "Investor";
    const productName = payment.productName || "Investasi Hijau";
    const dueDate = payment.dueDate.toLocaleDateString("id-ID");
    const amount = payment.installmentAmount || payment.amount;

    const message = whatsappTemplate(investorName, productName, dueDate, amount);

    // Send WhatsApp message
    const result = await sendWhatsAppMessage(userInfo.phoneNumber, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "WhatsApp reminder sent successfully",
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send WhatsApp message" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending WhatsApp reminder:", error);
    return NextResponse.json(
      {
        error: "Failed to send WhatsApp reminder",
        details: (error as any).message,
      },
      { status: 500 }
    );
  }
}
