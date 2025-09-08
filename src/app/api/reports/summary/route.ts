import { ensureConnection } from "@/lib/utils/database";
import { Member, PlantInstance } from "@/models";
import { NextResponse } from "next/server";

// Calculate totals by plant type
interface PlantTypeSummaryItem {
  id: string;
  name: string;
  plantType: string;
  totalInvestment: number;
  totalIncome: number;
  totalExpenses: number;
  instanceCount: number;
  investorCount: number;
}

export async function GET() {
  try {
    await ensureConnection();

    // Get all plant instances
    const plants = await PlantInstance.find({}).lean();
    const members = await Member.find({}).lean();

    // Calculate totals by plant type
    const plantTypeSummary = plants.reduce(
      (acc: Record<string, PlantTypeSummaryItem>, plant) => {
        const type = plant.plantType;
        if (!acc[type]) {
          acc[type] = {
            id: type,
            name: type.charAt(0).toUpperCase() + type.slice(1),
            plantType: type,
            totalInvestment: 0,
            totalIncome: 0,
            totalExpenses: 0,
            instanceCount: 0,
            investorCount: 0,
          };
        }

        acc[type].instanceCount++;
        acc[type].totalIncome += plant.incomeRecords.reduce(
          (sum: number, record: any) => sum + record.amount,
          0
        );
        acc[type].totalExpenses += plant.operationalCosts.reduce(
          (sum: number, cost: any) => sum + cost.amount,
          0
        );

        // Count unique investors for this plant type
        const investorsForType = new Set();
        members.forEach((member: any) => {
          const hasInvestmentInType = member.investments.some((inv: any) => {
            const plantInstance = plants.find(
              (p: any) => p.id === inv.plantInstanceId
            );
            return plantInstance && plantInstance.plantType === type;
          });
          if (hasInvestmentInType) {
            investorsForType.add(member._id.toString());
          }
        });
        acc[type].investorCount = investorsForType.size;

        // Calculate total investment for this plant type
        const investmentForType = members.reduce((sum: number, member: any) => {
          const memberInvestment = member.investments
            .filter((inv: any) => {
              const plantInstance = plants.find(
                (p: any) => p.id === inv.plantInstanceId
              );
              return plantInstance && plantInstance.plantType === type;
            })
            .reduce((invSum: number, inv: any) => invSum + inv.amount, 0);
          return sum + memberInvestment;
        }, 0);
        acc[type].totalInvestment += investmentForType;

        return acc;
      },
      {}
    );

    // Convert to array and calculate ROI and profit
    const plantSummaries = Object.values(plantTypeSummary).map((type: any) => ({
      ...type,
      totalProfit: type.totalIncome - type.totalExpenses,
      roi:
        type.totalInvestment > 0
          ? ((type.totalIncome - type.totalExpenses) / type.totalInvestment) *
            100
          : 0,
    }));

    // Overall totals
    const overallTotals = plantSummaries.reduce(
      (acc, type) => ({
        totalInvestment: acc.totalInvestment + type.totalInvestment,
        totalIncome: acc.totalIncome + type.totalIncome,
        totalExpenses: acc.totalExpenses + type.totalExpenses,
        netProfit: acc.netProfit + type.totalProfit,
        totalMembers: members.length,
        totalPlants: plants.length,
      }),
      {
        totalInvestment: 0,
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        totalMembers: 0,
        totalPlants: 0,
      }
    );

    const overallROI =
      overallTotals.totalInvestment > 0
        ? (overallTotals.netProfit / overallTotals.totalInvestment) * 100
        : 0;

    return NextResponse.json({
      plantSummaries,
      plantTypes: plantSummaries, // Added plantTypes alias for backward compatibility
      overallTotals: {
        ...overallTotals,
        roi: overallROI,
      },
    });
  } catch (error) {
    console.error("Summary API error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary report" },
      { status: 500 }
    );
  }
}
