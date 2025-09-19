import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { createCommissionRecord } from "@/lib/commission";
import { getFirstAdminName } from "@/lib/utils/admin";
import Investor from "@/models/Investor";
import Payment from "@/models/Payment";
import PlantInstance from "@/models/PlantInstance";
import User from "@/models/User";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId, action, adminNotes } = await request.json();

    console.log(paymentId, "paymentId");

    if (!paymentId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Start a MongoDB transaction
    const mongoSession = await mongoose.startSession();

    try {
      await mongoSession.withTransaction(async () => {
        // Find the payment record
        const payment = await Payment.findById(paymentId).session(mongoSession);
        if (!payment) {
          throw new Error("Payment not found");
        }

        // Update payment with admin review
        payment.adminStatus = action === "approve" ? "approved" : "rejected";
        payment.status = action === "approve" ? "approved" : "rejected";
        payment.adminNotes = adminNotes || "";
        payment.adminReviewBy = session.user.id;
        payment.adminReviewDate = new Date();
        await payment.save({ session: mongoSession });

        // If approved, handle cicilan payment processing
        if (action === "approve") {
          // Check if this is the first installment approval - need to create PlantInstance and investor record
          if (payment.installmentNumber === 1) {
            console.log(
              `First installment approved for cicilan ${payment.cicilanOrderId} - creating PlantInstance and investor record`
            );

            // Find the user for this payment
            const user = await User.findById(payment.userId).session(
              mongoSession
            );
            if (!user) {
              throw new Error("User not found for cicilan payment");
            }

            // Check if PlantInstance already exists for this cicilan
            const existingPlantInstance = await PlantInstance.findOne({
              contractNumber: `CONTRACT-${payment.cicilanOrderId}`,
            }).session(mongoSession);

            if (existingPlantInstance) {
              // PlantInstance already exists, just update investor record
              const existingInvestor = await Investor.findOne({
                userId: user._id,
              }).session(mongoSession);

              if (existingInvestor) {
                const investment = existingInvestor.investments.find(
                  (inv: any) => inv.investmentId === payment.cicilanOrderId
                );

                if (investment) {
                  investment.plantInstanceId =
                    existingPlantInstance._id.toString();
                  investment.status = "active";
                  investment.amountPaid += payment.amount;

                  const installment = investment.installments?.find(
                    (inst: any) =>
                      inst.installmentNumber === payment.installmentNumber
                  );
                  if (installment) {
                    installment.isPaid = true;
                    installment.paidDate = new Date();
                    installment.proofImageUrl = payment.proofImageUrl;
                  }

                  existingInvestor.totalPaid += payment.amount;

                  const extractTreeCount = (productName: string): number => {
                    if (!productName) return 1;
                    if (productName.includes("1 Pohon")) return 1;
                    if (productName.includes("10 Pohon")) return 10;
                    return 10;
                  };

                  existingInvestor.jumlahPohon += extractTreeCount(
                    payment.productName
                  );
                  await existingInvestor.save({ session: mongoSession });
                }
              }
            } else {
              // Create new PlantInstance
              const plantInstanceId = `PLANT-${
                payment.cicilanOrderId
              }-${Date.now()}`;

              // Map product name to plant type
              const getPlantType = (
                productName: string
              ): "gaharu" | "alpukat" | "jengkol" | "aren" => {
                const name = productName.toLowerCase();
                if (name.includes("gaharu")) return "gaharu";
                if (name.includes("alpukat")) return "alpukat";
                if (name.includes("jengkol")) return "jengkol";
                if (name.includes("aren")) return "aren";
                return "gaharu"; // default
              };

              const getBaseROI = (
                plantType: "gaharu" | "alpukat" | "jengkol" | "aren"
              ): number => {
                const roiMap = {
                  gaharu: 0.15,
                  alpukat: 0.12,
                  jengkol: 0.1,
                  aren: 0.18,
                };
                return roiMap[plantType] || 0.12;
              };

              const productName = payment.productName || "gaharu";
              const plantType = getPlantType(productName);
              const instanceName = `${
                plantType.charAt(0).toUpperCase() + plantType.slice(1)
              } - ${user.fullName}`;
              const adminName = await getFirstAdminName();

              const plantInstance = new PlantInstance({
                id: plantInstanceId,
                plantType,
                instanceName,
                baseAnnualROI: getBaseROI(plantType),
                operationalCosts: [],
                incomeRecords: [],
                qrCode: `QR-${productName}`,
                owner: user.fullName,
                fotoGambar: null,
                memberId: user._id.toString(),
                contractNumber: `CONTRACT-${payment.cicilanOrderId}`,
                location: "TBD",
                status: "Kontrak Baru", // First installment approved, plant is now active
                lastUpdate: new Date().toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }),
                history: [
                  {
                    id: `HISTORY-${Date.now()}-${Math.random()
                      .toString(36)
                      .substring(2, 9)}`,
                    action: "Kontrak Baru",
                    type: "Kontrak Baru",
                    date: new Date().toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }),

                    description: `Tanaman baru dibuat dengan cicilan untuk user ${user.fullName}`,
                    addedBy: adminName,
                  },
                ],
              });

              const savedPlantInstance = await plantInstance.save({
                session: mongoSession,
              });
              console.log(
                `PlantInstance created: ${plantInstanceId} for cicilan ${payment.cicilanOrderId}`
              );

              // Find existing investor record (should exist from cicilan creation)
              const existingInvestor = await Investor.findOne({
                userId: user._id,
              }).session(mongoSession);
              if (!existingInvestor) {
                throw new Error(
                  "Investor record not found - should have been created during cicilan creation"
                );
              }

              // Find the investment in the investor record and update it
              const investment = existingInvestor.investments.find(
                (inv: any) => inv.investmentId === payment.cicilanOrderId
              );
              if (!investment) {
                throw new Error("Investment not found in investor record");
              }

              // Update the investment with PlantInstance and mark as active
              investment.plantInstanceId = savedPlantInstance._id.toString();
              investment.status = "active";
              investment.amountPaid += payment.amount;

              // Find the specific installment and mark as paid
              const installment = investment.installments?.find(
                (inst: any) =>
                  inst.installmentNumber === payment.installmentNumber
              );
              if (installment) {
                installment.isPaid = true;
                installment.paidDate = new Date();
                installment.proofImageUrl = payment.proofImageUrl;
              }

              // Extract tree count from product name
              const extractTreeCount = (productName: string): number => {
                if (!productName) return 1;
                if (productName.includes("1 Pohon")) return 1;
                if (productName.includes("10 Pohon")) return 10;
                return 10; // Default for backward compatibility
              };

              // Update investor totals
              existingInvestor.totalPaid += payment.amount;
              existingInvestor.jumlahPohon += extractTreeCount(
                payment.productName
              ); // First installment approved = get the plants

              await existingInvestor.save({ session: mongoSession });

              console.log(
                "Investor record created/updated for first cicilan installment approval:",
                payment.cicilanOrderId
              );
            }
          } else {
            // For subsequent installments, just update existing investor record
            const investor = await Investor.findOne({
              userId: payment.userId,
            }).session(mongoSession);
            if (investor) {
              // Find the investment and installment
              const investment = investor.investments.find(
                (inv: any) => inv.investmentId === payment.cicilanOrderId
              );
              if (investment) {
                const installment = investment.installments?.find(
                  (inst: any) =>
                    inst.installmentNumber === payment.installmentNumber
                );
                if (installment) {
                  installment.isPaid = true;
                  installment.paidDate = new Date();
                  installment.proofImageUrl = payment.proofImageUrl;
                }

                // Update investment amount paid
                investment.amountPaid += payment.amount;
              }

              // Update total paid amount for the investor
              investor.totalPaid += payment.amount;
              await investor.save({ session: mongoSession });
            }
          }

          // After approving any installment (both first and subsequent), create the next installment payment if it doesn't exist yet
          if (payment.installmentNumber < payment.totalInstallments) {
            const nextInstallmentNumber = payment.installmentNumber + 1;

            // Check if next installment payment already exists
            const existingNextPayment = await Payment.findOne({
              cicilanOrderId: payment.cicilanOrderId,
              installmentNumber: nextInstallmentNumber,
            }).session(mongoSession);

            if (!existingNextPayment) {
              // Calculate next installment due date based on payment term
              const termToMonths = {
                monthly: 1,
                quarterly: 3,
                semiannual: 6,
                annual: 12,
              };
              const paymentTermMonths =
                termToMonths[
                  payment.paymentTerm as keyof typeof termToMonths
                ] || 1;

              const nextDueDate = new Date(payment.dueDate);
              nextDueDate.setMonth(nextDueDate.getMonth() + paymentTermMonths);

              // Create next installment payment record
              const nextInstallmentOrderId = `${payment.cicilanOrderId}-INST-${nextInstallmentNumber}`;
              const nextInstallment = new Payment({
                orderId: nextInstallmentOrderId,
                userId: payment.userId,
                amount: payment.installmentAmount,
                currency: "IDR",
                paymentType: "cicilan-installment",
                cicilanOrderId: payment.cicilanOrderId,
                installmentNumber: nextInstallmentNumber,
                totalInstallments: payment.totalInstallments,
                installmentAmount: payment.installmentAmount,
                paymentTerm: payment.paymentTerm,
                dueDate: nextDueDate,
                productName: payment.productName,
                productId: payment.productId,
                adminStatus: "pending",
                status: "pending",
                isProcessed: false,
              });

              await nextInstallment.save({ session: mongoSession });
              console.log(
                `Next installment created: ${nextInstallmentOrderId} due ${nextDueDate.toISOString()}`
              );

              // Also add the next installment to the investor record
              const investorForNextInstallment = await Investor.findOne({
                userId: payment.userId,
              }).session(mongoSession);
              if (investorForNextInstallment) {
                const investmentForNextInstallment =
                  investorForNextInstallment.investments.find(
                    (inv: any) => inv.investmentId === payment.cicilanOrderId
                  );
                if (
                  investmentForNextInstallment &&
                  investmentForNextInstallment.installments
                ) {
                  // Check if this installment already exists in investor record
                  const existingInstallmentInInvestor =
                    investmentForNextInstallment.installments.find(
                      (inst: any) =>
                        inst.installmentNumber === nextInstallmentNumber
                    );

                  if (!existingInstallmentInInvestor) {
                    investmentForNextInstallment.installments.push({
                      installmentNumber: nextInstallmentNumber,
                      amount: payment.installmentAmount,
                      dueDate: nextDueDate,
                      isPaid: false,
                      paidDate: null,
                      proofImageUrl: null,
                    });

                    await investorForNextInstallment.save({
                      session: mongoSession,
                    });
                    console.log(
                      `Added installment ${nextInstallmentNumber} to investor record for ${payment.cicilanOrderId}`
                    );
                  }
                }
              }
            }
          }

          // Create commission record if payment is approved, it's the first installment, and has referral code
          if (action === "approve" && payment.installmentNumber === 1 && payment.referralCode) {
            try {
              const commissionResult = await createCommissionRecord(payment._id.toString());
              if (commissionResult.success) {
                console.log(`Commission created for cicilan payment ${paymentId}: ${commissionResult.message}`);
              } else {
                console.log(`Commission creation skipped for cicilan payment ${paymentId}: ${commissionResult.message}`);
              }
            } catch (commissionError) {
              console.error(`Error creating commission for cicilan payment ${paymentId}:`, commissionError);
              // Don't fail the approval for commission errors
            }
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: `Payment ${
          action === "approve" ? "approved" : "rejected"
        } successfully`,
      });
    } finally {
      await mongoSession.endSession();
    }
  } catch (error) {
    console.error("Error reviewing installment:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
