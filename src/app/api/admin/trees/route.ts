import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import PlantInstance from "@/models/PlantInstance";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const blokFilter = searchParams.get("blok") || "all";

    // Fetch all plant instances
    const plantInstances = await PlantInstance.find({});

    // Fetch all investors
    const investors = await Investor.find({});

    // Calculate new statistics based on planting status
    const paketDibeli = investors.reduce((total, investor) => {
      return total + (investor.investments?.length || 0);
    }, 0);

    // Helper function to determine status based on new 4-status logic
    const getTreeStatus = (instance: any) => {
      const history = instance.history || [];

      // Check for "Panen" status (case insensitive)
      const hasPanen = history.some(
        (historyItem: any) =>
          (historyItem.action || historyItem.type || "").toLowerCase() ===
          "panen"
      );
      if (hasPanen) return "panen";

      // Count non-pending/non-kontrak-baru entries
      const nonInitialEntries = history.filter((historyItem: any) => {
        const action = (
          historyItem.action ||
          historyItem.type ||
          ""
        ).toLowerCase();
        return action !== "pending contract" && action !== "kontrak baru";
      });

      if (nonInitialEntries.length === 0) return "menunggu-tanam";
      if (nonInitialEntries.length === 1) return "sudah-ditanam";
      return "tumbuh";
    };

    // Calculate statistics based on new 4-status logic
    const menungguTanam = plantInstances.filter(
      (instance) => getTreeStatus(instance) === "menunggu-tanam"
    ).length;
    const sudahDitanam = plantInstances.filter(
      (instance) => getTreeStatus(instance) === "sudah-ditanam"
    ).length;
    const tumbuh = plantInstances.filter(
      (instance) => getTreeStatus(instance) === "tumbuh"
    ).length;
    const panen = plantInstances.filter(
      (instance) => getTreeStatus(instance) === "panen"
    ).length;

    // Apply filters
    let filteredInstances = plantInstances;
    if (filter !== "all") {
      filteredInstances = plantInstances.filter(
        (instance) => getTreeStatus(instance) === filter
      );
    }

    if (blokFilter !== "all") {
      filteredInstances = filteredInstances.filter((instance) => {
        const instanceBlok = (instance.blok || "No Blok").toLowerCase();
        return instanceBlok === blokFilter.toLowerCase();
      });
    }

    // Group by blok for the fourth card (case insensitive)
    const pohonPerBlok = plantInstances.reduce((acc, instance) => {
      const blok = (instance.blok || "No Blok").toLowerCase();
      acc[blok] = (acc[blok] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group plant instances by plant type, then by owner (use filtered instances)
    const plantTypes = ["gaharu", "jengkol", "aren", "alpukat", "kelapa"];
    const groupedData = plantTypes.map((plantType) => {
      // Find all plant instances of this type from filtered set
      const instancesOfType = filteredInstances.filter(
        (instance) => instance.plantType === plantType
      );

      // Group instances by owner
      const instancesByOwner = instancesOfType.reduce((acc, instance) => {
        const ownerKey = instance.owner || "No Owner";
        if (!acc[ownerKey]) {
          acc[ownerKey] = [];
        }
        acc[ownerKey].push(instance);
        return acc;
      }, {} as Record<string, any[]>);

      // Create owner groups with related investor/investment data
      const ownerGroups = Object.entries(instancesByOwner).map(
        ([ownerName, instances]) => {
          // Build a set of instance IDs for quick lookup
          const instanceIdSet = new Set(
            (instances as any).map((i: any) => i._id.toString())
          );

          // Find all investments (from any investor) that reference these instances
          const matchedInvestments: Array<{ investor: any; investment: any }> =
            [];
          investors.forEach((inv) => {
            (inv.investments || []).forEach((investment: any) => {
              if (
                investment.plantInstanceId &&
                instanceIdSet.has(investment.plantInstanceId.toString())
              ) {
                matchedInvestments.push({ investor: inv, investment });
              }
            });
          });

          // Derive relatedInvestments array and (if any) pick a representative relatedInvestor
          const relatedInvestments = matchedInvestments.map(
            ({ investment }) => ({
              investmentId: investment.investmentId,
              productName: investment.productName,
              totalAmount: investment.totalAmount,
              amountPaid: investment.amountPaid,
              paymentType: investment.paymentType,
              status: investment.status,
              investmentDate: investment.investmentDate,
              completionDate: investment.completionDate,
            })
          );

          const uniqueInvestorsForOwner = Array.from(
            new Set(matchedInvestments.map((mi) => mi.investor._id.toString()))
          );
          const representativeInvestor =
            matchedInvestments.length > 0
              ? matchedInvestments[0].investor
              : null;

          return {
            ownerName,
            totalInstances: (instances as any).length,
            instances: (instances as any).map((instance: any) => {
              // Calculate age and planting status from history using new 4-status logic
              const history = instance.history || [];
              const treeStatus = getTreeStatus(instance);

              // Map status to display labels
              const statusLabels = {
                "menunggu-tanam": "Menunggu Tanam",
                "sudah-ditanam": "Sudah Ditanam",
                tumbuh: "Tumbuh",
                panen: "Panen",
              };
              const statusPohon = statusLabels[treeStatus] || "Menunggu Tanam";

              // Find the first planting date and calculate age
              let tanggalTanam = null;
              let umur: string | number = 0;

              // Look for the first non-pending/non-new contract action for planting date
              const firstPlantingAction = history.find((h: any) => {
                const action = (h.action || h.type || "").toLowerCase();
                return (
                  action !== "pending contract" && action !== "kontrak baru"
                );
              });

              if (firstPlantingAction) {
                tanggalTanam =
                  firstPlantingAction.addedAt || firstPlantingAction.date;

                // Calculate age from planting date
                const now = new Date();
                let referenceDate;

                if (tanggalTanam) {
                  try {
                    // Parse DD/MM/YYYY format
                    const [day, month, year] = tanggalTanam.split("/");
                    referenceDate = new Date(
                      parseInt(year),
                      parseInt(month) - 1,
                      parseInt(day)
                    );
                  } catch {
                    // Fallback to createdAt if parsing fails
                    referenceDate = new Date(instance.createdAt);
                  }
                } else {
                  // Fallback to createdAt if no planting date found
                  referenceDate = new Date(instance.createdAt);
                }

                // Calculate detailed age breakdown
                const timeDiff = now.getTime() - referenceDate.getTime();
                const totalDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

                const years = Math.floor(totalDays / 365);
                const months = Math.floor((totalDays % 365) / 30);
                const days = totalDays % 30;

                // Calculate detailed age for display
                let ageDisplay = "";
                if (years > 0) ageDisplay += `${years} tahun `;
                if (months > 0) ageDisplay += `${months} bulan `;
                if (days > 0) ageDisplay += `${days} hari`;

                umur = ageDisplay.trim() || "0 hari";
              }

              return {
                _id: instance._id,
                id: instance.id,
                instanceName: instance.instanceName,
                baseAnnualROI: instance.baseAnnualROI,
                qrCode: instance.qrCode,
                owner: instance.owner,
                location: instance.location,
                blok: instance.blok,
                kavling: instance.kavling,
                status: instance.status,
                lastUpdate: instance.lastUpdate,
                createdAt: instance.createdAt,
                updatedAt: instance.updatedAt,
                tanggalTanam,
                umur,
                statusPohon,
                history: instance.history,
              };
            }),
            relatedInvestor: representativeInvestor
              ? {
                  _id: representativeInvestor._id,
                  name: representativeInvestor.name,
                  email: representativeInvestor.email,
                  totalInvestasi: representativeInvestor.totalInvestasi,
                  totalPaid: representativeInvestor.totalPaid,
                  phoneNumber: representativeInvestor.phoneNumber,
                }
              : null,
            relatedInvestments,
            totalInvestmentAmount: relatedInvestments.reduce(
              (sum: any, inv: any) => sum + (inv.totalAmount || 0),
              0
            ),
            totalPaidAmount: relatedInvestments.reduce(
              (sum: any, inv: any) => sum + (inv.amountPaid || 0),
              0
            ),
            uniqueInvestorCount: uniqueInvestorsForOwner.length,
          };
        }
      );

      // Calculate totals for this plant type
      const totalInvestment = ownerGroups.reduce(
        (sum, group) => sum + group.totalInvestmentAmount,
        0
      );
      const totalPaid = ownerGroups.reduce(
        (sum, group) => sum + group.totalPaidAmount,
        0
      );
      const uniqueInvestors = ownerGroups.filter(
        (group) => group.relatedInvestor
      ).length;

      return {
        plantType,
        totalInstances: instancesOfType.length,
        totalInvestors: uniqueInvestors,
        totalInvestment,
        totalPaid,
        ownerGroups: ownerGroups.sort((a, b) =>
          a.ownerName.localeCompare(b.ownerName)
        ),
      };
    });

    // Calculate overall stats with new card data
    const stats = {
      paketDibeli,
      menungguTanam,
      sudahDitanam,
      tumbuh,
      panen,
      pohonPerBlok,
    };

    return NextResponse.json({
      success: true,
      data: {
        groupedData,
        stats,
      },
    });
  } catch (error) {
    console.error("Error fetching trees data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch trees data" },
      { status: 500 }
    );
  }
}
