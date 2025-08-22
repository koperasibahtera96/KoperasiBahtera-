import dbConnect from '@/lib/mongodb';
import Investor from '@/models/Investor';
import Tree from '@/models/Tree';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/laporan - Get report data for all investors
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get all investors and their trees
    const investors = await Investor.find({});
    const trees = await Tree.find({}).populate('pemilik', 'name email');

    // Group trees by investor
    const investorReports = investors.map(investor => {
      const investorTrees = trees.filter(tree => 
        tree.pemilik && tree.pemilik._id.toString() === investor._id.toString()
      );

      // Calculate tree statistics for this investor
      const treeStats = {
        total: investorTrees.length,
        byCondition: {
          sehat: investorTrees.filter(t => t.kondisi === 'sehat').length,
          perlu_perawatan: investorTrees.filter(t => t.kondisi === 'perlu_perawatan').length,
          sakit: investorTrees.filter(t => t.kondisi === 'sakit').length
        },
        bySpecies: investorTrees.reduce((acc: any, tree) => {
          const species = tree.spesiesPohon;
          if (!acc[species]) {
            acc[species] = 0;
          }
          acc[species]++;
          return acc;
        }, {}),
        avgAge: investorTrees.length > 0 
          ? Math.round(investorTrees.reduce((sum, tree) => sum + tree.umur, 0) / investorTrees.length)
          : 0,
        avgHeight: investorTrees.length > 0 
          ? Math.round(investorTrees.reduce((sum, tree) => sum + tree.tinggi, 0) / investorTrees.length)
          : 0
      };

      return {
        investor: {
          _id: investor._id,
          name: investor.name,
          email: investor.email,
          totalInvestasi: investor.totalInvestasi,
          jumlahPohon: investor.jumlahPohon,
          status: investor.status,
          createdAt: investor.createdAt
        },
        trees: investorTrees.map(tree => ({
          _id: tree._id,
          spesiesPohon: tree.spesiesPohon,
          lokasi: tree.lokasi,
          umur: tree.umur,
          tinggi: tree.tinggi,
          tanggalTanam: tree.tanggalTanam,
          kondisi: tree.kondisi,
          createdAt: tree.createdAt
        })),
        statistics: treeStats
      };
    });

    // Calculate overall statistics
    const overallStats = {
      totalInvestors: investors.length,
      totalTrees: trees.length,
      totalInvestment: investors.reduce((sum, inv) => sum + inv.totalInvestasi, 0),
      activeInvestors: investors.filter(inv => inv.status === 'active').length,
      inactiveInvestors: investors.filter(inv => inv.status === 'inactive').length
    };

    return NextResponse.json({
      success: true,
      data: {
        reports: investorReports,
        summary: overallStats
      }
    });
  } catch (error) {
    console.error('GET /api/admin/laporan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report data' },
      { status: 500 }
    );
  }
}