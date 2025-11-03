import { midtransService } from "@/lib/midtrans";
import dbConnect from "@/lib/mongodb";
import Contract from "@/models/Contract";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { contractId, referralCode } = await req.json();

    if (!contractId) {
      return NextResponse.json(
        { error: "Contract ID is required. Please sign a contract first." },
        { status: 400 }
      );
    }

    const dbUser = await User.findOne({ email: session.user.email });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if contract exists and is approved
    const contract = await Contract.findOne({
      contractId,
      userId: dbUser._id
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    if (!contract.paymentAllowed) {
      return NextResponse.json(
        { error: "Payment not allowed for this contract" },
        { status: 403 }
      );
    }

    // Find existing payment record created during contract signing
    // The contract.contractId should now match the payment.orderId
    const targetContract = await Contract.findOne({ contractId });
    if (!targetContract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    console.log("Searching for payment with contractId:", contractId);
    console.log("Contract payment type:", targetContract.paymentType);

    // For cicilan contracts, find the first installment payment
    // For full contracts, find the full-investment payment
    let existingPayment;
    if (targetContract.paymentType === "cicilan") {
      existingPayment = await Payment.findOne({
        cicilanOrderId: contractId, // For cicilan, contractId is stored in cicilanOrderId
        userId: dbUser._id,
        paymentType: "cicilan-installment",
        installmentNumber: 1
      });
    } else {
      existingPayment = await Payment.findOne({
        orderId: contractId, // contractId should match payment orderId
        userId: dbUser._id,
        paymentType: "full-investment"
      });
    }

    if (!existingPayment) {
      // Debug: Check if there are any payments for this user
      const userPayments = await Payment.find({ userId: dbUser._id }).select('orderId cicilanOrderId installmentNumber paymentType');
      console.log("User payments found:", userPayments);

      return NextResponse.json(
        { error: "Payment record not found. Please sign the contract first." },
        { status: 404 }
      );
    }

    console.log("Found existing payment:", {
      orderId: existingPayment.orderId,
      cicilanOrderId: existingPayment.cicilanOrderId,
      paymentType: existingPayment.paymentType,
      installmentNumber: existingPayment.installmentNumber
    });

    // Use the orderId from the existing payment record
    const orderId = existingPayment.orderId;

    // For cicilan, use the installment amount; for full, use total amount
    const paymentAmount = targetContract.paymentType === "cicilan"
      ? existingPayment.amount
      : contract.totalAmount;

    const transaction = await midtransService.createTransaction({
      orderId,
      amount: paymentAmount,
      customerDetails: {
        first_name: dbUser.fullName,
        email: dbUser.email,
        phone: dbUser.phoneNumber,
      },
      itemDetails: [
        {
          id: contract.productId,
          price: paymentAmount,
          quantity: 1,
          name: targetContract.paymentType === "cicilan"
            ? `${contract.productName} - Cicilan 1/${targetContract.totalInstallments}`
            : contract.productName,
        },
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
        error: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/error`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/pending`,
      },
    });

    // Update existing payment record with additional details and Midtrans response
    // Use referral code from request, or copy from contract if not provided
    if (referralCode) {
      existingPayment.referralCode = referralCode;
    } else if (contract.referralCode) {
      existingPayment.referralCode = contract.referralCode;
    }
    existingPayment.customerData = {
      fullName: dbUser.fullName,
      email: dbUser.email,
      phoneNumber: dbUser.phoneNumber,
      dateOfBirth: dbUser.dateOfBirth,
      address: dbUser.address,
      village: dbUser.village,
      city: dbUser.city,
      province: dbUser.province,
      postalCode: dbUser.postalCode,
      occupation: dbUser.occupation,
      password: "", // Not needed for investment payments
      ktpImageUrl: "",
      faceImageUrl: "",
    };
    existingPayment.midtransResponse = transaction;
    existingPayment.paymentMethod = "midtrans"; // Save payment method selection
    existingPayment.isProcessed = false;
    existingPayment.status = "pending";
    existingPayment.transactionStatus = "pending";

    await existingPayment.save();
    console.log("Investment payment record updated for Midtrans:", orderId, "for contract:", contractId);

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Error creating investment payment:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to create payment";
    if (error instanceof Error) {
      if (error.message.includes("validation failed")) {
        errorMessage = "Invalid payment data provided";
      } else if (error.message.includes("Midtrans")) {
        errorMessage = "Payment gateway error. Please try again.";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
