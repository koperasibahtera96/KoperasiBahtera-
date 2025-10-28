import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import OTP from '@/models/OTP';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// Generate 6-digit OTP code
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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

    const { phoneNumber } = await request.json();

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json(
        { error: 'Nomor telepon wajib diisi' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(phoneNumber.trim());

    // Check if user with this phone number exists
    const user = await User.findOne({ phoneNumber: normalizedPhone });
    
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return NextResponse.json(
        { error: 'Nomor telepon tidak terdaftar' },
        { status: 404 }
      );
    }

    // Check for recent OTP requests (rate limiting - 1 minute)
    const recentOTP = await OTP.findOne({
      phoneNumber: normalizedPhone,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }, // Last 1 minute
    });

    if (recentOTP) {
      return NextResponse.json(
        { error: 'Mohon tunggu 1 menit sebelum meminta kode OTP lagi' },
        { status: 429 }
      );
    }

    // Generate OTP code
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to database
    await OTP.create({
      phoneNumber: normalizedPhone,
      code,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });

    // Send OTP via WhatsApp
    const message = `🔐 *KODE OTP - RESET PASSWORD*
Koperasi Bintang Merah Sejahtera

Kode OTP Anda: *${code}*

Kode ini berlaku selama *5 menit*.
Jangan bagikan kode ini kepada siapapun.

Jika Anda tidak meminta reset password, abaikan pesan ini.

_Pesan otomatis - Koperasi Bintang Merah Sejahtera_`;

    const result = await sendWhatsAppMessage(normalizedPhone, message);

    if (!result.success) {
      console.error('Failed to send WhatsApp OTP:', result.error);
      return NextResponse.json(
        { error: 'Gagal mengirim kode OTP. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kode OTP telah dikirim ke WhatsApp Anda',
      expiresIn: 300, // 5 minutes in seconds
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
