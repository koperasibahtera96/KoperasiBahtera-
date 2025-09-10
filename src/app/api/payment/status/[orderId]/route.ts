import { midtransService } from "@/lib/midtrans";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get both Midtrans status and database payment record
    const [midtransStatus, payment] = await Promise.all([
      midtransService.getTransactionStatus(orderId),
      (async () => {
        try {
          await dbConnect();
          return await Payment.findOne({ orderId });
        } catch (dbError) {
          console.warn("Failed to get payment from database:", dbError);
          return null;
        }
      })(),
    ]);

    // Combine both sources of data
    const responseData = {
      ...midtransStatus,
      // Add database-specific fields if payment record exists
      ...(payment && {
        contractRedirectUrl: payment.contractRedirectUrl,
        paymentType: payment.paymentType,
        isProcessed: payment.isProcessed,
        processingError: payment.processingError,
      }),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Payment status error:", error);

    return NextResponse.json(
      {
        error: "Failed to get payment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
