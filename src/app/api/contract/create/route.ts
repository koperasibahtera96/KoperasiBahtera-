import dbConnect from "@/lib/mongodb";
import { generateInvoiceNumber } from "@/lib/invoiceNumberGenerator";
import Contract from "@/models/Contract";
import User from "@/models/User";
import { midtransService } from "@/lib/midtrans";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productName, productId, totalAmount, paymentType, paymentTerm, totalInstallments, installmentAmount, contractNumber } = await req.json();

    // Validate required fields
    if (!productName || !productId || !totalAmount || !paymentType || !contractNumber) {
      return NextResponse.json(
        {
          error: "Missing required fields: productName, productId, totalAmount, paymentType, contractNumber",
        },
        { status: 400 }
      );
    }

    // Validate payment type
    if (!['full', 'cicilan'].includes(paymentType)) {
      return NextResponse.json(
        { error: "Invalid payment type. Must be 'full' or 'cicilan'" },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Total amount must be a positive number" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Spam protection: Check for recent contract creation attempts
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentContracts = await Contract.countDocuments({
      userId: user._id,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (recentContracts >= 3) {
      return NextResponse.json(
        {
          error: "Too many contract creation attempts. Please wait a few minutes before creating another contract."
        },
        { status: 429 }
      );
    }

    // Generate unique contract ID using new invoice format
    const contractId = await generateInvoiceNumber({
      productName,
      paymentType: paymentType === 'cicilan' ? 'cicilan-installment' : 'full-investment'
    });

    // Contract number will be generated automatically by the pre-save hook

    // For full payment contracts, generate Midtrans payment URL
    let paymentUrl = undefined;
    if (paymentType === 'full') {
      try {
        const midtransTransaction = await midtransService.createTransaction({
          orderId: contractId,
          amount: totalAmount,
          customerDetails: {
            first_name: user.fullName || user.firstName || 'User',
            last_name: user.lastName || '',
            email: user.email,
            phone: user.phoneNumber || '',
          },
          itemDetails: [
            {
              id: productId,
              price: totalAmount,
              quantity: 1,
              name: productName,
            },
          ],
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

    // Create new contract
    const contract = new Contract({
      contractId,
      userId: user._id,
      productName,
      productId,
      totalAmount,
      paymentType,
      // For cicilan payments, store the user's selected terms
      ...(paymentType === 'cicilan' && {
        paymentTerm,
        totalInstallments,
        installmentAmount
      }),
      // For full payments, store the Midtrans payment URL
      ...(paymentType === 'full' && paymentUrl && {
        paymentUrl
      }),
      contractNumber,
      status: 'draft',
      adminApprovalStatus: 'pending',
      paymentAllowed: true, // Allow immediate payment for both full and cicilan after signing
      paymentCompleted: false,
      signatureAttempts: [],
      currentAttempt: 0,
      maxAttempts: 3
    });

    await contract.save();

    console.log("Contract created successfully:", {
      contractId: contract.contractId,
      userId: user._id,
      productName,
      paymentType,
      totalAmount
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
        ...(contract.paymentUrl && { paymentUrl: contract.paymentUrl })
      }
    });

  } catch (error) {
    console.error("Error creating contract:", error);

    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: "Contract with this ID already exists" },
          { status: 409 }
        );
      }
      if (error.message.includes('validation failed')) {
        return NextResponse.json(
          { error: "Invalid contract data provided" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to create contract",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}