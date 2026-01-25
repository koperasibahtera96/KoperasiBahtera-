import dbConnect from "@/lib/mongodb";
import { generateInvoiceNumber } from "@/lib/invoiceNumberGenerator";
import Contract from "@/models/Contract";
import User from "@/models/User";
import Settings from "@/models/Settings";
import { midtransService } from "@/lib/midtrans";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log("Contract creation failed: No session or email");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("Contract creation request body:", body);

    const {
      productName,
      productId,
      totalAmount,
      paymentType,
      paymentTerm,
      totalInstallments,
      installmentAmount,
      durationYears,
      contractNumber,
      referralCode,
    } = body;

    // Validate required fields
    if (
      !productName ||
      !productId ||
      !totalAmount ||
      !paymentType ||
      !contractNumber
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: productName, productId, totalAmount, paymentType, contractNumber",
        },
        { status: 400 }
      );
    }

    // Validate payment type
    if (!["full", "cicilan"].includes(paymentType)) {
      return NextResponse.json(
        { error: "Invalid payment type. Must be 'full' or 'cicilan'" },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof totalAmount !== "number" || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Total amount must be a positive number" },
        { status: 400 }
      );
    }

    // Find user first (we need user data to check SPPG status)
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Variables for SPPG discount and locked rates
    let marketingUser = null;
    let lockedCommissionRate: number | undefined;
    let lockedCompanyCutRate: number | undefined;
    const originalAmount = totalAmount;
    let discountPercentage: number | undefined;
    let discountAmount: number | undefined;
    let isSppgDiscount = false;
    let finalAmount = totalAmount;

    // Validate referral code format and existence if provided
    if (referralCode) {
      if (
        typeof referralCode !== "string" ||
        referralCode.length !== 6 ||
        !/^[A-Z0-9]{6}$/.test(referralCode)
      ) {
        return NextResponse.json(
          {
            error:
              "Referral code must be exactly 6 uppercase alphanumeric characters",
          },
          { status: 400 }
        );
      }

      // Check if referral code exists and belongs to an ACTIVE marketing staff
      marketingUser = await User.findOne({
        referralCode: referralCode,
        role: { $in: ["marketing", "marketing_head"] },
        isActive: true, // Only allow referral codes from active marketing staff
      });

      if (!marketingUser) {
        return NextResponse.json(
          { error: "Kode referral salah atau tidak valid" },
          { status: 400 }
        );
      }

      // Get commission rates to lock at contract creation time
      const settings = await Settings.findOne({ type: "system" });
      const globalCommissionRate = settings?.config?.commissionRate ?? 0.02;

      lockedCommissionRate = marketingUser.customCommissionRate ?? globalCommissionRate;
      lockedCompanyCutRate = marketingUser.companyCutRate;

      // Check if user is SPPG or TNI and apply discount
      const discountEligibleOccupations = ["sppg", "tni"];
      if (discountEligibleOccupations.includes(user.occupation) && lockedCommissionRate !== undefined && lockedCommissionRate > 0) {
        isSppgDiscount = true;
        discountPercentage = lockedCommissionRate;
        discountAmount = Math.round(originalAmount * discountPercentage);
        finalAmount = originalAmount - discountAmount;

        console.log(`[SPPG Discount] User: ${user.email}, Original: ${originalAmount}, Discount: ${(discountPercentage * 100).toFixed(1)}% (${discountAmount}), Final: ${finalAmount}`);
      }
    }

    // Spam protection: Check for recent contract creation attempts
    const fiveMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);
    const recentContracts = await Contract.countDocuments({
      userId: user._id,
      createdAt: { $gte: fiveMinutesAgo },
    });

    if (recentContracts >= 3) {
      return NextResponse.json(
        {
          error: "Silahkan tunggu beberapa menit sebelum membuat kontrak baru",
        },
        { status: 429 }
      );
    }

    // Generate unique contract ID using new invoice format
    const contractId = await generateInvoiceNumber({
      productName,
      paymentType:
        paymentType === "cicilan" ? "cicilan-installment" : "full-investment",
    });

    // Contract number will be generated automatically by the pre-save hook

    // For full payment contracts, generate Midtrans payment URL
    let paymentUrl = undefined;
    if (paymentType === "full") {
      try {
        // Build item details - include discount as separate line item if SPPG
        const itemDetails = isSppgDiscount
          ? [
              {
                id: productId,
                price: originalAmount,
                quantity: 1,
                name: productName,
              },
              {
                id: "MEMBER_DISCOUNT",
                price: -discountAmount!,
                quantity: 1,
                name: `Diskon Anggota (${Math.round(discountPercentage! * 100)}%)`,
              },
            ]
          : [
              {
                id: productId,
                price: finalAmount,
                quantity: 1,
                name: productName,
              },
            ];

        const midtransTransaction = await midtransService.createTransaction({
          orderId: contractId,
          amount: finalAmount, // Use discounted amount for SPPG users
          customerDetails: {
            first_name: user.fullName || user.firstName || "User",
            last_name: user.lastName || "",
            email: user.email,
            phone: user.phoneNumber || "",
          },
          itemDetails,
          callbacks: {
            finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?paymentSuccess=${contractId}`,
            error: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?paymentError=${contractId}`,
            pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?paymentPending=${contractId}`,
          },
        });

        paymentUrl = midtransTransaction.redirect_url;
      } catch (midtransError) {
        console.error("Failed to create Midtrans transaction:", midtransError);
        // Continue without payment URL - can be generated later
      }
    }

    // Check if contractNumber already exists (prevent race condition)
    const existingContractByNumber = await Contract.findOne({ contractNumber });
    if (existingContractByNumber) {
      console.error(
        `Contract number ${contractNumber} already exists. This should not happen with the new generation logic.`
      );
      return NextResponse.json(
        {
          error:
            "Nomor kontrak sudah digunakan. Silakan coba lagi dalam beberapa detik.",
        },
        { status: 409 }
      );
    }

    // Check if contractId already exists (should be rare with invoice number format)
    const existingContractById = await Contract.findOne({ contractId });
    if (existingContractById) {
      console.error(
        `Contract ID ${contractId} already exists. This should be very rare.`
      );
      return NextResponse.json(
        {
          error:
            "ID kontrak sudah digunakan. Silakan coba lagi dalam beberapa detik.",
        },
        { status: 409 }
      );
    }

    // Create new contract
    const contract = new Contract({
      contractId,
      userId: user._id,
      productName,
      productId,
      totalAmount: finalAmount, // Use discounted amount as the contract total
      paymentType,
      // For cicilan payments, store the user's selected terms
      ...(paymentType === "cicilan" && {
        paymentTerm,
        totalInstallments,
        // Recalculate installment amount if SPPG discount applies
        installmentAmount: isSppgDiscount
          ? Math.round(finalAmount / totalInstallments)
          : installmentAmount,
        durationYears,
      }),
      // For full payments, store the Midtrans payment URL
      ...(paymentType === "full" &&
        paymentUrl && {
          paymentUrl,
        }),
      // Add referral code if provided
      ...(referralCode && {
        referralCode,
      }),
      // Lock commission rates at contract creation time (for rate consistency)
      ...(lockedCommissionRate !== undefined && {
        lockedCommissionRate,
      }),
      ...(lockedCompanyCutRate !== undefined && {
        lockedCompanyCutRate,
      }),
      // SPPG discount fields
      ...(isSppgDiscount && {
        originalAmount,
        discountPercentage,
        discountAmount,
        isSppgDiscount: true,
      }),
      contractNumber,
      status: "draft",
      adminApprovalStatus: "pending",
      paymentAllowed: true, // Allow immediate payment for both full and cicilan after signing
      paymentCompleted: false,
      signatureAttempts: [],
      currentAttempt: 0,
      maxAttempts: 3,
    });

    await contract.save();

    console.log("Contract created successfully:", {
      contractId: contract.contractId,
      userId: user._id,
      productName,
      paymentType,
      totalAmount,
    });

    return NextResponse.json({
      success: true,
      data: {
        contractId: contract.contractId,
        contractNumber: contract.contractNumber,
        status: contract.status,
        productName: contract.productName,
        totalAmount: contract.totalAmount,
        paymentType: contract.paymentType,
        ...(contract.paymentUrl && { paymentUrl: contract.paymentUrl }),
        // Include discount info if SPPG discount was applied
        ...(isSppgDiscount && {
          discountApplied: {
            originalAmount,
            discountPercentage,
            discountAmount,
            finalAmount,
          },
        }),
      },
    });
  } catch (error) {
    console.error("Error creating contract:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes("duplicate key")) {
        return NextResponse.json(
          { error: "Contract with this ID already exists" },
          { status: 409 }
        );
      }
      if (error.message.includes("validation failed")) {
        console.error("Validation error details:", error.message);
        return NextResponse.json(
          { error: "Invalid contract data provided" },
          { status: 400 }
        );
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Returning generic error:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to create contract",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
