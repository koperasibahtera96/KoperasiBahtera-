import Settings from "@/models/Settings";
import nodemailer from "nodemailer";
import dbConnect from "./mongodb";
import { decrypt } from "./encryption";

// Get email configuration from database
export const getEmailConfig = async () => {
  await dbConnect();
  const settings = await Settings.findOne({ type: "email", isActive: true });

  if (!settings) {
    throw new Error(
      "Email configuration not found. Please configure email settings in admin panel."
    );
  }

  return settings.config;
};

// Create transporter using database configuration
const createTransporter = async () => {
  const config = await getEmailConfig();

  // Decrypt the password before using it
  const decryptedPassword = decrypt(config.password);
  
  return nodemailer.createTransport({
    service: config.service || "gmail",
    auth: {
      user: config.email,
      pass: decryptedPassword,
    },
  });
};

// Email templates
export const emailTemplates = {
  contractApproved: (
    investorName: string,
    contractNumber: string,
    contractId: string,
    productName: string,
    amount: number,
    approvedDate: string
  ) => ({
    subject: `Kontrak Disetujui - ${contractNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Kontrak Disetujui</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa;">

        <table width="100%" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #ffffff; border-bottom: 3px solid #e9ecef;">
              <img src="${
                process.env.NEXTAUTH_URL
              }/images/koperasi-logo.jpg" alt="Koperasi Bintang Merah Sejahtera" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px;">
              <h2 style="margin: 0; font-size: 24px; color: #333; font-weight: 600;">Pemberitahuan Persetujuan Kontrak</h2>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Koperasi Bintang Merah Sejahtera</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px;">Kepada Yth. <strong>${investorName}</strong>,</p>

              <p style="background: #f8f9fa; padding: 20px; border-left: 4px solid #6c757d; margin: 25px 0; font-size: 16px; line-height: 1.5;">
                Dengan hormat, kami informasikan bahwa kontrak investasi Anda telah disetujui oleh tim admin kami dan siap untuk tahap selanjutnya.
              </p>

              <table style="width: 100%; border-collapse: collapse; margin: 25px 0; border: 1px solid #e9ecef;">
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; font-weight: 600; width: 40%;">Nomor Kontrak</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef;">${contractNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; font-weight: 600;">Produk Investasi</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef;">${productName}</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; font-weight: 600;">Tanggal Disetujui</td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef;">${approvedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; font-weight: 600;">Nilai Investasi</td>
                  <td style="padding: 12px 15px; font-weight: 600; font-size: 18px;">Rp ${amount.toLocaleString(
                    "id-ID"
                  )}</td>
                </tr>
              </table>

              <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #495057; font-size: 18px; font-weight: 600;">Langkah Selanjutnya:</h3>
                <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li style="margin-bottom: 8px;">Lakukan pembayaran sesuai dengan metode yang telah dipilih dalam kontrak</li>
                  <li style="margin-bottom: 8px;">Upload bukti pembayaran melalui dashboard investor Anda</li>
                  <li style="margin-bottom: 8px;">Tunggu proses verifikasi pembayaran dari tim kami (1-2 hari kerja)</li>
                  <li>Setelah pembayaran diverifikasi, pohon investasi Anda akan dialokasikan secara otomatis</li>
                </ol>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.6;">
                  <strong>Catatan Penting:</strong> Silakan akses dashboard investor Anda di website untuk melihat detail kontrak lengkap dan melakukan pembayaran. Jika mengalami kesulitan, jangan ragu untuk menghubungi tim customer service kami.
                </p>
              </div>

              <p style="margin: 25px 0 15px 0; line-height: 1.6;">
                Terima kasih atas kepercayaan Anda memilih Koperasi Bintang Merah Sejahtera sebagai mitra investasi. Kami berkomitmen untuk memberikan layanan terbaik dan transparansi penuh dalam setiap proses investasi Anda.
              </p>

              <p style="margin: 15px 0; line-height: 1.6;">
                Hormat kami,<br>
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
    `,
  }),

  weeklyReminder: (
    investorName: string,
    productName: string,
    dueDate: string,
    amount: number
  ) => ({
    subject: `Pengingat Cicilan - ${productName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pengingat Cicilan</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">

        <table width="100%" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <img src="${
                process.env.NEXTAUTH_URL
              }/images/koperasi-logo.jpg" alt="Koperasi Bintang Merah Sejahtera" style="width: 80px; height: 80px; border-radius: 50%;">
              <h2 style="margin: 10px 0 5px 0;">Koperasi Bintang Merah Sejahtera</h2>
              <p style="margin: 0; color: #666; font-size: 14px;">Pengingat Cicilan</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; border-top: 2px solid #ddd;">
              <p>Yth. <strong>${investorName}</strong>,</p>

              <p><strong>PENGINGAT:</strong> Cicilan Anda akan jatuh tempo dalam <strong>7 hari</strong>.</p>

              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Produk:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${productName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Tanggal Jatuh Tempo:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">${dueDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;"><strong>Jumlah:</strong></td>
                  <td style="padding: 10px 0; font-weight: bold; font-size: 18px;">Rp ${amount.toLocaleString(
                    "id-ID"
                  )}</td>
                </tr>
              </table>

              <p style="text-align: center; margin: 30px 0;">
                <a href="${
                  process.env.NEXTAUTH_URL
                }/payments" style="background: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Lihat Dashboard Pembayaran
                </a>
              </p>

              <p>Mohon persiapkan pembayaran Anda untuk menghindari keterlambatan.</p>

              <p>Terima kasih atas kerjasama Anda.</p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 12px; color: #666; text-align: center;">
                <strong>Koperasi Bintang Merah Sejahtera</strong><br>
                Email otomatis - mohon jangan membalas
              </p>
            </td>
          </tr>
        </table>

      </body>
      </html>
    `,
  }),

  dueDateReminder: (
    investorName: string,
    productName: string,
    dueDate: string,
    amount: number
  ) => ({
    subject: `URGENT - Cicilan Jatuh Tempo Hari Ini - ${productName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>URGENT - Cicilan Jatuh Tempo</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">

        <table width="100%" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 20px 0; background: #d32f2f; color: white;">
              <img src="${
                process.env.NEXTAUTH_URL
              }/images/koperasi-logo.jpg" alt="Koperasi Bintang Merah Sejahtera" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px;">
              <h2 style="margin: 0; font-size: 24px;">CICILAN JATUH TEMPO HARI INI</h2>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Koperasi Bintang Merah Sejahtera</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px;">
              <p>Yth. <strong>${investorName}</strong>,</p>

              <p style="background: #ffebee; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0; font-weight: bold;">
                ⚠️ URGENT: Cicilan Anda JATUH TEMPO HARI INI. Segera lakukan pembayaran untuk menghindari denda.
              </p>

              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Produk:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${productName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Tanggal Jatuh Tempo:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #d32f2f;">${dueDate} (HARI INI)</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;"><strong>Jumlah:</strong></td>
                  <td style="padding: 10px 0; font-weight: bold; font-size: 20px; color: #d32f2f;">Rp ${amount.toLocaleString(
                    "id-ID"
                  )}</td>
                </tr>
              </table>

                              }/payments" style="background: #d32f2f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                  BAYAR SEKARANG
                </a>
              </div>
              <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <strong>Sudah Bayar?</strong> Upload bukti pembayaran melalui dashboard pembayaran untuk verifikasi.

              <p>Untuk bantuan segera, hubungi customer service kami.</p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 12px; color: #d32f2f; text-align: center; font-weight: bold;">
                <strong>Koperasi Bintang Merah Sejahtera</strong><br>
                Email darurat - segera ambil tindakan
              </p>
            </td>
          </tr>
        </table>

      </body>
      </html>
    `,
  }),
};

// Send email function
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = await createTransporter();
    const config = await getEmailConfig();

    const mailOptions = {
      from: `"Koperasi Bintang Merah Sejahtera" <${config.email}>`,
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return { success: false, error: (error as any).message };
  }
};
