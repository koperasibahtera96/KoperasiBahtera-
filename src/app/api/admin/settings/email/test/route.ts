import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { decrypt } from "@/lib/encryption";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !["admin", "staff"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, password, service } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password diperlukan untuk pengujian" },
        { status: 400 }
      );
    }

    // Create transporter with the provided settings
    // Check if the password is encrypted (contains a colon)
    const decryptedPassword = password.includes(':') ? decrypt(password) : password;
    
    const transporter = nodemailer.createTransport({
      service: service || "gmail",
      auth: {
        user: email,
        pass: decryptedPassword,
      },
    });

    // Verify connection configuration
    await transporter.verify();

    // Send test email
    const _info = await transporter.sendMail({
      from: `"Investasi Hijau" <${email}>`,
      to: email,
      subject: "Test Email dari Investasi Hijau",
      text: "Ini adalah email percobaan untuk memverifikasi pengaturan email Anda.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email dari Investasi Hijau</h2>
          <p>Email ini menandakan bahwa pengaturan email Anda berfungsi dengan benar.</p>
          <p>Jika Anda menerima email ini, berarti konfigurasi SMTP Anda sudah benar.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Ini adalah email otomatis - mohon jangan membalas pesan ini.
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Test email berhasil dikirim!"
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    
    let errorMessage = "Gagal mengirim email percobaan";
    
    if (error instanceof Error) {
      if (error.message.includes("Invalid login")) {
        errorMessage = "Email atau password salah";
      } else if (error.message.includes("self signed certificate")) {
        errorMessage = "Masalah dengan sertifikat SSL. Pastikan konfigurasi keamanan benar.";
      } else if (error.message.includes("connect ETIMEDOUT")) {
        errorMessage = "Tidak dapat terhubung ke server email. Periksa koneksi internet Anda.";
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
