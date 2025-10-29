import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import OTP from '@/models/OTP';
import crypto from 'crypto';

// Normalize phone number
const normalizePhone = (phone: string): string => {
  const normalized = phone.replace(/[^0-9]/g, ''); // Remove non-digits
  
  if (normalized.startsWith('62')) {
    return '+' + normalized;
  } else if (normalized.startsWith('0')) {
    return '+62' + normalized.substring(1);
  } else {
    return '+62' + normalized;
  }
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { identifier, otp } = await request.json();

    if (!identifier || !otp) {
      return NextResponse.json(
        { error: 'Email/Nomor telepon dan kode OTP wajib diisi' },
        { status: 400 }
      );
    }

    const identifierValue = identifier.trim();
    const isEmail = identifierValue.includes('@');
    
    let user;
    let phoneFormats: string[] = [];
    
    if (isEmail) {
      // Search by email
      user = await User.findOne({ email: identifierValue });
      if (user && user.phoneNumber) {
        phoneFormats = [user.phoneNumber];
      }
    } else {
      // Search by phone number
      const normalizedPhone = normalizePhone(identifierValue);
      
      // Create alternative phone formats to check
      phoneFormats = [
        identifierValue,
        normalizedPhone,
        identifierValue.replace(/[^0-9]/g, ''),
        identifierValue.replace(/[^0-9]/g, '').startsWith('0') 
          ? '62' + identifierValue.replace(/[^0-9]/g, '').substring(1)
          : identifierValue.replace(/[^0-9]/g, ''),
      ];
      
      user = await User.findOne({ phoneNumber: { $in: phoneFormats } });
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      );
    }

    // Find the most recent unused OTP for this phone number (check all formats)
    const otpRecord = await OTP.findOne({
      phoneNumber: { $in: phoneFormats },
      isUsed: false,
      expiresAt: { $gt: new Date() }, // Not expired
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Kode OTP tidak valid atau sudah kadaluarsa' },
        { status: 400 }
      );
    }

    // Check max attempts (5 attempts)
    if (otpRecord.attempts >= 5) {
      await OTP.findByIdAndUpdate(otpRecord._id, { isUsed: true });
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Silakan minta kode OTP baru.' },
        { status: 429 }
      );
    }

    // Verify OTP code
    if (otpRecord.code !== otp.trim()) {
      // Increment attempts
      await OTP.findByIdAndUpdate(otpRecord._id, { 
        $inc: { attempts: 1 } 
      });
      
      const remainingAttempts = 5 - (otpRecord.attempts + 1);
      return NextResponse.json(
        { 
          error: `Kode OTP salah. Sisa percobaan: ${remainingAttempts}`,
          remainingAttempts 
        },
        { status: 400 }
      );
    }

    // OTP is valid - mark as used
    await OTP.findByIdAndUpdate(otpRecord._id, { isUsed: true });

    // Generate a reset token (valid for 15 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // Store reset token in user document (check all phone formats)
    await User.findOneAndUpdate(
      { phoneNumber: { $in: phoneFormats } },
      {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Kode OTP valid',
      resetToken,
      expiresIn: 900, // 15 minutes in seconds
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
