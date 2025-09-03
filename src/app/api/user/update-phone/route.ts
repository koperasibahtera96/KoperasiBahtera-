import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { phoneNumber } = await request.json();

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Check if phone number is already in use by another user
    const existingUser = await User.findOne({ 
      phoneNumber: phoneNumber.trim(),
      email: { $ne: session.user.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Phone number is already in use' },
        { status: 400 }
      );
    }

    // Update user's phone number
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { 
        phoneNumber: phoneNumber.trim(),
        isPhoneVerified: false // Reset phone verification status
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number updated successfully',
      phoneNumber: updatedUser.phoneNumber
    });

  } catch (error: any) {
    console.error('Error updating phone number:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update phone number' },
      { status: 500 }
    );
  }
}