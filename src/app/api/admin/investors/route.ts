import dbConnect from '@/lib/mongodb';
import Investor from '@/models/Investor';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/investors - Get all investors
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query: any = {};

    // Apply search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get total count for pagination
    const totalItems = await Investor.countDocuments(query);

    // Apply pagination
    const skip = (page - 1) * limit;
    const investors = await Investor.find(query)
      .populate('userId', 'userCode fullName email') // Populate userId to get userCode
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: investors,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('GET /api/admin/investors error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch investors' },
      { status: 500 }
    );
  }
}

// POST /api/admin/investors - Create new investor
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    console.log(body, 'post admin investors');

    // Validate required fields
    const { userId, name, email, totalInvestasi = 0, jumlahPohon = 0, status = 'active' } = body;

    if (!name || !email || !userId) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and userId are required' },
        { status: 400 }
      );
    }

    // Validate userId is not already used
    const existingInvestorWithUserId = await Investor.findOne({ userId });
    if (existingInvestorWithUserId) {
      return NextResponse.json(
        { success: false, error: 'User is already an investor' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingInvestor = await Investor.findOne({ email });
    if (existingInvestor) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Create new investor
    const newInvestor = new Investor({
      userId,
      name,
      email,
      totalInvestasi,
      jumlahPohon,
      status
    });

    console.log(newInvestor, 'newInvestor');

    await newInvestor.save();

    return NextResponse.json({
      success: true,
      data: newInvestor,
      message: 'Investor created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/admin/investors error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create investor' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/investors - Update investor
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Investor ID is required' },
        { status: 400 }
      );
    }

    const investor = await Investor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!investor) {
      return NextResponse.json(
        { success: false, error: 'Investor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: investor,
      message: 'Investor updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/admin/investors error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update investor' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/investors - Delete investor
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Investor ID is required' },
        { status: 400 }
      );
    }

    const investor = await Investor.findByIdAndDelete(id);

    if (!investor) {
      return NextResponse.json(
        { success: false, error: 'Investor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: investor,
      message: 'Investor deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/admin/investors error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete investor' },
      { status: 500 }
    );
  }
}