import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ProfileChangeRequest from '@/models/ProfileChangeRequest';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Check if user has sufficient role
    const adminUser = await User.findOne({ email: session.user.email });
    const allowedRoles = ['admin', 'staff', 'spv_staff', 'finance'];
    if (!adminUser || !allowedRoles.includes(adminUser.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all profile change requests with populated user data
    const requests = await ProfileChangeRequest.find({})
      .populate('userId', 'fullName email')
      .sort({ requestedAt: -1 })
      .lean();

    // Transform the data to include user info at the top level
    const transformedRequests = requests.map(request => ({
      ...request,
      user: request.userId
    }));

    return NextResponse.json({
      success: true,
      requests: transformedRequests
    });

  } catch (error: any) {
    console.error('Error fetching profile change requests:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile change requests' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { requestId, action, adminNotes } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      );
    }

    // Find the profile change request
    const profileRequest = await ProfileChangeRequest.findById(requestId);
    if (!profileRequest) {
      return NextResponse.json(
        { error: 'Profile change request not found' },
        { status: 404 }
      );
    }

    if (profileRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Update the user's profile with the requested value
      const updateData: any = {};
      updateData[profileRequest.changeType] = profileRequest.requestedValue;

      // If changing email, also reset email verification
      if (profileRequest.changeType === 'email') {
        updateData.isEmailVerified = false;
      }

      const updatedUser = await User.findByIdAndUpdate(
        profileRequest.userId,
        updateData,
        { new: true }
      );

      if (!updatedUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }

    // Update the profile change request
    profileRequest.status = action === 'approve' ? 'approved' : 'rejected';
    profileRequest.reviewedAt = new Date();
    profileRequest.reviewedBy = adminUser.fullName;
    if (adminNotes) {
      profileRequest.adminNotes = adminNotes;
    }

    await profileRequest.save();

    return NextResponse.json({
      success: true,
      message: `Profile change request ${action}d successfully`
    });

  } catch (error: any) {
    console.error('Error processing profile change request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process profile change request' },
      { status: 500 }
    );
  }
}