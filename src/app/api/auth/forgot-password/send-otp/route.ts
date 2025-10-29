import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import OTP from '@/models/OTP';
import { sendEmail } from '@/lib/email';

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

    const { identifier, deliveryMethod = 'whatsapp' } = await request.json();

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { error: 'Email atau nomor telepon wajib diisi' },
        { status: 400 }
      );
    }

    const identifierValue = identifier.trim();
    const isEmail = identifierValue.includes('@');
    
    let user;
    let userPhoneNumber = '';
    
    if (isEmail) {
      // Search by email
      user = await User.findOne({ email: identifierValue });
      if (user) {
        userPhoneNumber = user.phoneNumber;
      }
    } else {
      // Search by phone number
      const normalizedPhone = normalizePhone(identifierValue);
      
      // Create alternative phone formats to check
      const phoneFormats = [
        normalizedPhone, // 082249013283
        normalizedPhone.startsWith('0') ? '62' + normalizedPhone.substring(1) : normalizedPhone, // 6282249013283
        normalizedPhone.startsWith('0') ? '+62' + normalizedPhone.substring(1) : '+' + normalizedPhone, // +6282249013283
      ];

      user = await User.findOne({ phoneNumber: { $in: phoneFormats } });
      if (user) {
        userPhoneNumber = user.phoneNumber;
      }
    }
    
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return NextResponse.json(
        { error: isEmail ? 'Email tidak terdaftar' : 'Nomor telepon tidak terdaftar' },
        { status: 404 }
      );
    }

    // Check for recent OTP requests (rate limiting - 1 minute)
    const recentOTP = await OTP.findOne({
      phoneNumber: userPhoneNumber,
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
      phoneNumber: userPhoneNumber, // Use the exact format from user document
      code,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });

    // Send OTP based on delivery method
    if (deliveryMethod === 'email') {
      // Send via email
      if (!user.email) {
        return NextResponse.json(
          { error: 'Email tidak terdaftar untuk akun ini. Silakan gunakan WhatsApp.' },
          { status: 400 }
        );
      }

      try {
        const emailSubject = 'Kode OTP - Reset Password';
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Kode OTP - Reset Password</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa;">
            <table width="100%" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <tr>
                <td align="center" style="padding: 30px 20px; background-color: #ffffff; border-bottom: 3px solid #e9ecef;">
                  <img src="${process.env.NEXTAUTH_URL}/images/koperasi-logo.jpg" alt="Koperasi Bintang Merah Sejahtera" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px;">
                  <h2 style="margin: 0; font-size: 24px; color: #333; font-weight: 600;">Kode OTP - Reset Password</h2>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Koperasi Bintang Merah Sejahtera</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px;">Halo <strong>${user.fullName || 'Pengguna'}</strong>,</p>

                  <p style="font-size: 16px; line-height: 1.5; margin: 20px 0;">
                    Anda telah meminta untuk mereset password akun Anda. Gunakan kode OTP berikut untuk melanjutkan proses reset password:
                  </p>

                  <div style="background: #f8f9fa; border: 2px dashed #364D32; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Kode OTP Anda</p>
                    <p style="margin: 0; font-size: 36px; font-weight: bold; color: #364D32; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</p>
                  </div>

                  <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 25px 0;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #856404; line-height: 1.6;">
                      <strong>⏱️ Penting:</strong> Kode ini berlaku selama <strong>5 menit</strong>.
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.6;">
                      <strong>🔒 Keamanan:</strong> Jangan bagikan kode ini kepada siapapun, termasuk staff kami.
                    </p>
                  </div>

                  <div style="background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 25px 0;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #495057; line-height: 1.6;">
                      Jika Anda <strong>tidak meminta</strong> reset password, abaikan email ini dan password Anda akan tetap aman.
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #495057; line-height: 1.6;">
                      Jika Anda mengalami masalah keamanan, segera hubungi tim customer service kami.
                    </p>
                  </div>

                  <p style="margin: 25px 0 15px 0; line-height: 1.6;">
                    Terima kasih,<br>
                    <strong>Tim Koperasi Bintang Merah Sejahtera</strong>
                  </p>

                  <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">

                  <p style="font-size: 12px; color: #6c757d; text-align: center; margin: 0; line-height: 1.4;">
                    <strong>Koperasi Bintang Merah Sejahtera</strong><br>
                    Email otomatis - mohon jangan membalas langsung ke email ini<br>
                    Untuk bantuan, silakan hubungi customer service melalui website
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const result = await sendEmail(user.email, emailSubject, emailHtml);

        if (!result.success) {
          console.error('Failed to send email OTP:', result.error);
          return NextResponse.json(
            { error: 'Gagal mengirim kode OTP. Silakan coba lagi.' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Kode OTP telah dikirim ke Email Anda',
          expiresIn: 300, // 5 minutes in seconds
        });
      } catch (error) {
        console.error('Error sending email OTP:', error);
        return NextResponse.json(
          { error: 'Gagal mengirim kode OTP. Silakan coba lagi.' },
          { status: 500 }
        );
      }
    } else {
      // Send via WhatsApp (default)
      if (!userPhoneNumber) {
        return NextResponse.json(
          { error: 'Nomor telepon tidak terdaftar untuk akun ini. Silakan gunakan Email.' },
          { status: 400 }
        );
      }

      const message = `🔐 *KODE OTP - RESET PASSWORD*
Koperasi Bintang Merah Sejahtera

Kode OTP Anda: *${code}*

Kode ini berlaku selama *5 menit*.
Jangan bagikan kode ini kepada siapapun.

Jika Anda tidak meminta reset password, abaikan pesan ini.

_Pesan otomatis - Koperasi Bintang Merah Sejahtera_`;

      // Convert phone to WhatsApp format (62xxx without +)
      const whatsappPhone = userPhoneNumber.startsWith('0') 
        ? '62' + userPhoneNumber.substring(1) 
        : userPhoneNumber.replace('+', '');
      
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

        return NextResponse.json({
          success: true,
          message: 'Kode OTP telah dikirim ke WhatsApp Anda',
          expiresIn: 300, // 5 minutes in seconds
        });
      } catch (error) {
        console.error('Error calling WhatsApp service:', error);
        return NextResponse.json(
          { error: 'Gagal mengirim kode OTP. Silakan coba lagi.' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
