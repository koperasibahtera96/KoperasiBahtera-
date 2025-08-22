import dbConnect from '@/lib/mongodb';
import Investor from '@/models/Investor';
import Tree from '@/models/Tree';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/dashboard - Get dashboard data
export async function GET(_request: NextRequest) {
  try {
    await dbConnect();

    // Get all investors and trees
    const [investors, trees] = await Promise.all([
      Investor.find({}),
      Tree.find({}).populate('pemilik', 'name email')
    ]);

    // Calculate investor statistics
    const totalInvestors = investors.length;
    const activeInvestors = investors.filter(inv => inv.status === 'active').length;
    const inactiveInvestors = investors.filter(inv => inv.status === 'inactive').length;
    const totalInvestment = investors.reduce((sum, inv) => sum + inv.totalInvestasi, 0);

    // Calculate tree statistics
    const totalTrees = trees.length;
    const treesByCondition = {
      sehat: trees.filter(t => t.kondisi === 'sehat').length,
      perlu_perawatan: trees.filter(t => t.kondisi === 'perlu_perawatan').length,
      sakit: trees.filter(t => t.kondisi === 'sakit').length
    };

    // Group trees by species (get top 3)
    const treesBySpecies = trees.reduce((acc, tree) => {
      const species = tree.spesiesPohon;
      if (!acc[species]) {
        acc[species] = 0;
      }
      acc[species]++;
      return acc;
    }, {});

    const topSpecies = Object.entries(treesBySpecies)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([species, count], index) => ({
        name: species,
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

    // Calculate average tree age and height
    const avgTreeAge = trees.length > 0 ? Math.round(trees.reduce((sum, tree) => sum + tree.umur, 0) / trees.length) : 0;
    const avgTreeHeight = trees.length > 0 ? Math.round(trees.reduce((sum, tree) => sum + tree.tinggi, 0) / trees.length) : 0;

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
        totalTrees,
        activeInvestment: formattedTotalInvestment,
        averageTreeAge: `${avgTreeAge} bulan`,
        monthlyGrowth: {
          investors: 0, // Would need historical data to calculate
          trees: 0,
          investment: 0,
          roi: 0
        }
      },
      recentInvestors,
      treeStats: topSpecies.map(species => ({
        name: species.name,
        count: species.count,
        value: `${species.count} pohon`,
        growth: '+0%', // Would need historical data
        color: species.color
      })),
      investorStats: {
        active: activeInvestors,
        inactive: inactiveInvestors,
        total: totalInvestors
      },
      treeConditionStats: treesByCondition,
      summary: {
        totalInvestors,
        totalTrees,
        totalInvestment,
        activeInvestors,
        avgTreeAge,
        avgTreeHeight
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