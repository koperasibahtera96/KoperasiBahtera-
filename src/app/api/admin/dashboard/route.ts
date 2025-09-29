import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import PlantInstance from "@/models/PlantInstance";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

// Helper function to calculate percentage change
function calculatePercentageChange(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+100%" : "0%";
  }

  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${Math.round(change)}%`;
}

// GET /api/admin/dashboard - Get dashboard data
export async function GET(_request: NextRequest) {
  try {
    await dbConnect();

    // Get all investors, plant instances, and users
    const [investors, plantInstances, users] = await Promise.all([
      Investor.find({}),
      PlantInstance.find({}),
      User.countDocuments({}),
    ]);

    // Get date ranges for current and previous months
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const endOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59
    );

    // Filter data for current and previous months
    const currentMonthInvestors = investors.filter(
      (inv) => new Date(inv.createdAt) >= startOfCurrentMonth
    );
    const previousMonthInvestors = investors.filter(
      (inv) =>
        new Date(inv.createdAt) >= startOfPreviousMonth &&
        new Date(inv.createdAt) <= endOfPreviousMonth
    );

    const currentMonthPlants = plantInstances.filter(
      (plant) => new Date(plant.createdAt) >= startOfCurrentMonth
    );
    const previousMonthPlants = plantInstances.filter(
      (plant) =>
        new Date(plant.createdAt) >= startOfPreviousMonth &&
        new Date(plant.createdAt) <= endOfPreviousMonth
    );

    // Calculate investor statistics
    const totalInvestors = investors.length;
    const activeInvestors = investors.filter(
      (inv) => inv.status === "active"
    ).length;
    const inactiveInvestors = investors.filter(
      (inv) => inv.status === "inactive"
    ).length;
    const totalInvestment = investors.reduce(
      (sum, inv) => sum + inv.totalInvestasi,
      0
    );

    const currentMonthInvestment = currentMonthInvestors.reduce(
      (sum, inv) => sum + inv.totalInvestasi,
      0
    );
    const previousMonthInvestment = previousMonthInvestors.reduce(
      (sum, inv) => sum + inv.totalInvestasi,
      0
    );

    // Calculate plant statistics
    const totalPlants = plantInstances.length;
    const plantsByStatus = {
      active: plantInstances.filter(
        (p) => p.status === "Tanam Bibit" || p.status === "Tumbuh Sehat"
      ).length,
      maintenance: plantInstances.filter((p) => p.status === "Perlu Perawatan")
        .length,
      problem: plantInstances.filter(
        (p) => p.status === "Bermasalah" || p.status === "Sakit"
      ).length,
    };

    // Group plants by type (get top 3)
    const plantsByType = plantInstances.reduce(
      (acc: Record<string, number>, plant) => {
        const type = plant.plantType;
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type]++;
        return acc;
      },
      {}
    );

    // Calculate plant type growth for current vs previous month
    const currentMonthPlantsByType = currentMonthPlants.reduce(
      (acc: Record<string, number>, plant) => {
        const type = plant.plantType;
        if (!acc[type]) acc[type] = 0;
        acc[type]++;
        return acc;
      },
      {}
    );

    const previousMonthPlantsByType = previousMonthPlants.reduce(
      (acc: Record<string, number>, plant) => {
        const type = plant.plantType;
        if (!acc[type]) acc[type] = 0;
        acc[type]++;
        return acc;
      },
      {}
    );

    const topPlantTypes = Object.entries(plantsByType)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([type, count], index) => {
        const currentCount = currentMonthPlantsByType[type] || 0;
        const previousCount = previousMonthPlantsByType[type] || 0;
        const growth = calculatePercentageChange(currentCount, previousCount);

        return {
          name: type,
          count: count as number,
          color: index === 0 ? "amber" : index === 1 ? "green" : "emerald",
          growth,
        };
      });

    // Get recent investors (last 4) - sorted by most recent investment or creation date
    const recentInvestors = investors
      .map(investor => {
        // Get the most recent investment date for this investor
        const mostRecentInvestmentDate = investor.investments && investor.investments.length > 0
          ? Math.max(...investor.investments.map((inv: any) => new Date(inv.investmentDate).getTime()))
          : new Date(investor.createdAt).getTime();

        return {
          ...investor.toObject(),
          mostRecentActivity: new Date(mostRecentInvestmentDate)
        };
      })
      .sort(
        (a, b) => b.mostRecentActivity.getTime() - a.mostRecentActivity.getTime()
      )
      .slice(0, 4)
      .map((investor) => ({
        id: investor._id,
        name: investor.name,
        email: investor.email,
        investment: `Rp ${investor.totalInvestasi.toLocaleString("id-ID")}`,
        date: investor.mostRecentActivity.toISOString().split("T")[0],
        status: investor.status,
      }));

    // Calculate average plant age - using months since creation
    const avgPlantAge =
      plantInstances.length > 0
        ? Math.round(
            plantInstances.reduce((sum, plant) => {
              const monthsSincePlanting = Math.round(
                (Date.now() - new Date(plant.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24 * 30)
              );
              return sum + Math.max(0, monthsSincePlanting);
            }, 0) / plantInstances.length
          )
        : 0;

    // Format total investment
    const formattedTotalInvestment =
      totalInvestment >= 1000000000
        ? `Rp ${(totalInvestment / 1000000000).toFixed(1)}B`
        : totalInvestment >= 1000000
        ? `Rp ${(totalInvestment / 1000000).toFixed(1)}M`
        : `Rp ${totalInvestment.toLocaleString("id-ID")}`;

    // Calculate month-over-month percentage changes
    const investorGrowth = calculatePercentageChange(
      currentMonthInvestors.length,
      previousMonthInvestors.length
    );
    const plantGrowth = calculatePercentageChange(
      currentMonthPlants.length,
      previousMonthPlants.length
    );
    const investmentGrowth = calculatePercentageChange(
      currentMonthInvestment,
      previousMonthInvestment
    );

    // Calculate average ROI growth (simplified - you might want to enhance this)
    const avgROIGrowth =
      plantInstances.length > 0
        ? calculatePercentageChange(avgPlantAge, Math.max(1, avgPlantAge - 1))
        : "0%";

    // Build dashboard data
    const dashboardData = {
      stats: {
        totalInvestors,
        totalTrees: totalPlants,
        activeInvestment: formattedTotalInvestment,
        averageTreeAge: `${avgPlantAge} bulan`,
        monthlyGrowth: {
          investors: investorGrowth,
          trees: plantGrowth,
          investment: investmentGrowth,
          roi: avgROIGrowth,
        },
      },
      recentInvestors,
      treeStats: topPlantTypes.map((type) => ({
        name: type.name,
        count: type.count,
        value: `${type.count} tanaman`,
        growth: type.growth,
        color: type.color,
      })),
      investorStats: {
        active: activeInvestors,
        inactive: inactiveInvestors,
        total: totalInvestors,
      },
      treeConditionStats: plantsByStatus,
      summary: {
        totalInvestors,
        totalTrees: totalPlants,
        totalInvestment,
        activeInvestors,
        avgTreeAge: avgPlantAge,
        totalUsers: users,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        ...dashboardData,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

// POST /api/admin/dashboard/refresh - Refresh dashboard data
export async function POST() {
  try {
    // Just call GET to refresh the data
    const request = new Request("http://localhost/api/admin/dashboard");
    return GET(request as NextRequest);
  } catch (error) {
    console.error("POST /api/admin/dashboard/refresh error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to refresh dashboard data" },
      { status: 500 }
    );
  }
}
