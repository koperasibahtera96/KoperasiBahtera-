import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import PlantInstance from "@/models/PlantInstance";
import { NextResponse } from "next/server";

// GET /api/admin/laporan - Get report data for all investors
export async function GET() {
  try {
    await dbConnect();

    // Get all investors and plant instances
    const investors = await Investor.find({});
    const plantInstances = await PlantInstance.find({});

    // Group plant instances by investor
    const investorReports = investors.map((investor) => {
      // Find plant instances related to this investor through their investments
      const investorPlantInstances = plantInstances.filter((plantInstance) => {
        return investor.investments.some(
          (a: any) =>
            a.plantInstanceId?.toString() === plantInstance._id.toString()
        );
      });

      // Calculate plant statistics for this investor
      const plantStats = {
        total: investorPlantInstances.length,
        byCondition: {
          sehat: investorPlantInstances.filter(
            (p: any) =>
              p.status === "Tanam Bibit" ||
              p.status === "Tumbuh Sehat" ||
              p.status === "sehat"
          ).length,
          perlu_perawatan: investorPlantInstances.filter(
            (p: any) =>
              p.status === "Perlu Perawatan" || p.status === "perlu_perawatan"
          ).length,
          sakit: investorPlantInstances.filter(
            (p) =>
              p.status === "Bermasalah" ||
              p.status === "Sakit" ||
              p.status === "sakit"
          ).length,
        },
        bySpecies: investorPlantInstances.reduce((acc, plantInstance) => {
          const type = plantInstance.plantType;
          if (!acc[type]) {
            acc[type] = 0;
          }
          acc[type]++;
          return acc;
        }, {} as Record<string, number>),
        avgAge: 0, // PlantInstance doesn't have age field, will calculate from createdAt
        avgHeight: 0, // PlantInstance doesn't have height field
      };

      // Calculate average age based on creation date (in months)
      if (investorPlantInstances.length > 0) {
        const now = new Date();
        const totalAgeInMonths = investorPlantInstances.reduce(
          (sum, plantInstance) => {
            const createdDate = new Date(plantInstance.createdAt);
            const ageInMonths = Math.floor(
              (now.getTime() - createdDate.getTime()) /
                (1000 * 60 * 60 * 24 * 30)
            );
            return sum + Math.max(0, ageInMonths);
          },
          0
        );
        plantStats.avgAge = Math.round(
          totalAgeInMonths / investorPlantInstances.length
        );
      }

      return {
        investor: {
          _id: investor._id,
          name: investor.name,
          email: investor.email,
          totalInvestasi: investor.totalInvestasi,
          jumlahPohon: investor.jumlahPohon,
          status: investor.status,
          createdAt: investor.createdAt,
        },
        trees: investorPlantInstances.map((plantInstance) => {
          // Calculate age in months from creation date
          const now = new Date();
          const createdDate = new Date(plantInstance.createdAt);
          const ageInMonths = Math.floor(
            (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );

          return {
            _id: plantInstance._id,
            spesiesPohon: `${plantInstance.instanceName}`,
            lokasi: plantInstance.location || "Lokasi tidak tersedia",
            umur: Math.max(0, ageInMonths),
            tinggi: 0, // PlantInstance doesn't have height field
            tanggalTanam: plantInstance.createdAt,
            kondisi:
              plantInstance.status === "Tanam Bibit" ||
              plantInstance.status === "Tumbuh Sehat" ||
              plantInstance.status === "sehat"
                ? "sehat"
                : plantInstance.status === "Perlu Perawatan" ||
                  plantInstance.status === "perlu_perawatan"
                ? "perlu_perawatan"
                : "sakit",
            createdAt: plantInstance.createdAt,
          };
        }),
        statistics: plantStats,
      };
    });

    // Calculate overall statistics
    const overallStats = {
      totalInvestors: investors.length,
      totalTrees: plantInstances.length,
      activeInvestors: investors.filter((inv) => inv.status === "active")
        .length,
      inactiveInvestors: investors.filter((inv) => inv.status === "inactive")
        .length,
    };

    return NextResponse.json({
      success: true,
      data: {
        reports: investorReports,
        summary: overallStats,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/laporan error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch report data" },
      { status: 500 }
    );
  }
}
