import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
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

// Helper function to fetch profile image from URL and convert to base64
const fetchImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // Determine MIME type from URL or response headers
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error fetching profile image:', error);
    return null;
  }
};

export async function POST(_request: NextRequest) {
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

    // Check if kartu anggota already exists
    if (user.kartuAnggotaUrl) {
      return NextResponse.json({
        success: true,
        kartuAnggotaUrl: user.kartuAnggotaUrl,
        message: 'Kartu anggota already exists'
      });
    }

    // Create PDF with larger dimensions for more professional look (A4 landscape)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Set font to Poppins (fallback to helvetica if not available)
    pdf.setFont('helvetica'); // jsPDF doesn't support Poppins directly, but we'll use helvetica as fallback

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Background gradient effect
    pdf.setFillColor(248, 248, 248); // Light gray
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header section with red theme (matching koperasi logo)
    pdf.setFillColor(180, 40, 40); // Red color matching typical cooperative logos
    pdf.rect(0, 0, pageWidth, 35, 'F'); // Reduced header height

    // Header text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('KARTU ANGGOTA', pageWidth/2, 15, { align: 'center' });

    pdf.setFontSize(14);
    pdf.text('KOPERASI BINTANG MERAH SEJAHTERA', pageWidth/2, 28, { align: 'center' });

    // Generate QR code for public user profile URL
    const publicProfileUrl = `${process.env.NEXTAUTH_URL}/public/user/${user.userCode}`;
    console.log('Generating QR code for URL:', publicProfileUrl);

    try {
      const qrCodeDataURL = await QRCode.toDataURL(publicProfileUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        width: 100, // Size for the QR code image
        color: {
          dark: '#B42828', // Red color matching the theme
          light: '#FFFFFF'
        }
      });

      // QR code position (top right corner)
      const qrSize = 35; // Size in mm for PDF - match logo size
      const qrX = pageWidth - qrSize; // Positioned at absolute right edge
      const qrY = 0; // Positioned at absolute top edge

      // Add QR code to PDF
      pdf.addImage(qrCodeDataURL, 'PNG', qrX, qrY, qrSize, qrSize);

      // Add small text below QR code
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Scan untuk', qrX + qrSize/2, qrY + qrSize + 4, { align: 'center' });
      pdf.text('profil publik', qrX + qrSize/2, qrY + qrSize + 8, { align: 'center' });

    } catch (qrError) {
      console.error('Error generating QR code:', qrError);
      // Add fallback text if QR code generation fails
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'normal');
      pdf.text('QR Code', pageWidth - 25, 15, { align: 'center' });
      pdf.text('Available', pageWidth - 25, 25, { align: 'center' });
    }

    // Logo section (top left corner) - Aligned with header height
    const logoX = 0; // Positioned at absolute left edge
    const logoY = 0; // Positioned at absolute top edge  
    const logoSize = 35; // Size matches header height (35mm)
    
    // Try to load the koperasi logo
    const logoBase64 = getImageAsBase64('images/koperasi-logo.jpg');
    
    if (logoBase64) {
      try {
        // Add the actual koperasi logo image
        pdf.addImage(logoBase64, 'JPEG', logoX, logoY, logoSize, logoSize);
      } catch (error) {
        console.error('Error adding koperasi logo:', error);
        // Fallback to placeholder
        pdf.setFillColor(255, 255, 255);
        pdf.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 'F');
        pdf.setDrawColor(255, 255, 255);
        pdf.setLineWidth(1);
        pdf.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 'S');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'bold');
        pdf.text('LOGO', logoX + logoSize/2, logoY + logoSize/2 - 2, { align: 'center' });
        pdf.text('KOPERASI', logoX + logoSize/2, logoY + logoSize/2 + 2, { align: 'center' });
      }
    } else {
      // Fallback to placeholder if logo file not found
      pdf.setFillColor(255, 255, 255);
      pdf.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 'F');
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(1);
      pdf.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 'S');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LOGO', logoX + logoSize/2, logoY + logoSize/2 - 2, { align: 'center' });
      pdf.text('KOPERASI', logoX + logoSize/2, logoY + logoSize/2 + 2, { align: 'center' });
    }

    // Member photo section (left side, aligned with text)
    const photoX = 20;
    const photoY = 45; // Moved up to align with information area
    const photoWidth = 35; // Match logo size
    const photoHeight = 35; // Match logo size
    
    // Create photo frame
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(photoX, photoY, photoWidth, photoHeight, 3, 3, 'F');
    pdf.setDrawColor(180, 40, 40);
    pdf.setLineWidth(2);
    pdf.roundedRect(photoX, photoY, photoWidth, photoHeight, 3, 3, 'S');

    // Add profile image if available
    if (user.faceImageUrl) {
      try {
        console.log('Fetching face image from:', user.faceImageUrl);
        const profileImageBase64 = await fetchImageAsBase64(user.faceImageUrl);
        
        if (profileImageBase64) {
          // Add the actual profile image, maintaining aspect ratio and fitting within frame
          pdf.addImage(profileImageBase64, 'JPEG', photoX + 2, photoY + 2, photoWidth - 4, photoHeight - 4);
          console.log('Face image added successfully');
        } else {
          throw new Error('Could not fetch face image');
        }
      } catch (error) {
        console.error('Error adding face image:', error);
        // Fallback to "image available" text
        pdf.setTextColor(180, 40, 40);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text('FOTO WAJAH', photoX + photoWidth/2, photoY + photoHeight/2 - 5, { align: 'center' });
        pdf.text('TERSEDIA', photoX + photoWidth/2, photoY + photoHeight/2 + 5, { align: 'center' });
      }
    } else {
      // Photo placeholder text when no face image
      pdf.setTextColor(120, 120, 120);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FOTO', photoX + photoWidth/2, photoY + photoHeight/2 - 3, { align: 'center' });
      pdf.text('ANGGOTA', photoX + photoWidth/2, photoY + photoHeight/2 + 5, { align: 'center' });
    }

    // Main information section - 2 Grid Layout
    const infoStartX = 80; // Start after photo area
    const infoStartY = 45; // Aligned with photo position
    const columnWidth = (pageWidth - infoStartX - 20) / 2; // Two equal columns
    const column1X = infoStartX;
    const column2X = infoStartX + columnWidth + 10; // 10mm gap between columns
    
    let currentY1 = infoStartY; // Left column Y position
    let currentY2 = infoStartY; // Right column Y position
    const lineHeight = 10;

    pdf.setTextColor(180, 40, 40); // Red theme color
    
    // Information Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INFORMASI ANGGOTA', column1X, currentY1);
    currentY1 += 18;
    currentY2 = currentY1; // Align both columns

    // Helper function to add info row to specific column
    const addInfoRowToColumn = (label: string, value: string, columnX: number, currentY: number, isBold = false) => {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(180, 40, 40);
      pdf.text(label, columnX, currentY);
      
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      const maxChars = 25; // Reduced for 2-column layout
      const valueText = value.length > maxChars ? value.substring(0, maxChars) + '...' : value;
      pdf.text(valueText, columnX, currentY + 6);
      return currentY + lineHeight + 2;
    };

    // Member ID (spans both columns, prominent) - Removed yellow background
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(180, 40, 40);
    pdf.text('ID ANGGOTA:', column1X, currentY1);
    // Removed yellow highlight background
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${user.userCode || 'N/A'}`, column1X + 40, currentY1);
    currentY1 += 20;
    currentY2 = currentY1;

    // Left Column Data
    currentY1 = addInfoRowToColumn('NAMA LENGKAP:', user.fullName.toUpperCase(), column1X, currentY1, true);
    currentY1 = addInfoRowToColumn('TELEPON:', user.phoneNumber, column1X, currentY1);
    currentY1 = addInfoRowToColumn('EMAIL:', user.email, column1X, currentY1);
    
    const dobText = new Date(user.dateOfBirth).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    currentY1 = addInfoRowToColumn('TANGGAL LAHIR:', dobText, column1X, currentY1);
    currentY1 = addInfoRowToColumn('ALAMAT:', user.address, column1X, currentY1);
    currentY1 = addInfoRowToColumn('DESA/KELURAHAN:', user.village, column1X, currentY1);

    // Right Column Data
    currentY2 = addInfoRowToColumn('KOTA/KABUPATEN:', user.city, column2X, currentY2);
    currentY2 = addInfoRowToColumn('PROVINSI:', user.province, column2X, currentY2);
    currentY2 = addInfoRowToColumn('KODE POS:', user.postalCode, column2X, currentY2);
    currentY2 = addInfoRowToColumn('PEKERJAAN:', user.occupation, column2X, currentY2);
    
    if (user.occupationCode) {
      currentY2 = addInfoRowToColumn('KODE PEKERJAAN:', user.occupationCode, column2X, currentY2);
    }

    // Join date
    const joinDate = new Date(user.createdAt).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    addInfoRowToColumn('BERGABUNG:', joinDate, column2X, currentY2);

    // Bottom section with validity information only
    const bottomY = pageHeight - 35;
    
    // Validity information
    pdf.setDrawColor(180, 40, 40);
    pdf.setLineWidth(1);
    pdf.line(20, bottomY, pageWidth - 20, bottomY);
    
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    
    const issueDate = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);
    const validUntilText = validUntil.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    pdf.text(`Diterbitkan: ${issueDate}`, 20, bottomY + 12);
    pdf.text(`Berlaku hingga: ${validUntilText}`, 20, bottomY + 22);

    // Footer with contact information
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    pdf.text('Koperasi Bintang Merah Sejahtera | Email: info@koperasibms.com | Website: www.koperasibms.com', pageWidth/2, pageHeight - 8, { align: 'center' });

    // Convert PDF to buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Upload to ImageKit
    const timestamp = Date.now();
    const fileName = `kartu-anggota-${user.userCode}-${timestamp}.pdf`;

    const privateKey = "private_nmGGpZ++RRY1MW+OetGD6yr63wE=";
    const uploadFormData = new FormData();
    uploadFormData.append("file", new Blob([pdfBuffer], { type: 'application/pdf' }), fileName);
    uploadFormData.append("fileName", fileName);
    uploadFormData.append("folder", "/kartu-anggota");
    uploadFormData.append("tags", "kartu-anggota,member-card,pdf");

    const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`ImageKit API error: ${uploadResponse.status} ${errorText}`);
    }

    const result = await uploadResponse.json();

    // Update user with kartu anggota URL
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { kartuAnggotaUrl: result.url },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('Failed to update user with kartu anggota URL');
    }

    return NextResponse.json({
      success: true,
      kartuAnggotaUrl: result.url,
      fileId: result.fileId,
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