import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

/**
 * GET - Fetch commission settings for a marketing staff
 * Query params: staffId (required)
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has marketing_head or admin role
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser || !['marketing_head', 'admin'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Access denied. Marketing Head or Admin role required.' },
        { status: 403 }
      );
    }

    const staffId = req.nextUrl.searchParams.get('staffId');
    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    // Find the marketing staff or mitra
    const marketingStaff = await User.findById(staffId);
    if (!marketingStaff || !['marketing', 'marketing_head', 'mitra'].includes(marketingStaff.role)) {
      return NextResponse.json(
        { error: 'Marketing staff or mitra not found' },
        { status: 404 }
      );
    }



    return NextResponse.json({
      success: true,
      data: {
        staffId: marketingStaff._id,
        staffName: marketingStaff.fullName,
        referralCode: marketingStaff.referralCode,
        customCommissionRate: marketingStaff.customCommissionRate,
        companyCutRate: marketingStaff.companyCutRate,
      },
    });
  } catch (error) {
    console.error('Error fetching referral settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch referral settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update commission settings for a marketing staff
 * Body: { staffId, customCommissionRate, companyCutRate }
 */
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has marketing_head or admin role
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser || !['marketing_head', 'admin'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Access denied. Marketing Head or Admin role required.' },
        { status: 403 }
      );
    }

    const { staffId, customCommissionRate, companyCutRate } = await req.json();

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    // Find the marketing staff or mitra
    const marketingStaff = await User.findById(staffId);
    if (!marketingStaff || !['marketing', 'marketing_head', 'mitra'].includes(marketingStaff.role)) {
      return NextResponse.json(
        { error: 'Marketing staff or mitra not found' },
        { status: 404 }
      );
    }

    // Validate customCommissionRate (0 to 1, i.e., 0% to 100%)
    if (customCommissionRate !== undefined && customCommissionRate !== null) {
      if (typeof customCommissionRate !== 'number' || customCommissionRate < 0 || customCommissionRate > 1) {
        return NextResponse.json(
          { error: 'Commission rate must be between 0 and 1 (0% to 100%)' },
          { status: 400 }
        );
      }
    }

    // Company cut can only be set for mitra role
    if (companyCutRate !== undefined && companyCutRate !== null) {
      if (marketingStaff.role !== 'mitra') {
        return NextResponse.json(
          { error: 'Company cut rate can only be set for mitra role' },
          { status: 400 }
        );
      }

       if (typeof companyCutRate !== 'number' || companyCutRate < 0 || companyCutRate > 1) {
         return NextResponse.json(
           { error: 'Company cut rate must be between 0 and 1 (0% to 100%)' },
           { status: 400 }
         );
       }

       const effectiveCommissionRate = customCommissionRate ?? marketingStaff.customCommissionRate;

       if (effectiveCommissionRate === undefined || effectiveCommissionRate === null) {
         return NextResponse.json(
           { error: 'Persentase komisi harus diatur terlebih dahulu sebelum potongan perusahaan' },
           { status: 400 }
         );
       }
       
       if (companyCutRate >= effectiveCommissionRate) {
         return NextResponse.json(
           { error: 'Potongan perusahaan harus kurang dari komisi' },
           { status: 400 }
         );
       }
    } else if (marketingStaff.role === 'mitra' && companyCutRate === null) {
      // Allow clearing company cut for mitra (set to undefined)
      // This is handled by the updateFields logic below
    }

    // Store old values for audit logging
    const oldValues = {
      customCommissionRate: marketingStaff.customCommissionRate,
      companyCutRate: marketingStaff.companyCutRate,
    };

    // Prepare update object
    const updateFields: Record<string, number | undefined> = {};
    if (customCommissionRate !== undefined) {
      updateFields.customCommissionRate = customCommissionRate;
    }
    
    // Company cut handling:
    // - For mitra: Set to provided value (or undefined if null)
    // - For marketing/head marketing: Always set to undefined (cannot have company cut)
    if (marketingStaff.role === 'mitra') {
      if (companyCutRate !== undefined) {
        updateFields.companyCutRate = companyCutRate;
      }
    } else {
      // Marketing/head marketing cannot have company cut
      updateFields.companyCutRate = undefined;
    }

    // Update the marketing staff
    const updatedStaff = await User.findByIdAndUpdate(
      staffId,
      { $set: updateFields },
      { new: true }
    ).select('_id fullName email referralCode customCommissionRate companyCutRate');

    // Log audit trail
    console.log('[AUDIT] Commission settings updated:', {
      updatedBy: currentUser.email,
      staffId: marketingStaff._id,
      staffName: marketingStaff.fullName,
      oldValues,
      newValues: {
        customCommissionRate: updatedStaff?.customCommissionRate,
        companyCutRate: updatedStaff?.companyCutRate,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Commission settings updated successfully',
      data: {
        staffId: updatedStaff?._id,
        staffName: updatedStaff?.fullName,
        referralCode: updatedStaff?.referralCode,
        customCommissionRate: updatedStaff?.customCommissionRate,
        companyCutRate: updatedStaff?.companyCutRate,
      },
    });
  } catch (error) {
    console.error('Error updating referral settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to update referral settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
