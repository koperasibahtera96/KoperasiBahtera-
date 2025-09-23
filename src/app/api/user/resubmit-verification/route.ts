import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import ResubmissionRequest from '@/models/ResubmissionRequest';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ktpImageUrl, faceImageUrl } = body || {};

    if (!ktpImageUrl || !faceImageUrl) {
      return NextResponse.json(
        { error: 'ktpImageUrl and faceImageUrl are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create a resubmission request record
    const req = new ResubmissionRequest({
      userId: user._id,
      ktpImageUrl,
      faceImageUrl,
      status: 'pending',
    });

    await req.save();

    // Update user verification status back to pending so admin can re-review
    user.verificationStatus = 'pending';
    user.verificationNotes = undefined;
    user.verifiedBy = undefined as any;
    user.verifiedAt = undefined as any;
    user.canPurchase = false;
    await user.save();

    // return both the created resubmission and the updated user verification fields
    return NextResponse.json({
      success: true,
      data: {
        resubmission: req,
        user: {
          verificationStatus: user.verificationStatus,
          verificationNotes: user.verificationNotes,
          profileImageUrl: (user as any).profileImageUrl,
          ktpImageUrl: (user as any).ktpImageUrl,
        },
      },
    });
  } catch (error) {
    console.error('Error creating resubmission request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - return latest resubmission request for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const resub = await ResubmissionRequest.findOne({ userId: session.user.id }).sort({ createdAt: -1 }).lean();
    const user = await User.findById(session.user.id).lean();

    return NextResponse.json({
      success: true,
      data: {
        resubmission: resub || null,
        user: user
          ? {
              verificationStatus: (user as any).verificationStatus,
              verificationNotes: (user as any).verificationNotes,
              profileImageUrl: (user as any).profileImageUrl,
              ktpImageUrl: (user as any).ktpImageUrl,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching user resubmission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
