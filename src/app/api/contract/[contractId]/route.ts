import dbConnect from "@/lib/mongodb";
import { generateInvoiceNumber } from "@/lib/invoiceNumberGenerator";
import Contract from "@/models/Contract";
import Payment from "@/models/Payment";
import { Investor } from "@/models";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    await dbConnect();

    const { contractId } = await params;

    // Find contract by contractId
    const contract = await Contract.findOne({ contractId }).populate("userId");

    if (!contract) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      );
    }

    // Get user data
    const user = contract.userId;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found for contract" },
        { status: 404 }
      );
    }

    // Check if contract is already signed or no longer available for signing
    if (contract.status !== "draft") {
      return NextResponse.json(
        {
          success: false,
          error: "Contract is no longer available for signing",
          contractStatus: contract.status,
        },
        { status: 400 }
      );
    }

    // Format contract data to match the interface expected by the frontend
    const contractData = {
      investor: {
        name: user.fullName || user.name || user.email.split("@")[0],
        email: user.email,
        phoneNumber: user.phoneNumber || undefined,
        nik: user.nik || undefined,
        dateOfBirth: user.dateOfBirth || undefined,
        occupation: user.occupation || undefined,
        address: user.ktpAddress || user.address || undefined,
        village: user.ktpVillage || undefined,
        city: user.ktpCity || undefined,
        province: user.ktpProvince || undefined,
        postalCode: user.ktpPostalCode || undefined,
      },
      investment: {
        investmentId: contract.contractId,
        productName: contract.productName,
        totalAmount: contract.totalAmount,
        amountPaid: 0, // Contract hasn't been paid yet in new flow
        paymentType: contract.paymentType,
        plantInstanceId: contract.plantInstanceId?.toString() || "",
        investmentDate:
          contract.createdAt?.toISOString() || new Date().toISOString(),
      },
      plantInstance: {
        instanceName: "Instansi Pohon",
        plantType: (() => {
          if (contract.productName) {
            const productName = contract.productName.toLowerCase();
            if (productName.includes("alpukat")) return "ALPUKAT";
            if (productName.includes("gaharu")) return "GAHARU";
            if (productName.includes("jengkol")) return "JENGKOL";
            if (productName.includes("aren")) return "AREN";
          }
          return "pohon";
        })(),
        baseAnnualROI: 0.15, // Default 15%
        location: "Akan ditentukan",
      },
      contractNumber: contract.contractNumber,
      contractDate:
        contract.createdAt?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: contractData,
    });
  } catch (error) {
    console.error("GET /api/contract/[contractId] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch contract data" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contractId } = await params;
    const body = await request.json();
    const { signatureData } = body;

    // Find the contract
    const contract = await Contract.findOne({ contractId }).populate("userId");

    if (!contract) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      );
    }

    // Verify user owns this contract
    if (contract.userId.email !== session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized access to contract" },
        { status: 403 }
      );
    }

    // Check if contract is still in draft status
    if (contract.status !== "draft") {
      return NextResponse.json(
        { error: "Contract is no longer in draft status" },
        { status: 400 }
      );
    }

    // Check retry limits
    if (contract.currentAttempt >= contract.maxAttempts) {
      return NextResponse.json(
        { error: "Maximum signature attempts exceeded" },
        { status: 400 }
      );
    }

    // Create signature attempt
    const signatureAttempt = {
      attemptNumber: contract.currentAttempt + 1,
      signatureData: signatureData || null,
      submittedAt: new Date(),
      adminReview: "pending",
      reviewedAt: null,
      reviewNotes: null,
    };

    // Get user data for payment creation
    const user = contract.userId;

    // For cicilan payments, create individual installment Payment records
    if (contract.paymentType === "cicilan") {
      const totalInstallments = contract.totalInstallments || 12;
      const installmentAmount =
        contract.installmentAmount ||
        Math.ceil(contract.totalAmount / totalInstallments);
      const cicilanOrderId = contract.contractId; // Use contractId as cicilanOrderId

      // Check if first installment payment already exists
      const existingFirstInstallment = await Payment.findOne({
        cicilanOrderId: cicilanOrderId,
        installmentNumber: 1,
        paymentType: "cicilan-installment",
      });

      if (!existingFirstInstallment) {
        // Create only the first installment Payment record
        const firstInstallmentDueDate = new Date();
        // Set due date to one day after today (previously was one month ahead)
        firstInstallmentDueDate.setDate(firstInstallmentDueDate.getDate() + 1);

        const firstInstallmentOrderId = await generateInvoiceNumber({
          productName: contract.productName,
          installmentNumber: 1,
          paymentType: "cicilan-installment",
        });

        const firstInstallmentPayment = new Payment({
          orderId: firstInstallmentOrderId,
          userId: user._id,
          amount: installmentAmount,
          currency: "IDR",
          paymentType: "cicilan-installment",
          cicilanOrderId: cicilanOrderId,
          installmentNumber: 1,
          totalInstallments: totalInstallments,
          installmentAmount: installmentAmount,
          paymentTerm: contract.paymentTerm || "monthly",
          dueDate: firstInstallmentDueDate,
          adminStatus: "pending",
          productName: contract.productName,
          productId: contract.productId || "",
          isProcessed: false,
          status: "pending",
          transactionStatus: "pending",
          customerData: {
            fullName: user.name || user.email.split("@")[0],
            email: user.email,
            phoneNumber: user.phoneNumber || "",
          },
          // Copy referral code from contract if it exists
          ...(contract.referralCode && {
            referralCode: contract.referralCode,
          }),
        });

        await firstInstallmentPayment.save();

        console.log("First installment Payment record created:", {
          orderId: firstInstallmentOrderId,
          cicilanOrderId: cicilanOrderId,
          installmentNumber: 1,
          amount: installmentAmount,
          dueDate: firstInstallmentDueDate,
        });
      }
    } else {
      // For full payments, create single payment record
      // Use the existing contractId which already has the correct invoice format
      const orderId = contract.contractId;

      // Check if payment already exists for this contract
      const existingPayment = await Payment.findOne({
        orderId: orderId,
        userId: user._id,
        paymentType: "full-investment",
      });
      if (!existingPayment) {
        // set due date for full payment to 1 day after now
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);

        const payment = new Payment({
          orderId: orderId,
          userId: user._id,
          amount: contract.totalAmount,
          productName: contract.productName,
          paymentType: "full-investment",
          status: "pending",
          transactionStatus: "pending",
          dueDate,
          customerData: {
            email: user.email,
            fullName: user.name || user.email.split("@")[0],
            phoneNumber: user.phoneNumber || "",
          },
          isProcessed: false,
          // Copy referral code from contract if it exists
          ...(contract.referralCode && {
            referralCode: contract.referralCode,
          }),
        });

        await payment.save();

        console.log("Full payment record created:", {
          orderId: orderId,
          contractId: contract.contractId,
          amount: contract.totalAmount,
          paymentType: "full-investment",
          dueDate: dueDate.toISOString(),
        });
      }
    }

    // Create or update Investor record (with plantInstanceId: null)
    let investor = await Investor.findOne({ userId: user._id });

    if (!investor) {
      // Create new investor record
      investor = new Investor({
        userId: user._id,
        name: user.name || user.email.split("@")[0],
        email: user.email,
        phoneNumber: user.phoneNumber || "",
        totalInvestasi: contract.totalAmount,
        jumlahPohon: 0, // Will be updated when PlantInstance is created after payment
        status: "active",
        investments: [],
      });
    }

    // Add investment entry to the investor (without PlantInstance reference)
    const investment: any = {
      investmentId: contract.contractId,
      productName: contract.productName,
      totalAmount: contract.totalAmount,
      amountPaid: 0, // Will be updated when payment is made
      paymentType: contract.paymentType,
      plantInstanceId: null, // Will be set when PlantInstance is created after payment
      investmentDate: new Date(),
      status: "pending", // Pending payment
      contractSigned: true,
      contractNumber: contract.contractNumber,
      contractSignedDate: new Date(),
    };

    // Create only the first installment if payment type is cicilan (next ones created after approval)
    if (contract.paymentType === "cicilan") {
      const totalInstallments = contract.totalInstallments || 12; // Use contract data or fallback
      const installmentAmount =
        contract.installmentAmount ||
        Math.ceil(contract.totalAmount / totalInstallments);

      // Only create the first installment
      const firstInstallmentDueDate = new Date();
      // Set due date to one day after today (previously was one month ahead)
      firstInstallmentDueDate.setDate(firstInstallmentDueDate.getDate() + 1);

      const firstInstallment = {
        installmentNumber: 1,
        amount: installmentAmount,
        dueDate: firstInstallmentDueDate,
        status: "pending",
        isPaid: false,
        paidDate: null,
        proofImageUrl: null,
        adminStatus: "pending",
        adminReviewDate: null,
        adminNotes: null,
        submissionDate: null,
      };

      investment.installments = [firstInstallment]; // Only first installment
    }

    await investor.save();

    // Update contract
    contract.signatureAttempts.push(signatureAttempt);
    contract.currentAttempt += 1;
    contract.status = "signed";

    await contract.save();

    return NextResponse.json({
      success: true,
      message: "Contract signed successfully. Awaiting admin approval.",
      data: {
        contractId: contract.contractId,
        status: contract.status,
        currentAttempt: contract.currentAttempt,
        maxAttempts: contract.maxAttempts,
      },
    });
  } catch (error) {
    console.error("POST /api/contract/[contractId] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save contract signature" },
      { status: 500 }
    );
  }
}
