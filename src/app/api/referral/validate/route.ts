import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
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

    // Verify the referral code exists (belongs to a marketing staff)
    const marketingUser = await User.findOne({
      referralCode: referralCode,
      role: 'marketing'
    });

    if (!marketingUser) {
      return NextResponse.json({
        success: false,
        error: 'Kode referral tidak valid atau tidak ditemukan'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Kode referral valid',
      marketingStaffName: marketingUser.fullName
    });

  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json({
      success: false,
      error: 'Gagal memvalidasi kode referral'
    }, { status: 500 });
  }
}