import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PlantInstance from '@/models/PlantInstance';
import Investor from '@/models/Investor';

export async function GET() {
  try {
    await dbConnect();

    // Fetch all plant instances
    const plantInstances = await PlantInstance.find({});
    
    // Fetch all investors
    const investors = await Investor.find({});

    // Group plant instances by plant type, then by owner
    const plantTypes = ['gaharu', 'jengkol', 'aren', 'alpukat'];
    const groupedData = plantTypes.map(plantType => {
      // Find all plant instances of this type
      const instancesOfType = plantInstances.filter(
        instance => instance.plantType === plantType
      );

      // Group instances by owner
      const instancesByOwner = instancesOfType.reduce((acc, instance) => {
        const ownerKey = instance.owner || 'No Owner';
        if (!acc[ownerKey]) {
          acc[ownerKey] = [];
        }
        acc[ownerKey].push(instance);
        return acc;
      }, {} as Record<string, any[]>);

      // Create owner groups with related investor data
      const ownerGroups = Object.entries(instancesByOwner).map(([ownerName, instances]) => {
        // Find the investor for this owner
        const relatedInvestor = investors.find(investor => investor.name === ownerName);
        
        // Get investments related to these plant instances
        const relatedInvestments = relatedInvestor?.investments.filter(investment => 
          instances.some(instance => 
            investment.plantInstanceId?.toString() === instance._id.toString()
          )
        ) || [];

        return {
          ownerName,
          totalInstances: instances.length,
          instances: instances.map(instance => ({
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
            updatedAt: instance.updatedAt
          })),
          relatedInvestor: relatedInvestor ? {
            _id: relatedInvestor._id,
            name: relatedInvestor.name,
            email: relatedInvestor.email,
            totalInvestasi: relatedInvestor.totalInvestasi,
            totalPaid: relatedInvestor.totalPaid,
            phoneNumber: relatedInvestor.phoneNumber
          } : null,
          relatedInvestments: relatedInvestments.map(investment => ({
            investmentId: investment.investmentId,
            productName: investment.productName,
            totalAmount: investment.totalAmount,
            amountPaid: investment.amountPaid,
            paymentType: investment.paymentType,
            status: investment.status,
            investmentDate: investment.investmentDate,
            completionDate: investment.completionDate
          })),
          totalInvestmentAmount: relatedInvestments.reduce((sum, inv) => sum + inv.totalAmount, 0),
          totalPaidAmount: relatedInvestments.reduce((sum, inv) => sum + inv.amountPaid, 0)
        };
      });

      // Calculate totals for this plant type
      const totalInvestment = ownerGroups.reduce((sum, group) => sum + group.totalInvestmentAmount, 0);
      const totalPaid = ownerGroups.reduce((sum, group) => sum + group.totalPaidAmount, 0);
      const uniqueInvestors = ownerGroups.filter(group => group.relatedInvestor).length;

      return {
        plantType,
        totalInstances: instancesOfType.length,
        totalInvestors: uniqueInvestors,
        totalInvestment,
        totalPaid,
        ownerGroups: ownerGroups.sort((a, b) => a.ownerName.localeCompare(b.ownerName))
      };
    });

    // Calculate overall stats
    const stats = {
      totalInstances: plantInstances.length,
      totalInvestors: investors.length,
      totalInvestment: investors.reduce((sum, investor) => sum + investor.totalInvestasi, 0),
      totalPaid: investors.reduce((sum, investor) => sum + investor.totalPaid, 0),
      byType: groupedData.reduce((acc, group) => {
        acc[group.plantType] = {
          instances: group.totalInstances,
          investors: group.totalInvestors,
          investment: group.totalInvestment,
          paid: group.totalPaid
        };
        return acc;
      }, {} as Record<string, any>)
    };

    return NextResponse.json({
      success: true,
      data: {
        groupedData,
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching trees data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trees data' },
      { status: 500 }
    );
  }
}