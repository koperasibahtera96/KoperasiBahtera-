import { midtransService } from "@/lib/midtrans";
import dbConnect from "@/lib/mongodb";
import Contract from "@/models/Contract";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { plan, user, contractId, referralCode } = await req.json();

    if (!plan || !user || !user.email) {
      return NextResponse.json(
        { error: "Missing plan or user data" },
        { status: 400 }
      );
    }

    if (!contractId) {
      return NextResponse.json(
        { error: "Contract ID is required. Please sign a contract first." },
        { status: 400 }
      );
    }

    const dbUser = await User.findOne({ email: user.email });

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

    // Validate contract details match payment plan
    if (contract.totalAmount !== plan.price || contract.productName !== plan.name) {
      return NextResponse.json(
        { error: "Contract details do not match payment plan" },
        { status: 400 }
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

    console.log("Searching for payment with orderId:", contractId);

    const existingPayment = await Payment.findOne({
      orderId: contractId, // contractId should match payment orderId
      userId: dbUser._id,
      paymentType: "full-investment"
    });

    if (!existingPayment) {
      // Debug: Check if there are any payments for this user
      const userPayments = await Payment.find({ userId: dbUser._id }).select('orderId contractId paymentType');
      console.log("User payments found:", userPayments);

      return NextResponse.json(
        { error: "Payment record not found. Please sign the contract first." },
        { status: 404 }
      );
    }

    console.log("Found existing payment:", {
      orderId: existingPayment.orderId,
      contractId: existingPayment.contractId,
      paymentType: existingPayment.paymentType
    });

    // Use the orderId from the existing payment record
    const orderId = existingPayment.orderId;

    const transaction = await midtransService.createTransaction({
      orderId,
      amount: plan.price,
      customerDetails: {
        first_name: dbUser.fullName,
        email: dbUser.email,
        phone: dbUser.phoneNumber,
      },
      itemDetails: [
        {
          id: plan.name,
          price: plan.price,
          quantity: 1,
          name: plan.name,
        },
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
        error: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/error`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/pending`,
      },
    });

    // Update existing payment record with additional details and Midtrans response
    if (referralCode) {
      existingPayment.referralCode = referralCode;
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
