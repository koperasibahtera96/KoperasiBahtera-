import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Investor } from "@/models";
import Contract from "@/models/Contract";
import User from "@/models/User";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

async function getUserName(userId: string): Promise<string> {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return userId; // Return original if not a valid ObjectId
    }
    const user = await User.findById(userId).select("fullName");
    return user ? user.fullName : userId;
  } catch (error) {
    console.error("Error getting user name:", error);
    return userId; // Return original ID if lookup fails
  }
}

async function populateHistoryUserNames(history: any[]): Promise<any[]> {
  if (!history || history.length === 0) return history;

  const populatedHistory = await Promise.all(
    history.map(async (item) => ({
      ...item,
      addedBy: item.addedBy ? await getUserName(item.addedBy) : item.addedBy,
    }))
  );

  return populatedHistory;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate if user ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find investor record for the current user
    const investor = await Investor.findOne({
      userId: session.user.id,
    }).populate("investments.plantInstanceId");

    if (!investor) {
      // Return empty data instead of error for users with no investments yet
      return NextResponse.json({
        success: true,
        data: {
          investments: [],
          totalInvestment: 0,
          totalProfit: 0,
          overallROI: 0,
        },
      });
    }

    // Calculate investment summary
    const investments = investor.investments || [];
    const totalAmount = investments.reduce(
      (sum: number, inv: any) => sum + (Number(inv.totalAmount) || 0),
      0
    );
    const totalPaid = investments.reduce(
      (sum: number, inv: any) => sum + (Number(inv.amountPaid) || 0),
      0
    );
    const jumlahPohon = investor.jumlahPohon;

    // Get contract information for each investment
    const investmentData = await Promise.all(
      investments.map(async (inv: any) => {
        const totalAmount = Number(inv.totalAmount) || 0;
        const amountPaid = Number(inv.amountPaid) || 0;
        const progress =
          totalAmount > 0 ? Math.round((amountPaid / totalAmount) * 100) : 0;

        // Find related contract information
        let contractInfo = null;
        if (inv.investmentId) {
          const contract = await Contract.findOne({
            contractId: inv.investmentId,
          });
          if (contract) {
            contractInfo = {
              contractId: contract.contractId,
              adminApprovalStatus: contract.adminApprovalStatus,
              currentAttempt: contract.currentAttempt || 0,
              maxAttempts: contract.maxAttempts || 3,
              paymentAllowed: contract.paymentAllowed,
              paymentCompleted: contract.paymentCompleted,
              isMaxRetryReached:
                (contract.currentAttempt || 0) >= (contract.maxAttempts || 3),
              isPermanentlyRejected:
                contract.adminApprovalStatus === "permanently_rejected",
              // Add debug info to understand the issue
              debugInfo: {
                adminApprovalStatus: contract.adminApprovalStatus,
                currentAttempt: contract.currentAttempt,
                maxAttempts: contract.maxAttempts,
                signatureAttemptsCount: contract.signatureAttempts?.length || 0,
              },
            };
          }
        }

        // Populate user names in recent costs
        const recentCosts = await Promise.all(
          (inv.plantInstanceId?.operationalCosts?.slice(-3) || []).map(
            async (cost: any) => ({
              id: cost.id,
              date: cost.date,
              description: cost.description,
              amount: cost.amount,
              addedBy: cost.addedBy
                ? await getUserName(cost.addedBy)
                : cost.addedBy,
            })
          )
        );

        // Populate user names in recent income
        const recentIncome = await Promise.all(
          (inv.plantInstanceId?.incomeRecords?.slice(-3) || []).map(
            async (income: any) => ({
              id: income.id,
              date: income.date,
              description: income.description,
              amount: income.amount,
              addedBy: income.addedBy
                ? await getUserName(income.addedBy)
                : income.addedBy,
            })
          )
        );

        // Populate user names in history
        const populatedHistory = inv.plantInstanceId?.history
          ? await populateHistoryUserNames(inv.plantInstanceId.history)
          : [];

        return {
          investmentId: inv.investmentId || inv._id.toString(),
          productName: inv.productName,
          paymentType: inv.paymentType,
          status: inv.status || "active",
          totalAmount,
          amountPaid,
          progress,
          investmentDate: inv.investmentDate,
          completionDate: inv.completionDate,
          nextPaymentInfo: inv.nextPaymentInfo,
          contractInfo,
          plantInstance: inv.plantInstanceId
            ? {
                id: inv.plantInstanceId._id.toString(),
                plantType: inv.plantInstanceId.plantType,
                instanceName: inv.plantInstanceId.instanceName,
                baseAnnualROI: inv.plantInstanceId.baseAnnualROI,
                location: inv.plantInstanceId.location,
                kavling: inv.plantInstanceId.kavling,
                blok: inv.plantInstanceId.blok,
                status: inv.plantInstanceId.status,
                qrCode: inv.plantInstanceId.qrCode,
                fotoGambar: inv.plantInstanceId.fotoGambar,
                owner: inv.plantInstanceId.owner,
                contractNumber: inv.plantInstanceId.contractNumber,
                totalOperationalCosts:
                  inv.plantInstanceId.operationalCosts?.reduce(
                    (sum: number, cost: any) => sum + cost.amount,
                    0
                  ) || 0,
                totalIncome:
                  inv.plantInstanceId.incomeRecords?.reduce(
                    (sum: number, income: any) => sum + income.amount,
                    0
                  ) || 0,
                recentCosts,
                recentIncome,
                history: populatedHistory,
                lastUpdate: inv.plantInstanceId.lastUpdate,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        userInfo: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
          phoneNumber: "", // You might want to add this to your user model
        },
        totalInvestments: investments.length,
        totalAmount,
        totalPaid,
        jumlahPohon,
        investments: investmentData,
      },
    });
  } catch (error) {
    console.error("Error fetching investor investments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
