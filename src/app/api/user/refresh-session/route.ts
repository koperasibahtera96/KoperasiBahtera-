import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();
    
    // Get latest user data from database
    const user = await User.findOne({ email: session.user.email }).select('-password');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return updated user data for session refresh
    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.fullName,
        fullName: user.fullName,
        role: user.role,
        verificationStatus: user.verificationStatus,
        canPurchase: user.canPurchase,
        profileImageUrl: user.profileImageUrl,
        phoneNumber: user.phoneNumber,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        userCode: user.userCode,
        occupationCode: user.occupationCode,
        province: user.province,
        city: user.city,
      }
    });

  } catch (error: any) {
    console.error('Error refreshing session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh session' },
      { status: 500 }
    );
  }
}