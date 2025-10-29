import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import OTP from '@/models/OTP';

// Generate 6-digit OTP code
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Normalize phone number to match database format (without + prefix)
const normalizePhone = (phone: string): string => {
  const normalized = phone.replace(/[^0-9]/g, ''); // Remove non-digits
  
  // Keep the format as stored in DB (starting with 0)
  if (normalized.startsWith('0')) {
    return normalized;
  } else if (normalized.startsWith('62')) {
    return '0' + normalized.substring(2);
  } else {
    return '0' + normalized;
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
    
    // Create alternative phone formats to check
    const phoneFormats = [
      normalizedPhone, // 082249013283
      normalizedPhone.startsWith('0') ? '62' + normalizedPhone.substring(1) : normalizedPhone, // 6282249013283
      normalizedPhone.startsWith('0') ? '+62' + normalizedPhone.substring(1) : '+' + normalizedPhone, // +6282249013283
    ];

    // Check if user with this phone number exists (try multiple formats)
    const user = await User.findOne({ phoneNumber: { $in: phoneFormats } });
    
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

    // Save OTP to database using the format found in DB
    await OTP.create({
      phoneNumber: user.phoneNumber, // Use the exact format from user document
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

    // Convert phone to WhatsApp format (62xxx without +)
    const userPhone = user.phoneNumber;
    const whatsappPhone = userPhone.startsWith('0') 
      ? '62' + userPhone.substring(1) 
      : userPhone.replace('+', '');
    
    // Call cron service to send WhatsApp message
    try {
      const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3010';
      const whatsappServiceSecret = process.env.WHATSAPP_SERVICE_SECRET || 'default-secret-change-me';
      
      const response = await fetch(`${whatsappServiceUrl}/whatsapp/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappServiceSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: whatsappPhone,
          message: message,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Failed to send WhatsApp OTP:', result.error);
        return NextResponse.json(
          { error: 'Gagal mengirim kode OTP. Silakan coba lagi.' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error calling WhatsApp service:', error);
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
