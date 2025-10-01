import { NextResponse } from "next/server";
import * as XLSX from "xlsx-js-style";
import dbConnect from "@/lib/mongodb";
import CommissionHistory from "@/models/CommissionHistory";
import PlantInstance from "@/models/PlantInstance";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "marketing_head")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get all commission history with populated data
    const commissions = await CommissionHistory.find({})
      .populate("marketingStaffId", "fullName email referralCode")
      .populate("customerId", "fullName email phoneNumber")
      .populate("paymentId", "orderId contractId")
      .sort({ earnedAt: -1 });

    // Get PlantInstance data for blok and kavling information
    const contractNumbers = commissions
      .map((c) => {
        // For cicilan payments, use cicilanOrderId
        if (c.paymentType === "cicilan-installment" && c.cicilanOrderId) {
          return c.cicilanOrderId;
        }
        // For full payments, use contractId from commission or payment orderId
        if (c.contractId) {
          return c.contractId;
        }
        if (c.paymentId?.orderId) {
          return c.paymentId.orderId;
        }
        return null;
      })
      .filter(Boolean);

    const plantInstances = await PlantInstance.find({
      contractNumber: { $in: contractNumbers },
    });
    const plantInstancesMap = new Map(
      plantInstances.map((plant) => [plant.contractNumber, plant])
    );

    // Build marketing data for the report
    const marketingData: any[] = [];
    let rowNumber = 1;

    commissions.forEach((commission: any) => {
      // Get the correct contract identifier based on payment type
      const contractIdentifier =
        commission.paymentType === "cicilan-installment"
          ? commission.cicilanOrderId
          : commission.contractId || commission.paymentId?.orderId;

      const plantInstance = plantInstancesMap.get(contractIdentifier);

      // Format payment type in Indonesian
      let pembayaran = "";
      switch (commission.paymentType) {
        case "full-investment":
          pembayaran = "Penuh";
          break;
        case "cicilan-installment":
          pembayaran = "Cicilan";
          break;
        default:
          pembayaran = "Penuh";
      }

      // Format join date
      const tanggalBergabung = new Date(commission.earnedAt).toLocaleDateString(
        "id-ID",
        {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        }
      );

      // Format commission amount
      const totalKomisi = `Rp. ${commission.commissionAmount.toLocaleString(
        "id-ID"
      )}`;

      // Each row represents one referral
      const totalReferrals = 1;

      // Determine status (always "Aktif" for commission records)
      const status = "Aktif";

      marketingData.push([
        rowNumber,
        commission.marketingStaffName,
        commission.referralCodeUsed,
        commission.customerName,
        plantInstance?.blok || "-",
        plantInstance?.kavling || "-",
        commission.productName,
        pembayaran,
        tanggalBergabung,
        totalKomisi,
        totalReferrals,
        status,
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
      ["LAPORAN MARKETING"],
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
      ["DAFTAR MARKETING"],
      [
        "No.",
        "Nama Marketing",
        "Kode Referal",
        "Nama Pelanggan",
        "Blok",
        "Kavling",
        "Paket Investasi",
        "Pembayaran",
        "Tanggal Bergabung",
        "Total Komisi",
        "Total Referal",
        "Status",
      ],
    ];

    // Add header information to worksheet data
    worksheetData.push(...headerInfo);

    // Add marketing data
    worksheetData.push(...marketingData);

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
          worksheetData[row][0] === "DAFTAR MARKETING" ||
          worksheetData[row][0] === "No."
        ) {
          worksheet[cellRef].s.font = { bold: true, sz: 11 };
          worksheet[cellRef].s.fill = { fgColor: { rgb: "E5E7EB" } };
          worksheet[cellRef].s.alignment = { horizontal: "center" };
        }

        // Data alignment for numbers
        if (row > 8 && (col === 0 || col === 10)) {
          // No., Total Referal
          worksheet[cellRef].s.alignment = { horizontal: "center" };
        }
      }
    }

    // Merge header cells
    try {
      worksheet["!merges"] = worksheet["!merges"] || [];

      // Merge company header rows (0..4) across all 12 columns
      for (let r = 0; r <= 4; r++) {
        worksheet["!merges"].push({ s: { r, c: 0 }, e: { r, c: 11 } });
      }
      // Merge empty rows (5..6)
      for (let r = 5; r <= 6; r++) {
        worksheet["!merges"].push({ s: { r, c: 0 }, e: { r, c: 11 } });
      }
      // Merge "DAFTAR MARKETING" across all 12 columns
      worksheet["!merges"].push({ s: { r: 7, c: 0 }, e: { r: 7, c: 11 } });

      // Ensure merged cells are created
      for (let r = 0; r <= 7; r++) {
        for (let c = 0; c <= 11; c++) {
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
                c === 11
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Marketing");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-marketing-${
          new Date().toISOString().split("T")[0]
        }.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error generating marketing Excel export:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate marketing Excel export" },
      { status: 500 }
    );
  }
}
