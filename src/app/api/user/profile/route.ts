import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
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

    // Find user with all fields
    const user = await User.findOne({ email: session.user.email }).select('-password');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        nik: user.nik,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        // KTP Address
        ktpAddress: user.ktpAddress,
        ktpVillage: user.ktpVillage,
        ktpCity: user.ktpCity,
        ktpProvince: user.ktpProvince,
        ktpPostalCode: user.ktpPostalCode,
        // Domisili Address
        domisiliAddress: user.domisiliAddress,
        domisiliVillage: user.domisiliVillage,
        domisiliCity: user.domisiliCity,
        domisiliProvince: user.domisiliProvince,
        domisiliPostalCode: user.domisiliPostalCode,
        occupation: user.occupation,
        occupationCode: user.occupationCode,
        userCode: user.userCode,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        verificationStatus: user.verificationStatus,
        canPurchase: user.canPurchase,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const allowedUpdates = ['phoneNumber', 'fullName', 'ktpAddress', 'ktpVillage', 'ktpCity', 'ktpProvince', 'ktpPostalCode', 'domisiliAddress', 'domisiliVillage', 'domisiliCity', 'domisiliProvince', 'domisiliPostalCode', 'occupation'];
    const updates: any = {};

    // Filter only allowed updates
    Object.keys(body).forEach(key => {
      if (allowedUpdates.includes(key) && body[key] !== undefined) {
        updates[key] = body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // If updating phone number, check if it's already in use
    if (updates.phoneNumber) {
      const existingUser = await User.findOne({ 
        phoneNumber: updates.phoneNumber,
        email: { $ne: session.user.email }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Phone number is already in use' },
          { status: 400 }
        );
      }
      
      // Reset phone verification if phone number is changed
      updates.isPhoneVerified = false;
    }

    // Update user profile
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      updates,
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
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        nik: updatedUser.nik,
        phoneNumber: updatedUser.phoneNumber,
        dateOfBirth: updatedUser.dateOfBirth,
        // KTP Address
        ktpAddress: updatedUser.ktpAddress,
        ktpVillage: updatedUser.ktpVillage,
        ktpCity: updatedUser.ktpCity,
        ktpProvince: updatedUser.ktpProvince,
        ktpPostalCode: updatedUser.ktpPostalCode,
        // Domisili Address
        domisiliAddress: updatedUser.domisiliAddress,
        domisiliVillage: updatedUser.domisiliVillage,
        domisiliCity: updatedUser.domisiliCity,
        domisiliProvince: updatedUser.domisiliProvince,
        domisiliPostalCode: updatedUser.domisiliPostalCode,
        occupation: updatedUser.occupation,
        occupationCode: updatedUser.occupationCode,
        userCode: updatedUser.userCode,
        profileImageUrl: updatedUser.profileImageUrl,
        role: updatedUser.role,
        verificationStatus: updatedUser.verificationStatus,
        canPurchase: updatedUser.canPurchase,
        isEmailVerified: updatedUser.isEmailVerified,
        isPhoneVerified: updatedUser.isPhoneVerified,
        createdAt: updatedUser.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user profile' },
      { status: 500 }
    );
  }
}