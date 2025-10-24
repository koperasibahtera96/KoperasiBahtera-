import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== "finance" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    await dbConnect();

    // Helper function to calculate late payments per investment
    const calculateLatePayments = (investor: any, userPayments: any[]) => {
      const now = new Date();
      const lateInvestments = new Set();

      // Check all payments and group by investment
      userPayments.forEach((payment: any) => {
        const dueDate = new Date(payment.dueDate);
        const isOverdue =
          dueDate < now &&
          dueDate.toDateString() !== now.toDateString() &&
          payment.transactionStatus !== "settlement";

        if (isOverdue) {
          // Use cicilanOrderId for cicilan payments, orderId for full payments
          const investmentId = payment.cicilanOrderId || payment.orderId;
          lateInvestments.add(investmentId);
        }
      });

      return lateInvestments.size;
    };

    // Get all users who have manual BCA payments (cicilan or full)
    const allPayments = await Payment.find({
      paymentType: { $in: ["cicilan-installment", "full-investment"] },
      paymentMethod: "manual-bca",
    });

    // Get unique user IDs from all payments
    const allPaymentUserIds = [
      ...new Set(allPayments.map((p) => p.userId.toString())),
    ];

    // Build query for existing investors
    const investorQuery: any = {
      investments: { $exists: true, $ne: [] },
      userId: { $ne: null, $exists: true },
    };

    // Get existing investors
    const existingInvestors = await Investor.find(investorQuery);
    const existingInvestorUserIds = existingInvestors.map((inv) =>
      inv.userId.toString()
    );

    // Combine user IDs: existing investors + users with manual BCA payments
    const allUserIds = [
      ...new Set([...existingInvestorUserIds, ...allPaymentUserIds]),
    ];

    // Apply search filter to users
    const userQuery: any = { _id: { $in: allUserIds } };
    if (search) {
      userQuery.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userCode: { $regex: search, $options: "i" } },
      ];
    }

    // Get users with pagination
    const totalCount = await User.countDocuments(userQuery);
    const users = await User.find(userQuery)
      .select("fullName email phoneNumber userCode")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const userIds = users.map((user) => user._id);

    // Get existing investors for these users
    const investors = await Investor.find({ userId: { $in: userIds } });
    const investorsMap = new Map(
      investors.map((inv) => [inv.userId.toString(), inv])
    );

    // Get manual BCA payments (cicilan and full) for these users
    const payments = await Payment.find({
      userId: { $in: userIds },
      paymentType: { $in: ["cicilan-installment", "full-investment"] },
      paymentMethod: "manual-bca",
    });

    const paymentsMap = new Map();
    payments.forEach((payment) => {
      const userId = payment.userId.toString();
      if (!paymentsMap.has(userId)) {
        paymentsMap.set(userId, []);
      }
      paymentsMap.get(userId).push(payment);
    });

    // Process investor data for all users
    const investorGroups = users.map((user) => {
      const investor = investorsMap.get(user._id.toString());
      const userPayments = paymentsMap.get(user._id.toString()) || [];

      // Count pending reviews (payments with adminStatus: pending and proofImageUrl)
      const pendingReviews = userPayments.filter(
        (p: any) => p.adminStatus === "pending" && p.proofImageUrl
      ).length;

      // Count late payments (per investment, not per installment)
      const latePaymentsCount = calculateLatePayments(investor, userPayments);

      // If user has an existing investor record
      if (investor) {
        // Count overdue installments that are not yet submitted for review
        const now = new Date();
        const overdueCount = investor.investments.reduce(
          (count: number, investment: any) => {
            return (
              count +
              (investment.installments?.filter(
                (inst: any) =>
                  new Date(inst.dueDate) < now &&
                  !inst.isPaid &&
                  !userPayments.some(
                    (p: any) =>
                      p.cicilanOrderId === investment.investmentId &&
                      p.installmentNumber === inst.installmentNumber &&
                      p.proofImageUrl
                  )
              ).length || 0)
            );
          },
          0
        );

        // Process investments summary
        const investments = investor.investments.map((investment: any) => {
          const paidCount =
            investment.installments?.filter((i: any) => i.isPaid).length || 0;
          const totalCount = investment.installments?.length || 0;

          let investmentStatus: "active" | "completed" | "overdue" = "active";
          if (paidCount === totalCount) {
            investmentStatus = "completed";
          } else {
            const hasOverdue = investment.installments?.some(
              (inst: any) =>
                new Date(inst.dueDate) < now &&
                !inst.isPaid &&
                !userPayments.some(
                  (p: any) =>
                    p.cicilanOrderId === investment.investmentId &&
                    p.installmentNumber === inst.installmentNumber &&
                    p.proofImageUrl
                )
            );
            if (hasOverdue) investmentStatus = "overdue";
          }

          return {
            cicilanOrderId: investment.investmentId,
            productName: investment.productName,
            productId: investment.productId || "unknown",
            totalAmount: investment.totalAmount,
            installmentCount: totalCount,
            paidCount,
            status: investmentStatus,
            latestActivity: investment.investmentDate.toISOString(),
          };
        });

        return {
          userId: user._id.toString(),
          userInfo: {
            _id: user._id.toString(),
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            userCode: user.userCode,
          },
          totalInvestments: investor.investments.length,
          totalAmount: investor.totalInvestasi,
          totalPaid: investor.totalPaid,
          latePayments: latePaymentsCount,
          overdueCount,
          pendingReviews,
          investments,
        };
      } else {
        // User has pending manual BCA payments but no investor record yet
        const cicilanOrderGroups = new Map();
        userPayments.forEach((payment: any) => {
          if (
            payment.cicilanOrderId &&
            !cicilanOrderGroups.has(payment.cicilanOrderId)
          ) {
            cicilanOrderGroups.set(payment.cicilanOrderId, {
              cicilanOrderId: payment.cicilanOrderId,
              productName: payment.productName,
              productId: payment.productId || "unknown",
              totalAmount:
                payment.installmentAmount * payment.totalInstallments,
              installmentCount: payment.totalInstallments,
              paidCount: 0,
              status: "active" as const,
              latestActivity: payment.createdAt.toISOString(),
            });
          }
        });

        const virtualInvestments = Array.from(cicilanOrderGroups.values());
        const totalAmount = virtualInvestments.reduce(
          (sum, inv) => sum + inv.totalAmount,
          0
        );

        // Count overdue payments
        const now = new Date();
        const overdueCount = userPayments.filter(
          (p: any) =>
            new Date(p.dueDate) < now &&
            p.transactionStatus === "pending" &&
            !p.proofImageUrl
        ).length;

        return {
          userId: user._id.toString(),
          userInfo: {
            _id: user._id.toString(),
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            userCode: user.userCode,
          },
          totalInvestments: virtualInvestments.length,
          totalAmount: totalAmount,
          totalPaid: 0,
          latePayments: latePaymentsCount,
          overdueCount,
          pendingReviews,
          investments: virtualInvestments,
        };
      }
    });

    // Apply status filter after processing
    let filteredInvestors = investorGroups;
    if (status) {
      filteredInvestors = investorGroups.filter((investor: any) => {
        const approvedCount = investor.investments.filter(
          (inv: any) => inv.status === "completed"
        ).length;
        const totalCount = investor.investments.length;
        const hasOverdue = investor.overdueCount > 0;

        switch (status) {
          case "completed":
            return approvedCount === totalCount;
          case "overdue":
            return hasOverdue;
          case "active":
            return approvedCount < totalCount && !hasOverdue;
          default:
            return true;
        }
      });
    }

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      investors: filteredInvestors,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching finance investors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
