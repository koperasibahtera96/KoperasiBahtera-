import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import Investor from "@/models/Investor";
import Contract from "@/models/Contract";
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
    const search = searchParams.get("search") || null;
    const filterParam = searchParams.get("filter") || null;

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

    // Get cicilan contracts that don't have payment records yet (unsigned contracts)
    const unsignedCicilanContracts = await Contract.find({
      userId: user._id,
      paymentType: "cicilan",
      status: "draft", // Only draft contracts (not yet signed)
    }).sort({ createdAt: -1 });

    // Get full payment contracts
    const fullPaymentContracts = await Contract.find({
      userId: user._id,
      paymentType: "full",
      status: {
        $in: [
          "draft",
          "signed",
          "approved",
          "rejected",
          "permanently_rejected",
        ],
      }, // Include rejected contracts so users can retry
    }).sort({ createdAt: -1 });

    // Get referral codes from full payment records
    const fullPaymentIds = fullPaymentContracts.map(
      (contract) => contract.contractId
    );
    const fullPayments = await Payment.find({
      orderId: { $in: fullPaymentIds },
      paymentType: "full-investment",
    }).select("orderId referralCode dueDate");

    // Get investor data for contract information
    const investor = await Investor.findOne({ userId: user._id });
    const investorInvestments = investor?.investments || [];

    // Get contract data for admin approval status
    const contractIds = Object.keys(
      installments.reduce((acc, payment) => {
        acc[payment.cicilanOrderId] = true;
        return acc;
      }, {} as any)
    );

    const contracts = await Contract.find({
      contractId: { $in: contractIds },
    }).select(
      "contractId adminApprovalStatus status adminApprovedDate paymentAllowed signatureAttempts currentAttempt maxAttempts totalAmount"
    );

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

      // Total amount should be from contract, not sum of installments
      // We'll set this properly when we match with contract data
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

      // Find matching contract for admin approval status
      const contract = contracts.find(
        (cont: any) => cont.contractId === group.cicilanOrderId
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
        approvedCount === totalInstallments
          ? "completed"
          : completeInstallments.some(
              (inst: any) =>
                inst.exists &&
                new Date(inst.dueDate) < new Date() &&
                inst.status !== "approved"
            )
          ? "overdue"
          : "active";

      return {
        cicilanOrderId: group.cicilanOrderId,
        productName: group.productName,
        productId: group.productId,
        totalAmount:
          contract?.totalAmount ||
          investorInvestment?.totalAmount ||
          group.installmentAmount * group.totalInstallments,
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
        // Add contract admin approval status
        contractApprovalStatus: contract?.adminApprovalStatus || "pending",
        contractStatus: contract?.status || "signed",
        contractApprovedDate: contract?.adminApprovedDate,
        paymentAllowed: contract?.paymentAllowed || false,
        // Add retry attempt information
        contractId: contract?.contractId,
        currentAttempt: contract?.currentAttempt || 0,
        maxAttempts: contract?.maxAttempts || 3,
        signatureAttemptsCount: contract?.signatureAttempts?.length || 0,
        hasEverSigned: (contract?.signatureAttempts?.length || 0) > 0,
        isMaxRetryReached:
          (contract?.currentAttempt || 0) >= (contract?.maxAttempts || 3),
        isPermanentlyRejected:
          contract?.adminApprovalStatus === "permanently_rejected",
        // Get referral code from any payment in this group
        referralCode:
          group.installments.find((inst: any) => inst.referralCode)
            ?.referralCode || null,
      };
    });

    // Add unsigned cicilan contracts (draft status) to the groups
    const unsignedCicilanGroups = unsignedCicilanContracts.map((contract) => ({
      cicilanOrderId: contract.contractId,
      productName: contract.productName,
      productId: contract.productId,
      totalInstallments: contract.totalInstallments || 12,
      installmentAmount:
        contract.installmentAmount ||
        Math.ceil(contract.totalAmount / (contract.totalInstallments || 12)),
      paymentTerm: contract.paymentTerm || "monthly",
      totalAmount: contract.totalAmount,
      installments: [], // No installments created yet since contract isn't signed
      createdAt: contract.createdAt,

      // Contract admin approval status
      contractApprovalStatus: contract.adminApprovalStatus || "pending",
      contractStatus: contract.status || "draft",
      contractApprovedDate: contract.adminApprovedDate,
      paymentAllowed: contract.paymentAllowed || false,

      // Add retry attempt information
      contractId: contract.contractId,
      currentAttempt: contract.currentAttempt || 0,
      maxAttempts: contract.maxAttempts || 3,
      signatureAttemptsCount: contract.signatureAttempts?.length || 0,
      hasEverSigned: (contract.signatureAttempts?.length || 0) > 0,
      isMaxRetryReached:
        (contract.currentAttempt || 0) >= (contract.maxAttempts || 3),
      isPermanentlyRejected:
        contract.adminApprovalStatus === "permanently_rejected",
      referralCode: null, // No referral code yet since no payments made
    }));

    // Combine signed cicilan groups with unsigned cicilan groups
    const allCicilanGroups = [...cicilanGroups, ...unsignedCicilanGroups];

    // Helper to check overdue
    const isOverdueLocal = (d: any) => {
      if (!d) return false;
      try {
        return new Date(d).getTime() < Date.now();
      } catch {
        return false;
      }
    };

    // Map fullPaymentContracts into the frontend shape
    const mappedFullPayments = fullPaymentContracts.map((contract) => {
      const associatedPayment = fullPayments.find(
        (p) => p.orderId === contract.contractId
      );
      return {
        contractId: contract.contractId,
        // attach matching payment _id (if any) so frontend can reference the actual payment record
        paymentId: associatedPayment?._id || null,
        productName: contract.productName,
        productId: contract.productId,
        totalAmount: contract.totalAmount,
        paymentType: contract.paymentType,
        paymentUrl: contract.paymentUrl,
        adminApprovalStatus: contract.adminApprovalStatus,
        adminApprovedDate: contract.adminApprovedDate,
        status: contract.status,
        contractNumber: contract.contractNumber,
        contractDate: contract.contractDate,
        // Use payment dueDate
        dueDate: associatedPayment?.dueDate,
        paymentAllowed: contract.paymentAllowed,
        paymentCompleted: contract.paymentCompleted,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        // Add retry attempt information
        currentAttempt: contract.currentAttempt || 0,
        maxAttempts: contract.maxAttempts || 3,
        signatureAttemptsCount: contract.signatureAttempts?.length || 0,
        hasEverSigned: (contract.signatureAttempts?.length || 0) > 0,
        isMaxRetryReached:
          (contract.currentAttempt || 0) >= (contract.maxAttempts || 3),
        isPermanentlyRejected:
          contract.adminApprovalStatus === "permanently_rejected",
        referralCode: associatedPayment?.referralCode || null,
      };
    });

    // Apply server-side search and filter
    let filteredCicilan = allCicilanGroups;
    let filteredFullPayments = mappedFullPayments;

    if (search) {
      const q = search.toLowerCase().trim();
      filteredCicilan = filteredCicilan.filter((g: any) => {
        const nameMatch = (g.productName || "").toLowerCase().includes(q);
        const idMatch = (
          (g.contractId as string) ||
          (g.cicilanOrderId as string) ||
          ""
        )
          .toLowerCase()
          .includes(q);
        return nameMatch || idMatch;
      });

      filteredFullPayments = filteredFullPayments.filter((c: any) => {
        const nameMatch = (c.productName || "").toLowerCase().includes(q);
        const idMatch = (
          (c.contractId as string) ||
          (c.paymentId as string) ||
          ""
        )
          .toLowerCase()
          .includes(q);
        return nameMatch || idMatch;
      });
    }

    if (filterParam && filterParam !== "all") {
      switch (filterParam) {
        case "completed":
          filteredCicilan = filteredCicilan.filter(
            (g: any) => g.status === "completed"
          );
          filteredFullPayments = filteredFullPayments.filter(
            (c: any) => c.paymentCompleted === true
          );
          break;
        case "overdue":
          filteredCicilan = filteredCicilan.filter(
            (g: any) => g.status === "overdue"
          );
          filteredFullPayments = filteredFullPayments.filter(
            (c: any) =>
              !c.paymentCompleted && c.dueDate && isOverdueLocal(c.dueDate)
          );
          break;
        case "active":
          filteredCicilan = filteredCicilan.filter(
            (g: any) => g.status === "active"
          );
          filteredFullPayments = filteredFullPayments.filter(
            (c: any) => !c.paymentCompleted
          );
          break;
        case "installment":
          // hide full payments
          filteredFullPayments = [];
          break;
        case "full-payment":
          // hide installments
          filteredCicilan = [];
          break;
        default:
          break;
      }
    }

    return NextResponse.json({
      success: true,
      cicilanGroups: filteredCicilan,
      fullPaymentContracts: filteredFullPayments,
    });
  } catch (error) {
    console.error("Error getting user cicilan payments:", error);
    return NextResponse.json(
      { error: "Failed to get cicilan payments" },
      { status: 500 }
    );
  }
}
