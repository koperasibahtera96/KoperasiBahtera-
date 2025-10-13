import { NextResponse } from "next/server";
import * as XLSX from "xlsx-js-style";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import Contract from "@/models/Contract";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get all cicilan payments
    const cicilanPayments = await Payment.find({
      paymentType: "cicilan-installment",
    }).sort({ createdAt: -1 });

    // Get all unique user IDs from payments
    const userIds = [
      ...new Set(cicilanPayments.map((p) => p.userId.toString())),
    ];

    // Get user information including userCode
    const users = await User.find({ _id: { $in: userIds } }).select(
      "fullName email phoneNumber userCode"
    );
    const usersMap = new Map(users.map((user) => [user._id.toString(), user]));

    // Get unique cicilanOrderIds (which are contractIds)
    const contractIds = [
      ...new Set(cicilanPayments.map((p) => p.cicilanOrderId)),
    ];

    // Get contract information to get the actual total amounts
    const contracts = await Contract.find({ contractId: { $in: contractIds } });
    const contractsMap = new Map(
      contracts.map((contract) => [contract.contractId, contract])
    );

    // Group payments by cicilanOrderId and installmentNumber
    const paymentGroups = new Map();

    cicilanPayments.forEach((payment) => {
      const key = `${payment.cicilanOrderId}-${payment.installmentNumber}`;
      paymentGroups.set(key, payment);
    });

    // Build cicilan data for the report
    const cicilanData: any[] = [];

    // Group by cicilanOrderId to get all installments per contract
    const contractGroups = new Map();
    cicilanPayments.forEach((payment) => {
      if (!contractGroups.has(payment.cicilanOrderId)) {
        contractGroups.set(payment.cicilanOrderId, []);
      }
      contractGroups.get(payment.cicilanOrderId).push(payment);
    });

    let rowNumber = 1;

    // Process each contract
    Array.from(contractGroups.entries()).forEach(
      ([cicilanOrderId, payments]) => {
        const sortedPayments = payments.sort(
          (a: any, b: any) => a.installmentNumber - b.installmentNumber
        );

        sortedPayments.forEach((payment: any) => {
          const user = usersMap.get(payment.userId.toString());
          const contract = contractsMap.get(payment.cicilanOrderId);

          // Determine payment term in Indonesian
          let jenisCicilan = "";
          switch (payment.paymentTerm) {
            case "monthly":
              jenisCicilan = "Bulanan";
              break;
            case "quarterly":
              jenisCicilan = "Kuartalan";
              break;
            case "annual":
              jenisCicilan = "Tahunan";
              break;
            default:
              jenisCicilan = "Bulanan";
          }

          // Format due date
          const tanggalJatuhTempo = new Date(
            payment.dueDate
          ).toLocaleDateString("id-ID");

          // Format payment date (if paid)
          let tanggalBayar = "-";
          if (
            payment.transactionStatus === "settlement" &&
            payment.settlementTime
          ) {
            tanggalBayar = new Date(payment.settlementTime).toLocaleDateString(
              "id-ID"
            );
          }

          // Determine payment status
          let statusCicilan = "";
          const now = new Date();
          const dueDate = new Date(payment.dueDate);

          if (payment.transactionStatus === "settlement") {
            statusCicilan = "Lunas";
          } else if (dueDate < now) {
            statusCicilan = "Terlambat";
          } else {
            statusCicilan = "Belum Bayar";
          }

          // Calculate late days if overdue
          let keterlambatan = 0;
          if (
            payment.transactionStatus !== "settlement" &&
            new Date(payment.dueDate) < new Date()
          ) {
            const diffTime =
              new Date().getTime() - new Date(payment.dueDate).getTime();
            keterlambatan = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          }

          // Format amounts - Use contract's actual total amount, fallback to calculation if contract not found
          const actualTotalAmount =
            contract?.totalAmount ||
            payment.installmentAmount * payment.totalInstallments;
          const totalKontrak = `Rp. ${actualTotalAmount.toLocaleString(
            "id-ID"
          )}`;
          const nominalCicilan = `Rp. ${payment.installmentAmount.toLocaleString(
            "id-ID"
          )}`;

          cicilanData.push([
            rowNumber,
            cicilanOrderId,
            user?.fullName || payment.customerData?.fullName || "-",
            user?.userCode || "-",
            payment.productName,
            totalKontrak,
            jenisCicilan,
            payment.installmentNumber,
            nominalCicilan,
            tanggalJatuhTempo,
            tanggalBayar,
            statusCicilan,
            keterlambatan,
          ]);

          rowNumber++;
        });
      }
    );

    // Create worksheet data
    const worksheetData = [];

    // Add company header information
    const headerInfo = [
      ["KOPERASI BINTANG MERAH SEJAHTERA"],
      [
        "Bintaro Business Center Jl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330",
      ],
      ["Tel: +62 81118893679 | Email: bintangmerahsejahtera@gmail.com"],
      ["LAPORAN CICILAN"],
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
      ["DAFTAR CICILAN"],
      [
        "No.",
        "No. Kontrak",
        "Nama User",
        "No Anggota",
        "Jenis Paket",
        "Total Kontrak",
        "Jenis Cicilan",
        "Cicilan ke-",
        "Nominal Cicilan (Rp)",
        "Tanggal Jatuh Tempo",
        "Tanggal Bayar",
        "Status Cicilan",
        "Keterlambatan (Hari)",
      ],
    ];

    // Add header information to worksheet data
    worksheetData.push(...headerInfo);

    // Add cicilan data
    worksheetData.push(...cicilanData);

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
          worksheetData[row][0] === "DAFTAR CICILAN" ||
          worksheetData[row][0] === "No."
        ) {
          worksheet[cellRef].s.font = { bold: true, sz: 11 };
          worksheet[cellRef].s.fill = { fgColor: { rgb: "E5E7EB" } };
          worksheet[cellRef].s.alignment = { horizontal: "center" };
        }

        // Data alignment for numbers
        if (row > 8 && (col === 0 || col === 7 || col === 12)) {
          // No., Cicilan ke-, Keterlambatan
          worksheet[cellRef].s.alignment = { horizontal: "center" };
        }
      }
    }

    // Merge header cells
    try {
      worksheet["!merges"] = worksheet["!merges"] || [];

      // Merge company header rows (0..4) across all 13 columns
      for (let r = 0; r <= 4; r++) {
        worksheet["!merges"].push({ s: { r, c: 0 }, e: { r, c: 12 } });
      }
      // Merge empty rows (5..6)
      for (let r = 5; r <= 6; r++) {
        worksheet["!merges"].push({ s: { r, c: 0 }, e: { r, c: 12 } });
      }
      // Merge "DAFTAR CICILAN" across all 13 columns
      worksheet["!merges"].push({ s: { r: 7, c: 0 }, e: { r: 7, c: 12 } });

      // Ensure merged cells are created
      for (let r = 0; r <= 7; r++) {
        for (let c = 0; c <= 12; c++) {
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
                c === 12
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Cicilan");

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
        "Content-Disposition": `attachment; filename="laporan-cicilan-${
          new Date().toISOString().split("T")[0]
        }.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error generating Excel export:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate Excel export" },
      { status: 500 }
    );
  }
}
