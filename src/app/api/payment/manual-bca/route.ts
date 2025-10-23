import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Find all manual BCA payments for this user
    const payments = await Payment.find({
      userId: session.user.id,
      paymentMethod: "manual-bca",
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      payments: payments.map((payment) => ({
        _id: payment._id,
        orderId: payment.orderId,
        cicilanOrderId: payment.cicilanOrderId,
        amount: payment.amount,
        paymentType: payment.paymentType,
        productName: payment.productName,
        proofImageUrl: payment.proofImageUrl,
        proofDescription: payment.proofDescription,
        adminStatus: payment.adminStatus,
        status: payment.status,
        installmentNumber: payment.installmentNumber,
        totalInstallments: payment.totalInstallments,
        dueDate: payment.dueDate,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        adminReviewDate: payment.adminReviewDate,
        adminNotes: payment.adminNotes,
      })),
    });
  } catch (error) {
    console.error("Error fetching manual BCA payments:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch manual BCA payments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
