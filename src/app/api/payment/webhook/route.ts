import { occupationOptions } from "@/constant/OCCUPATION";
import { midtransService } from "@/lib/midtrans";
import dbConnect from "@/lib/mongodb";
import { createCommissionRecord } from "@/lib/commission";
import { getFirstAdminName } from "@/lib/utils/admin";
import { Investor } from "@/models";
import Contract from "@/models/Contract";
import Payment from "@/models/Payment";
import PlantInstance from "@/models/PlantInstance";
import User from "@/models/User";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// Helper function to extract tree count from product name
function extractTreeCount(productName: string): number {
  if (!productName) return 1; // Default fallback
  if (productName.includes("1 Pohon")) return 1;
  if (productName.includes("10 Pohon")) return 10;
  return 10;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Midtrans webhook received:", body);

    // Handle test notifications from Midtrans Dashboard
    if (body.order_id?.includes("payment_notif_test")) {
      console.log("🧪 Test notification received from Midtrans Dashboard");
      return NextResponse.json({
        success: true,
        message: "Test notification received successfully",
      });
    }

    // Verify the notification
    await midtransService.verifyNotification(body);

    const orderId = body.order_id;
    const transactionId = body.transaction_id;
    const transactionStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    console.log(`🔍 orderId: ${orderId}, transactionId: ${transactionId}`);
    console.log(
      `Transaction ${orderId} status: ${transactionStatus}, fraud: ${fraudStatus}`
    );

    await dbConnect();

    // Find the payment record
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      console.error(`Payment not found for order: "${orderId}"`);
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    // Update payment status
    payment.transactionId = transactionId;
    payment.transactionStatus = transactionStatus;
    payment.fraudStatus = fraudStatus;
    payment.transactionTime = new Date(body.transaction_time);
    payment.midtransResponse = body;
    payment.status = "completed";

    let message = "";
    let shouldCreateUser = false;

    // Transaction status handling
    if (transactionStatus === "capture") {
      if (fraudStatus === "challenge") {
        message = "Transaction is challenged by FDS";
        payment.processingError = "Transaction challenged by fraud detection";
      } else if (fraudStatus === "accept") {
        message = "Transaction successful";
        shouldCreateUser = true;
        payment.settlementTime = new Date();
      }
    } else if (transactionStatus === "settlement") {
      message = "Transaction successful";
      shouldCreateUser = true;
      payment.settlementTime = new Date();
    } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
      message = "Transaction failed";
      payment.processingError = `Transaction ${transactionStatus}`;
    } else if (transactionStatus === "pending") {
      message = "Transaction pending";
    }

    // REG user creation
    if (
      shouldCreateUser &&
      !payment.isProcessed &&
      payment.customerData &&
      orderId.startsWith("REG-")
    ) {
      const existingUser = await User.findOne({
        $or: [
          { email: payment.customerData.email },
          { phoneNumber: payment.customerData.phoneNumber },
        ],
      });

      if (existingUser) {
        console.log("User already exists, skipping creation");
        payment.processingError = "User already exists";
      } else {
        const hashedPassword = payment.customerData.password;
        const occupationData = occupationOptions.find(
          (opt) => opt.value === payment.customerData.occupation
        );
        const occupationCode = occupationData?.code || "999";
        const currentYear = new Date().getFullYear().toString().slice(-2);

        const lastUser = await User.findOne({})
          .sort({ userCode: -1 })
          .select("userCode");

        let sequential = 1;
        if (lastUser?.userCode) {
          const match = lastUser.userCode.match(/BMS-\d+\.(\d+)$/);
          if (match) sequential = parseInt(match[1]) + 1;
        }

        const userCode = `BMS-${currentYear}${occupationCode}.${sequential
          .toString()
          .padStart(4, "0")}`;

        const user = new User({
          ...payment.customerData,
          password: hashedPassword,
          occupationCode,
          userCode,
          role: "user",
          isEmailVerified: false,
          isPhoneVerified: false,
          isActive: true,
        });

        await user.save();

        payment.userId = user._id;
        payment.isProcessed = true;
        message = `Transaction successful - User created: ${userCode}`;
      }
    }

    // CONTRACT payments
    if (
      (transactionStatus === "settlement" ||
        (transactionStatus === "capture" && fraudStatus === "accept")) &&
      orderId.startsWith("CONTRACT-")
    ) {
      const mongoSession = await mongoose.startSession();
      const txnId = `TXN-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      await mongoSession.withTransaction(async () => {
        const user = await User.findById(payment.userId).session(mongoSession);
        if (!user) throw new Error("User not found for investment payment");

        const getPlantType = (
          productName: string
        ): "gaharu" | "alpukat" | "jengkol" | "aren" => {
          const name = productName.toLowerCase();
          if (name.includes("gaharu")) return "gaharu";
          if (name.includes("alpukat")) return "alpukat";
          if (name.includes("jengkol")) return "jengkol";
          if (name.includes("aren")) return "aren";
          return "gaharu";
        };

        const getBaseROI = (plantType: "gaharu" | "alpukat" | "jengkol" | "aren") => {
          const roiMap = { gaharu: 0.15, alpukat: 0.12, jengkol: 0.1, aren: 0.18 };
          return roiMap[plantType] || 0.12;
        };

        let savedPlantInstance = await PlantInstance.findOne({
          contractNumber: orderId,
        }).session(mongoSession);

        if (!savedPlantInstance) {
          const plantInstanceId = `PLANT-${payment.orderId}-${orderId.slice(-8)}`;
          const productName = payment.productName || "gaharu";
          const plantType = getPlantType(productName);
          const instanceName = `${plantType.charAt(0).toUpperCase() + plantType.slice(1)} - ${
            user.fullName
          }`;
          const adminName = await getFirstAdminName();

          const deterministicHistoryId = `HISTORY-${orderId}-NEW`;

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
            contractNumber: orderId,
            location: "Musi Rawas Utara",
            kavling: "-",
            status: "active",
            approvalStatus: "approved",
            lastUpdate: new Date().toLocaleDateString("id-ID"),
            history: [
              {
                id: deterministicHistoryId,
                action: "Kontrak Baru",
                type: "Kontrak Baru",
                date: new Date().toLocaleDateString("id-ID"),
                description: `Tanaman baru dibuat dengan pembayaran full untuk user ${user.fullName}`,
                addedBy: adminName,
              },
            ],
          });

          savedPlantInstance = await plantInstance.save({ session: mongoSession });
        }

        const investmentRecord = {
          investmentId: orderId,
          productName: payment.productName,
          plantInstanceId: savedPlantInstance._id.toString(),
          totalAmount: payment.amount,
          amountPaid: payment.amount,
          paymentType: "full" as const,
          status: "completed" as const,
          investmentDate: new Date(),
          completionDate: new Date(),
        };

        let investor = await Investor.findOne({ userId: user._id }).session(mongoSession);
        if (investor) {
          const existingIndex = investor.investments.findIndex(
            (inv: any) => inv.investmentId === orderId
          );

          if (existingIndex !== -1) {
            const existingInvestment = investor.investments[existingIndex];
            existingInvestment.plantInstanceId = investmentRecord.plantInstanceId;
            existingInvestment.status = "approved";

            if (existingInvestment.amountPaid === 0) {
              existingInvestment.amountPaid = payment.amount;
              investor.totalPaid += payment.amount;
              investor.jumlahPohon += extractTreeCount(payment.productName);
            }
            
            existingInvestment.completionDate = new Date();
          } else {
            investor.investments.push(investmentRecord);
            investor.totalInvestasi += payment.amount;
            investor.totalPaid += payment.amount;
            investor.jumlahPohon += extractTreeCount(payment.productName);
          }
          await investor.save({ session: mongoSession });
        } else {
          investor = new Investor({
            userId: user._id,
            name: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            status: "active",
            investments: [investmentRecord],
            totalInvestasi: payment.amount,
            totalPaid: payment.amount,
            jumlahPohon: extractTreeCount(payment.productName),
          });
          await investor.save({ session: mongoSession });
        }

        const contract = await Contract.findOne({ contractId: orderId }).session(mongoSession);
        if (contract) {
          contract.paymentCompleted = true;
          await contract.save({ session: mongoSession });
          console.log(`📄 [${txnId}] Contract ${orderId} marked as paymentCompleted`);
        }

        payment.contractRedirectUrl = `/contract/${orderId}`;
        payment.isProcessed = true;
        payment.status = "completed";

        if (payment.referralCode && payment.paymentType === "full-investment") {
          const commissionResult = await createCommissionRecord(payment._id.toString());
          console.log(`Commission for ${orderId}: ${commissionResult.message}`);
        }

        await payment.save({ session: mongoSession });
      });

      await mongoSession.endSession();
      message = "Investment payment successful - Contract ready for signing";
    }

    await payment.save();
    console.log(`Processed transaction ${orderId}: ${message}`);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
