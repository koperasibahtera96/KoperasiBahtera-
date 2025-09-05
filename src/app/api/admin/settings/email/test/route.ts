import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.role ||
      !["admin", "staff"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, password, service } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create transporter with provided settings
    const transporter = nodemailer.createTransport({
      service: service,
      auth: {
        user: email,
        pass: password,
      },
    });

    // Send test email
    const testMailOptions = {
      from: `"Koperasi Bintang Merah Sejahtera" <${email}>`,
      to: email, // Send to self for testing
      subject: "Test Email Configuration - Koperasi Bintang Merah Sejahtera",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E7D32;">Test Email Berhasil!</h2>

          <p>Selamat! Konfigurasi email Anda berhasil.</p>

          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2E7D32; margin-top: 0;">Detail Konfigurasi:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Service:</strong> ${service}</p>
            <p><strong>Tanggal Test:</strong> ${new Date().toLocaleString(
              "id-ID"
            )}</p>
          </div>

          <p>Email ini menunjukkan bahwa sistem dapat mengirim notifikasi cicilan kepada investor.</p>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            Koperasi Bintang Merah Sejahtera<br>
            Email test dikirim secara otomatis.
          </p>
        </div>
      `,
    };

    const result = await transporter.sendMail(testMailOptions);
    console.log(`Test email sent successfully:`, result.messageId);

    return NextResponse.json({
      message: "Test email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Failed to send test email:", error);
    return NextResponse.json(
      { error: (error as any).message || "Failed to send test email" },
      { status: 500 }
    );
  }
}
