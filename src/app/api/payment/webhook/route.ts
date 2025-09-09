import { occupationOptions } from "@/constant/OCCUPATION";
import { midtransService } from "@/lib/midtrans";
import dbConnect from "@/lib/mongodb";
import { getFirstAdminId } from "@/lib/utils/admin";
import Investor from "@/models/Investor";
import Payment from "@/models/Payment";
import PlantInstance from "@/models/PlantInstance";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

// Helper function to extract tree count from product name
function extractTreeCount(productName: string): number {
  if (!productName) return 1; // Default fallback

  // Look for "1 Pohon" or "10 Pohon" in the product name
  if (productName.includes("1 Pohon")) {
    return 1;
  } else if (productName.includes("10 Pohon")) {
    return 10;
  }

  // Default to 10 if pattern not found (backward compatibility)
  return 10;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Midtrans webhook received:", body);

    // Handle test notifications from Midtrans Dashboard
    if (body.order_id && body.order_id.includes("payment_notif_test")) {
      console.log("🧪 Test notification received from Midtrans Dashboard");
      return NextResponse.json({
        success: true,
        message: "Test notification received successfully",
      });
    }

    // Verify the notification
    const _verifiedNotification = await midtransService.verifyNotification(
      body
    );

    // Use original notification body for field extraction (verified notification might have different structure)
    const orderId = body.order_id;
    const transactionId = body.transaction_id;
    const transactionStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    console.log(`🔍 RAW BODY order_id: "${body.order_id}"`);
    console.log(`🔍 RAW BODY transaction_id: "${body.transaction_id}"`);
    console.log(`🔍 EXTRACTED orderId: "${orderId}"`);
    console.log(`🔍 EXTRACTED transactionId: "${transactionId}"`);
    console.log(
      `Transaction ${orderId} status: ${transactionStatus}, fraud: ${fraudStatus}`
    );
    console.log(`🔍 Looking for payment with orderId: "${orderId}"`);
    console.log(`🔍 Transaction ID: "${transactionId}"`);

    await dbConnect();

    // Find the payment record
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      console.error(`Payment record not found for order: "${orderId}"`);
      console.log(
        `🔍 Available payments in DB:`,
        await Payment.find({}).select("orderId").lean()
      );
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    // Update payment status
    payment.transactionId = transactionId;
    payment.transactionStatus = transactionStatus;
    payment.fraudStatus = fraudStatus;
    // Note: Don't update paymentType - it's our internal type, not Midtrans payment method
    payment.transactionTime = new Date(body.transaction_time);
    payment.midtransResponse = body;

    let message = "";
    let shouldCreateUser = false;

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
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      message = "Transaction failed";
      payment.processingError = `Transaction ${transactionStatus}`;
    } else if (transactionStatus === "pending") {
      message = "Transaction pending";
    }

    // Create user account if payment is successful and not already processed
    // Only for registration payments (REG-*), not investment payments (INV-*)
    if (
      shouldCreateUser &&
      !payment.isProcessed &&
      payment.customerData &&
      orderId.startsWith("REG-")
    ) {
      try {
        // Check if user already exists
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
          // Password is already hashed from payment creation
          const hashedPassword = payment.customerData.password;

          // Get occupation code
          const occupationData = occupationOptions.find(
            (opt) => opt.value === payment.customerData.occupation
          );
          const occupationCode = occupationData?.code || "999";

          // Generate user code
          const currentYear = new Date().getFullYear().toString().slice(-2);
          const lastUserCode = await User.findOne({
            occupationCode: occupationCode,
            userCode: { $regex: `^IH-${occupationCode}-${currentYear}-` },
          })
            .sort({ userCode: -1 })
            .select("userCode");

          let sequential = 1;
          if (lastUserCode && lastUserCode.userCode) {
            const lastSequential = parseInt(
              lastUserCode.userCode.split("-")[3]
            );
            sequential = lastSequential + 1;
          }

          const userCode = `IH-${occupationCode}-${currentYear}-${sequential
            .toString()
            .padStart(3, "0")}`;

          // Create user
          const user = new User({
            email: payment.customerData.email,
            password: hashedPassword,
            fullName: payment.customerData.fullName,
            phoneNumber: payment.customerData.phoneNumber,
            dateOfBirth: payment.customerData.dateOfBirth,
            address: payment.customerData.address,
            village: payment.customerData.village,
            city: payment.customerData.city,
            province: payment.customerData.province,
            postalCode: payment.customerData.postalCode,
            occupation: payment.customerData.occupation,
            occupationCode: occupationCode,
            userCode: userCode,
            ktpImageUrl: payment.customerData.ktpImageUrl,
            faceImageUrl: payment.customerData.faceImageUrl,
            role: "user",
            isEmailVerified: false,
            isPhoneVerified: false,
            isActive: true,
          });

          await user.save();

          payment.userId = user._id;
          payment.isProcessed = true;
          message = `Transaction successful - User account created: ${userCode}`;

          console.log("User created successfully:", {
            id: user._id,
            email: user.email,
            userCode: user.userCode,
            orderId: orderId,
          });
        }
      } catch (userCreationError) {
        console.error("Error creating user:", userCreationError);
        payment.processingError = `User creation failed: ${
          userCreationError instanceof Error
            ? userCreationError.message
            : "Unknown error"
        }`;
        message = "Transaction successful but user creation failed";
      }
    } else if (shouldCreateUser && orderId.startsWith("INV-")) {
      // Investment payments - create PlantInstance and investor record
      console.log(
        "Investment payment successful - creating PlantInstance and investor record for:",
        orderId
      );

      try {
        // Find the user for this payment
        const user = await User.findById(payment.userId);
        if (!user) {
          throw new Error("User not found for investment payment");
        }

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

        // Create new PlantInstance
        const plantInstanceId = `PLANT-${payment.orderId}-${Date.now()}`;

        const productName = payment.productName || "gaharu";
        const plantType = getPlantType(productName);
        const instanceName = `${
          plantType.charAt(0).toUpperCase() + plantType.slice(1)
        } - ${user.fullName}`;

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
          contractNumber: `CONTRACT-${orderId}`,
          location: "TBD",
          status: "active", // Payment succeeded, plant is now active
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
              description: `Tanaman baru dibuat dengan pembayaran full untuk user ${user.fullName}`,
              addedBy: await getFirstAdminId(),
            },
          ],
        });

        const savedPlantInstance = await plantInstance.save();
        // Create investment record for investor collection
        const investmentRecord = {
          investmentId: orderId,
          productName: productName,
          plantInstanceId: savedPlantInstance._id.toString(),
          totalAmount: payment.amount,
          amountPaid: payment.amount, // Full payment completed
          paymentType: "full" as const,
          status: "completed" as const, // Payment succeeded
          installments: undefined,
          fullPaymentProofUrl: null, // Midtrans handles the payment proof
          investmentDate: new Date(),
          completionDate: new Date(),
        };

        // Check if investor already exists to avoid conflicts
        let existingInvestor = await Investor.findOne({ userId: user._id });

        if (existingInvestor) {
          // Update existing investor
          existingInvestor.name = user.fullName;
          existingInvestor.phoneNumber = user.phoneNumber;
          existingInvestor.status = "active";
          existingInvestor.investments.push(investmentRecord);
          existingInvestor.totalInvestasi += payment.amount;
          existingInvestor.totalPaid += payment.amount;
          existingInvestor.jumlahPohon += extractTreeCount(payment.productName);
          await existingInvestor.save();
        } else {
          // Create new investor
          existingInvestor = new Investor({
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
          await existingInvestor.save();
        }

        // Set contract redirect URL for successful payment
        payment.contractRedirectUrl = `/contract/${orderId}`;
      } catch (investorError) {
        console.error(
          "Error creating PlantInstance and investor record:",
          investorError
        );
        payment.processingError = `Investment processing failed: ${
          investorError instanceof Error
            ? investorError.message
            : "Unknown error"
        }`;
      }

      payment.isProcessed = true;
      message = "Investment payment successful - Contract ready for signing";
    }

    await payment.save();
    console.log(`Processed transaction ${orderId}: ${message}`);

    return NextResponse.json({
      success: true,
      message,
    });
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
