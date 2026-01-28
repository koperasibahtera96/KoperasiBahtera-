import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CommissionHistory from "@/models/CommissionHistory";
import CommissionWithdrawal from "@/models/CommissionWithdrawal";
import PlantInstance from "@/models/PlantInstance";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx-js-style";

export async function GET(req: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (
      !session ||
      (session.user.role !== "admin" &&
       session.user.role !== "marketing_head" &&
       session.user.role !== "marketing_admin" &&
       session.user.role !== "finance" &&
       session.user.role !== "staff_finance")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get date filters from query parameters
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Build query with date filters
    const query: any = {};
    if (startDate && endDate) {
      // Set start date to beginning of day (00:00:00.000)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      // Set end date to end of day (23:59:59.999)
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.earnedAt = {
        $gte: start,
        $lte: end,
      };
    }

    // Get commission history with populated data and date filters
    const commissions = await CommissionHistory.find(query)
      .populate("marketingStaffId", "fullName email referralCode")
      .populate("customerId", "fullName email phoneNumber")
      .populate("paymentId", "orderId contractId paymentTerm originalAmount discountPercentage discountAmount isSppgDiscount amount")
      .sort({ earnedAt: -1 });

    // Get all commission withdrawals to calculate paid amounts per staff
    const allWithdrawals = await CommissionWithdrawal.find({});
    const withdrawalsByStaff = new Map();
    allWithdrawals.forEach((withdrawal: any) => {
      const staffId = withdrawal.marketingStaffId.toString();
      if (!withdrawalsByStaff.has(staffId)) {
        withdrawalsByStaff.set(staffId, 0);
      }
      withdrawalsByStaff.set(
        staffId,
        withdrawalsByStaff.get(staffId) + withdrawal.amount
      );
    });

    // Calculate total commissions per staff
    const commissionsByStaff = new Map();
    commissions.forEach((commission: any) => {
      const staffId = commission.marketingStaffId._id.toString();
      if (!commissionsByStaff.has(staffId)) {
        commissionsByStaff.set(staffId, 0);
      }
      commissionsByStaff.set(
        staffId,
        commissionsByStaff.get(staffId) + commission.commissionAmount
      );
    });

    // Calculate total referrals per staff (count of commissions)
    const referralsByStaff = new Map();
    commissions.forEach((commission: any) => {
      const staffId = commission.marketingStaffId._id.toString();
      if (!referralsByStaff.has(staffId)) {
        referralsByStaff.set(staffId, 0);
      }
      referralsByStaff.set(
        staffId,
        referralsByStaff.get(staffId) + 1
      );
    });

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

      // Format tenor (Lunas or installment number)
      let tenor = "";
      if (commission.paymentType === "full-investment") {
        tenor = "Lunas";
      } else if (commission.paymentType === "cicilan-installment") {
        const installmentNum = commission.installmentDetails?.installmentNumber || 1;
        tenor = installmentNum.toString();
      } else {
        tenor = "Lunas";
      }

      // Format jenis cicilan (payment term)
      let jenisCicilan = "-";
      if (commission.paymentType === "cicilan-installment" && commission.paymentId?.paymentTerm) {
        const paymentTerm = commission.paymentId.paymentTerm;
        if (paymentTerm === "monthly") {
          jenisCicilan = "Bulanan";
        } else if (paymentTerm === "annual") {
          jenisCicilan = "Tahunan";
        }
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

      // Determine status (always "Aktif" for commission records)
      const status = "Aktif";

      // Mitra/SPPG discount detail (only when isSppgTransaction).
      // Derive from amount + discountPercentage only: some Payments store contract-level
      // originalAmount/discountAmount (totals) while amount is per-installment, which
      // mixes scales. Use: Harga Akhir = amount; Harga Awal = amount / (1 - p);
      // Diskon (Rp) = Harga Awal - Harga Akhir.
      const pay = commission.paymentId as any;
      const hasDiscount = commission.isSppgTransaction && pay?.isSppgDiscount;
      const p = pay?.discountPercentage;
      const paid = pay?.amount;
      const validP = typeof p === "number" && p > 0 && p < 1;
      const discPct = hasDiscount && validP
        ? `${(p * 100).toFixed(2)}%`
        : "-";
      let discRp = "-";
      let hargaAwal = "-";
      const hargaAkhir = hasDiscount && typeof paid === "number" && paid >= 0
        ? `Rp. ${paid.toLocaleString("id-ID")}`
        : "-";
      if (hasDiscount && validP && typeof paid === "number" && paid >= 0) {
        const orig = Math.round(paid / (1 - p));
        const disc = orig - paid;
        discRp = `Rp. ${disc.toLocaleString("id-ID")}`;
        hargaAwal = `Rp. ${orig.toLocaleString("id-ID")}`;
      }

      marketingData.push([
        rowNumber,
        commission.marketingStaffName,
        commission.referralCodeUsed,
        commission.customerName,
        plantInstance?.blok || "-",
        plantInstance?.kavling || "-",
        commission.productName,
        pembayaran,
        tenor,
        jenisCicilan,
        tanggalBergabung,
        totalKomisi,
        1,
        status,
        discPct,
        discRp,
        hargaAwal,
        hargaAkhir,
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
        "Tenor",
        "Jenis Cicilan",
        "Tanggal Bergabung",
        "Total Komisi",
        "Total Referal",
        "Status",
        "Diskon %",
        "Diskon (Rp)",
        "Harga Awal",
        "Harga Akhir",
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
        if (row > 8 && col === 14) {
          // Diskon %
          worksheet[cellRef].s.alignment = { horizontal: "center" };
        }
        if (row > 8 && (col === 15 || col === 16 || col === 17)) {
          // Diskon (Rp), Harga Awal, Harga Akhir
          worksheet[cellRef].s.alignment = { horizontal: "right" };
        }
      }
    }

    // Merge header cells (18 columns: 0–17)
    const lastCol = 17;
    try {
      worksheet["!merges"] = worksheet["!merges"] || [];

      // Merge company header rows (0..4) across all columns
      for (let r = 0; r <= 4; r++) {
        worksheet["!merges"].push({ s: { r, c: 0 }, e: { r, c: lastCol } });
      }
      // Merge empty rows (5..6)
      for (let r = 5; r <= 6; r++) {
        worksheet["!merges"].push({ s: { r, c: 0 }, e: { r, c: lastCol } });
      }
      // Merge "DAFTAR MARKETING" across all columns
      worksheet["!merges"].push({ s: { r: 7, c: 0 }, e: { r: 7, c: lastCol } });

      // Ensure merged cells are created
      for (let r = 0; r <= 7; r++) {
        for (let c = 0; c <= lastCol; c++) {
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
                c === lastCol
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
