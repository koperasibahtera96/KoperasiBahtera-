import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import ResubmissionRequest from '@/models/ResubmissionRequest';

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
    .select('fullName nik email phoneNumber ktpImageUrl faceImageUrl verificationStatus createdAt ktpAddress ktpVillage ktpCity ktpProvince ktpPostalCode domisiliAddress domisiliVillage domisiliCity domisiliProvince domisiliPostalCode verificationNotes verifiedBy verifiedAt beneficiaryName beneficiaryNik beneficiaryDateOfBirth beneficiaryRelationship')
    .sort({ createdAt: -1 })
    .lean();

    return NextResponse.json({
      success: true,
      data: users,
      // return all resubmissions so admin UI can show full history per user
      resubmissions: await ResubmissionRequest.find({}).lean(),
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

  const { userId, status, notes, resubmissionId } = await request.json();

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

    // If admin approves a specific resubmission, prefer that resubmission's images
    let user: any = null;
    if (status === 'approved' && resubmissionId) {
      // Find the resubmission
  const resub: any = await ResubmissionRequest.findById(resubmissionId).lean();
      if (!resub) {
        return NextResponse.json({ error: 'Resubmission not found' }, { status: 404 });
      }
      if (resub.userId.toString() !== userId) {
        return NextResponse.json({ error: 'Resubmission does not belong to the specified user' }, { status: 400 });
      }

      // Copy approved images into the user record
      if (resub.faceImageUrl) updateData.profileImageUrl = resub.faceImageUrl;
      if (resub.ktpImageUrl) updateData.ktpImageUrl = resub.ktpImageUrl;

      user = await User.findByIdAndUpdate(userId, updateData, { new: true });

      // Mark the approved resubmission as reviewed and others as rejected
      try {
        await ResubmissionRequest.findByIdAndUpdate(resubmissionId, { status: 'reviewed', adminNotes: notes || '' });
        await ResubmissionRequest.updateMany({ userId, _id: { $ne: resubmissionId } }, { status: 'rejected', adminNotes: notes || '' });
      } catch (err) {
        console.warn('Failed to update resubmission requests for user after approving specific resubmission:', userId, err);
      }
    } else {
      // Default behavior: update user without changing image URLs
      user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    // Update any pending resubmission requests for this user
    try {
      if (status === 'approved') {
        await ResubmissionRequest.updateMany({ userId }, { status: 'reviewed', adminNotes: notes || '' });
      } else if (status === 'rejected') {
        await ResubmissionRequest.updateMany({ userId }, { status: 'rejected', adminNotes: notes || '' });
      }
    } catch (err) {
      console.warn('Failed to update resubmission requests for user:', userId, err);
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