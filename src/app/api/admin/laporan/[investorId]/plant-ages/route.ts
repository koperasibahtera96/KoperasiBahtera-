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

    // Helper function to determine status based on new 4-status logic (same as trees page)
    const getTreeStatus = (instance: any) => {
      const history = instance.history || [];

      // Check for "Panen" status (case insensitive)
      const hasPanen = history.some((historyItem: any) =>
        (historyItem.action || historyItem.type || '').toLowerCase() === 'panen'
      );
      if (hasPanen) return 'Panen';

      // Count non-pending/non-kontrak-baru entries
      const nonInitialEntries = history.filter((historyItem: any) => {
        const action = (historyItem.action || historyItem.type || '').toLowerCase();
        return action !== 'pending contract' && action !== 'kontrak baru';
      });

      if (nonInitialEntries.length === 0) return 'Menunggu Tanam';
      if (nonInitialEntries.length === 1) return 'Sudah Ditanam';
      return 'Tumbuh';
    };

    // Calculate detailed plant data with ages using new logic
    const now = new Date();
    const plantsWithAges = investorPlantInstances.map((plantInstance) => {
      const history = plantInstance.history || [];
      const treeStatus = getTreeStatus(plantInstance);

      // Find the first non-pending/non-new contract action for planting date
      const firstPlantingAction = history.find((h: any) => {
        const action = (h.action || h.type || '').toLowerCase();
        return action !== 'pending contract' && action !== 'kontrak baru';
      });

      let referenceDate;
      let ageSource = "createdAt";
      let tanggalTanam = null;

      if (firstPlantingAction) {
        tanggalTanam = firstPlantingAction.addedAt || firstPlantingAction.date;
        ageSource = "tanamBibit";

        if (tanggalTanam) {
          try {
            // Parse DD/MM/YYYY format
            const [day, month, year] = tanggalTanam.split('/');
            referenceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } catch {
            // Fallback to createdAt if parsing fails
            referenceDate = new Date(plantInstance.createdAt);
            ageSource = "createdAt";
          }
        } else {
          // Fallback to createdAt if no planting date found
          referenceDate = new Date(plantInstance.createdAt);
          ageSource = "createdAt";
        }
      } else {
        // No planting action found, use createdAt
        referenceDate = new Date(plantInstance.createdAt);
      }

      const detailedAge = calculateDetailedAge(referenceDate, now);
      const totalMonths = detailedAge.years * 12 + detailedAge.months;

      // Determine condition (health status)
      const kondisiHealth = plantInstance.status?.toLowerCase() === 'sakit' ? 'Sakit' :
                           plantInstance.status?.toLowerCase() === 'mati' ? 'Mati' : 'Sehat';

      return {
        _id: plantInstance._id,
        spesiesPohon: plantInstance.instanceName,
        lokasi: plantInstance.location || "Lokasi tidak tersedia",
        umur: totalMonths, // Keep original months calculation for compatibility
        detailedAge, // New detailed age object
        tinggi: 0,
        tanggalTanam: tanggalTanam || new Date(plantInstance.createdAt).toLocaleDateString("id-ID"),
        kondisi: treeStatus, // Use new 4-status system
        status: kondisiHealth, // Keep health status separate
        createdAt: plantInstance.createdAt,
        ageSource,
        referenceDate: referenceDate.toLocaleDateString("id-ID"),
        nomorKontrak: plantInstance.id || plantInstance._id.toString(),
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
