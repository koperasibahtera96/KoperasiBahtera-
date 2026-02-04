import dbConnect from '@/lib/mongodb';
import { validateReferralCode } from '@/lib/referral';
import Settings from '@/models/Settings';
import User from '@/models/User';
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

     // Get the commission rate for this referral (only custom, no fallback to global)
     const commissionRate = referralOwner.customCommissionRate;

     // Determine if this is a mitra referral (outside session block)
     const isMitraMatch = referralOwner.role === 'mitra';

     // Check discount eligibility based on referral code type
     // Calculate discount info regardless of session for preview functionality
     let discountInfo = null;

      // Only apply discount if:
      // 1. Referral code owner is 'mitra'
      // 2. Mitra has a custom commission rate set
      if (
        referralOwner.role === 'mitra' &&
        referralOwner.customCommissionRate !== undefined &&
        referralOwner.customCommissionRate !== null
      ) {
        // Calculate discount as commissionRate minus companyCutRate
        const companyCutRate = referralOwner.companyCutRate ?? 0;
        const discountPercentage = Math.max(0, commissionRate - companyCutRate);
        
        if (discountPercentage > 0) {
          // Fetch mitra discount settings
          const settings = await Settings.findOne({ type: 'system' });
          const eligiblePaymentTerms = settings?.config?.mitraDiscountEligiblePaymentTerms || ['monthly', 'annual'];

          discountInfo = {
            isSppgUser: true, // Keep field name for backward compatibility
            discountPercentage: discountPercentage, // e.g., 0.30 = 30%
            discountLabel: `${Math.round(discountPercentage * 100)}%`,
            eligiblePaymentTerms: eligiblePaymentTerms
          };
        }
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