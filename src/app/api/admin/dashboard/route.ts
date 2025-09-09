import dbConnect from '@/lib/mongodb';
import Investor from '@/models/Investor';
import PlantInstance from '@/models/PlantInstance';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/dashboard - Get dashboard data
export async function GET(_request: NextRequest) {
  try {
    await dbConnect();

    // Get all investors, plant instances, and users
    const [investors, plantInstances, users] = await Promise.all([
      Investor.find({}),
      PlantInstance.find({}),
      User.countDocuments({})
    ]);

    // Calculate investor statistics
    const totalInvestors = investors.length;
    const activeInvestors = investors.filter(inv => inv.status === 'active').length;
    const inactiveInvestors = investors.filter(inv => inv.status === 'inactive').length;
    const totalInvestment = investors.reduce((sum, inv) => sum + inv.totalInvestasi, 0);

    // Calculate plant statistics
    const totalPlants = plantInstances.length;
    const plantsByStatus = {
      active: plantInstances.filter(p => p.status === 'Tanam Bibit' || p.status === 'Tumbuh Sehat').length,
      maintenance: plantInstances.filter(p => p.status === 'Perlu Perawatan').length,
      problem: plantInstances.filter(p => p.status === 'Bermasalah' || p.status === 'Sakit').length
    };

    // Group plants by type (get top 3)
    const plantsByType = plantInstances.reduce((acc: Record<string, number>, plant) => {
      const type = plant.plantType;
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type]++;
      return acc;
    }, {});

    const topPlantTypes = Object.entries(plantsByType)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([type, count], index) => ({
        name: type,
        count: count as number,
        color: index === 0 ? 'amber' : index === 1 ? 'green' : 'emerald'
      }));

    // Get recent investors (last 4)
    const recentInvestors = investors
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
      .map(investor => ({
        id: investor._id,
        name: investor.name,
        email: investor.email,
        investment: `Rp ${investor.totalInvestasi.toLocaleString('id-ID')}`,
        date: investor.createdAt.toISOString().split('T')[0],
        status: investor.status
      }));

    // Calculate average plant age - using months since creation
    const avgPlantAge = plantInstances.length > 0 ? 
      Math.round(plantInstances.reduce((sum, plant) => {
        const monthsSincePlanting = Math.round((Date.now() - new Date(plant.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
        return sum + Math.max(0, monthsSincePlanting);
      }, 0) / plantInstances.length) : 0;

    // Format total investment
    const formattedTotalInvestment = totalInvestment >= 1000000000
      ? `Rp ${(totalInvestment / 1000000000).toFixed(1)}B`
      : totalInvestment >= 1000000
      ? `Rp ${(totalInvestment / 1000000).toFixed(1)}M`
      : `Rp ${totalInvestment.toLocaleString('id-ID')}`;

    // Build dashboard data
    const dashboardData = {
      stats: {
        totalInvestors,
        totalTrees: totalPlants,
        activeInvestment: formattedTotalInvestment,
        averageTreeAge: `${avgPlantAge} bulan`,
        monthlyGrowth: {
          investors: 0, // Would need historical data to calculate
          trees: 0,
          investment: 0,
          roi: 0
        }
      },
      recentInvestors,
      treeStats: topPlantTypes.map(type => ({
        name: type.name,
        count: type.count,
        value: `${type.count} tanaman`,
        growth: '+0%', // Would need historical data
        color: type.color
      })),
      investorStats: {
        active: activeInvestors,
        inactive: inactiveInvestors,
        total: totalInvestors
      },
      treeConditionStats: plantsByStatus,
      summary: {
        totalInvestors,
        totalTrees: totalPlants,
        totalInvestment,
        activeInvestors,
        avgTreeAge: avgPlantAge,
        totalUsers: users
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        ...dashboardData,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('GET /api/admin/dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// POST /api/admin/dashboard/refresh - Refresh dashboard data
export async function POST() {
  try {
    // Just call GET to refresh the data
    const request = new Request('http://localhost/api/admin/dashboard');
    return GET(request as NextRequest);
  } catch (error) {
    console.error('POST /api/admin/dashboard/refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh dashboard data' },
      { status: 500 }
    );
  }
}