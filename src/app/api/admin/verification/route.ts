import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// GET - Fetch users for verification
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['admin', 'staff'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const users = await User.find({
      role: 'user'
    })
    .select('fullName email phoneNumber ktpImageUrl faceImageUrl verificationStatus createdAt address city province verificationNotes verifiedBy verifiedAt')
    .sort({ createdAt: -1 })
    .lean();

    return NextResponse.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error fetching users for verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update verification status
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['admin', 'staff'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, status, notes } = await request.json();

    if (!userId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    await dbConnect();

    const updateData: any = {
      verificationStatus: status,
      verifiedBy: session.user.id,
      verifiedAt: new Date(),
      canPurchase: status === 'approved'
    };

    if (notes) {
      updateData.verificationNotes = notes;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${status === 'approved' ? 'disetujui' : 'ditolak'} berhasil`,
      data: user
    });

  } catch (error) {
    console.error('Error updating verification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}