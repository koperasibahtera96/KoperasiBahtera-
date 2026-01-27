import dbConnect from '@/lib/mongodb';
import { validateReferralCode } from '@/lib/referral';
import Settings from '@/models/Settings';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { referralCode } = await req.json();

    if (!referralCode) {
      return NextResponse.json({
        success: false,
        error: 'Kode referral tidak boleh kosong'
      }, { status: 400 });
    }

    // Validate referral code format
    if (!validateReferralCode(referralCode)) {
      return NextResponse.json({
        success: false,
        error: 'Format kode referral tidak valid. Harus 6 karakter huruf kapital dan angka'
      }, { status: 400 });
    }

    // Verify the referral code exists (belongs to marketing, marketing_head, or mitra)
    const referralOwner = await User.findOne({
      referralCode: referralCode,
      role: { $in: ['marketing', 'marketing_head', 'mitra'] }
    });

    if (!referralOwner) {
      return NextResponse.json({
        success: false,
        error: 'Kode referral tidak valid atau tidak ditemukan'
      }, { status: 400 });
    }

    // Check if referral owner is deactivated
    if (!referralOwner.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Kode referral tidak aktif'
      }, { status: 400 });
    }

    // Determine referral code type
    const referralCodeType = referralOwner.role === 'mitra' ? 'mitra' :
                             referralOwner.role === 'marketing_head' ? 'marketing_head' : 'marketing';

    // Get the commission rate for this referral (custom or global)
    let commissionRate = referralOwner.customCommissionRate;
    if (commissionRate === undefined || commissionRate === null) {
      // Fall back to global rate
      const settings = await Settings.findOne({ type: 'system' });
      commissionRate = settings?.config?.commissionRate ?? 0.02;
    }

    // Check discount eligibility based on referral code type
    const session = await getServerSession();
    let discountInfo = null;
    let isMitraMatch = false;

    if (session?.user?.email) {
      const requestingUser = await User.findOne({ email: session.user.email });

      // Only apply discount if:
      // 1. Referral code owner is 'mitra'
      // 2. User's occupation matches mitra's occupation
      // 3. Commission rate > 0
      if (
        referralOwner.role === 'mitra' &&
        requestingUser?.occupation &&
        requestingUser.occupation === referralOwner.occupation &&
        commissionRate > 0
      ) {
        isMitraMatch = true;
        discountInfo = {
          isSppgUser: true, // Keep field name for backward compatibility
          discountPercentage: commissionRate, // e.g., 0.30 = 30%
          discountLabel: `${Math.round(commissionRate * 100)}%`
        };
      }
      // Marketing/head marketing codes never provide discount (regardless of user occupation)
    }

    return NextResponse.json({
      success: true,
      message: 'Kode referral valid',
      marketingStaffName: referralOwner.fullName,
      referralCodeType,
      ...(referralOwner.role === 'mitra' && { isMitraMatch }),
      ...(discountInfo && { discountInfo })
    });

  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json({
      success: false,
      error: 'Gagal memvalidasi kode referral'
    }, { status: 500 });
  }
}