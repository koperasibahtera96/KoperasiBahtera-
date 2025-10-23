import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== "finance" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const paymentTypeFilter = searchParams.get("paymentType"); // "all", "full-investment", "cicilan-installment"
    const statusFilter = searchParams.get("status"); // "pending", "approved", "rejected"
    const searchTerm = searchParams.get("search"); // Search by user name, email, contract ID

    // Build query
    const query: any = {
      paymentMethod: "manual-bca",
      adminStatus: statusFilter || "pending",
    };

    // Filter by payment type if specified
    if (paymentTypeFilter && paymentTypeFilter !== "all") {
      query.paymentType = paymentTypeFilter;
    }

    // Search filter
    if (searchTerm) {
      // We'll need to populate user and then filter, so we'll do this after the initial query
    }

    // Fetch payments
    const payments = await Payment.find(query)
      .populate("userId", "fullName email phoneNumber userCode")
      .sort({ createdAt: -1 })
      .limit(100); // Limit to prevent performance issues

    // Apply search filter if provided
    let filteredPayments = payments;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredPayments = payments.filter((payment: any) => {
        const user = payment.userId;
        return (
          user?.fullName?.toLowerCase().includes(searchLower) ||
          user?.email?.toLowerCase().includes(searchLower) ||
          user?.userCode?.toLowerCase().includes(searchLower) ||
          payment.orderId?.toLowerCase().includes(searchLower) ||
          payment.cicilanOrderId?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Format response
    const formattedPayments = filteredPayments.map((payment: any) => ({
      _id: payment._id,
      orderId: payment.orderId,
      cicilanOrderId: payment.cicilanOrderId,
      amount: payment.amount,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod,
      adminStatus: payment.adminStatus,
      status: payment.status,
      productName: payment.productName,
      proofImageUrl: payment.proofImageUrl,
      proofDescription: payment.proofDescription,
      installmentNumber: payment.installmentNumber,
      totalInstallments: payment.totalInstallments,
      dueDate: payment.dueDate,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      user: {
        fullName: payment.userId?.fullName,
        email: payment.userId?.email,
        phoneNumber: payment.userId?.phoneNumber,
        userCode: payment.userId?.userCode,
      },
      adminReviewDate: payment.adminReviewDate,
      adminNotes: payment.adminNotes,
    }));

    return NextResponse.json({
      success: true,
      payments: formattedPayments,
      total: formattedPayments.length,
    });
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch pending payments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
