import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import User from "@/models/User";
import PlantInstance from "@/models/PlantInstance";
import { NextResponse } from "next/server";

// GET /api/admin/laporan - Get report data for all investors with pagination and search
export async function GET(request: Request) {
  try {
    await dbConnect();

    // Parse URL parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const search = searchParams.get('search') || '';
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Get total count for pagination
    const totalInvestors = await Investor.countDocuments(searchQuery);
    
    // Get paginated investors
    const investors = await Investor.find(searchQuery)
      .skip(skip)
    .limit(limit)
      .sort({ createdAt: -1 }); // Most recent first
    
    // Get all plant instances (we still need all for calculations)
    const plantInstances = await PlantInstance.find({});

    // Group plant instances by investor
    // Preload user data for the paginated investors to include userCode
    const userIds = investors.map((inv) => inv.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('userCode');
    const usersMap = users.reduce((acc: Record<string, any>, u: any) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {} as Record<string, any>);

  // Preloaded users map (userCode) for investors

    const investorReports = investors.map((investor) => {
      // Compute earliest purchase date from investor.investments if available
      let earliestPurchaseDate = investor.createdAt;
      try {
        const invDates = Array.isArray(investor.investments)
          ? investor.investments
              .map((i: any) => i.investmentDate)
              .filter(Boolean)
              .map((d: any) => new Date(d))
          : [];
        if (invDates.length > 0) {
          const min = new Date(Math.min(...invDates.map((d: Date) => d.getTime())));
          earliestPurchaseDate = min.toISOString();
        }
      } catch {
        // ignore and fallback to createdAt
      }
      // Find plant instances related to this investor through their investments
      const investorPlantInstances = plantInstances.filter((plantInstance) => {
        return investor.investments.some(
          (a: any) =>
            a.plantInstanceId?.toString() === plantInstance._id.toString()
        );
      });

      // Calculate plant statistics for this investor using actual status
      const statusCounts = investorPlantInstances.reduce((acc, plantInstance) => {
        const status = plantInstance.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const plantStats = {
        total: investorPlantInstances.length,
        byCondition: statusCounts,
        bySpecies: investorPlantInstances.reduce((acc, plantInstance) => {
          const type = plantInstance.plantType;
          if (!acc[type]) {
            acc[type] = 0;
          }
          acc[type]++;
          return acc;
        }, {} as Record<string, number>),
        avgHeight: 0, // PlantInstance doesn't have height field
      };

      return {
        investor: {
          _id: investor._id,
          name: investor.name,
          email: investor.email,
          userCode: usersMap[investor.userId?.toString()]?.userCode,
          totalInvestasi: investor.totalInvestasi,
          jumlahPohon: investor.jumlahPohon,
          status: investor.status,
          createdAt: investor.createdAt,
          earliestPurchaseDate,
        },
        trees: investorPlantInstances.map((plantInstance) => {
          // Calculate age in months from 'Tanam Bibit' history date
          const now = new Date();
          const tanamBibitHistory = plantInstance.history?.find((h: any) => h.action === 'Tanam Bibit');
          let referenceDate;
          
          if (tanamBibitHistory && tanamBibitHistory.addedAt) {
            // Parse DD/MM/YYYY format
            const [day, month, year] = tanamBibitHistory.addedAt.split('/');
            referenceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            // Fallback to createdAt if no 'Tanam Bibit' history found
            referenceDate = new Date(plantInstance.createdAt);
          }
          
          const ageInMonths = Math.floor(
            (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );

          return {
            _id: plantInstance._id,
            spesiesPohon: `${plantInstance.instanceName}`,
            lokasi: plantInstance.location || "Lokasi tidak tersedia",
            umur: Math.max(0, ageInMonths),
            tinggi: 0, // PlantInstance doesn't have height field
            tanggalTanam: plantInstance.createdAt,
            kondisi: plantInstance.status || "Unknown",
            createdAt: plantInstance.createdAt,
            nomorKontrak: plantInstance.id.slice(6) 
          };
        }),
        statistics: plantStats,
      };
    });

    // Calculate overall statistics (for all investors, not just paginated)
    const allInvestors = await Investor.find({});
    const overallStats = {
      totalInvestors: allInvestors.length,
      totalTrees: plantInstances.length,
      activeInvestors: allInvestors.filter((inv) => inv.status === "active")
        .length,
      inactiveInvestors: allInvestors.filter((inv) => inv.status === "inactive")
        .length,
    };

    // Calculate pagination info
    const totalPages = Math.ceil(totalInvestors / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        reports: investorReports,
        summary: overallStats,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalInvestors,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
          startIndex: skip + 1,
          endIndex: Math.min(skip + limit, totalInvestors)
        },
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
