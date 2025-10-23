import { NextResponse } from "next/server";
import * as XLSX from "xlsx-js-style";
import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import User from "@/models/User";

export async function GET() {
  try {
    await dbConnect();

    // Fetch all investors with user data populated
    const investors = await Investor.find()
      .populate({
        path: "userId",
        model: User,
        select:
          "fullName email phoneNumber nik userCode ktpAddress ktpCity ktpProvince domisiliAddress domisiliCity domisiliProvince occupation verificationStatus",
      })
      .sort({ createdAt: -1 });

    // Prepare data for Excel export
    const investorData: any[] = [];
    let rowNumber = 1;

    investors.forEach((investor) => {
      const user = investor.userId as any;

      investorData.push([
        rowNumber,
        user?.userCode || "-",
        user?.fullName || investor.name,
        user?.email || investor.email,
        user?.phoneNumber || investor.phoneNumber || "-",
        user?.nik || "-",
        user?.ktpAddress
          ? `${user.ktpAddress}, ${user.ktpCity}, ${user.ktpProvince}`
          : "-",
        user?.domisiliAddress
          ? `${user.domisiliAddress}, ${user.domisiliCity}, ${user.domisiliProvince}`
          : "-",
        user?.occupation || "-",
        new Date(investor.createdAt).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        }),
      ]);

      rowNumber++;
    });

    // Create worksheet data
    const worksheetData = [];

    // Add company header information
    const headerInfo = [
      ["KOPERASI BINTANG MERAH SEJAHTERA"],
      [
        "Bintaro Business Center Jl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330",
      ],
      ["Tel: +62 81118893679 | Email: bintangmerahsejahtera@gmail.com"],
      ["LAPORAN DATA INVESTOR"],
      [
        `Dibuat pada: ${new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
      ],
      [""],
      [""],
      ["DAFTAR INVESTOR"],
      [
        "No.",
        "No Anggota",
        "Nama Lengkap",
        "Email",
        "No. Telepon",
        "NIK",
        "Alamat KTP",
        "Alamat Domisili",
        "Pekerjaan",
        "Tanggal Bergabung",
      ],
    ];

    // Add header information to worksheet data
    worksheetData.push(...headerInfo);

    // Add investor data
    worksheetData.push(...investorData);

    // Create worksheet from data
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-size columns based on content
    const colWidths = [];
    const maxCols = Math.max(...worksheetData.map((row) => row.length));

    for (let col = 0; col < maxCols; col++) {
      let maxWidth = 0;
      for (let row = 0; row < worksheetData.length; row++) {
        const cellValue = worksheetData[row][col];
        if (cellValue) {
          const cellWidth = cellValue.toString().length;
          maxWidth = Math.max(maxWidth, cellWidth);
        }
      }
      // Ensure minimum width for readability
      colWidths.push({ width: Math.min(Math.max(maxWidth + 2, 10), 50) });
    }
    worksheet["!cols"] = colWidths;

    // Add styling and borders
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
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
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          };
        }

        // Company header styling (row 0)
        if (row === 0) {
          worksheet[cellRef].s.font = { bold: true, sz: 14 };
          worksheet[cellRef].s.alignment = { horizontal: "left" };
          worksheet[cellRef].s.fill = { fgColor: { rgb: "E5E7EB" } };
        }

        // Section headers
        if (
          worksheetData[row][0] === "DAFTAR INVESTOR" ||
          worksheetData[row][0] === "No."
        ) {
          worksheet[cellRef].s.font = { bold: true, sz: 11 };
          worksheet[cellRef].s.fill = { fgColor: { rgb: "E5E7EB" } };
          worksheet[cellRef].s.alignment = { horizontal: "center" };
        }

        // Data alignment for numbers (center No. column)
        if (row > 8 && col === 0) {
          worksheet[cellRef].s.alignment = { horizontal: "center" };
        }
      }
    }

    // Merge header cells
    try {
      worksheet["!merges"] = worksheet["!merges"] || [];

      // Merge company header rows (0..4) across all columns
      for (let r = 0; r <= 4; r++) {
        worksheet["!merges"].push({ s: { r, c: 0 }, e: { r, c: maxCols - 1 } });
      }
      // Merge empty rows (5..6)
      for (let r = 5; r <= 6; r++) {
        worksheet["!merges"].push({ s: { r, c: 0 }, e: { r, c: maxCols - 1 } });
      }
      // Merge "DAFTAR INVESTOR" across all columns
      worksheet["!merges"].push({
        s: { r: 7, c: 0 },
        e: { r: 7, c: maxCols - 1 },
      });

      // Ensure merged cells are created
      for (let r = 0; r <= 7; r++) {
        for (let c = 0; c <= maxCols - 1; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!worksheet[cellRef]) {
            const val = (worksheetData[r] && worksheetData[r][c]) || "";
            worksheet[cellRef] = { v: val, t: "s" } as any;
          }
          if (!worksheet[cellRef].s) worksheet[cellRef].s = {};

          // Add borders to title rows
          if (r === 3 || r === 4 || r === 7) {
            worksheet[cellRef].s.border = {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left:
                c === 0
                  ? { style: "thin", color: { rgb: "000000" } }
                  : undefined,
              right:
                c === 15
                  ? { style: "thin", color: { rgb: "000000" } }
                  : undefined,
            };
          }
        }
      }
    } catch {
      // ignore if merging fails
    }

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Investor");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Create response with Excel file
    const response = new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="data-investor-${
          new Date().toISOString().split("T")[0]
        }.xlsx"`,
      },
    });

    return response;
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Gagal mengekspor data investor" },
      { status: 500 }
    );
  }
}
