import Settings from "@/models/Settings";
import nodemailer from "nodemailer";
import dbConnect from "./mongodb";

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

  return nodemailer.createTransport({
    service: config.service || "gmail",
    auth: {
      user: config.email,
      pass: config.password,
    },
  });
};

// Email templates
export const emailTemplates = {
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
                }/cicilan" style="background: #333; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Lihat Dashboard Cicilan
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

              <p style="text-align: center; margin: 30px 0;">
                <a href="${
                  process.env.NEXTAUTH_URL
                }/cicilan" style="background: #d32f2f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                  BAYAR SEKARANG
                </a>
              </p>

              <p style="background: #f0f8ff; padding: 15px; border-left: 4px solid #2196f3;">
                <strong>Sudah Bayar?</strong> Upload bukti pembayaran melalui dashboard cicilan untuk verifikasi.
              </p>

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
