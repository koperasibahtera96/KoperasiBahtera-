import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';
import Contract from '@/models/Contract';
import { validateReferralCode } from '@/lib/referral';
import { getServerSession } from 'next-auth/next';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { investmentId, referralCode } = await req.json();

    console.log('Saving referral code:', { investmentId, referralCode, userEmail: session.user.email });

    if (!investmentId || !referralCode) {
      return NextResponse.json({
        success: false,
        error: 'Investment ID dan kode referral tidak boleh kosong'
      }, { status: 400 });
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
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

    // Determine if this is a cicilan or full payment investment
    // First check if it's a cicilan (installment payments)
    const cicilanPayments = await Payment.find({
      userId: user._id,
      cicilanOrderId: investmentId,
      paymentType: "cicilan-installment"
    });

    console.log('Cicilan payments found:', cicilanPayments.length);

    if (cicilanPayments.length > 0) {
      // This is a cicilan investment - update all payments in this group
      await Payment.updateMany(
        {
          userId: user._id,
          cicilanOrderId: investmentId,
          paymentType: "cicilan-installment"
        },
        {
          $set: { referralCode: referralCode }
        }
      );

      return NextResponse.json({
        success: true,
        message: `Kode referral ${referralCode} berhasil disimpan untuk semua cicilan dalam investasi ini`,
        investmentType: 'cicilan'
      });
    }

    // Check if it's a full payment investment
    const contract = await Contract.findOne({
      userId: user._id,
      contractId: investmentId,
      paymentType: "full"
    });

    if (contract) {
      // This is a full payment - update or create payment record
      const existingPayment = await Payment.findOne({
        userId: user._id,
        orderId: investmentId,
        paymentType: "full-investment"
      });

      if (existingPayment) {
        // Update existing payment record
        existingPayment.referralCode = referralCode;
        await existingPayment.save();

        return NextResponse.json({
          success: true,
          message: `Kode referral ${referralCode} berhasil disimpan untuk pembayaran penuh ini`,
          investmentType: 'full-payment'
        });
      } else {
        // No existing payment found - this means payment hasn't been created yet
        return NextResponse.json({
          success: false,
          error: 'Pembayaran untuk kontrak ini belum dibuat. Silakan buat pembayaran terlebih dahulu.'
        }, { status: 400 });
      }
    }

    // Investment ID not found
    return NextResponse.json({
      success: false,
      error: 'Investment tidak ditemukan'
    }, { status: 404 });

  } catch (error) {
    console.error('Error saving referral code:', error);
    return NextResponse.json({
      success: false,
      error: 'Gagal menyimpan kode referral'
    }, { status: 500 });
  }
}