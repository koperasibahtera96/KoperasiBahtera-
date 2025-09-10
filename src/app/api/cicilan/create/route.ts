import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import Payment from "@/models/Payment";
import User from "@/models/User";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await dbConnect();

  // Start a MongoDB transaction
  const mongoSession = await mongoose.startSession();

  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, productName, totalAmount, paymentTerm } =
      await req.json();

    if (!productId || !productName || !totalAmount || !paymentTerm) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: productId, productName, totalAmount, paymentTerm",
        },
        { status: 400 }
      );
    }

    // Validate payment term
    const validTerms = ["monthly", "quarterly", "semiannual", "annual"];
    if (!validTerms.includes(paymentTerm)) {
      return NextResponse.json(
        {
          error:
            "Invalid payment term. Must be one of: monthly, quarterly, semiannual, annual",
        },
        { status: 400 }
      );
    }

    let result;
    await mongoSession.withTransaction(async () => {
      // Find user
      const user = await User.findOne({ email: session.user.email }).session(
        mongoSession
      );
      if (!user) {
        throw new Error("User not found");
      }

      // Calculate payment terms
      const termToMonths = {
        monthly: 1,
        quarterly: 3,
        semiannual: 6,
        annual: 12,
      };

      const paymentTermMonths =
        termToMonths[paymentTerm as keyof typeof termToMonths];
      const totalInstallments = Math.ceil(60 / paymentTermMonths); // 5 years
      const installmentAmount = Math.ceil(totalAmount / totalInstallments);

      // First payment is due 24 hours from creation
      const nextPaymentDue = new Date();
      nextPaymentDue.setHours(nextPaymentDue.getHours() + 24);

      const cicilanOrderId = `CICILAN-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create only the first installment Payment record (due 24 hours from now)
      const firstInstallmentOrderId = `${cicilanOrderId}-INST-1`;
      const firstDueDate = new Date();
      firstDueDate.setHours(firstDueDate.getHours() + 24); // Due 24 hours from now

      const firstInstallment = new Payment({
        orderId: firstInstallmentOrderId,
        userId: user._id,
        amount: installmentAmount,
        currency: "IDR",
        paymentType: "cicilan-installment",
        cicilanOrderId,
        installmentNumber: 1,
        totalInstallments,
        installmentAmount,
        paymentTerm,
        dueDate: firstDueDate,
        productName,
        productId,
        adminStatus: "pending",
        status: "pending",
        isProcessed: false,
      });

      await firstInstallment.save({ session: mongoSession });

      // Create first installment summary for Investor tracking
      const firstInstallmentSummary = {
        installmentNumber: 1,
        amount: installmentAmount,
        dueDate: firstDueDate,
        isPaid: false,
        paidDate: null,
      };

      const investmentRecord = {
        investmentId: cicilanOrderId,
        productName,
        plantInstanceId: null, // Will be assigned when plant is allocated
        totalAmount,
        amountPaid: 0,
        paymentType: "cicilan" as const,
        status: "active" as const,
        totalInstallments, // Store total for tracking
        currentInstallment: 1, // Track current installment number
        installments: [firstInstallmentSummary], // Start with first installment
        investmentDate: new Date(),
      };

      // Create or update investor record safely
      let investor = await Investor.findOne({ userId: user._id }).session(
        mongoSession
      );

      if (investor) {
        // Update existing investor
        investor.name = user.fullName;
        investor.email = user.email;
        investor.phoneNumber = user.phoneNumber;
        investor.status = "active";
        investor.investments.push(investmentRecord);
        investor.totalInvestasi += totalAmount;
        await investor.save({ session: mongoSession });
      } else {
        // Create new investor
        investor = new Investor({
          userId: user._id,
          name: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          totalInvestasi: totalAmount,
          totalPaid: 0,
          jumlahPohon: 0,
          investments: [investmentRecord],
          status: "active",
        });
        await investor.save({ session: mongoSession });
      }

      // Prepare result data
      result = {
        success: true,
        orderId: cicilanOrderId,
        cicilanPayment: {
          orderId: cicilanOrderId,
          productName,
          totalAmount,
          installmentAmount,
          paymentTerm,
          totalInstallments,
          nextPaymentDue,
          status: "active",
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating cicilan payment:", error);
    return NextResponse.json(
      {
        error: (error as any).message || "Failed to create cicilan payment",
      },
      { status: 500 }
    );
  } finally {
    await mongoSession.endSession();
  }
}
