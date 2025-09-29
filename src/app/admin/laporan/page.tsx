"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { KetuaLayout } from "@/components/ketua/KetuaLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import {
  RefreshCw,
  Download,
  FileText,
  Users,
  Trees as TreeIcon,
  UserCheck,
  UserX,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Tree {
  _id: string;
  spesiesPohon: string;
  lokasi: string;
  umur: number;
  tinggi: number;
  tanggalTanam: string;
  kondisi: string;
  createdAt: string;
  nomorKontrak?: string;
}

interface InvestorReport {
  investor: {
    _id: string;
    name: string;
    email: string;
    totalInvestasi: number;
    jumlahPohon: number;
    status: string;
    createdAt: string;
  };
  payment?: {
    _id: string;
    orderId: string;
    transactionId?: string;
    amount: number;
    paymentType: string;
    transactionStatus?: string;
    productName?: string;
    referralCode?: string;
    createdAt: string;
    transactionTime?: string;
    settlementTime?: string;
    dueDate?: string;
    installmentNumber?: number;
    adminStatus?: string;
    status: string;
  };
  contract?: {
    _id: string;
    contractId: string;
    contractNumber: string;
    contractDate: string;
    totalAmount: number;
    paymentType: string;
    status: string;
  };
  trees: Tree[];
  statistics: {
    total: number;
    byCondition: Record<string, number>;
    bySpecies: Record<string, number>;
    avgHeight: number;
  };
}

interface ReportData {
  reports: InvestorReport[];
  summary: {
    totalInvestors: number;
    totalTrees: number;
    totalInvestment: number;
    activeInvestors: number;
    inactiveInvestors: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startIndex: number;
    endIndex: number;
  };
}

export default function LaporanPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getThemeClasses = (base: string, pink = "") => {
    if (!mounted) return base;
    return theme === "pink" ? `${base} ${pink}` : base;
  };
  // XLSX Export Functions
  const downloadAllInvestorsXLSX = () => {
    if (!reportData) return;
    const wb = XLSX.utils.book_new();

    // Add header information
    const headerInfo = [
      ["KOPERASI BINTANG MERAH SEJAHTERA"],
      [
        "Bintaro Business Center\nJl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330",
      ],
      ["Tel: 081118893679 | Email: koperasibintangmerahsejahtera@gmail.com"],
      [""],
      ["LAPORAN ADMIN - SEMUA INVESTOR"],
      [
        `Dibuat pada: ${new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
      ],
      [""],
      ["RINGKASAN UMUM"],
    ];

    // Summary data matching PDF
    const summarySheetData = [
      ...headerInfo,
      ["Metrik", "Jumlah"],
      ["Total Investor", reportData.summary.totalInvestors.toString()],
      ["Total Instansi Tanaman", reportData.summary.totalTrees.toString()],
      ["Investor Aktif", reportData.summary.activeInvestors.toString()],
      ["Investor Tidak Aktif", reportData.summary.inactiveInvestors.toString()],
      [""],
      ["DETAIL INVESTOR"],
      [
        "No.",
        "No. Invoice",
        "ID Transaksi",
        "Tanggal Invoice",
        "Status Invoice",
        "Nama User",
        "Email",
        "No. HP",
        "Nama Paket",
        "Jumlah",
        "Harga",
        "Kode Referral",
        "Tgl Transaksi",
        "Tgl Bayar",
        "Metode Pembayaran",
        "Jatuh Tempo",
        "Status Keterlambatan",
        "Nomor Kontrak",
        "Awal Kontrak",
        "Akhir Kontrak",
        "Total Dibayar",
        "Sisa Dibayar",
        "Status Akhir",
      ],
      // Now reports are payment-based, so each report represents one payment
      ...reports.map((report, reportIdx) => {
        // Each report now has payment data as primary and investor as secondary
        const payment = report.payment;
        const investor = report.investor;

        // Debug: Log the data to console to see what we're getting
        console.log(`Payment ${payment?.orderId}:`, {
          payment: payment,
          investor: investor?.name,
          contract: report.contract,
          reportStructure: Object.keys(report),
        });

        // Since each report now represents one payment directly, create one row per report
        const rowNumber = reportIdx + 1;

        // Map Payment data directly from the report structure
        // Get contract data from Contract table
        const contract = report.contract;
        let contractNumber = "-";
        let contractStart = null;
        let contractEnd = null;

        if (contract) {
          contractNumber =
            contract.contractNumber || contract.contractId || "-";

          if (contract.contractDate) {
            try {
              contractStart = new Date(contract.contractDate);
              // End contract is 10 years after start
              contractEnd = new Date(
                contractStart.getFullYear() + 10,
                contractStart.getMonth(),
                contractStart.getDate()
              );
            } catch (error) {
              console.error(error);
              console.warn("Invalid contract date:", contract.contractDate);
            }
          }
        }

        // Fallback to payment dates if no contract data
        if (!contractStart && payment?.createdAt) {
          try {
            contractStart = new Date(payment.createdAt);
            contractEnd = new Date(
              contractStart.getFullYear() + 10,
              contractStart.getMonth(),
              contractStart.getDate()
            );
          } catch (error) {
            console.error(error);
            console.warn("Invalid payment date:", payment.createdAt);
          }
        }

        return [
          String(rowNumber),
          payment?.orderId || "-", // No. Invoice
          payment?.transactionId || "-", // ID Transaksi
          payment?.transactionTime
            ? new Date(payment.transactionTime).toLocaleDateString("id-ID")
            : "-", // Tanggal Invoice
          payment?.transactionStatus || payment?.status || "-", // Status Invoice
          investor?.name || "-", // Nama User
          investor?.email || "-", // Email
          (investor as any)?.phoneNumber || "-", // No. HP (now from User table)
          payment?.productName || "-", // Nama Paket
          "1", // Jumlah
          payment?.amount
            ? `Rp ${payment.amount.toLocaleString("id-ID")}`
            : "-", // Harga
          payment?.referralCode || "-", // Kode Referral
          payment?.createdAt
            ? new Date(payment.createdAt).toLocaleDateString("id-ID")
            : "-", // Tgl Transaksi
          payment?.settlementTime
            ? new Date(payment.settlementTime).toLocaleDateString("id-ID")
            : "-", // Tgl Bayar
          payment?.paymentType === "full-investment"
            ? "Pembayaran Penuh"
            : payment?.paymentType === "cicilan-installment"
            ? `Cicilan ${payment?.installmentNumber || ""}`
            : payment?.paymentType === "registration"
            ? "Registrasi"
            : payment?.paymentType || "-", // Metode Pembayaran
          payment?.dueDate
            ? new Date(payment.dueDate).toLocaleDateString("id-ID")
            : "-", // Jatuh Tempo
          // Status Keterlambatan: Terlambat = overdue unpaid, Tepat Waktu = paid on time, Pending = not paid but not overdue
          payment?.transactionStatus === "settlement"
            ? "Tepat Waktu" // Paid successfully
            : payment?.dueDate && new Date(payment.dueDate) < new Date()
            ? "Terlambat" // Past due date and not paid
            : "Pending", // Not paid but not overdue yet
          contractNumber, // Nomor Kontrak (from plantInstance.contractNumber)
          contractStart ? contractStart.toLocaleDateString("id-ID") : "-", // Awal Kontrak
          contractEnd ? contractEnd.toLocaleDateString("id-ID") : "-", // Akhir Kontrak (10 years after start)
          payment?.transactionStatus === "settlement"
            ? `Rp ${payment?.amount?.toLocaleString("id-ID") || 0}`
            : "Rp 0", // Total Dibayar
          payment?.transactionStatus !== "settlement"
            ? `Rp ${payment?.amount?.toLocaleString("id-ID") || 0}`
            : "Rp 0", // Sisa Dibayar
          payment?.transactionStatus === "settlement"
            ? "Selesai"
            : payment?.transactionStatus === "pending"
            ? "Pending"
            : payment?.adminStatus || payment?.status || "-", // Status Akhir
        ];
      }),
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);

    // Auto-size columns based on content AND headers
    const colWidths = [];
    const maxCols = Math.max(...summarySheetData.map((row) => row.length));

    for (let col = 0; col < maxCols; col++) {
      let maxWidth = 0;
      for (let row = 0; row < summarySheetData.length; row++) {
        const cellValue = summarySheetData[row][col];
        if (cellValue) {
          const cellWidth = cellValue.toString().length;
          maxWidth = Math.max(maxWidth, cellWidth);
        }
      }
      // Set specific column widths for the new table structure
      if (col === 0) {
        // No. column - make wider to fit "KOPERASI BINTANG MERAH SEJAHTERA" header
        colWidths.push({ width: 20 });
      } else if (col === 1 || col === 2) {
        // No. Invoice, ID Transaksi
        colWidths.push({ width: 25 });
      } else if (col === 5 || col === 6) {
        // Nama User, Email
        colWidths.push({ width: 30 });
      } else if (col === 7) {
        // No. HP
        colWidths.push({ width: 18 });
      } else if (col === 8) {
        // Nama Paket
        colWidths.push({ width: 20 });
      } else if (col === 10 || col === 20 || col === 21) {
        // Harga, Total Dibayar, Sisa Dibayar
        colWidths.push({ width: 18 });
      } else if (col === 17) {
        // Nomor Kontrak
        colWidths.push({ width: 35 });
      } else {
        // Other columns - use calculated width
        colWidths.push({ width: Math.min(Math.max(maxWidth + 3, 15), 25) });
      }
    }
    summarySheet["!cols"] = colWidths;

    // Add borders and styling
    const range = XLSX.utils.decode_range(summarySheet["!ref"] || "A1");
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!summarySheet[cellRef]) continue;

        // Initialize cell style
        if (!summarySheet[cellRef].s) summarySheet[cellRef].s = {};

        // Add borders to all cells
        summarySheet[cellRef].s.border = {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        };

        // Company header styling - make gray
        if (
          row === 0 ||
          summarySheetData[row][0] === "KOPERASI BINTANG MERAH SEJAHTERA"
        ) {
          summarySheet[cellRef].s.font = { bold: true, sz: 14 };
          summarySheet[cellRef].s.alignment = { horizontal: "center" };
          summarySheet[cellRef].s.fill = { fgColor: { rgb: "E5E7EB" } };
        }

        // Section headers with background color - use subtle gray
        if (
          summarySheetData[row][0] === "RINGKASAN UMUM" ||
          summarySheetData[row][0] === "DETAIL INVESTOR" ||
          summarySheetData[row][0] === "Metrik" ||
          summarySheetData[row][0] === "Nama"
        ) {
          summarySheet[cellRef].s.font = { bold: true, sz: 11 };
          summarySheet[cellRef].s.fill = {
            fgColor: { rgb: "E5E7EB" },
          };
          summarySheet[cellRef].s.alignment = { horizontal: "center" };
        }

        // Header row for the investor details table (contains 'Tanggal Bergabung' or 'Tanggal Pembelian')
        try {
          const rowArr = summarySheetData[row];
          if (
            Array.isArray(rowArr) &&
            (rowArr.includes("Tanggal Bergabung") ||
              rowArr.includes("Tanggal Pembelian") ||
              rowArr.includes("No."))
          ) {
            summarySheet[cellRef].s.font = { bold: true, sz: 11 };
            summarySheet[cellRef].s.fill = { fgColor: { rgb: "E5E7EB" } };
            summarySheet[cellRef].s.alignment = { horizontal: "center" };
          }
        } catch {
          // ignore
        }

        // Data alignment
        if (
          row > 0 &&
          col > 0 &&
          summarySheetData[row][col] &&
          !isNaN(Number(summarySheetData[row][col]))
        ) {
          summarySheet[cellRef].s.alignment = { horizontal: "right" };
        }
      }
    }

    // Merge the top header rows: company header rows (0..6) -> A..C, RINGKASAN UMUM (row 7) -> A..B
    try {
      summarySheet["!merges"] = summarySheet["!merges"] || [];
      // company header rows (0..6) -> span only A..C (3 columns)
      for (let r = 0; r <= 6; r++) {
        summarySheet["!merges"].push({ s: { r, c: 0 }, e: { r, c: 2 } });
      }
      // RINGKASAN UMUM row (7) -> A..B (keep narrow for summary)
      summarySheet["!merges"].push({ s: { r: 7, c: 0 }, e: { r: 7, c: 1 } });

      // Ensure each cell in the merged areas has a cell object and borders
      // For rows 0..6 (A..C - spanning only 3 columns)
      for (let r = 0; r <= 6; r++) {
        for (let c = 0; c <= 2; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!summarySheet[cellRef]) {
            const val = (summarySheetData[r] && summarySheetData[r][c]) || "";
            summarySheet[cellRef] = { v: val, t: "s" } as any;
          }
          if (!summarySheet[cellRef].s) summarySheet[cellRef].s = {};
          summarySheet[cellRef].s.border = {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left:
              c === 0 ? { style: "thin", color: { rgb: "000000" } } : undefined,
            right:
              c === 22
                ? { style: "thin", color: { rgb: "000000" } }
                : undefined,
          };
        }
      }

      // For RINGKASAN UMUM row (r=7), fill cols 0..1 and set col 2 left border
      for (let c = 0; c <= 1; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 7, c });
        if (!summarySheet[cellRef]) {
          const val = (summarySheetData[7] && summarySheetData[7][c]) || "";
          summarySheet[cellRef] = { v: val, t: "s" } as any;
        }
        if (!summarySheet[cellRef].s) summarySheet[cellRef].s = {};
        summarySheet[cellRef].s.border = {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        };
      }
      // ensure column C (c=2) at row 7 has left border to close the box
      const rightOfRingkasan = XLSX.utils.encode_cell({ r: 7, c: 2 });
      if (!summarySheet[rightOfRingkasan])
        summarySheet[rightOfRingkasan] = { v: "", t: "s" } as any;
      if (!summarySheet[rightOfRingkasan].s)
        summarySheet[rightOfRingkasan].s = {};
      summarySheet[rightOfRingkasan].s.border =
        summarySheet[rightOfRingkasan].s.border || {};
      summarySheet[rightOfRingkasan].s.border.left = {
        style: "thin",
        color: { rgb: "000000" },
      };
    } catch {
      // ignore if merging fails for any reason
    }

    XLSX.utils.book_append_sheet(wb, summarySheet, "Laporan Admin Semua");

    XLSX.writeFile(
      wb,
      `Laporan-Admin-Semua-Investor-${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );
  };

  const downloadIndividualInvestorXLSX = async (groupedReport: any) => {
    const wb = XLSX.utils.book_new();

    // Fetch individual investor data from API
    const response = await fetch(
      `/api/admin/laporan?investorId=${groupedReport.investor._id}`
    );
    if (!response.ok) {
      console.error("Failed to fetch individual investor data");
      return;
    }

    const apiData = await response.json();
    if (!apiData.success) {
      console.error("API returned error:", apiData.error);
      return;
    }

    const reports = apiData.data.reports; // Array of payment reports
    const firstReport = reports[0]; // For investor info

    // Ensure we have detailed plant data for accurate age calculations
    await fetchDetailedPlantAges(firstReport.investor._id);

    // (removed plant statistics calculations — not needed for per-investor export)

    // Header information matching PDF
    const headerInfo = [
      ["KOPERASI BINTANG MERAH SEJAHTERA"],
      [
        "Bintaro Business Center\nJl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330",
      ],
      ["Tel: 081118893679 | Email: koperasibintangmerahsejahtera@gmail.com"],
      [""],
      [`LAPORAN INVESTOR - ${firstReport.investor.name.toUpperCase()}`],
      [
        `Dibuat pada: ${new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
      ],
      [""],
      ["INFORMASI INVESTOR"],
    ];

    // Get investor data for the new metrics
    const investorData = firstReport.investor;

    // Calculate metrics based on all related payments for this investor
    const allPayments = reports.map((r: any) => r.payment);
    const fullInvestments = allPayments.filter(
      (p: any) => p.paymentType === "full-investment"
    );
    const cicilanInvestments = allPayments.filter(
      (p: any) => p.paymentType === "cicilan-installment"
    );

    // Paket Aktif: full investments that are settled, or cicilan investments with at least one settled installment
    const paketAktif =
      fullInvestments.filter((p: any) => p.transactionStatus === "settlement")
        .length +
      [
        ...new Set(
          cicilanInvestments
            .filter((p: any) => p.transactionStatus === "settlement")
            .map((p: any) => p.cicilanOrderId)
        ),
      ].length;

    // Paket Pending: full investments pending or cicilan groups with no settled installments
    const fullPending = fullInvestments.filter(
      (p: any) => p.transactionStatus === "pending"
    ).length;
    const cicilanGroups = [
      ...new Set(cicilanInvestments.map((p: any) => p.cicilanOrderId)),
    ];
    const cicilanPending = cicilanGroups.filter(
      (groupId) =>
        !cicilanInvestments.some(
          (p: any) =>
            p.cicilanOrderId === groupId && p.transactionStatus === "settlement"
        )
    ).length;
    const paketPending = fullPending + cicilanPending;

    // Calculate total transaction value
    const totalNilaiTransaksi = allPayments.reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0
    );

    // Calculate rata-rata umur from all plant instances across all payment reports
    const allTrees = reports.flatMap((r: any) => r.trees);
    const avgAge =
      allTrees.length > 0
        ? allTrees.reduce(
            (sum: number, tree: any) => sum + (tree.umur || 0),
            0
          ) / allTrees.length
        : 0;

    // Investor Info Sheet with new template
    const investorInfo = [
      ...headerInfo,
      ["Bidang", "Nilai"],
      ["No. Anggota", (investorData as any).userCode || "BMS-..."],
      ["Nama", investorData.name],
      ["Email", investorData.email],
      ["No. Telepon", (investorData as any).phoneNumber || ""],
      ["Status", investorData.status === "active" ? "Aktif" : "Tidak Aktif"],
      [
        "Tanggal Registrasi",
        new Date(investorData.createdAt).toLocaleDateString("id-ID"),
      ],
      [""],
      [""],
      [""],
      [""],
      [""],
      [""],
      ["RINGKASAN TANAMAN", "Jumlah"],
      ["Total Paket Dibeli", reports.length.toString()],
      [
        "Total Nilai Transaksi",
        `Rp ${totalNilaiTransaksi.toLocaleString("id-ID")}`,
      ],
      ["Total Paket Aktif", paketAktif.toString()],
      ["Total Paket Pending", paketPending.toString()],
      ["Jumlah Invoice", fullInvestments.length.toString()],
      ["Jumlah Cicilan", cicilanInvestments.length.toString()],
      ["Rata-rata Umur", `${Math.round(avgAge)} Bulan`],
      [""],
      ["RINCIAN JENIS TANAMAN"],
      ["Jenis Tanaman", "Jumlah"],
      ...Object.entries(
        allTrees.reduce((acc: any, tree: any) => {
          const type = tree.spesiesPohon.split(" - ")[0].toLowerCase();
          if (!acc[type]) {
            acc[type] = 0;
          }
          acc[type]++;
          return acc;
        }, {} as Record<string, number>)
      ).map(([type, count]) => [
        type.charAt(0).toUpperCase() + type.slice(1),
        (count as any).toString(),
      ]),
      [""],
      ["INSTANSI TANAMAN INDIVIDUAL"],
      [
        "Nomor Kontrak Aktif",
        "Awal Kontrak",
        "Akhir Kontrak",
        "Jenis Paket",
        "Lokasi",
        "Blok",
        "Kavling",
        "Umur",
        "Ditanam",
        "Status",
      ],
      ...reports.map((report: any) => {
        // For individual reports, each payment should be one row (not each tree)
        // Use first tree for display data, but row represents the payment
        const tree =
          report.trees && report.trees.length > 0 ? report.trees[0] : null;
        let ageDisplay = "0 hari";

        // First check if we have detailed plant data (this should be fetched for exports)
        const detailedData = detailedPlantData[report.investor._id];
        if (detailedData && tree) {
          const detailedTree = detailedData.find((dt) => dt._id === tree._id);
          if (detailedTree && detailedTree.detailedAge) {
            ageDisplay = formatDetailedAge(detailedTree.detailedAge);
          } else {
            // Use creation date for age calculation (like new plants showing "1 hari")
            const referenceDate = new Date(tree.createdAt);
            const now = new Date();
            let years = now.getFullYear() - referenceDate.getFullYear();
            let months = now.getMonth() - referenceDate.getMonth();
            let days = now.getDate() - referenceDate.getDate();

            if (days < 0) {
              months--;
              const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
              days += lastMonth.getDate();
            }
            if (months < 0) {
              years--;
              months += 12;
            }

            const parts = [];
            if (years > 0) parts.push(`${years} tahun`);
            if (months > 0) parts.push(`${months} bulan`);
            if (days > 0 && years === 0 && months === 0)
              parts.push(`${days} hari`);

            ageDisplay = parts.length > 0 ? parts.join(", ") : "0 hari";
          }
        } else if (tree) {
          // Fallback: calculate age using the same logic as plant-ages API
          const history = (tree as any).history || [];

          // Find the first non-pending/non-new contract action for planting date
          const firstPlantingAction = history.find((h: any) => {
            const action = (h.action || h.type || "").toLowerCase();
            return action !== "pending contract" && action !== "kontrak baru";
          });

          let referenceDate;
          if (firstPlantingAction) {
            const tanggalTanam =
              firstPlantingAction.addedAt || firstPlantingAction.date;
            if (tanggalTanam) {
              try {
                // Parse DD/MM/YYYY format
                const [day, month, year] = tanggalTanam.split("/");
                referenceDate = new Date(
                  parseInt(year),
                  parseInt(month) - 1,
                  parseInt(day)
                );
              } catch {
                referenceDate = new Date(tree.createdAt);
              }
            } else {
              referenceDate = new Date(tree.createdAt);
            }
          } else {
            // No planting action found, use createdAt (most recent date for new plants)
            referenceDate = new Date(tree.createdAt);
          }

          // Calculate detailed age like the plant-ages API
          const now = new Date();
          let years = now.getFullYear() - referenceDate.getFullYear();
          let months = now.getMonth() - referenceDate.getMonth();
          let days = now.getDate() - referenceDate.getDate();

          // Adjust for negative days
          if (days < 0) {
            months--;
            const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += lastMonth.getDate();
          }

          // Adjust for negative months
          if (months < 0) {
            years--;
            months += 12;
          }

          // Format like the UI
          const parts = [];
          if (years > 0) parts.push(`${years} tahun`);
          if (months > 0) parts.push(`${months} bulan`);
          if (days > 0 && years === 0 && months === 0)
            parts.push(`${days} hari`);

          ageDisplay = parts.length > 0 ? parts.join(", ") : "0 hari";
        }

        // Get contract and payment data from grouped report
        const contract = report.contract;
        const payment =
          report.payments && report.payments.length > 0
            ? report.payments[0]
            : report.payment;

        // Contract number: prefer contract.contractNumber, fallback to payment.orderId
        const contractNumber =
          contract?.contractNumber ||
          contract?.contractId ||
          payment?.orderId ||
          tree.nomorKontrak ||
          "-";

        // Contract dates
        let contractStart = null;
        let contractEnd = null;

        if (contract?.contractDate) {
          try {
            contractStart = new Date(contract.contractDate);
            contractEnd = new Date(
              contractStart.getFullYear() + 10,
              contractStart.getMonth(),
              contractStart.getDate()
            );
          } catch (error) {
            console.error(error);
            console.warn("Invalid contract date:", contract.contractDate);
          }
        }

        // Fallback to payment dates if no contract data
        if (!contractStart && payment?.createdAt) {
          try {
            contractStart = new Date(payment.createdAt);
            contractEnd = new Date(
              contractStart.getFullYear() + 10,
              contractStart.getMonth(),
              contractStart.getDate()
            );
          } catch (error) {
            console.error(error);
            console.warn("Invalid payment date:", payment.createdAt);
          }
        }

        // Final fallback to tree creation date
        if (!contractStart) {
          contractStart = new Date(tree.createdAt);
          contractEnd = new Date(
            contractStart.getFullYear() + 10,
            contractStart.getMonth(),
            contractStart.getDate()
          );
        }

        // Jenis Paket: use payment.productName (like in all investors export)
        const jenispaket =
          payment?.productName ||
          contract?.productName ||
          tree?.spesiesPohon ||
          "Tidak Ada Paket";

        // Get blok and kavling from tree data (now included in API response)
        const blok = tree?.blok || "";
        const kavling = tree?.kavling || "";

        // Fix planted date - handle invalid dates properly
        let plantedDate = "";
        try {
          if (
            tree &&
            tree.tanggalTanam &&
            tree.tanggalTanam !== "Invalid Date"
          ) {
            // If tanggalTanam is a valid date string
            if (
              typeof tree.tanggalTanam === "string" &&
              tree.tanggalTanam.includes("/")
            ) {
              plantedDate = tree.tanggalTanam; // Already formatted
            } else {
              plantedDate = new Date(tree.tanggalTanam).toLocaleDateString(
                "id-ID"
              );
            }
          } else if (tree) {
            // Use creation date as fallback
            plantedDate = new Date(tree.createdAt).toLocaleDateString("id-ID");
          }
        } catch (error) {
          console.error(error);
          // Final fallback
          if (tree) {
            plantedDate = new Date(tree.createdAt).toLocaleDateString("id-ID");
          } else {
            plantedDate = "-";
          }
        }

        // If no tree at all, set default values
        if (!tree) {
          plantedDate = "-";
        }

        return [
          contractNumber,
          contractStart.toLocaleDateString("id-ID"),
          contractEnd?.toLocaleDateString("id-ID"),
          jenispaket, // Use contract product name instead of tree species
          tree?.lokasi || "Lokasi tidak tersedia",
          blok,
          kavling,
          ageDisplay,
          plantedDate,
          tree?.kondisi || "Belum Ada Pohon",
        ];
      }),
    ];

    const infoSheet = XLSX.utils.aoa_to_sheet(investorInfo);

    // Auto-size columns based on content AND headers
    const colWidths = [];
    const maxCols = Math.max(...investorInfo.map((row) => row.length));

    for (let col = 0; col < maxCols; col++) {
      let maxWidth = 0;
      for (let row = 0; row < investorInfo.length; row++) {
        const cellValue = investorInfo[row][col];
        if (cellValue) {
          const cellWidth = cellValue.toString().length;
          maxWidth = Math.max(maxWidth, cellWidth);
        }
      }
      // Make column A (index 0) wider for longer text like "RINGKASAN TANAMAN" and "RINCIAN JENIS TANAMAN"
      if (col === 0) {
        colWidths.push({ width: 30 });
      } else if (col === 2) {
        colWidths.push({ width: 40 });
      } else {
        // Ensure minimum width for readability and maximum for reasonable display
        colWidths.push({ width: Math.min(Math.max(maxWidth + 3, 12), 60) });
      }
    }
    infoSheet["!cols"] = colWidths;

    // Add borders and styling
    const range = XLSX.utils.decode_range(infoSheet["!ref"] || "A1");
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!infoSheet[cellRef]) continue;

        // Initialize cell style
        if (!infoSheet[cellRef].s) infoSheet[cellRef].s = {};

        // Skip borders for empty spacing cells - using 0-based row indexing
        const skipBorderCells = [
          // A16-A21 (rows 15-20 in 0-based indexing)
          ...[15, 16, 17, 18, 19, 20].map(
            (r) => `${XLSX.utils.encode_col(0)}${r + 1}`
          ),
          // A30 (row 29 in 0-based)
          `${XLSX.utils.encode_col(0)}${30}`,
          // A31 (row 30 in 0-based)
          `${XLSX.utils.encode_col(0)}${31}`,
          // A34 (row 33 in 0-based)
          `${XLSX.utils.encode_col(0)}${34}`,
        ];

        if (!skipBorderCells.includes(cellRef)) {
          // Add borders to cells that should have them
          infoSheet[cellRef].s.border = {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          };
        }

        // Company header styling - use subtle gray
        if (
          row === 0 ||
          investorInfo[row][0] === "KOPERASI BINTANG MERAH SEJAHTERA"
        ) {
          infoSheet[cellRef].s.font = { bold: true, sz: 14 };
          infoSheet[cellRef].s.alignment = { horizontal: "center" };
          infoSheet[cellRef].s.fill = { fgColor: { rgb: "E5E7EB" } };
        }

        // Section headers with background color - gray
        // Force styling for specific header cells regardless of skip border logic
        const isHeaderCell =
          investorInfo[row] &&
          (investorInfo[row][0] === "INFORMASI INVESTOR" ||
            investorInfo[row][0] === "RINCIAN JENIS TANAMAN" ||
            investorInfo[row][0] === "INSTANSI TANAMAN INDIVIDUAL" ||
            investorInfo[row][0] === "Bidang" ||
            investorInfo[row][0] === "Jenis Tanaman" ||
            investorInfo[row][0] === "Nomor Kontrak" ||
            investorInfo[row][0] === "Nomor Kontrak Aktif" ||
            investorInfo[row][0] === "RINGKASAN TANAMAN");

        if (isHeaderCell) {
          infoSheet[cellRef].s.font = { bold: true, sz: 11 };
          infoSheet[cellRef].s.fill = {
            fgColor: { rgb: "E5E7EB" },
          };
          // INFORMASI INVESTOR should be left aligned, others center aligned
          if (investorInfo[row][0] === "INFORMASI INVESTOR") {
            infoSheet[cellRef].s.alignment = { horizontal: "left" };
          } else {
            infoSheet[cellRef].s.alignment = { horizontal: "center" };
          }
          // Header cells should always have borders
          if (!infoSheet[cellRef].s.border) {
            infoSheet[cellRef].s.border = {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            };
          }
        }

        // Data alignment
        if (
          row > 0 &&
          col > 0 &&
          investorInfo[row][col] &&
          !isNaN(Number(investorInfo[row][col]))
        ) {
          infoSheet[cellRef].s.alignment = { horizontal: "right" };
        }
      }
    }

    // Merge the header rows appropriately
    try {
      infoSheet["!merges"] = infoSheet["!merges"] || [];

      // Merge company header rows (0-6) to span full width
      for (let r = 0; r <= 6; r++) {
        infoSheet["!merges"].push({ s: { r, c: 0 }, e: { r, c: 2 } });
      }

      // "INFORMASI INVESTOR" (row 7) only spans A7-B7
      infoSheet["!merges"].push({ s: { r: 7, c: 0 }, e: { r: 7, c: 1 } });

      // Ensure each cell in merged header area has borders
      for (let r = 0; r <= 6; r++) {
        for (let c = 0; c <= 2; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!infoSheet[cellRef]) {
            const val = (investorInfo[r] && investorInfo[r][c]) || "";
            infoSheet[cellRef] = { v: val, t: "s" } as any;
          }
          if (!infoSheet[cellRef].s) infoSheet[cellRef].s = {};
          infoSheet[cellRef].s.border = {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          };
        }
      }

      // Handle "INFORMASI INVESTOR" row (r=7) border for A7-B7
      for (let c = 0; c <= 1; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 7, c });
        if (!infoSheet[cellRef]) {
          const val = (investorInfo[7] && investorInfo[7][c]) || "";
          infoSheet[cellRef] = { v: val, t: "s" } as any;
        }
        if (!infoSheet[cellRef].s) infoSheet[cellRef].s = {};
        infoSheet[cellRef].s.border = {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        };
      }

      // Ensure the cell immediately to the right of merged areas has left borders
      for (let r = 0; r <= 6; r++) {
        const rightCellRef = XLSX.utils.encode_cell({ r, c: 3 });
        if (!infoSheet[rightCellRef])
          infoSheet[rightCellRef] = { v: "", t: "s" } as any;
        if (!infoSheet[rightCellRef].s) infoSheet[rightCellRef].s = {};
        infoSheet[rightCellRef].s.border =
          infoSheet[rightCellRef].s.border || {};
        infoSheet[rightCellRef].s.border.left = {
          style: "thin",
          color: { rgb: "000000" },
        };
      }

      // Add left border to C7 (next to "INFORMASI INVESTOR" merged area)
      const c7RightRef = XLSX.utils.encode_cell({ r: 7, c: 2 });
      if (!infoSheet[c7RightRef])
        infoSheet[c7RightRef] = { v: "", t: "s" } as any;
      if (!infoSheet[c7RightRef].s) infoSheet[c7RightRef].s = {};
      infoSheet[c7RightRef].s.border = infoSheet[c7RightRef].s.border || {};
      infoSheet[c7RightRef].s.border.left = {
        style: "thin",
        color: { rgb: "000000" },
      };
    } catch {
      // ignore
    }

    XLSX.utils.book_append_sheet(wb, infoSheet, "Laporan Investor");

    XLSX.writeFile(
      wb,
      `Laporan-Investor-${firstReport.investor.name.replace(/\s+/g, "-")}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );
  };
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedInvestor, setExpandedInvestor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailedPlantData, setDetailedPlantData] = useState<
    Record<string, any[]>
  >({});
  const [loadingPlantAges, setLoadingPlantAges] = useState<
    Record<string, boolean>
  >({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Format number helper
  const formatNumber = (num: number) => {
    return num.toLocaleString("id-ID");
  };

  // Format detailed age helper
  const formatDetailedAge = (detailedAge: {
    years: number;
    months: number;
    days: number;
  }) => {
    const parts = [];
    if (detailedAge.years > 0) parts.push(`${detailedAge.years} tahun`);
    if (detailedAge.months > 0) parts.push(`${detailedAge.months} bulan`);
    if (detailedAge.days > 0) parts.push(`${detailedAge.days} hari`);
    return parts.length > 0 ? parts.join(", ") : "0 hari";
  };

  // PDF Generation Functions
  const addPDFHeader = async (doc: jsPDF, title: string) => {
    // Add logo
    try {
      const logoImg = new Image();
      logoImg.onload = () => {
        doc.addImage(logoImg, "PNG", 20, 15, 25, 25);
      };
      logoImg.src = "/images/koperasi-logo.jpg";

      // Wait a bit for image to load
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.warn("Logo not loaded:", error);
    }

    // Company header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("KOPERASI BINTANG MERAH SEJAHTERA", 55, 25);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Bintaro Business Center", 55, 32);
    doc.text(
      "Jl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330",
      55,
      38
    );
    doc.text(
      "Tel: 081118893679 | Email: koperasibintangmerahsejahtera@gmail.com",
      55,
      44
    );

    // Report title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, 55);

    // Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const currentDate = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Dibuat pada: ${currentDate}`, 20, 62);

    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, 70, 190, 70);

    return 80; // Return Y position for content start
  };

  const downloadAllInvestorsReport = async () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const startY = await addPDFHeader(doc, "LAPORAN ADMIN - SEMUA INVESTOR");

    // Summary section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RINGKASAN UMUM", 20, startY);

    const summaryData = [
      ["Total Investor", reportData.summary.totalInvestors.toString()],
      ["Total Instansi Tanaman", reportData.summary.totalTrees.toString()],
      ["Investor Aktif", reportData.summary.activeInvestors.toString()],
      ["Investor Tidak Aktif", reportData.summary.inactiveInvestors.toString()],
    ];

    autoTable(doc, {
      startY: startY + 8,
      head: [["Metrik", "Jumlah"]],
      body: summaryData,
      theme: "striped",
      headStyles: { fillColor: [50, 77, 62] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 },
    });

    // Investors table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DETAIL INVESTOR", 20, finalY);

    // Create payment table data matching XLSX structure
    const investmentTableData = reports.map((report, reportIdx) => {
      const payment = report.payment;
      const investor = report.investor;
      const contract = report.contract;

      // Since each report now represents one payment directly, create one row per report
      const rowNumber = reportIdx + 1;

      // Get contract data from Contract table (same logic as XLSX)
      let contractNumber = "-";
      let contractStart = null;
      let contractEnd = null;

      if (contract) {
        contractNumber = contract.contractNumber || contract.contractId || "-";

        if (contract.contractDate) {
          try {
            contractStart = new Date(contract.contractDate);
            // End contract is 10 years after start
            contractEnd = new Date(
              contractStart.getFullYear() + 10,
              contractStart.getMonth(),
              contractStart.getDate()
            );
          } catch {
            console.warn("Invalid contract date:", contract.contractDate);
          }
        }
      }

      // Fallback to payment dates if no contract data
      if (!contractStart && payment?.createdAt) {
        try {
          contractStart = new Date(payment.createdAt);
          contractEnd = new Date(
            contractStart.getFullYear() + 10,
            contractStart.getMonth(),
            contractStart.getDate()
          );
        } catch {
          console.warn("Invalid payment date:", payment.createdAt);
        }
      }

      return [
        String(rowNumber),
        payment?.orderId || "-", // No. Invoice
        payment?.transactionId || "-", // ID Transaksi
        payment?.transactionTime
          ? new Date(payment.transactionTime).toLocaleDateString("id-ID")
          : "-", // Tanggal Invoice
        payment?.transactionStatus || payment?.status || "-", // Status Invoice
        investor?.name || "-", // Nama User
        investor?.email || "-", // Email
        (investor as any)?.phoneNumber || "-", // No. HP
        payment?.productName || "-", // Nama Paket
        "1", // Jumlah
        payment?.amount ? `Rp ${payment.amount.toLocaleString("id-ID")}` : "-", // Harga
        payment?.referralCode || "-", // Kode Referral
        payment?.createdAt
          ? new Date(payment.createdAt).toLocaleDateString("id-ID")
          : "-", // Tgl Transaksi
        payment?.settlementTime
          ? new Date(payment.settlementTime).toLocaleDateString("id-ID")
          : "-", // Tgl Bayar
        payment?.paymentType === "full-investment"
          ? "Pembayaran Penuh"
          : payment?.paymentType === "cicilan-installment"
          ? `Cicilan ${payment?.installmentNumber || ""}`
          : payment?.paymentType === "registration"
          ? "Registrasi"
          : payment?.paymentType || "-", // Metode Pembayaran
        payment?.dueDate
          ? new Date(payment.dueDate).toLocaleDateString("id-ID")
          : "-", // Jatuh Tempo
        // Status Keterlambatan: same logic as XLSX export
        payment?.transactionStatus === "settlement"
          ? "Tepat Waktu" // Paid successfully
          : payment?.dueDate && new Date(payment.dueDate) < new Date()
          ? "Terlambat" // Past due date and not paid
          : "Pending", // Not paid but not overdue yet
        contractNumber, // Nomor Kontrak
        contractStart ? contractStart.toLocaleDateString("id-ID") : "-", // Awal Kontrak
        contractEnd ? contractEnd.toLocaleDateString("id-ID") : "-", // Akhir Kontrak
        payment?.transactionStatus === "settlement"
          ? `Rp ${payment?.amount?.toLocaleString("id-ID") || 0}`
          : "Rp 0", // Total Dibayar
        payment?.transactionStatus !== "settlement"
          ? `Rp ${payment?.amount?.toLocaleString("id-ID") || 0}`
          : "Rp 0", // Sisa Dibayar
        payment?.transactionStatus === "settlement"
          ? "Selesai"
          : payment?.transactionStatus === "pending"
          ? "Pending"
          : payment?.adminStatus || payment?.status || "-", // Status Akhir
      ];
    });

    // Note: This table is very wide (23 columns), so we'll use smaller font and auto-width
    autoTable(doc, {
      startY: finalY + 8,
      head: [
        [
          "No.",
          "No. Invoice",
          "ID Transaksi",
          "Tanggal Invoice",
          "Status Invoice",
          "Nama User",
          "Email",
          "No. HP",
          "Nama Paket",
          "Jumlah",
          "Harga",
          "Kode Referral",
          "Tgl Transaksi",
          "Tgl Bayar",
          "Metode Pembayaran",
          "Jatuh Tempo",
          "Status Keterlambatan",
          "Nomor Kontrak",
          "Awal Kontrak",
          "Akhir Kontrak",
          "Total Dibayar",
          "Sisa Dibayar",
          "Status Akhir",
        ],
      ],
      body: investmentTableData,
      theme: "striped",
      headStyles: { fillColor: [50, 77, 62], fontSize: 6 },
      margin: { left: 5, right: 5 },
      styles: { fontSize: 5, cellPadding: 1 },
      tableWidth: "auto",
      // Use smaller column widths to fit all 23 columns
      columnStyles: {
        0: { cellWidth: 5 }, // No.
        1: { cellWidth: 12 }, // No. Invoice
        2: { cellWidth: 12 }, // ID Transaksi
        3: { cellWidth: 10 }, // Tanggal Invoice
        4: { cellWidth: 8 }, // Status Invoice
        5: { cellWidth: 12 }, // Nama User
        6: { cellWidth: 15 }, // Email
        7: { cellWidth: 10 }, // No. HP
        8: { cellWidth: 12 }, // Nama Paket
        9: { cellWidth: 5 }, // Jumlah
        10: { cellWidth: 12 }, // Harga
        11: { cellWidth: 8 }, // Kode Referral
        12: { cellWidth: 10 }, // Tgl Transaksi
        13: { cellWidth: 10 }, // Tgl Bayar
        14: { cellWidth: 10 }, // Metode Pembayaran
        15: { cellWidth: 10 }, // Jatuh Tempo
        16: { cellWidth: 8 }, // Status Keterlambatan
        17: { cellWidth: 15 }, // Nomor Kontrak
        18: { cellWidth: 10 }, // Awal Kontrak
        19: { cellWidth: 10 }, // Akhir Kontrak
        20: { cellWidth: 12 }, // Total Dibayar
        21: { cellWidth: 12 }, // Sisa Dibayar
        22: { cellWidth: 8 }, // Status Akhir
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Halaman ${i} dari ${pageCount}`, 20, 285);
      doc.text("Rahasia - Hanya untuk Penggunaan Internal", 150, 285);
    }

    doc.save(
      `Laporan-Admin-Semua-Investor-${
        new Date().toISOString().split("T")[0]
      }.pdf`
    );
  };

  const downloadIndividualInvestorReport = async (groupedReport: any) => {
    // Fetch individual investor data from API
    const response = await fetch(
      `/api/admin/laporan?investorId=${groupedReport.investor._id}`
    );
    if (!response.ok) {
      console.error("Failed to fetch individual investor data");
      return;
    }

    const apiData = await response.json();
    if (!apiData.success) {
      console.error("API returned error:", apiData.error);
      return;
    }

    const reports = apiData.data.reports; // Array of payment reports
    const firstReport = reports[0]; // For investor info

    const doc = new jsPDF();
    const startY = await addPDFHeader(
      doc,
      `LAPORAN INVESTOR - ${firstReport.investor.name.toUpperCase()}`
    );

    // Ensure we have detailed plant data for accurate age calculations
    await fetchDetailedPlantAges(firstReport.investor._id);

    // (removed plant statistics calculations — not needed for per-investor export)

    // Calculate metrics for PDF (same logic as XLSX)
    const investorData = firstReport.investor;
    const allPayments = reports.map((r: any) => r.payment);
    const fullInvestments = allPayments.filter(
      (p: any) => p.paymentType === "full-investment"
    );
    const cicilanInvestments = allPayments.filter(
      (p: any) => p.paymentType === "cicilan-installment"
    );

    // Paket Aktif calculation
    const paketAktif =
      fullInvestments.filter((p: any) => p.transactionStatus === "settlement")
        .length +
      [
        ...new Set(
          cicilanInvestments
            .filter((p: any) => p.transactionStatus === "settlement")
            .map((p: any) => p.cicilanOrderId)
        ),
      ].length;

    // Paket Pending calculation
    const fullPending = fullInvestments.filter(
      (p: any) => p.transactionStatus === "pending"
    ).length;
    const cicilanGroups = [
      ...new Set(cicilanInvestments.map((p: any) => p.cicilanOrderId)),
    ];
    const cicilanPending = cicilanGroups.filter(
      (groupId) =>
        !cicilanInvestments.some(
          (p: any) =>
            p.cicilanOrderId === groupId && p.transactionStatus === "settlement"
        )
    ).length;
    const paketPending = fullPending + cicilanPending;

    // Calculate total transaction value
    const totalNilaiTransaksi = allPayments.reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0
    );

    // Calculate rata-rata umur from all payment reports
    const allTrees = reports.flatMap((r: any) => r.trees);
    const avgAge =
      allTrees.length > 0
        ? allTrees.reduce(
            (sum: number, tree: any) => sum + (tree.umur || 0),
            0
          ) / allTrees.length
        : 0;

    // Investor info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMASI INVESTOR", 20, startY);

    const investorInfo = [
      ["No. Anggota", (investorData as any).userCode || "BMS-..."],
      ["Nama", investorData.name],
      ["Email", investorData.email],
      ["No. Telepon", (investorData as any).phoneNumber || ""],
      ["Status", investorData.status === "active" ? "Aktif" : "Tidak Aktif"],
      [
        "Tanggal Registrasi",
        new Date(investorData.createdAt).toLocaleDateString("id-ID"),
      ],
    ];

    autoTable(doc, {
      startY: startY + 8,
      head: [["Bidang", "Nilai"]],
      body: investorInfo,
      theme: "striped",
      headStyles: { fillColor: [50, 77, 62] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 },
    });

    // Plant Summary section
    const afterInfo = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RINGKASAN TANAMAN", 20, afterInfo);

    const plantSummary = [
      ["Total Paket Dibeli", reports.length.toString()],
      [
        "Total Nilai Transaksi",
        `Rp ${totalNilaiTransaksi.toLocaleString("id-ID")}`,
      ],
      ["Total Paket Aktif", paketAktif.toString()],
      ["Total Paket Pending", paketPending.toString()],
      ["Jumlah Invoice", fullInvestments.length.toString()],
      ["Jumlah Cicilan", cicilanInvestments.length.toString()],
      ["Rata-rata Umur", `${Math.round(avgAge)} Bulan`],
    ];

    autoTable(doc, {
      startY: afterInfo + 8,
      head: [["", "Jumlah"]],
      body: plantSummary,
      theme: "striped",
      headStyles: { fillColor: [50, 77, 62] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 },
    });

    // Plant types
    const afterSummary = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RINCIAN JENIS TANAMAN", 20, afterSummary);

    // Aggregate plant types from all reports
    const aggregatedSpecies = reports.reduce(
      (acc: Record<string, number>, report: any) => {
        Object.entries(report.statistics.bySpecies).forEach(
          ([type, count]: [string, any]) => {
            acc[type] = (acc[type] || 0) + count;
          }
        );
        return acc;
      },
      {}
    );

    const plantTypes = Object.entries(aggregatedSpecies).map(
      ([type, count]) => [
        type.charAt(0).toUpperCase() + type.slice(1),
        (count as any).toString(),
      ]
    );

    autoTable(doc, {
      startY: afterSummary + 8,
      head: [["Jenis Tanaman", "Jumlah"]],
      body: plantTypes,
      theme: "striped",
      headStyles: { fillColor: [50, 77, 62] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10 },
    });

    // Individual plants table - one row per payment (not per tree)
    if (reports.length > 0) {
      const afterTypes = (doc as any).lastAutoTable.finalY + 15;

      // Check if we need a new page
      let tableStartY = 0;
      if (afterTypes > 220) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("INSTANSI TANAMAN INDIVIDUAL", 20, 30);
        tableStartY = 38;
      } else {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("INSTANSI TANAMAN INDIVIDUAL", 20, afterTypes);
        tableStartY = (afterTypes as number) + 8;
      }

      const plantsData = reports.map((report: any) => {
        // For individual reports, each payment should be one row (not each tree)
        // Use first tree for display data, but row represents the payment
        const tree = report.trees[0]; // Get first tree for display data
        // Use the same age calculation logic as the UI (from plant-ages API)
        let ageDisplay = "0 hari";

        // First check if we have detailed plant data (this should be fetched for exports)
        const detailedData = detailedPlantData[report.investor._id];
        if (detailedData) {
          const detailedTree = detailedData.find((dt) => dt._id === tree._id);
          if (detailedTree && detailedTree.detailedAge) {
            ageDisplay = formatDetailedAge(detailedTree.detailedAge);
          } else {
            // Use creation date for age calculation (like new plants showing "1 hari")
            const referenceDate = new Date(tree.createdAt);
            const now = new Date();
            let years = now.getFullYear() - referenceDate.getFullYear();
            let months = now.getMonth() - referenceDate.getMonth();
            let days = now.getDate() - referenceDate.getDate();

            if (days < 0) {
              months--;
              const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
              days += lastMonth.getDate();
            }
            if (months < 0) {
              years--;
              months += 12;
            }

            const parts = [];
            if (years > 0) parts.push(`${years} tahun`);
            if (months > 0) parts.push(`${months} bulan`);
            if (days > 0 && years === 0 && months === 0)
              parts.push(`${days} hari`);

            ageDisplay = parts.length > 0 ? parts.join(", ") : "0 hari";
          }
        } else if (tree) {
          // Fallback: calculate age using the same logic as plant-ages API
          const history = (tree as any).history || [];

          // Find the first non-pending/non-new contract action for planting date
          const firstPlantingAction = history.find((h: any) => {
            const action = (h.action || h.type || "").toLowerCase();
            return action !== "pending contract" && action !== "kontrak baru";
          });

          let referenceDate;
          if (firstPlantingAction) {
            const tanggalTanam =
              firstPlantingAction.addedAt || firstPlantingAction.date;
            if (tanggalTanam) {
              try {
                // Parse DD/MM/YYYY format
                const [day, month, year] = tanggalTanam.split("/");
                referenceDate = new Date(
                  parseInt(year),
                  parseInt(month) - 1,
                  parseInt(day)
                );
              } catch {
                referenceDate = new Date(tree.createdAt);
              }
            } else {
              referenceDate = new Date(tree.createdAt);
            }
          } else {
            // No planting action found, use createdAt (most recent date for new plants)
            referenceDate = new Date(tree.createdAt);
          }

          // Calculate detailed age like the plant-ages API
          const now = new Date();
          let years = now.getFullYear() - referenceDate.getFullYear();
          let months = now.getMonth() - referenceDate.getMonth();
          let days = now.getDate() - referenceDate.getDate();

          // Adjust for negative days
          if (days < 0) {
            months--;
            const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += lastMonth.getDate();
          }

          // Adjust for negative months
          if (months < 0) {
            years--;
            months += 12;
          }

          // Format like the UI
          const parts = [];
          if (years > 0) parts.push(`${years} tahun`);
          if (months > 0) parts.push(`${months} bulan`);
          if (days > 0 && years === 0 && months === 0)
            parts.push(`${days} hari`);

          ageDisplay = parts.length > 0 ? parts.join(", ") : "0 hari";
        }

        // Get contract and payment data from grouped report
        const contract = report.contract;
        const payment =
          report.payments && report.payments.length > 0
            ? report.payments[0]
            : report.payment;

        // Contract number: prefer contract.contractNumber, fallback to payment.orderId
        const contractNumber =
          contract?.contractNumber ||
          contract?.contractId ||
          payment?.orderId ||
          tree.nomorKontrak ||
          "-";

        // Contract dates
        let contractStart = null;
        let contractEnd = null;

        if (contract?.contractDate) {
          try {
            contractStart = new Date(contract.contractDate);
            contractEnd = new Date(
              contractStart.getFullYear() + 10,
              contractStart.getMonth(),
              contractStart.getDate()
            );
          } catch (error) {
            console.warn(
              "Invalid contract date:",
              contract.contractDate,
              "error",
              error
            );
          }
        }

        // Fallback to payment dates if no contract data
        if (!contractStart && payment?.createdAt) {
          try {
            contractStart = new Date(payment.createdAt);
            contractEnd = new Date(
              contractStart.getFullYear() + 10,
              contractStart.getMonth(),
              contractStart.getDate()
            );
          } catch (error) {
            console.warn(
              "Invalid payment date:",
              payment.createdAt,
              "error",
              error
            );
          }
        }

        // Final fallback to tree creation date
        if (!contractStart) {
          contractStart = new Date(tree.createdAt);
          contractEnd = new Date(
            contractStart.getFullYear() + 10,
            contractStart.getMonth(),
            contractStart.getDate()
          );
        }

        // Jenis Paket: use payment.productName (like in all investors export)
        const jenispaket =
          payment?.productName ||
          contract?.productName ||
          tree?.spesiesPohon ||
          "Tidak Ada Paket";

        // Get blok and kavling from tree data (now included in API response)
        const blok = tree?.blok || "";
        const kavling = tree?.kavling || "";

        // Fix planted date - handle invalid dates properly
        let plantedDate = "";
        try {
          if (
            tree &&
            tree.tanggalTanam &&
            tree.tanggalTanam !== "Invalid Date"
          ) {
            // If tanggalTanam is a valid date string
            if (
              typeof tree.tanggalTanam === "string" &&
              tree.tanggalTanam.includes("/")
            ) {
              plantedDate = tree.tanggalTanam; // Already formatted
            } else {
              plantedDate = new Date(tree.tanggalTanam).toLocaleDateString(
                "id-ID"
              );
            }
          } else if (tree) {
            // Use creation date as fallback
            plantedDate = new Date(tree.createdAt).toLocaleDateString("id-ID");
          }
        } catch (error) {
          console.warn("Invalid planted date:", tree?.tanggalTanam, error);
          // Final fallback
          if (tree) {
            plantedDate = new Date(tree.createdAt).toLocaleDateString("id-ID");
          } else {
            plantedDate = "-";
          }
        }

        // If no tree at all, set default values
        if (!tree) {
          plantedDate = "-";
        }

        return [
          contractNumber,
          contractStart.toLocaleDateString("id-ID"),
          contractEnd?.toLocaleDateString("id-ID"),
          jenispaket, // Use contract product name instead of tree species
          tree?.lokasi || "Lokasi tidak tersedia",
          blok,
          kavling,
          ageDisplay,
          plantedDate,
          tree?.kondisi || "Belum Ada Pohon",
        ];
      });

      autoTable(doc, {
        startY: tableStartY,
        head: [
          [
            "Nomor Kontrak Aktif",
            "Awal Kontrak",
            "Akhir Kontrak",
            "Jenis Paket",
            "Lokasi",
            "Blok",
            "Kavling",
            "Umur",
            "Ditanam",
            "Status",
          ],
        ],
        body: plantsData,
        theme: "striped",
        headStyles: { fillColor: [50, 77, 62] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 6 }, // Smaller font for more columns
        tableWidth: "auto",
        columnStyles: {
          0: { cellWidth: 25 }, // Nomor Kontrak Aktif
          1: { cellWidth: 15 }, // Awal Kontrak
          2: { cellWidth: 15 }, // Akhir Kontrak
          3: { cellWidth: 18 }, // Jenis Paket
          4: { cellWidth: 20 }, // Lokasi
          5: { cellWidth: 8 }, // Blok
          6: { cellWidth: 8 }, // Kavling
          7: { cellWidth: 15 }, // Umur
          8: { cellWidth: 15 }, // Ditanam
          9: { cellWidth: 15 }, // Status
        },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Halaman ${i} dari ${pageCount}`, 20, 285);
      doc.text("Rahasia - Hanya untuk Penggunaan Internal", 150, 285);
    }

    doc.save(
      `Laporan-Investor-${firstReport.investor.name.replace(/\s+/g, "-")}-${
        new Date().toISOString().split("T")[0]
      }.pdf`
    );
  };

  // Fetch report data with pagination and search
  const fetchReportData = async (page = 1, search = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/laporan?${params}`);

      if (response.ok) {
        const result = await response.json();
        setReportData(result.data);
        setCurrentPage(page);
      } else {
        console.error("Failed to fetch report data");
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed plant ages for specific investor
  const fetchDetailedPlantAges = async (investorId: string) => {
    if (detailedPlantData[investorId]) {
      // Data already loaded
      return;
    }

    try {
      setLoadingPlantAges((prev) => ({ ...prev, [investorId]: true }));
      const response = await fetch(
        `/api/admin/laporan/${investorId}/plant-ages`
      );

      if (response.ok) {
        const result = await response.json();
        setDetailedPlantData((prev) => ({
          ...prev,
          [investorId]: result.data,
        }));
      } else {
        console.error("Failed to fetch detailed plant ages");
      }
    } catch (error) {
      console.error("Error fetching detailed plant ages:", error);
    } finally {
      setLoadingPlantAges((prev) => ({ ...prev, [investorId]: false }));
    }
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data on mount
  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch data when debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return; // Only trigger when debounce is complete
    fetchReportData(1, debouncedSearchTerm); // Reset to page 1 on search
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const getKondisiBadge = (kondisi: string) => {
    switch (kondisi.toLowerCase()) {
      case "tanam bibit":
      case "tumbuh sehat":
      case "sehat":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300";
      case "perlu perawatan":
      case "perlu_perawatan":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300";
      case "bermasalah":
      case "sakit":
      case "mati":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300";
      case "pemupukan":
      case "penyiraman":
      case "pemangkasan":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300";
      case "panen":
        return "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300";
      default:
        return "bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300";
    }
  };

  const getKondisiText = (kondisi: string) => {
    return kondisi;
  };

  const toggleExpanded = (investorId: string) => {
    const isExpanding = expandedInvestor !== investorId;
    setExpandedInvestor(isExpanding ? investorId : null);

    // Fetch detailed plant ages when expanding
    if (isExpanding) {
      fetchDetailedPlantAges(investorId);
    }
  };

  // Reports are already filtered and paginated by the server
  const reports = reportData?.reports || [];

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              Laporan Investasi
            </h1>
            <p className="text-gray-600 dark:text-gray-200 mt-2 transition-colors duration-300">
              Memuat laporan...
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse transition-colors duration-300"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!reportData) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              Laporan Investasi
            </h1>
            <p className="text-gray-600 dark:text-gray-200 mt-2 transition-colors duration-300">
              Gagal memuat data laporan
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Determine which layout to use based on user role
  const isKetua = session?.user?.role === "ketua";
  const Layout = isKetua ? KetuaLayout : AdminLayout;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h1
              className={getThemeClasses(
                "text-2xl sm:text-3xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] truncate transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              Laporan Admin
            </h1>
            <p className="text-[#889063] dark:text-gray-200 mt-1 sm:mt-2 text-sm sm:text-base transition-colors duration-300">
              Ringkasan manajemen investor dan pelacakan instansi tanaman
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => fetchReportData(currentPage, debouncedSearchTerm)}
              disabled={loading}
              className="bg-[#324D3E]/10 dark:bg-[#324D3E]/20 hover:bg-[#324D3E]/20 dark:hover:bg-[#324D3E]/30 text-[#324D3E] dark:text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {loading ? "Memuat..." : "Refresh"}
              </span>
            </button>
            <button
              onClick={downloadAllInvestorsReport}
              className={getThemeClasses(
                "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap hover:shadow-lg",
                "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
              )}
            >
              <Download className="w-4 h-4" />
              <span className="sm:hidden">Unduh</span>
              <span className="hidden sm:inline">Unduh Semua PDF</span>
            </button>
            <button
              onClick={downloadAllInvestorsXLSX}
              className={getThemeClasses(
                "bg-gradient-to-r from-green-600 to-green-800 dark:from-green-700 dark:to-green-900 text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap hover:shadow-lg hover:from-green-700 hover:to-green-900 dark:hover:from-green-800 dark:hover:to-green-950",
                "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
              )}
            >
              <FileText className="w-4 h-4" />
              <span className="sm:hidden">XLSX</span>
              <span className="hidden sm:inline">Unduh Semua XLSX</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            <div>
              <p className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#889063] dark:text-gray-200" />
                <span>Total Investor</span>
              </p>
              <p className="text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
                {reportData.summary.totalInvestors}
              </p>
            </div>
          </div>

          <div
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            <div>
              <p className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300 flex items-center gap-2">
                <TreeIcon className="w-4 h-4 text-[#889063] dark:text-gray-200" />
                <span>Total Instansi Tanaman</span>
              </p>
              <p className="text-2xl font-bold text-[#4C3D19] dark:text-emerald-300 transition-colors duration-300">
                {reportData.summary.totalTrees}
              </p>
            </div>
          </div>

          <div
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            <div>
              <p className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300 flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Investor Tidak Aktif</span>
              </p>
              <p className="text-2xl font-bold text-[#889063] dark:text-gray-200 transition-colors duration-300">
                {reportData.summary.inactiveInvestors || 0}
              </p>
            </div>
          </div>

          <div
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            <div>
              <p className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Investor Aktif</span>
              </p>
              <p className="text-2xl font-bold text-[#4C3D19] dark:text-emerald-300 transition-colors duration-300">
                {reportData.summary.activeInvestors}
              </p>
            </div>
          </div>
        </div>

        {/* Search and Pagination Info */}
        <div
          className={getThemeClasses(
            "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 lg:p-6 transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Cari investor berdasarkan nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={getThemeClasses(
                  "w-full px-4 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white placeholder-[#889063] dark:placeholder-gray-300 bg-white dark:bg-gray-700 transition-all duration-300",
                  "!bg-white/95 !border-[#FFC1CC]/30 !text-[#4c1d1d]"
                )}
              />
            </div>
            {reportData?.pagination && reportData.pagination.totalItems > 0 && (
              <div className="text-sm text-[#889063] dark:text-gray-200 whitespace-nowrap">
                Menampilkan {reportData.pagination.startIndex}-
                {reportData.pagination.endIndex} dari{" "}
                {reportData.pagination.totalItems} investor
                {searchTerm && ` (hasil pencarian untuk "${searchTerm}")`}
              </div>
            )}
          </div>
        </div>

        {/* Investor Reports */}
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div
              className={getThemeClasses(
                "bg-white/80 dark:bg_gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-8 text-center text-[#889063] dark:text-gray-200 transition-colors duration-300",
                "!bg-white/95 !border-[#FFC1CC]/30 !text-[#4c1d1d]"
              )}
            >
              {searchTerm
                ? "Tidak ada investor yang sesuai dengan pencarian"
                : "Belum ada data investor"}
            </div>
          ) : (
            // Group payment reports by investor for display
            Object.values(
              (reports as any[]).reduce(
                (groupedReports: Record<string, any>, report: any) => {
                  const investorId = report?.investor?._id || "unknown";

                  // normalize/parse incoming statistics
                  const incoming = report?.statistics || {
                    total: 0,
                    byCondition: {},
                    bySpecies: {},
                  };
                  const parseStats = (s: any) => {
                    const total = Number(s?.total) || 0;
                    const byCondition: Record<string, number> = {};
                    const bySpecies: Record<string, number> = {};

                    if (s?.byCondition && typeof s.byCondition === "object") {
                      Object.entries(s.byCondition).forEach(([k, v]) => {
                        const key = String(k || "")
                          .trim()
                          .toLowerCase();
                        byCondition[key] =
                          (byCondition[key] || 0) + (Number(v) || 0);
                      });
                    }

                    if (s?.bySpecies && typeof s.bySpecies === "object") {
                      Object.entries(s.bySpecies).forEach(([k, v]) => {
                        const key = String(k || "").trim();
                        bySpecies[key] =
                          (bySpecies[key] || 0) + (Number(v) || 0);
                      });
                    }

                    return { total, byCondition, bySpecies };
                  };

                  const incomingStats = parseStats(incoming);

                  if (!groupedReports[investorId]) {
                    groupedReports[investorId] = {
                      investor: report.investor,
                      payments: report.payment ? [report.payment] : [],
                      trees: Array.isArray(report.trees)
                        ? report.trees.slice()
                        : [],
                      statistics: incomingStats,
                      contract: report.contract, // Add contract data to grouped report
                    };
                  } else {
                    groupedReports[investorId].payments.push(report.payment);

                    // Keep contract data if not already set
                    if (
                      !groupedReports[investorId].contract &&
                      report.contract
                    ) {
                      groupedReports[investorId].contract = report.contract;
                    }

                    if (Array.isArray(report.trees)) {
                      const existingTreeIds = new Set(
                        groupedReports[investorId].trees.map((t: any) =>
                          String(t._id || "")
                        )
                      );
                      const newTrees = report.trees.filter(
                        (tree: any) =>
                          !existingTreeIds.has(String(tree._id || ""))
                      );
                      groupedReports[investorId].trees.push(...newTrees);
                    }

                    // merge statistics
                    const target = groupedReports[investorId].statistics || {
                      total: 0,
                      byCondition: {},
                      bySpecies: {},
                    };
                    target.total =
                      (Number(target.total) || 0) +
                      (Number(incomingStats.total) || 0);

                    Object.entries(incomingStats.byCondition).forEach(
                      ([k, v]) => {
                        const key = String(k || "")
                          .trim()
                          .toLowerCase();
                        target.byCondition[key] =
                          (target.byCondition[key] || 0) + (Number(v) || 0);
                      }
                    );

                    Object.entries(incomingStats.bySpecies).forEach(
                      ([k, v]) => {
                        const key = String(k || "").trim();
                        target.bySpecies[key] =
                          (target.bySpecies[key] || 0) + (Number(v) || 0);
                      }
                    );

                    groupedReports[investorId].statistics = target;
                  }

                  return groupedReports;
                },
                {} as Record<string, any>
              )
            ).map((groupedReport) => (
              <div
                key={`${groupedReport.investor._id}-${groupedReport.investor.name}`}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden transition-colors duration-300"
              >
                {/* Investor Header */}
                <div
                  className={getThemeClasses(
                    "p-4 lg:p-6 border-b border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300",
                    "!border-[#FFC1CC]/30"
                  )}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={getThemeClasses(
                          "w-12 h-12 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center",
                          "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9]"
                        )}
                      >
                        <span className="text-white font-bold text-lg">
                          {groupedReport.investor.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3
                          className={getThemeClasses(
                            "text-lg lg:text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          {groupedReport.investor.name}
                        </h3>
                        <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                          {groupedReport.investor.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          groupedReport.investor.status === "active"
                            ? "bg-[#4C3D19]/10 dark:bg-[#4C3D19]/20 text-[#4C3D19] dark:text-emerald-300 border border-[#4C3D19]/20 dark:border-emerald-600/50"
                            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                        }`}
                      >
                        {groupedReport.investor.status === "active"
                          ? "Aktif"
                          : "Tidak Aktif"}
                      </span>
                      <button
                        onClick={() =>
                          downloadIndividualInvestorReport(groupedReport)
                        }
                        className={getThemeClasses(
                          "bg-[#324D3E]/10 dark:bg-[#324D3E]/20 hover:bg-[#324D3E]/20 dark:hover:bg-[#324D3E]/30 text-[#324D3E] dark:text-white px-3 py-1 rounded-xl text-sm font-medium transition-colors hover:shadow-sm",
                          "!bg-white/95 !border-[#FFC1CC]/30 !text-[#4c1d1d]"
                        )}
                      >
                        <Download className="w-4 h-4 inline-block mr-2" />
                        Unduh PDF
                      </button>
                      <button
                        onClick={() =>
                          downloadIndividualInvestorXLSX(groupedReport)
                        }
                        className={getThemeClasses(
                          "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-3 py-1 rounded-xl text-sm font-medium transition-colors hover:shadow-sm",
                          "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
                        )}
                      >
                        <FileText className="w-4 h-4 inline-block mr-2" />
                        XLSX
                      </button>
                    </div>
                  </div>
                </div>

                {/* Administrative Summary */}
                <div
                  className={getThemeClasses(
                    "p-4 lg:p-6 bg-gradient-to-r from-[#324D3E]/5 to-[#4C3D19]/5 dark:from-gray-700/50 dark:to-gray-600/50 border-b border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300",
                    "!bg-gradient-to-r !from-[#FFC1CC]/10 !to-[#FFDEE9]/10"
                  )}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
                        {groupedReport.investor.jumlahPohon ||
                          (groupedReport.trees?.length ?? 0)}
                      </p>
                      <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                        Tanaman Terdaftar
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#4C3D19] dark:text-emerald-300 transition-colors duration-300">
                        {groupedReport.statistics?.total ||
                          (groupedReport.trees?.length ?? 0)}
                      </p>
                      <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                        Instansi Tanaman
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#889063] dark:text-gray-300 transition-colors duration-300">
                        {(groupedReport.trees || []).reduce(
                          (total: number, tree: any) => {
                            const statusVal = String(tree.status || "")
                              .trim()
                              .toLowerCase();
                            const unhealthy = ["sakit", "mati"];
                            return unhealthy.includes(statusVal)
                              ? total
                              : total + 1;
                          },
                          0
                        )}
                      </p>
                      <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                        Tanaman Sehat
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tree Details Toggle */}
                <div className="p-4 lg:p-6">
                  <button
                    onClick={() => toggleExpanded(groupedReport.investor._id)}
                    className={getThemeClasses(
                      "flex items-center justify-between w-full text-left hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 p-2 rounded-xl transition-colors",
                      "!hover:bg-[#FFD7E0]/30"
                    )}
                  >
                    <span className="text-lg font-medium text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
                      Detail Instansi Tanaman ({groupedReport.statistics.total})
                    </span>
                    <ChevronDown
                      className={`transform transition-transform duration-200 text-[#324D3E] dark:text-white ${
                        expandedInvestor === groupedReport.investor._id
                          ? "rotate-180"
                          : ""
                      } w-5 h-5`}
                    />
                  </button>

                  {/* Expanded Tree Details */}
                  {expandedInvestor === groupedReport.investor._id && (
                    <div className="mt-4 space-y-4">
                      {groupedReport.trees.length === 0 ? (
                        <p className="text-center py-4 text-gray-500 dark:text-gray-200 transition-colors duration-300">
                          Tidak ada instansi tanaman yang ditugaskan untuk
                          investor ini
                        </p>
                      ) : (
                        <>
                          {/* Plant Type Summary */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            {Object.entries(
                              groupedReport.statistics.bySpecies
                            ).map(([plantType, count]) => (
                              <div
                                key={plantType}
                                className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 dark:from-gray-700/50 dark:to-gray-600/50 p-3 rounded-xl border border-[#324D3E]/20 dark:border-gray-600/50 transition-colors duration-300"
                              >
                                <p className="font-medium text-[#324D3E] dark:text-white capitalize transition-colors duration-300">
                                  {plantType}
                                </p>
                                <p className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
                                  {String(count)} instansi
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Plant Instance List */}
                          <div className="overflow-x-auto">
                            {loadingPlantAges[groupedReport.investor._id] ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#324D3E]"></div>
                                <span className="ml-2 text-[#889063]">
                                  Memuat data umur tanaman...
                                </span>
                              </div>
                            ) : (
                              <table className="w-full text-sm">
                                <thead className="bg-[#324D3E]/5 dark:bg-gray-700/50 transition-colors duration-300">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                      Nomor Kontrak
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                      Nama Instansi
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white hidden sm:table-cell transition-colors duration-300">
                                      Lokasi
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                      Umur Detail
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white hidden lg:table-cell transition-colors duration-300">
                                      Jenis
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white hidden sm:table-cell transition-colors duration-300">
                                      Tanggal Tanam
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#324D3E]/10 dark:divide-gray-600 transition-colors duration-300">
                                  {(
                                    detailedPlantData[
                                      groupedReport.investor._id
                                    ] || groupedReport.trees
                                  ).map((tree) => {
                                    const isDetailed =
                                      detailedPlantData[
                                        groupedReport.investor._id
                                      ];
                                    return (
                                      <tr
                                        key={tree._id}
                                        className="hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 transition-colors"
                                      >
                                        <td className="px-3 py-2">
                                          <p className="font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                            {tree.nomorKontrak}
                                          </p>
                                        </td>
                                        <td className="px-3 py-2">
                                          <div>
                                            <p className="font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                                              {tree.spesiesPohon}
                                            </p>
                                            <p className="text-xs text-[#889063] dark:text-gray-200 sm:hidden transition-colors duration-300">
                                              {tree.lokasi}
                                            </p>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-[#889063] dark:text-gray-200 hidden sm:table-cell transition-colors duration-300">
                                          {tree.lokasi}
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="text-[#324D3E] dark:text-white transition-colors duration-300">
                                            {isDetailed && tree.detailedAge ? (
                                              tree.ageSource ===
                                              "tanamBibit" ? (
                                                <div>
                                                  <div className="font-medium">
                                                    {formatDetailedAge(
                                                      tree.detailedAge
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-[#889063] dark:text-gray-300">
                                                    ({formatNumber(tree.umur)}{" "}
                                                    bulan)
                                                  </div>
                                                </div>
                                              ) : (
                                                <div>
                                                  <div className="font-medium text-orange-600 dark:text-orange-400">
                                                    Belum Ditanam
                                                  </div>
                                                </div>
                                              )
                                            ) : (
                                              <span>
                                                {formatNumber(tree.umur)} bulan
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-[#889063] dark:text-gray-200 hidden lg:table-cell capitalize transition-colors duration-300">
                                          {tree.spesiesPohon.split(" ")[0] ||
                                            "Tidak Diketahui"}
                                        </td>
                                        <td className="px-3 py-2 text-[#889063] dark:text-gray-200 hidden sm:table-cell transition-colors duration-300">
                                          {isDetailed ? (
                                            tree.ageSource === "tanamBibit" ? (
                                              <div>
                                                <div>{tree.tanggalTanam}</div>
                                              </div>
                                            ) : (
                                              <div>
                                                <div className="text-orange-600 dark:text-orange-400">
                                                  Belum Ditanam
                                                </div>
                                                <div className="text-xs text-[#889063] dark:text-gray-300">
                                                  Dibuat: {tree.referenceDate}
                                                </div>
                                              </div>
                                            )
                                          ) : (
                                            new Date(
                                              tree.tanggalTanam
                                            ).toLocaleDateString("id-ID")
                                          )}
                                        </td>
                                        <td className="px-3 py-2">
                                          <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKondisiBadge(
                                              tree.status
                                            )}`}
                                          >
                                            {getKondisiText(tree.status)}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {reportData?.pagination && reportData.pagination.totalPages > 1 && (
          <div
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 lg:p-6 transition-colors duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-[#889063] dark:text-gray-200">
                Halaman {reportData.pagination.currentPage} dari{" "}
                {reportData.pagination.totalPages}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchReportData(1, debouncedSearchTerm)}
                  disabled={!reportData.pagination.hasPrevPage}
                  className="px-3 py-2 text-sm font-medium text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ««
                </button>

                <button
                  onClick={() =>
                    fetchReportData(currentPage - 1, debouncedSearchTerm)
                  }
                  disabled={!reportData.pagination.hasPrevPage}
                  className="px-3 py-2 text-sm font-medium text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ‹
                </button>

                {/* Page Numbers */}
                {Array.from(
                  { length: Math.min(5, reportData.pagination.totalPages) },
                  (_, i) => {
                    const totalPages = reportData.pagination.totalPages;
                    const currentPage = reportData.pagination.currentPage;
                    let pageNum;

                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    const isActive = pageNum === currentPage;

                    return (
                      <button
                        key={pageNum}
                        onClick={() =>
                          fetchReportData(pageNum, debouncedSearchTerm)
                        }
                        className={`px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white"
                            : "text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}

                <button
                  onClick={() =>
                    fetchReportData(currentPage + 1, debouncedSearchTerm)
                  }
                  disabled={!reportData.pagination.hasNextPage}
                  className="px-3 py-2 text-sm font-medium text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ›
                </button>

                <button
                  onClick={() =>
                    fetchReportData(
                      reportData.pagination.totalPages,
                      debouncedSearchTerm
                    )
                  }
                  disabled={!reportData.pagination.hasNextPage}
                  className="px-3 py-2 text-sm font-medium text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  »»
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
