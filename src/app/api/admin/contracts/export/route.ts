import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import fs from 'fs';
import path from 'path';
import dbConnect from "@/lib/mongodb";
import Contract from "@/models/Contract";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";

export async function GET() {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or staff_admin
    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'staff_admin')) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Read the template file
    const templatePath = path.join(process.cwd(), 'tarikan_data.xlsx');
    const templateFile = fs.readFileSync(templatePath);
    const templateWorkbook = XLSX.read(templateFile, { type: 'buffer' });

    // Get the "Laporan Kontrak" worksheet
    const templateWorksheet = templateWorkbook.Sheets['Laporan Kontrak'];

    if (!templateWorksheet) {
      return NextResponse.json({ error: 'Laporan Kontrak sheet not found in template' }, { status: 404 });
    }

    // Fetch contracts data directly from database
    const filter = {
      adminApprovalStatus: { $in: ['pending', 'approved', 'rejected', 'permanently_rejected'] }
    };

    const contractsFromDB = await Contract.find(filter)
      .populate('userId', 'fullName email phoneNumber ktpImageUrl userCode')
      .sort({ createdAt: -1 })
      .lean();

    // Format contract data
    const contracts = contractsFromDB.map(contract => {
      const lastAttempt = contract.signatureAttempts[contract.signatureAttempts.length - 1];

      return {
        contractId: contract.contractId,
        contractNumber: contract.contractNumber,
        status: contract.status,
        adminApprovalStatus: contract.adminApprovalStatus,
        productName: contract.productName,
        totalAmount: contract.totalAmount,
        paymentType: contract.paymentType,
        user: contract.userId ? {
          id: contract.userId._id,
          fullName: contract.userId.fullName,
          email: contract.userId.email,
          phoneNumber: contract.userId.phoneNumber,
          ktpImageUrl: contract.userId.ktpImageUrl,
          userCode: contract.userId.userCode
        } : null,
        currentAttempt: contract.currentAttempt,
        maxAttempts: contract.maxAttempts,
        lastSignature: lastAttempt ? {
          attemptNumber: lastAttempt.attemptNumber,
          signatureData: lastAttempt.signatureData,
          submittedAt: lastAttempt.submittedAt,
          reviewStatus: lastAttempt.reviewStatus,
          rejectionReason: lastAttempt.rejectionReason,
          adminNotes: lastAttempt.adminNotes
        } : null,
        contractDate: contract.contractDate,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      };
    });

    // Create a new workbook from the template
    const newWorkbook = XLSX.utils.book_new();

    // Copy template structure and prepare data
    const worksheetData = [];

    // Add company header information
    const headerInfo = [
      ["KOPERASI BINTANG MERAH SEJAHTERA"],
      [
        "Bintaro Business Center\nJl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330",
      ],
      ["Tel: 081118893679 | Email: bintangmerahsejahtera@gmail.com"],
      [""],
      ["LAPORAN KONTRAK"],
      [`Dibuat pada: ${new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`],
      [""],
      ["DETAIL KONTRAK"],
    ];

    // Add header information to worksheet data
    worksheetData.push(...headerInfo);

    // Add table header row
    worksheetData.push([
      'No',
      'Nomor Kontrak',
      'Nama User',
      'No Anggota',
      'Jenis Paket',
      'Status Kontrak',
      'Awal Kontrak',
      'Akhir Kontrak'
    ]);

    // Add contract data
    contracts.forEach((contract: any, index: number) => {
      // Calculate awal kontrak (start date) and akhir kontrak (end date = start date + 10 years)
      const awalKontrak = new Date(contract.contractDate || contract.createdAt);
      const akhirKontrak = new Date(awalKontrak);
      akhirKontrak.setFullYear(akhirKontrak.getFullYear() + 10);

      // Map status to Indonesian terms
      let statusKontrak = '';
      switch (contract.adminApprovalStatus) {
        case 'approved':
          statusKontrak = 'Disetujui';
          break;
        case 'pending':
          statusKontrak = 'Menunggu';
          break;
        case 'rejected':
        case 'permanently_rejected':
          statusKontrak = 'Ditolak';
          break;
        default:
          statusKontrak = 'Menunggu';
      }

      worksheetData.push([
        index + 1,                                                    // No
        contract.contractNumber,                                      // Nomor Kontrak
        contract.user.fullName,                                       // Nama User
        contract.user.userCode || '-',                                // No Anggota
        contract.productName,                                         // Jenis Paket
        statusKontrak,                                               // Status Kontrak
        awalKontrak.toLocaleDateString('id-ID'),                     // Awal Kontrak
        akhirKontrak.toLocaleDateString('id-ID')                     // Akhir Kontrak
      ]);
    });

    // Create worksheet from data
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-size columns based on content AND headers
    const colWidths = [];
    const maxCols = Math.max(...worksheetData.map(row => row.length));

    for (let col = 0; col < maxCols; col++) {
      let maxWidth = 0;
      for (let row = 0; row < worksheetData.length; row++) {
        const cellValue = worksheetData[row][col];
        if (cellValue) {
          const cellWidth = cellValue.toString().length;
          maxWidth = Math.max(maxWidth, cellWidth);
        }
      }
      // Make column A (index 0) a bit narrower for numbering
      if (col === 0) {
        colWidths.push({ width: 20 });
      } else if (col === 2) {
        // Column C (index 2) - make wider for names
        colWidths.push({ width: 30 });
      } else if (col === 3) {
        // Column D (index 3) - No Anggota
        colWidths.push({ width: 15 });
      } else {
        // Ensure minimum width for readability and maximum for reasonable display
        colWidths.push({ width: Math.min(Math.max(maxWidth + 3, 12), 50) });
      }
    }
    worksheet['!cols'] = colWidths;

    // Add borders and styling
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellRef]) continue;

        // Initialize cell style
        if (!worksheet[cellRef].s) worksheet[cellRef].s = {};

        // Add borders to all cells except LAPORAN KONTRAK and dibuat pada rows
        const shouldHaveBorders = !(
          worksheetData[row][0] === "LAPORAN KONTRAK" ||
          (worksheetData[row][0] && worksheetData[row][0].toString().startsWith("Dibuat pada:"))
        );

        if (shouldHaveBorders) {
          worksheet[cellRef].s.border = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          };
        }

        // Company header styling - make gray (exact copy from laporan)
        if (row === 0 || worksheetData[row][0] === "KOPERASI BINTANG MERAH SEJAHTERA") {
          worksheet[cellRef].s.font = { bold: true, sz: 14 };
          worksheet[cellRef].s.alignment = { horizontal: 'center' };
          worksheet[cellRef].s.fill = { fgColor: { rgb: 'E5E7EB' } };
        }

        // Section headers with background color - use subtle gray (exact copy from laporan)
        if (worksheetData[row][0] === "DETAIL KONTRAK") {
          worksheet[cellRef].s.font = { bold: true, sz: 11 };
          worksheet[cellRef].s.fill = {
            fgColor: { rgb: 'E5E7EB' }
          };
          worksheet[cellRef].s.alignment = { horizontal: 'center' };
        }

        // LAPORAN KONTRAK - normal text like "dibuat pada" (no background, left aligned, not bold)
        if (worksheetData[row][0] === "LAPORAN KONTRAK") {
          // No special styling - just default text
        }

        // Header row for the contract details table (contains 'No' or table headers) - exact copy from laporan
        try {
          const rowArr = worksheetData[row];
          if (Array.isArray(rowArr) && (rowArr.includes("No") || rowArr.includes("Nomor Kontrak") || rowArr.includes("Nama User") || rowArr.includes("No Anggota"))) {
            worksheet[cellRef].s.font = { bold: true, sz: 11 };
            worksheet[cellRef].s.fill = { fgColor: { rgb: 'E5E7EB' } };
            worksheet[cellRef].s.alignment = { horizontal: 'center' };
          }
        } catch {
          // ignore
        }

        // Data alignment
        if (row > 0 && col > 0 && worksheetData[row][col] &&
            !isNaN(Number(worksheetData[row][col]))) {
          worksheet[cellRef].s.alignment = { horizontal: 'right' };
        }
      }
    }

    // Merge the top header rows: company header rows (0..6) -> A..G (span all 7 columns), DETAIL KONTRAK (row 7) -> A..G (exact copy pattern from laporan)
    try {
      worksheet['!merges'] = worksheet['!merges'] || [];
      // company header rows (0..6) -> A..G (all 7 columns)
      for (let r = 0; r <= 6; r++) {
        worksheet['!merges'].push({ s: { r, c: 0 }, e: { r, c: 6 } });
      }
      // DETAIL KONTRAK row (7) -> A..G (all 7 columns)
      worksheet['!merges'].push({ s: { r: 7, c: 0 }, e: { r: 7, c: 6 } });

      // Ensure each cell in the merged areas has a cell object and borders
      // For rows 0..6 (A..G) - exact copy from laporan
      for (let r = 0; r <= 6; r++) {
        for (let c = 0; c <= 6; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!worksheet[cellRef]) {
            const val = (worksheetData[r] && worksheetData[r][c]) || "";
            worksheet[cellRef] = { v: val, t: 's' } as any;
          }
          if (!worksheet[cellRef].s) worksheet[cellRef].s = {};

          // Don't add borders to LAPORAN KONTRAK (row 4) and Dibuat pada (row 5)
          const shouldHaveBorders = !(r === 4 || r === 5);

          if (shouldHaveBorders) {
            worksheet[cellRef].s.border = {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } },
            };
          }
        }
      }

      // For DETAIL KONTRAK row (r=7), fill cols 0..6 - exact copy pattern from laporan
      for (let c = 0; c <= 6; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 7, c });
        if (!worksheet[cellRef]) {
          const val = (worksheetData[7] && worksheetData[7][c]) || "";
          worksheet[cellRef] = { v: val, t: 's' } as any;
        }
        if (!worksheet[cellRef].s) worksheet[cellRef].s = {};
        worksheet[cellRef].s.border = {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        };
      }
    } catch {
      // ignore if merging fails for any reason
    }

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(newWorkbook, worksheet, 'Laporan Kontrak');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });

    // Create response with proper headers
    const response_headers = new Headers();
    response_headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response_headers.set('Content-Disposition', `attachment; filename="Laporan_Kontrak_${new Date().toISOString().split('T')[0]}.xlsx"`);

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: response_headers,
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}