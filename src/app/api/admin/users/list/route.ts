import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/users/list - Get users list for dropdown
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { isActive: true };

    // Apply search filter if provided
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users for dropdown (only active ones)
    const users = await User.find(query)
      .select('_id fullName email')
      .sort({ fullName: 1 })
      .limit(100); // Limit to prevent performance issues

    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('GET /api/admin/users/list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users list' },
      { status: 500 }
    );
  }
}