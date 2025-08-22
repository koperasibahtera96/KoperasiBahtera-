import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Investor from '@/models/Investor';

// GET /api/admin/investors/list - Get investors list for dropdown
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';

    // Get investors for dropdown (only active ones by default)
    const investors = await Investor.find({ status })
      .select('_id name email')
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: investors
    });
  } catch (error) {
    console.error('GET /api/admin/investors/list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch investors list' },
      { status: 500 }
    );
  }
}