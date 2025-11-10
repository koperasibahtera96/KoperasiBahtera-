import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import Payment from "@/models/Payment";
import User from "@/models/User";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== "finance" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    // Validate if userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Helper function to calculate late payments per investment
    const calculateLatePayments = (
      cicilanGroups: any[],
      fullPaymentGroups: any[]
    ) => {
      const now = new Date();
      let lateInvestmentsCount = 0;

      // Check cicilan investments
      cicilanGroups.forEach((group: any) => {
        const hasLateInstallment = group.installments.some((inst: any) => {
          const dueDate = new Date(inst.dueDate);
          return (
            dueDate < now &&
            dueDate.toDateString() !== now.toDateString() &&
            !inst.isPaid
          );
        });
        if (hasLateInstallment) {
          lateInvestmentsCount++;
        }
      });

      // Check full payment investments
      fullPaymentGroups.forEach((group: any) => {
        if (group.installments && group.installments.length > 0) {
          const installment = group.installments[0];
          const dueDate = new Date(installment.dueDate);
          const isLate =
            dueDate < now &&
            dueDate.toDateString() !== now.toDateString() &&
            installment.status === "pending";
          if (isLate) {
            lateInvestmentsCount++;
          }
        }
      });

      return lateInvestmentsCount;
    };

    // Get user info first
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has any manual BCA payments
    const userBCAPayments = await Payment.find({
      userId: userId,
      paymentMethod: "manual-bca",
      paymentType: { $in: ["cicilan-installment", "full-investment"] },
    });

    if (userBCAPayments.length === 0) {
      // Return empty investor detail instead of error
      return NextResponse.json({
        investor: {
          userId: user._id.toString(),
          userInfo: {
            _id: user._id.toString(),
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            userCode: user.userCode,
          },
          totalInvestments: 0,
          totalAmount: 0,
          totalPaid: 0,
          latePayments: 0,
          overdueCount: 0,
          pendingReviews: 0,
          cicilanGroups: [],
        },
      });
    }

    // Get investor data (may not exist for users with only pending payments)
    const investor = await Investor.findOne({ userId });

    // Get all manual BCA payments for this user (both cicilan and full payments)
    const payments = await Payment.find({
      userId: userId,
      paymentType: { $in: ["cicilan-installment", "full-investment"] },
      paymentMethod: "manual-bca",
    });

    // Separate cicilan and full payments
    const cicilanPayments = payments.filter(
      (p) => p.paymentType === "cicilan-installment"
    );
    const fullPayments = payments.filter(
      (p) => p.paymentType === "full-investment"
    );

    // Create a map of cicilan payments by cicilanOrderId and installmentNumber for quick lookup
    const paymentsMap = new Map();
    cicilanPayments.forEach((payment) => {
      const key = `${payment.cicilanOrderId}-${payment.installmentNumber}`;
      paymentsMap.set(key, payment);
    });

    // Just show payment data grouped by cicilanOrderId - simple approach
    const cicilanOrderGroups = new Map();

    cicilanPayments.forEach((payment) => {
      const cicilanOrderId = payment.cicilanOrderId;
      if (!cicilanOrderGroups.has(cicilanOrderId)) {
        cicilanOrderGroups.set(cicilanOrderId, []);
      }
      cicilanOrderGroups.get(cicilanOrderId).push(payment);
    });

    // Create groups from actual payment data only
    const cicilanGroups = Array.from(cicilanOrderGroups.entries()).map(
      ([cicilanOrderId, payments]) => {
        const sortedPayments = payments.sort(
          (a: any, b: any) => a.installmentNumber - b.installmentNumber
        );
        const firstPayment = sortedPayments[0];

        // Convert payments to installment format
        const installments = sortedPayments.map((payment: any) => ({
          _id: payment._id.toString(),
          orderId: payment.orderId,
          installmentNumber: payment.installmentNumber,
          amount: payment.installmentAmount,
          dueDate: payment.dueDate,
          status: payment.status || (payment.transactionStatus === "settlement" ? "approved" : "pending"),
          adminStatus: payment.adminStatus || "pending",
          proofImageUrl: payment.proofImageUrl || null,
          proofDescription: payment.proofDescription || null,
          adminNotes: payment.adminNotes || null,
          adminReviewBy: payment.adminReviewBy || null,
          adminReviewDate: payment.adminReviewDate || null,
          submissionDate: payment.createdAt,
          isPaid: payment.transactionStatus === "settlement",
          paidDate:
            payment.transactionStatus === "settlement"
              ? payment.settlementTime
              : null,
          totalInstallments: payment.totalInstallments,
        }));

        return {
          cicilanOrderId: cicilanOrderId,
          productName: firstPayment.productName,
          productId: firstPayment.productId || "unknown",
          totalAmount:
            firstPayment.installmentAmount * firstPayment.totalInstallments,
          totalInstallments: firstPayment.totalInstallments,
          installmentAmount: firstPayment.installmentAmount,
          paymentTerm: firstPayment.paymentTerm,
          installments: installments,
          status: getInvestmentStatus(installments),
          createdAt: firstPayment.createdAt,
        };
      }
    );

    // Handle full payments similarly if any exist
    const fullPaymentGroups = fullPayments.map((payment: any) => {
      // Build installments array first so we can reuse the same status helper
      const installments = [
        {
          _id: payment._id.toString(),
          orderId: payment.orderId,
          installmentNumber: 1,
          amount: payment.amount,
          // prefer explicit dueDate on the payment, fall back to createdAt
          dueDate: payment.dueDate || payment.createdAt,
          status: payment.status || (payment.transactionStatus === "settlement" ? "approved" : "pending"),
          // keep adminStatus consistent with cicilan (default to pending)
          adminStatus: payment.adminStatus || "pending",
          proofImageUrl: payment.proofImageUrl || null,
          proofDescription: payment.proofDescription || null,
          adminNotes: payment.adminNotes || null,
          adminReviewBy: payment.adminReviewBy || null,
          adminReviewDate: payment.adminReviewDate || null,
          submissionDate: payment.createdAt,
          isPaid: payment.transactionStatus === "settlement",
          paidDate:
            payment.transactionStatus === "settlement"
              ? payment.settlementTime
              : null,
          totalInstallments: 1,
        },
      ];

      return {
        cicilanOrderId: payment.orderId,
        productName: payment.productName,
        productId: payment.productId || "unknown",
        totalAmount: payment.amount,
        totalInstallments: 1,
        installmentAmount: payment.amount,
        paymentTerm: "full",
        installments,
        // Use same status calculation as cicilan groups so badges are consistent
        status: getInvestmentStatus(installments),
        createdAt: payment.createdAt,
        isFullPayment: true,
      };
    });

    // Combine cicilan and full payment groups
    const allGroups = [...cicilanGroups, ...fullPaymentGroups];

    // Calculate statistics - use investor data when available for consistency
    const totalInvestments = cicilanGroups.length + fullPaymentGroups.length;
    const totalAmount =
      investor?.totalInvestasi ||
      [...cicilanGroups, ...fullPaymentGroups].reduce(
        (sum, group) => sum + group.totalAmount,
        0
      );
    const totalPaid =
      investor?.totalPaid ||
      [...cicilanPayments, ...fullPayments]
        .filter((p) => p.transactionStatus === "settlement")
        .reduce((sum, p) => sum + p.amount, 0);

    // Count late payments (per investment, not per installment)
    const latePaymentsCount = calculateLatePayments(
      cicilanGroups,
      fullPaymentGroups
    );

    // Count overdue installments (only cicilan payments can be overdue)
    const now = new Date();
    const overdueCount = cicilanGroups.reduce((count: number, group: any) => {
      return (
        count +
        group.installments.filter(
          (inst: any) =>
            new Date(inst.dueDate) < now &&
            inst.status === "pending" &&
            !inst.proofImageUrl
        ).length
      );
    }, 0);

    // Count pending reviews
    const pendingReviews = [...cicilanPayments, ...fullPayments].filter(
      (p) => p.adminStatus === "pending" && p.proofImageUrl
    ).length;

    const investorDetail = {
      userId: user._id.toString(),
      userInfo: {
        _id: user._id.toString(),
        fullName: user.fullName || (investor ? investor.name : ""),
        email: user.email || (investor ? investor.email : ""),
        phoneNumber: user.phoneNumber || (investor ? investor.phoneNumber : ""),
        userCode: user.userCode,
      },
      totalInvestments,
      totalAmount,
      totalPaid,
      latePayments: latePaymentsCount,
      overdueCount,
      pendingReviews,
      cicilanGroups: allGroups,
    };

    return NextResponse.json({ investor: investorDetail });
  } catch (error) {
    console.error("Error fetching finance investor detail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to determine investment status
function getInvestmentStatus(
  installments: any[]
): "active" | "completed" | "overdue" {
  const approvedCount = installments.filter(
    (i) => i.status === "approved"
  ).length;
  const totalCount = installments.length;

  if (approvedCount === totalCount) return "completed";

  const now = new Date();
  const hasOverdue = installments.some((i) => {
    const dueDate = new Date(i.dueDate);
    return (
      dueDate < now &&
      dueDate.toDateString() !== now.toDateString() &&
      i.status === "pending" &&
      !i.proofImageUrl
    );
  });

  return hasOverdue ? "overdue" : "active";
}
