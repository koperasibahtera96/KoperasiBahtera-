import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Investor } from '@/models';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate if user ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find investor record for the current user
    const investor = await Investor.findOne({ userId: session.user.id }).lean();
    
    if (!investor) {
      // Return empty data instead of error for users with no investments yet
      return NextResponse.json({
        success: true,
        data: {
          investments: [],
          totalInvestment: 0,
          totalProfit: 0,
          overallROI: 0
        }
      });
    }

    // Calculate investment summary
    const investments = investor.investments || [];
    const totalInvestment = investments.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    
    // For now, return basic data - you can enhance this later with profit calculations
    const investmentData = investments.map((inv) => ({
      id: inv.investmentId || inv._id,
      productName: inv.productName,
      amount: Number(inv.totalAmount) || 0,
      investmentDate: inv.investmentDate,
      status: inv.status || 'active',
      // Add more fields as needed
    }));

    return NextResponse.json({
      success: true,
      data: {
        investments: investmentData,
        totalInvestment,
        totalProfit: 0, // Calculate this based on your business logic
        overallROI: 0   // Calculate this based on your business logic
      }
    });

  } catch (error) {
    console.error('Error fetching investor investments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}