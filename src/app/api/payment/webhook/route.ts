import { occupationOptions } from "@/constant/OCCUPATION";
import { midtransService } from "@/lib/midtrans";
import dbConnect from "@/lib/mongodb";
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
    } else if (shouldCreateUser && !payment.isProcessed && orderId.startsWith("CONTRACT-")) {
      // Investment payments - create PlantInstance and investor record
      console.log(
        "Investment payment successful - creating PlantInstance and investor record for:",
        orderId
      );

      // Start MongoDB transaction to prevent duplicates
      const mongoSession = await mongoose.startSession();
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        console.log(`🔄 [${transactionId}] Starting transaction for ${orderId}`);
        await mongoSession.withTransaction(async () => {
          console.log(`📦 [${transactionId}] Inside transaction callback for ${orderId}`);
          
          // Find the user for this payment
          const user = await User.findById(payment.userId).session(mongoSession);
          if (!user) {
            throw new Error("User not found for investment payment");
          }
          console.log(`👤 [${transactionId}] Found user: ${user._id}`);

          // Check if this investment has already been processed to prevent duplicates
          console.log(`🔍 [${transactionId}] Checking for existing investment ${orderId} for user ${user._id}`);
          const existingInvestment = await Investor.findOne({ 
            userId: user._id,
            "investments.investmentId": orderId
          }).session(mongoSession);

          if (existingInvestment) {
            console.log(`⚠️ [${transactionId}] Investment ${orderId} already processed, skipping duplicate creation`);
            // Don't return early - still need to update contract status
          } else {
            console.log(`✅ [${transactionId}] No existing investment found, proceeding with creation for ${orderId}`);

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

            // Check if PlantInstance already exists to prevent duplicates
            console.log(`🌱 [${transactionId}] Checking for existing PlantInstance with contractNumber: ${orderId}`);
            let savedPlantInstance = await PlantInstance.findOne({
              contractNumber: orderId // orderId is already CONTRACT-... format
            }).session(mongoSession);

            if (!savedPlantInstance) {
              console.log(`🌱 [${transactionId}] No existing PlantInstance found, creating new one`);
              // Create new PlantInstance with FULLY deterministic data to prevent duplicates on transaction retries
              const plantInstanceId = `PLANT-${payment.orderId}-${orderId.slice(-8)}`;
              
              const productName = payment.productName || "gaharu";
              const plantType = getPlantType(productName);
              const instanceName = `${
                plantType.charAt(0).toUpperCase() + plantType.slice(1)
              } - ${user.fullName}`;
              const adminName = await getFirstAdminName();

              // Use deterministic history ID based on orderId to prevent duplicates on retries
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
                contractNumber: orderId, // orderId is already CONTRACT-... format
                location: "TBD",
                status: "active", // Payment succeeded, plant is now active
                lastUpdate: new Date().toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }),
                history: [
                  {
                    id: deterministicHistoryId,
                    action: "Kontrak Baru",
                    type: "Kontrak Baru",
                    date: new Date().toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }),
                    description: `Tanaman baru dibuat dengan pembayaran full untuk user ${user.fullName}`,
                    addedBy: adminName,
                  },
                ],
              });

              try {
                savedPlantInstance = await plantInstance.save({ session: mongoSession });
                console.log(`🌱 [${transactionId}] Created new PlantInstance for ${orderId}: ${savedPlantInstance._id}`);
              } catch (duplicateError) {
                // If save fails due to duplicate key (transaction retry), try to find existing one
                console.log(`🌱 [${transactionId}] PlantInstance creation failed (likely duplicate), searching for existing one`);
                savedPlantInstance = await PlantInstance.findOne({
                  contractNumber: orderId // orderId is already CONTRACT-... format
                }).session(mongoSession);
                
                if (!savedPlantInstance) {
                  throw duplicateError; // Re-throw if it's not a duplicate issue
                }
                console.log(`🌱 [${transactionId}] Found existing PlantInstance after creation failure: ${savedPlantInstance._id}`);
              }
            } else {
              console.log(`🌱 [${transactionId}] PlantInstance already exists for ${orderId}, reusing: ${savedPlantInstance._id}`);
            }

            // Create investment record for investor collection
            const productName = payment.productName || "gaharu";
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

            // Check if investor already exists
            console.log(`💰 [${transactionId}] Checking for existing investor for user: ${user._id}`);
            let existingInvestor = await Investor.findOne({ userId: user._id }).session(mongoSession);

            if (existingInvestor) {
              // Update existing investor
              console.log(`💰 [${transactionId}] Found existing investor: ${existingInvestor._id}, updating with investment`);
              existingInvestor.name = user.fullName;
              existingInvestor.phoneNumber = user.phoneNumber;
              existingInvestor.status = "active";
              existingInvestor.investments.push(investmentRecord);
              existingInvestor.totalInvestasi += payment.amount;
              existingInvestor.totalPaid += payment.amount;
              existingInvestor.jumlahPohon += extractTreeCount(payment.productName);
              await existingInvestor.save({ session: mongoSession });
              console.log(`💰 [${transactionId}] Updated existing investor for ${orderId}: ${existingInvestor._id} (${existingInvestor.investments.length} total investments)`);
            } else {
              // Create new investor
              console.log(`💰 [${transactionId}] No existing investor found, creating new one`);
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
              await existingInvestor.save({ session: mongoSession });
              console.log(`💰 [${transactionId}] Created new investor for ${orderId}: ${existingInvestor._id}`);
            }

            console.log(`✅ [${transactionId}] Investment processing completed successfully for ${orderId}`);
          }


            const contract = await Contract.findOne({ contractId: orderId }).session(mongoSession);
            if (contract) {
              contract.paymentCompleted = true;
              await contract.save({ session: mongoSession });
              console.log(`📄 [${transactionId}] Contract ${orderId} marked as paymentCompleted: true`);
            } else {
              console.log(`⚠️ [${transactionId}] Contract not found for ${orderId}, payment successful but contract status not updated`);
            }
      
            const investorToUpdate = await Investor.findOne({ 
              userId: user._id,
              "investments.investmentId": orderId
            }).session(mongoSession);

            if (investorToUpdate) {
              // Find and update the specific investment
              const investment = investorToUpdate.investments.find(
                (inv: any) => inv.investmentId === orderId
              );
              if (investment) {
                investment.amountPaid = payment.amount;
                investment.status = "approved";
                investment.completionDate = new Date();
                await investorToUpdate.save({ session: mongoSession });
                console.log(`💰 [${transactionId}] Updated investor amountPaid for ${orderId}: ${payment.amount}`);
              }
            }

          console.log(`✅ [${transactionId}] All updates completed successfully for ${orderId}`);

          // Set contract redirect URL for successful payment
          payment.contractRedirectUrl = `/contract/${orderId}`;
        });
        console.log(`🎯 [${transactionId}] Transaction successfully committed for ${orderId}`);
      } catch (investorError) {
        console.error(
          `❌ [${transactionId}] Error in transaction for ${orderId}:`,
          investorError
        );
        payment.processingError = `Investment processing failed: ${
          investorError instanceof Error
            ? investorError.message
            : "Unknown error"
        }`;
      } finally {
        await mongoSession.endSession();
        console.log(`🔚 [${transactionId}] Transaction session ended for ${orderId}`);
      }

      payment.isProcessed = true;
      payment.status = "completed"; // Mark payment as completed
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
