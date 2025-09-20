import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Investor from '@/models/Investor';
import PlantInstance from '@/models/PlantInstance';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find the user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find investor record
    const investor = await Investor.findOne({ userId: user._id });
    if (!investor) {
      return NextResponse.json({
        success: true,
        data: {
          totalInvestments: 0,
          totalAmount: 0,
          totalPaid: 0,
          investments: []
        }
      });
    }

    // Get PlantInstance data for each investment
    const investmentsWithPlantData = await Promise.all(
      investor.investments.map(async (investment: any) => {
        let plantInstance = null;

        if (investment.plantInstanceId) {
          plantInstance = await PlantInstance.findById(investment.plantInstanceId);
        }

        // Calculate investment progress
        const progress = investment.totalAmount > 0 ?
          Math.round((investment.amountPaid / investment.totalAmount) * 100) : 0;

        // Calculate next payment info for cicilan
        let nextPaymentInfo = null;
        if (investment.paymentType === 'cicilan' && investment.installments) {
          const nextUnpaidInstallment = investment.installments.find((inst: any) => !inst.isPaid);
          if (nextUnpaidInstallment) {
            nextPaymentInfo = {
              installmentNumber: nextUnpaidInstallment.installmentNumber,
              amount: nextUnpaidInstallment.amount,
              dueDate: nextUnpaidInstallment.dueDate
            };
          }
        }

        return {
          investmentId: investment.investmentId,
          productName: investment.productName,
          paymentType: investment.paymentType,
          status: investment.status,
          totalAmount: investment.totalAmount,
          amountPaid: investment.amountPaid,
          progress: progress,
          investmentDate: investment.investmentDate,
          completionDate: investment.completionDate,
          nextPaymentInfo,

          // Plant instance data
          plantInstance: plantInstance ? {
            id: plantInstance.id,
            plantType: plantInstance.plantType,
            instanceName: plantInstance.instanceName,
            baseAnnualROI: plantInstance.baseAnnualROI,
            location: plantInstance.location || 'Musi Rawas Utara',
            status: plantInstance.status,
            qrCode: plantInstance.qrCode,
            fotoGambar: plantInstance.fotoGambar,
            owner: plantInstance.owner,
            contractNumber: plantInstance.contractNumber,

            // Financial summary
            totalOperationalCosts: plantInstance.operationalCosts?.reduce((sum: number, cost: any) => sum + cost.amount, 0) || 0,
            totalIncome: plantInstance.incomeRecords?.reduce((sum: number, income: any) => sum + income.amount, 0) || 0,

            // Recent activity
            recentCosts: plantInstance.operationalCosts?.slice(-3) || [],
            recentIncome: plantInstance.incomeRecords?.slice(-3) || [],

            lastUpdate: plantInstance.lastUpdate,
            history: plantInstance.history?.slice(-5) || []
          } : null
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        userInfo: {
          name: investor.name,
          email: investor.email,
          phoneNumber: investor.phoneNumber
        },
        totalInvestments: investor.investments.length,
        totalAmount: investor.totalInvestasi,
        totalPaid: investor.totalPaid,
        jumlahPohon: investor.jumlahPohon,
        investments: investmentsWithPlantData
      }
    });

  } catch (error) {
    console.error('Error fetching user investments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}