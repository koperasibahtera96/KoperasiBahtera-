import dbConnect from '@/lib/mongodb';
import Investor from '@/models/Investor';
import Plant from '@/models/Plant';
import { NextResponse } from 'next/server';

// GET /api/admin/laporan - Get report data for all investors
export async function GET() {
  try {
    await dbConnect();

    // Get all investors and plants
    const investors = await Investor.find({});
    const plants = await Plant.find({});

    // Group plants by investor (using owner field)
    const investorReports = investors.map(investor => {
      const investorPlants = plants.filter(plant =>
        plant.owner && plant.owner.toLowerCase() === investor.name.toLowerCase()
      );

      // Calculate plant statistics for this investor
      const plantStats = {
        total: investorPlants.length,
        byCondition: {
          sehat: investorPlants.filter(p => p.status === 'Tanam Bibit' || p.status === 'Tumbuh Sehat').length,
          perlu_perawatan: investorPlants.filter(p => p.status === 'Perlu Perawatan').length,
          sakit: investorPlants.filter(p => p.status === 'Bermasalah' || p.status === 'Sakit').length
        },
        bySpecies: investorPlants.reduce((acc, plant) => {
          const type = plant.plantType;
          if (!acc[type]) {
            acc[type] = 0;
          }
          acc[type]++;
          return acc;
        }, {}),
        avgAge: investorPlants.length > 0
          ? Math.round(investorPlants.reduce((sum, plant) => sum + plant.age, 0) / investorPlants.length)
          : 0,
        avgHeight: investorPlants.length > 0
          ? Math.round(investorPlants.reduce((sum, plant) => sum + plant.height, 0) / investorPlants.length)
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
        trees: investorPlants.map(plant => ({
          _id: plant._id,
          spesiesPohon: plant.name, // Using name as species for UI compatibility
          lokasi: plant.location,
          umur: plant.age,
          tinggi: plant.height,
          tanggalTanam: plant.lastUpdate, // Using lastUpdate as plant date
          kondisi: plant.status === 'Tanam Bibit' || plant.status === 'Tumbuh Sehat' ? 'sehat' :
                   plant.status === 'Perlu Perawatan' ? 'perlu_perawatan' : 'sakit',
          createdAt: plant.createdAt
        })),
        statistics: plantStats
      };
    });

    // Calculate overall statistics
    const overallStats = {
      totalInvestors: investors.length,
      totalTrees: plants.length,
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