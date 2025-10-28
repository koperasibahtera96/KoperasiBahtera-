import dbConnect from "@/lib/mongodb";
import Contract from "@/models/Contract";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or staff_admin
    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "staff_admin")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get URL parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const status = url.searchParams.get("status") || "pending";
    const skip = (page - 1) * limit;

    // Build query filter
    const filter: any = {};

    if (status === "pending") {
      filter.adminApprovalStatus = "pending";
      filter.status = "signed";
    } else if (status === "all") {
      filter.adminApprovalStatus = {
        $in: ["pending", "approved", "rejected", "permanently_rejected"],
      };
    } else {
      filter.adminApprovalStatus = status;
    }

    // Get contracts with user details
    const contracts = await Contract.find(filter)
      .populate("userId", "fullName email phoneNumber ktpImageUrl userCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await Contract.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    // Format contract data for admin review
    const formattedContracts = contracts.map((contract) => {
      const lastAttempt =
        contract.signatureAttempts[contract.signatureAttempts.length - 1];

      return {
        contractId: contract.contractId,
        contractNumber: contract.contractNumber,
        status: contract.status,
        adminApprovalStatus: contract.adminApprovalStatus,

        // Product details
        productName: contract.productName,
        totalAmount: contract.totalAmount,
        paymentType: contract.paymentType,

        // User details
        user: contract.userId
          ? {
              id: contract.userId._id,
              fullName: contract.userId.fullName,
              email: contract.userId.email,
              phoneNumber: contract.userId.phoneNumber,
              ktpImageUrl: contract.userId.ktpImageUrl,
              userCode: contract.userId.userCode,
            }
          : null,

        // Signature details
        currentAttempt: contract.currentAttempt,
        maxAttempts: contract.maxAttempts,
        lastSignature: lastAttempt
          ? {
              attemptNumber: lastAttempt.attemptNumber,
              signatureData: lastAttempt.signatureData,
              submittedAt: lastAttempt.submittedAt,
              reviewStatus: lastAttempt.reviewStatus,
              rejectionReason: lastAttempt.rejectionReason,
              adminNotes: lastAttempt.adminNotes,
            }
          : null,

        // Timestamps
        contractDate: contract.contractDate,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        contracts: formattedContracts,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching pending contracts:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch pending contracts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
