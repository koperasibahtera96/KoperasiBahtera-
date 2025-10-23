import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Contract from "@/models/Contract";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contractId } = await req.json();

    if (!contractId) {
      return NextResponse.json(
        { error: "Contract ID is required" },
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
      userId: dbUser._id,
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

    // Check payment type (full or installment)
    const paymentType = contract.paymentType === "full" ? "full-investment" : "cicilan-installment";

    if (paymentType === "full-investment") {
      // Handle full payment
      // Find existing payment record created during contract signing
      const existingPayment = await Payment.findOne({
        orderId: contractId,
        userId: dbUser._id,
        paymentType: "full-investment",
      });

      if (!existingPayment) {
        return NextResponse.json(
          {
            error:
              "Payment record not found. Please sign the contract first.",
          },
          { status: 404 }
        );
      }

      // Update payment to manual-bca method
      existingPayment.paymentMethod = "manual-bca";
      existingPayment.adminStatus = "pending";
      existingPayment.status = "pending";
      existingPayment.transactionStatus = "pending";
      existingPayment.isProcessed = false;

      // Copy referral code from contract if exists
      if (contract.referralCode) {
        existingPayment.referralCode = contract.referralCode;
      }

      await existingPayment.save();

      return NextResponse.json({
        success: true,
        message:
          "Manual BCA payment created. Please upload payment proof on Payments page.",
        paymentId: existingPayment._id,
      });
    } else {
      // Handle installment payment (cicilan)
      // Find the first installment payment
      const firstInstallment = await Payment.findOne({
        cicilanOrderId: contractId,
        installmentNumber: 1,
        userId: dbUser._id,
        paymentType: "cicilan-installment",
      });

      if (!firstInstallment) {
        return NextResponse.json(
          {
            error:
              "First installment payment not found. Please sign the contract first.",
          },
          { status: 404 }
        );
      }

      // Update first installment to manual-bca method
      firstInstallment.paymentMethod = "manual-bca";
      firstInstallment.adminStatus = "pending";
      firstInstallment.status = "pending";
      firstInstallment.transactionStatus = "pending";
      firstInstallment.isProcessed = false;

      // Copy referral code from contract if exists
      if (contract.referralCode) {
        firstInstallment.referralCode = contract.referralCode;
      }

      await firstInstallment.save();

      return NextResponse.json({
        success: true,
        message:
          "Manual BCA payment created for first installment. Please upload payment proof on Payments page.",
        paymentId: firstInstallment._id,
      });
    }
  } catch (error) {
    console.error("Error creating manual BCA payment:", error);
    return NextResponse.json(
      {
        error: "Failed to create manual BCA payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
