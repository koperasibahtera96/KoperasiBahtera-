import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

// Helper function to convert image to base64
const getImageAsBase64 = (imagePath: string): string | null => {
  try {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    const imageBuffer = fs.readFileSync(fullPath);
    const base64 = imageBuffer.toString('base64');
    const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
};


// Generate HTML for front side
const generateFrontHTML = (user: any, logoBase64: string | null, qrCodeDataUrl: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Inter', sans-serif;
          background: white;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }

        .card {
          width: 450px;
          height: 600px;
          background: white;
          border: 2px solid black;
          border-radius: 24px;
          overflow: hidden;
          position: relative;
        }

        .header {
          background: #dc2626;
          height: 128px;
          border-radius: 24px 24px 0 0;
          display: flex;
          align-items: center;
          padding: 24px;
          color: white;
        }

        .logo {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .header-text {
          flex: 1;
          text-align: center;
          padding: 0 16px;
        }

        .header-title {
          font-size: 20px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .header-legal {
          font-size: 14px;
          margin-top: 8px;
          line-height: 1.1;
        }

        .content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: calc(100% - 128px - 96px);
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        }

        .title {
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          color: black;
          margin-bottom: 32px;
        }

        .photo {
          width: 128px;
          height: 128px;
          border: 2px solid #dc2626;
          border-radius: 50%;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .photo-placeholder {
          font-size: 14px;
          color: #666;
          text-align: center;
        }

        .name {
          font-size: 18px;
          font-weight: 700;
          color: black;
          margin-bottom: 12px;
          text-transform: uppercase;
          text-align: center;
        }

        .member-id {
          font-size: 16px;
          color: black;
          text-align: center;
          margin-bottom: 32px;
        }

        .qr-bottom {
          position: absolute;
          bottom: 112px;
          left: 32px;
          width: 60px;
          height: 60px;
          border: 1px solid #d1d5db;
        }

        .qr-bottom img {
          width: 100%;
          height: 100%;
        }

        .footer {
          background: #dc2626;
          height: 96px;
          border-radius: 0 0 24px 24px;
          color: white;
          text-align: center;
          padding: 16px;
          font-size: 12px;
          line-height: 1.2;
        }

        .footer-title {
          font-weight: 700;
          margin-bottom: 8px;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : '<div style="font-size:6px;">LOGO</div>'}
          </div>
          <div class="header-text">
            <div class="header-title">
              KOPERASI<br/>
              BINTANG MERAH SEJAHTERA
            </div>
            <div class="header-legal">
              Akta Notaris TEDDY YUNADI, SH No: 01/AP-04.09/2016<br/>
              SK KEMENKUMHAM No: AHU-0005960.AH.01.28.TAHUN 2022
            </div>
          </div>
          <div class="qr-placeholder">QR</div>
        </div>

        <div class="content">
          <div class="title">KARTU ANGGOTA</div>
          <div class="photo">
            ${user.faceImageUrl ? `<img src="${user.faceImageUrl}" alt="Photo" />` : '<div class="photo-placeholder">FOTO</div>'}
          </div>
          <div class="name">${user.fullName}</div>
          <div class="member-id">No Anggota : ${user.userCode}</div>
        </div>

        <div class="qr-bottom">
          <img src="${qrCodeDataUrl}" alt="QR Code" />
        </div>

        <div class="footer">
          <div class="footer-title">Bintaro Business Center</div>
          <div>Jl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan</div>
          <div>Kota Jakarta Selatan DKI Jakarta 12330</div>
          <div>Telp: 081118893679 Email: koperasibintangmerahsejahtera@gmail.com</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate HTML for back side
const generateBackHTML = () => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Inter', sans-serif;
          background: white;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }

        .card {
          width: 340px;
          height: 216px;
          background: white;
          border: 2px solid black;
          border-radius: 12px;
          overflow: hidden;
        }

        .header {
          background: #dc2626;
          height: 64px;
          border-radius: 10px 10px 0 0;
          color: white;
          text-align: center;
          padding: 8px;
        }

        .header-title {
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
        }

        .header-legal {
          font-size: 8px;
          margin-top: 4px;
          line-height: 1.1;
        }

        .content {
          padding: 16px;
          height: calc(100% - 64px - 48px);
        }

        .title {
          text-align: center;
          font-size: 18px;
          font-weight: 700;
          color: black;
          margin-bottom: 16px;
        }

        .terms {
          font-size: 9px;
          color: black;
          line-height: 1.4;
        }

        .term-item {
          margin-bottom: 8px;
        }

        .term-number {
          font-weight: 600;
        }

        .footer {
          background: #dc2626;
          height: 48px;
          border-radius: 0 0 10px 10px;
          color: white;
          text-align: center;
          padding: 8px;
        }

        .footer-title {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .footer-name {
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="header-title">
            KOPERASI<br/>
            BINTANG MERAH SEJAHTERA
          </div>
          <div class="header-legal">
            Akta Notaris TEDDY YUNADI, SH No: 01/AP-04.09/2016<br/>
            SK KEMENKUMHAM No: AHU-0005960.AH.01.28.TAHUN 2022
          </div>
        </div>

        <div class="content">
          <div class="title">KETENTUAN</div>
          <div class="terms">
            <div class="term-item">
              <span class="term-number">1.</span> Kartu ini merupakan kartu anggota Koperasi Bintang Merah Sejahtera.
            </div>
            <div class="term-item">
              <span class="term-number">2.</span> Penggunaan kartu ini tunduk pada ketentuan yang berlaku sebagaimana di atur dalam Anggaran Dasar (AD) dan Anggaran Rumah Tangga (ART) Koperasi Bintang Merah Sejahtera.
            </div>
            <div class="term-item">
              <span class="term-number">3.</span> Kartu anggota tidak dapat dipindah tangankan, pemindahan hak dan kewajiban di atur dalam AD/ART Koperasi Bintang Merah Sejahtera.
            </div>
            <div class="term-item">
              <span class="term-number">4.</span> Penggunaan kartu anggota sepenuhnya menjadi tanggung jawab anggota
            </div>
            <div class="term-item">
              <span class="term-number">5.</span> Koperasi Bintang Merah Sejahtera tidak bertanggung jawab terhadap penggunaan kartu anggota diluar ketentuan yang berlaku.
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-title">KETUA</div>
          <div class="footer-name">Halim Perdana Kusuma, S.H., M.H.</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate QR code
    const kartuAnggotaUrl = `${process.env.NEXTAUTH_URL}/kartu-anggota`;
    const qrCodeDataUrl = await QRCode.toDataURL(kartuAnggotaUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Check if kartu anggota already exists
    if (user.kartuAnggotaUrl) {
      return NextResponse.json({
        success: true,
        kartuAnggotaUrl: user.kartuAnggotaUrl,
        message: 'Kartu anggota already exists',
        user: {
          fullName: user.fullName,
          userCode: user.userCode,
          faceImageUrl: user.faceImageUrl
        },
        qrCodeDataUrl
      });
    }

    // Get logo as base64
    const logoBase64 = getImageAsBase64('images/koperasi-logo-removebg.png') ||
                      getImageAsBase64('images/koperasi-logo.jpg');

    // Generate HTML for both sides
    const frontHTML = generateFrontHTML(user, logoBase64, qrCodeDataUrl);
    const backHTML = generateBackHTML();

    // For now, let's return the HTML content in a combined format
    // Later we can use puppeteer or similar to convert to images
    const combinedHTML = `
      <div style="display: flex; gap: 20px; padding: 20px; background: #f0f0f0;">
        <div style="border: 1px solid #ccc;">
          <h3 style="text-align: center; margin-bottom: 10px;">Front</h3>
          ${frontHTML.replace('<!DOCTYPE html><html><head>', '').replace('</head><body>', '').replace('</body></html>', '')}
        </div>
        <div style="border: 1px solid #ccc;">
          <h3 style="text-align: center; margin-bottom: 10px;">Back</h3>
          ${backHTML.replace('<!DOCTYPE html><html><head>', '').replace('</head><body>', '').replace('</body></html>', '')}
        </div>
      </div>
    `;

    // Save kartu anggota data to user document
    const kartuAnggotaData = {
      frontHTML,
      backHTML,
      qrCodeDataUrl,
      generatedAt: new Date(),
    };

    // Update user with kartu anggota data
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        kartuAnggotaData: kartuAnggotaData,
        kartuAnggotaUrl: 'generated' // Mark as generated
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('Failed to update user with kartu anggota data');
    }

    return NextResponse.json({
      success: true,
      message: 'Kartu anggota generated successfully',
      user: {
        fullName: user.fullName,
        userCode: user.userCode,
        faceImageUrl: user.faceImageUrl
      },
      frontHTML,
      backHTML,
      combinedHTML,
      qrCodeDataUrl
    });

  } catch (error: any) {
    console.error('Error generating kartu anggota:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate kartu anggota',
        details: error.message,
      },
      { status: 500 }
    );
  }
}