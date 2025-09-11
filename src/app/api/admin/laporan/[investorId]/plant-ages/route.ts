import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import PlantInstance from "@/models/PlantInstance";
import { NextResponse } from "next/server";

// Helper function to calculate detailed age (years, months, days)
function calculateDetailedAge(startDate: Date, endDate: Date = new Date()) {
  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();

  // Adjust for negative days
  if (days < 0) {
    months--;
    const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
    days += lastMonth.getDate();
  }

  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

// GET /api/admin/laporan/[investorId]/plant-ages - Get detailed plant ages for specific investor
export async function GET(
  request: Request,
  { params }: { params: Promise<{ investorId: string }> }
) {
  try {
    await dbConnect();

    const investorId = (await params).investorId;

    // Get the specific investor
    const investor = await Investor.findById(investorId);
    if (!investor) {
      return NextResponse.json(
        { success: false, error: "Investor not found" },
        { status: 404 }
      );
    }

    // Get all plant instances
    const plantInstances = await PlantInstance.find({});

    // Find plant instances related to this investor through their investments
    const investorPlantInstances = plantInstances.filter((plantInstance) => {
      return investor.investments.some(
        (a: any) =>
          a.plantInstanceId?.toString() === plantInstance._id.toString()
      );
    });

    // Calculate detailed plant data with ages
    const now = new Date();
    const plantsWithAges = investorPlantInstances.map((plantInstance) => {
      // Find 'Tanam Bibit' history entry
      const tanamBibitHistory = plantInstance.history?.find(
        (h: any) => h.action === "Tanam Bibit"
      );
      let referenceDate;
      let ageSource = "createdAt";

      if (tanamBibitHistory && tanamBibitHistory.addedAt) {
        // Parse DD/MM/YYYY format
        const [day, month, year] = tanamBibitHistory.addedAt.split("/");
        referenceDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        ageSource = "tanamBibit";
      } else {
        // Fallback to createdAt if no 'Tanam Bibit' history found
        referenceDate = new Date(plantInstance.createdAt);
      }

      const detailedAge = calculateDetailedAge(referenceDate, now);
      const totalMonths = detailedAge.years * 12 + detailedAge.months;

      return {
        _id: plantInstance._id,
        spesiesPohon: plantInstance.instanceName,
        lokasi: plantInstance.location || "Lokasi tidak tersedia",
        umur: totalMonths, // Keep original months calculation for compatibility
        detailedAge, // New detailed age object
        tinggi: 0,
        tanggalTanam:
          ageSource === "tanamBibit"
            ? tanamBibitHistory.addedAt
            : new Date(plantInstance.createdAt).toLocaleDateString("id-ID"),
        kondisi: plantInstance.status || "Unknown",
        createdAt: plantInstance.createdAt,
        ageSource,
        referenceDate: referenceDate.toLocaleDateString("id-ID"),
      };
    });

    return NextResponse.json({
      success: true,
      data: plantsWithAges,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/laporan/[investorId]/plant-ages error:",
      error
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch plant ages data" },
      { status: 500 }
    );
  }
}
