import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get all payments (both cicilan and full payments)
    const payments = await Payment.find({
      paymentType: { $in: ["cicilan-installment", "full-investment", "registration"] }
    })
    .populate('userId', 'fullName email userCode')
    .sort({ createdAt: -1 });

    // Build invoice data for the report
    const invoiceData: any[] = [];
    let rowNumber = 1;

    payments.forEach((payment: any) => {
      // Format payment date
      const tanggalInvoice = new Date(payment.createdAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      // Determine payment status
      let statusPembayaran = "";
      if (payment.paymentType === "registration") {
        statusPembayaran = payment.transactionStatus === "settlement" ? "Lunas" : "Belum Dibayar";
      } else if (payment.paymentType === "cicilan-installment") {
        if (payment.transactionStatus === "settlement") {
          statusPembayaran = "Cicilan";
        } else {
          statusPembayaran = "Belum Dibayar";
        }
      } else if (payment.paymentType === "full-investment") {
        statusPembayaran = payment.transactionStatus === "settlement" ? "Lunas" : "Belum Dibayar";
      }

      // Format amount
      const totalPembayaran = `Rp ${payment.amount.toLocaleString("id-ID")}`;

      // Get user info
      const userCode = payment.userId?.userCode || "-";
      const fullName = payment.userId?.fullName || "-";

      invoiceData.push([
        rowNumber,
        userCode,
        fullName,
        payment.orderId,
        payment.transactionId || "-",
        tanggalInvoice,
        totalPembayaran,
        statusPembayaran
      ]);

      rowNumber++;
    });

    // Create worksheet data
    const worksheetData = [];

    // Add company header information
    const headerInfo = [
      ["KOPERASI BINTANG MERAH SEJAHTERA"],
      ["Bintaro Business Center Jl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330"],
      ["Tel: +62 81118893679 | Email: bintangmerahsejahtera@gmail.com"],
      ["LAPORAN INVOICE"],
      [`Dibuat pada: ${new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`],
      [""],
      [""],
      ["DAFTAR INVOICE"],
      ["No.", "No.Anggota", "Nama Anggota", "No.Inv", "ID transaksi", "Tanggal INV", "Total Pembayaran", "Status Pembayaran"]
    ];

    // Add header information to worksheet data
    worksheetData.push(...headerInfo);

    // Add invoice data
    worksheetData.push(...invoiceData);

    // Create worksheet from data
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths with smaller first column for numbers
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

      // Column A (index 0) should be smaller since it's just for numbers
      if (col === 0) {
        colWidths.push({ width: 6 }); // Fixed small width for number column
      } else {
        // Ensure minimum width for readability for other columns
        colWidths.push({ width: Math.min(Math.max(maxWidth + 2, 10), 50) });
      }
    }
    worksheet['!cols'] = colWidths;

    // Add styling and borders
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellRef]) continue;

        // Initialize cell style
        if (!worksheet[cellRef].s) worksheet[cellRef].s = {};

        // Add borders to data tables only (skip header rows)
        const shouldHaveBorders = row >= 8; // Data starts from row 8 (0-indexed)

        if (shouldHaveBorders) {
          worksheet[cellRef].s.border = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          };
        }

        // Company header styling (row 0)
        if (row === 0) {
          worksheet[cellRef].s.font = { bold: true, sz: 14 };
          worksheet[cellRef].s.alignment = { horizontal: 'left' };
          worksheet[cellRef].s.fill = { fgColor: { rgb: 'E5E7EB' } };
        }

        // Section headers
        if (worksheetData[row][0] === "DAFTAR INVOICE") {
          worksheet[cellRef].s.font = { bold: true, sz: 11 };
          worksheet[cellRef].s.fill = { fgColor: { rgb: 'E5E7EB' } };
          worksheet[cellRef].s.alignment = { horizontal: 'left' }; // Left aligned for DAFTAR INVOICE
        } else if (worksheetData[row][0] === "No.") {
          worksheet[cellRef].s.font = { bold: true, sz: 11 };
          worksheet[cellRef].s.fill = { fgColor: { rgb: 'E5E7EB' } };
          worksheet[cellRef].s.alignment = { horizontal: 'center' }; // Center aligned for column headers
        }

        // Data alignment for numbers
        if (row > 8 && col === 0) { // No.
          worksheet[cellRef].s.alignment = { horizontal: 'center' };
        }
      }
    }

    // Merge header cells
    try {
      worksheet['!merges'] = worksheet['!merges'] || [];

      // Merge company header rows (0..4) across all 8 columns
      for (let r = 0; r <= 4; r++) {
        worksheet['!merges'].push({ s: { r, c: 0 }, e: { r, c: 7 } });
      }
      // Merge empty rows (5..6)
      for (let r = 5; r <= 6; r++) {
        worksheet['!merges'].push({ s: { r, c: 0 }, e: { r, c: 7 } });
      }
      // Merge "DAFTAR INVOICE" across all 8 columns
      worksheet['!merges'].push({ s: { r: 7, c: 0 }, e: { r: 7, c: 7 } });

      // Ensure merged cells are created
      for (let r = 0; r <= 7; r++) {
        for (let c = 0; c <= 7; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!worksheet[cellRef]) {
            const val = (worksheetData[r] && worksheetData[r][c]) || "";
            worksheet[cellRef] = { v: val, t: 's' } as any;
          }
          if (!worksheet[cellRef].s) worksheet[cellRef].s = {};

          // Add borders to title rows
          if (r === 3 || r === 4 || r === 7) {
            worksheet[cellRef].s.border = {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: c === 0 ? { style: 'thin', color: { rgb: '000000' } } : undefined,
              right: c === 7 ? { style: 'thin', color: { rgb: '000000' } } : undefined,
            };
          }
        }
      }
    } catch {
      // ignore if merging fails
    }

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Invoice');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan-invoice-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error generating invoice Excel export:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoice Excel export' },
      { status: 500 }
    );
  }
}