import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  processFullPayment,
  processInstallmentPayment,
} from "@/lib/payment-processor";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== "finance" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { paymentId, action, adminNotes } = await req.json();

    if (!paymentId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // Start a MongoDB transaction
    const mongoSession = await mongoose.startSession();

    try {
      await mongoSession.withTransaction(async () => {
        // Find the payment record
        const payment = await Payment.findById(paymentId).session(mongoSession);
        if (!payment) {
          throw new Error("Payment not found");
        }

        // Verify this is a manual-bca payment
        if (payment.paymentMethod !== "manual-bca") {
          throw new Error(
            "This payment is not a manual BCA payment and cannot be approved here"
          );
        }

        // Verify payment has proof uploaded
        if (action === "approve" && !payment.proofImageUrl) {
          throw new Error(
            "Cannot approve payment without payment proof uploaded"
          );
        }

        // Update payment with admin review
        payment.adminStatus = action === "approve" ? "approved" : "rejected";
        payment.status = action === "approve" ? "completed" : "rejected";
        payment.adminNotes = adminNotes || "";
        payment.adminReviewBy = session.user.id;
        payment.adminReviewDate = new Date();

        if (action === "approve") {
          // Set settlement time for approved payments
          payment.settlementTime = new Date();
          payment.transactionStatus = "settlement";

          // Process payment using shared logic (EXACTLY same as webhook)
          if (payment.paymentType === "full-investment") {
            // Process full payment
            console.log(
              `Processing full payment approval for ${payment.orderId}`
            );
            await processFullPayment(payment, mongoSession);
          } else if (payment.paymentType === "cicilan-installment") {
            // Process installment payment
            console.log(
              `Processing installment payment approval for ${payment.orderId}`
            );
            await processInstallmentPayment(payment, mongoSession);
          } else {
            throw new Error(`Unsupported payment type: ${payment.paymentType}`);
          }
        } else {
          // For rejected payments, just save the payment record
          await payment.save({ session: mongoSession });
        }
      });

      await mongoSession.endSession();

      return NextResponse.json({
        success: true,
        message:
          action === "approve"
            ? "Payment approved and processed successfully"
            : "Payment rejected",
      });
    } catch (transactionError) {
      await mongoSession.endSession();
      throw transactionError;
    }
  } catch (error) {
    console.error("Error processing payment approval:", error);
    return NextResponse.json(
      {
        error: "Failed to process payment approval",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
