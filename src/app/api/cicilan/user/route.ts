import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import Investor from "@/models/Investor";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get URL parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const adminStatus = searchParams.get("adminStatus");

    // Build query for cicilan installment payments
    const query: any = {
      userId: user._id,
      paymentType: "cicilan-installment",
    };

    if (status) query.status = status;
    if (adminStatus) query.adminStatus = adminStatus;

    // Get installment payments
    const installments = await Payment.find(query)
      .populate("adminReviewBy", "fullName email")
      .sort({ cicilanOrderId: 1, installmentNumber: 1 });

    // Get investor data for contract information
    const investor = await Investor.findOne({ userId: user._id });
    const investorInvestments = investor?.investments || [];

    // Group by cicilanOrderId
    const groupedPayments = installments.reduce((acc, payment) => {
      const key = payment.cicilanOrderId;
      if (!acc[key]) {
        acc[key] = {
          cicilanOrderId: key,
          productName: payment.productName,
          productId: payment.productId,
          totalInstallments: payment.totalInstallments,
          installmentAmount: payment.installmentAmount,
          paymentTerm: payment.paymentTerm,
          totalAmount: 0, // Will calculate from installments
          installments: [],
        };
      }

      // Add up total amount
      acc[key].totalAmount += payment.amount;
      acc[key].installments.push(payment);
      return acc;
    }, {} as any);

    // Create complete view showing all expected installments
    const cicilanGroups = Object.values(groupedPayments).map((group: any) => {
      const installments = group.installments;
      const totalInstallments = group.totalInstallments || 0;

      // Find matching investor investment record for contract info
      const investorInvestment = investorInvestments.find(
        (inv: any) => inv.investmentId === group.cicilanOrderId
      );

      // Create complete installment list
      const completeInstallments = [];
      for (let i = 1; i <= totalInstallments; i++) {
        const existingInstallment = installments.find(
          (inst: any) => inst.installmentNumber === i
        );
        if (existingInstallment) {
          completeInstallments.push({
            _id: existingInstallment._id,
            installmentNumber: existingInstallment.installmentNumber,
            amount: existingInstallment.amount,
            dueDate: existingInstallment.dueDate,
            status: existingInstallment.status,
            adminStatus: existingInstallment.adminStatus,
            proofImageUrl: existingInstallment.proofImageUrl,
            proofDescription: existingInstallment.proofDescription,
            adminReviewDate: existingInstallment.adminReviewDate,
            adminNotes: existingInstallment.adminNotes,
            adminReviewBy: existingInstallment.adminReviewBy,
            createdAt: existingInstallment.createdAt,
            updatedAt: existingInstallment.updatedAt,
            exists: true,
          });
        } else {
          // Show placeholder for future installments
          completeInstallments.push({
            installmentNumber: i,
            amount: group.installmentAmount,
            dueDate: null, // Will be calculated when created
            status: "not_created",
            adminStatus: "not_created",
            exists: false,
          });
        }
      }

      // Determine if all installments are approved (for contract eligibility)
      const approvedCount = completeInstallments.filter(
        (inst: any) => inst.status === "approved"
      ).length;
      const status = 
        approvedCount === totalInstallments ? "completed" :
        completeInstallments.some((inst: any) => 
          inst.exists && new Date(inst.dueDate) < new Date() && 
          inst.status !== "approved"
        ) ? "overdue" : "active";

      return {
        cicilanOrderId: group.cicilanOrderId,
        productName: group.productName,
        productId: group.productId,
        totalAmount: group.totalAmount,
        totalInstallments: group.totalInstallments,
        installmentAmount: group.installmentAmount,
        paymentTerm: group.paymentTerm,
        installments: completeInstallments,
        status,
        createdAt: group.installments[0]?.createdAt || new Date(),
        contractSigned: investorInvestment?.contractSigned || false,
        contractSignedDate: investorInvestment?.contractSignedDate,
        contractDownloaded: investorInvestment?.contractDownloaded || false,
        contractDownloadedDate: investorInvestment?.contractDownloadedDate,
      };
    });

    return NextResponse.json({
      success: true,
      cicilanGroups,
    });
  } catch (error) {
    console.error("Error getting user cicilan payments:", error);
    return NextResponse.json(
      { error: "Failed to get cicilan payments" },
      { status: 500 }
    );
  }
}
