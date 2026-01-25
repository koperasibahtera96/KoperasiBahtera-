import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Settings from '@/models/Settings';
import { validateReferralCode } from '@/lib/referral';

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

    // Verify the referral code exists (belongs to a marketing staff or marketing_head)
    const marketingUser = await User.findOne({
      referralCode: referralCode,
      role: { $in: ['marketing', 'marketing_head'] }
    });

    if (!marketingUser) {
      return NextResponse.json({
        success: false,
        error: 'Kode referral tidak valid atau tidak ditemukan'
      }, { status: 400 });
    }

    // Check if marketing staff is deactivated
    if (!marketingUser.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Kode referral tidak aktif'
      }, { status: 400 });
    }

    // Get the commission rate for this referral (custom or global)
    let commissionRate = marketingUser.customCommissionRate;
    if (commissionRate === undefined || commissionRate === null) {
      // Fall back to global rate
      const settings = await Settings.findOne({ type: 'system' });
      commissionRate = settings?.config?.commissionRate ?? 0.02;
    }

    // Check if the requesting user is SPPG to calculate discount
    const session = await getServerSession();
    let discountInfo = null;

    if (session?.user?.email) {
      const requestingUser = await User.findOne({ email: session.user.email });
      
      // SPPG and TNI users get discount equal to the commission rate
      const discountEligibleOccupations = ['sppg', 'tni'];
      if (requestingUser?.occupation && discountEligibleOccupations.includes(requestingUser.occupation)) {
        discountInfo = {
          isSppgUser: true, // Keep field name for backward compatibility
          discountPercentage: commissionRate, // e.g., 0.30 = 30%
          discountLabel: `${Math.round(commissionRate * 100)}%`
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Kode referral valid',
      marketingStaffName: marketingUser.fullName,
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