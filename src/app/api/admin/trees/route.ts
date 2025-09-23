import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import PlantInstance from "@/models/PlantInstance";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();

    // Fetch all plant instances
    const plantInstances = await PlantInstance.find({});

    // Fetch all investors
    const investors = await Investor.find({});

    // Group plant instances by plant type, then by owner
    const plantTypes = ["gaharu", "jengkol", "aren", "alpukat"];
    const groupedData = plantTypes.map((plantType) => {
      // Find all plant instances of this type
      const instancesOfType = plantInstances.filter(
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
          const instanceIdSet = new Set((instances as any).map((i: any) => i._id.toString()));

          // Find all investments (from any investor) that reference these instances
          const matchedInvestments: Array<{ investor: any; investment: any }> = [];
          investors.forEach((inv) => {
            (inv.investments || []).forEach((investment: any) => {
              if (investment.plantInstanceId && instanceIdSet.has(investment.plantInstanceId.toString())) {
                matchedInvestments.push({ investor: inv, investment });
              }
            });
          });

          // Derive relatedInvestments array and (if any) pick a representative relatedInvestor
          const relatedInvestments = matchedInvestments.map(({ investment }) => ({
            investmentId: investment.investmentId,
            productName: investment.productName,
            totalAmount: investment.totalAmount,
            amountPaid: investment.amountPaid,
            paymentType: investment.paymentType,
            status: investment.status,
            investmentDate: investment.investmentDate,
            completionDate: investment.completionDate,
          }));

          const uniqueInvestorsForOwner = Array.from(new Set(matchedInvestments.map(mi => mi.investor._id.toString())));
          const representativeInvestor = matchedInvestments.length > 0 ? matchedInvestments[0].investor : null;

          return {
            ownerName,
            totalInstances: (instances as any).length,
            instances: (instances as any).map((instance: any) => ({
              _id: instance._id,
              id: instance.id,
              instanceName: instance.instanceName,
              baseAnnualROI: instance.baseAnnualROI,
              qrCode: instance.qrCode,
              owner: instance.owner,
              location: instance.location,
              status: instance.status,
              lastUpdate: instance.lastUpdate,
              createdAt: instance.createdAt,
              updatedAt: instance.updatedAt,
            })),
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

    // Calculate overall stats
    const stats = {
      totalInstances: plantInstances.length,
      totalInvestors: investors.length,
      totalInvestment: investors.reduce(
        (sum, investor) => sum + investor.totalInvestasi,
        0
      ),
      totalPaid: investors.reduce(
        (sum, investor) => sum + investor.totalPaid,
        0
      ),
      byType: groupedData.reduce((acc, group) => {
        acc[group.plantType] = {
          instances: group.totalInstances,
          investors: group.totalInvestors,
          investment: group.totalInvestment,
          paid: group.totalPaid,
        };
        return acc;
      }, {} as Record<string, any>),
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
