"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { motion } from "framer-motion";
import { Heart, Monitor, Moon, Settings, Sun, FileSpreadsheet, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui-finance/button";

/* ================= XLSX dynamic import ================= */
let XLSXMod: any;
async function getXLSX() {
  if (XLSXMod) return XLSXMod;
  XLSXMod = await import("xlsx-js-style");
  return XLSXMod as any;
}

/* ================= API endpoints ================= */
const ENDPOINTS = {
  financeSummary: "/api/finance/summary",
  financeExtra: "/api/finance/extra",
  plants: "/api/plants",
  invoiceExport: "/api/admin/invoice/export", // returns .xlsx (keep template)
  dailyIncoming: "/api/daily-incoming-investor?year=2025",
} as const;

/* ================= styles ================= */
const BORDER = {
  top: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } },
};
const STYLE = {
  blueBar: {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4F81BD" } },
    border: BORDER,
    alignment: { horizontal: "center", vertical: "center" },
  },
  headGreen: {
    font: { bold: true, color: { rgb: "0B2239" } },
    fill: { fgColor: { rgb: "A9D08E" } },
    border: BORDER,
    alignment: { horizontal: "center", vertical: "center" },
  },
  thLightGreen: {
    font: { bold: true, color: { rgb: "0B2239" } },
    fill: { fgColor: { rgb: "C6EFCE" } },
    border: BORDER,
    alignment: { horizontal: "left", vertical: "center" },
  },
  cell: { border: BORDER, alignment: { vertical: "top" } },
  cellRight: { border: BORDER, alignment: { horizontal: "right", vertical: "top" } },
  cellRp: { border: BORDER, alignment: { horizontal: "right", vertical: "top" }, numFmt: '"Rp" #,##0' },
  title: { font: { bold: true, sz: 16, color: { rgb: "1F2D22" } } },
  subBold: { font: { bold: true } },
};

/* ================= helpers ================= */
const toNum = (v: any) => {
  if (v == null) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? n : 0;
};
const fmtDate = (x: any) => {
  if (!x) return "";
  const d = new Date(x);
  return isNaN(+d) ? String(x) : d.toLocaleDateString("id-ID");
};

function A1(c: number, r: number) {
  let n = c + 1, s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return `${s}${r + 1}`;
}
function setCell(ws: any, c: number, r: number, v: any, s?: any) {
  ws[A1(c, r)] = { v, t: typeof v === "number" ? "n" : "s", s };
}
function merge(ws: any, s: string, e: string) {
  ws["!merges"] = ws["!merges"] || [];
  const to = (a1: string) => {
    const m = a1.match(/^([A-Z]+)(\d+)$/)!;
    const col = m[1].split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
    const row = parseInt(m[2], 10) - 1;
    return { c: col, r: row };
  };
  ws["!merges"].push({ s: to(s), e: to(e) });
}
function endRef(ws: any, maxC: number, maxR: number) { ws["!ref"] = `A1:${A1(maxC, maxR)}`; }
function autoCols(ws: any, widths: number[]) { ws["!cols"] = widths.map((w) => ({ wch: w })); }

/* ======= builders to mirror each page’s template ======= */

// ---- /finance (Ringkasan) — follow your handleDownloadSummary layout (start at col C)
function buildSheetRingkasan(XLSX: any, summary: any, extra: any) {
  // derive rows like your /finance sheet
  const totals = {
    invest: toNum(summary?.totals?.investment ?? summary?.totalInvestment),
    profit: toNum(summary?.totals?.profit ?? summary?.totalProfit),
    investors: toNum(summary?.totals?.members ?? summary?.members ?? summary?.investorsCount),
  };

  const perTypeRows: any[] = (summary?.topPlantTypes || []).map((t: any) => ({
    name: String(t.plantTypeName ?? t.type ?? "—"),
    totalInvestment: toNum(t.totalInvestment),
    totalIncome: toNum(t.totalIncome ?? t.paidProfit),
    totalExpenses: 0,
  }));

  // enrich from /finance/extra
  const mapEx = new Map<string, any>();
  (extra?.totalsByType || []).forEach((x: any) =>
    mapEx.set(String(x.name || "").toLowerCase(), {
      totalIncome: toNum(x.totalIncome),
      totalExpenses: toNum(x.totalExpenses),
    })
  );
  perTypeRows.forEach((p) => {
    const ex = mapEx.get(p.name.toLowerCase());
    if (ex) Object.assign(p, ex);
  });

  const totalExpensesAll = perTypeRows.reduce((s, r) => s + (r.totalExpenses || 0), 0);

  const S: (string | number)[][] = [
    ["", "", "RINGKASAN INVESTASI KESELURUHAN", ""],
    ["", "", "Tanggal Laporan:", new Date().toLocaleDateString("id-ID")],
    ["", "", "", ""],
    ["", "", "METRIK UTAMA", ""],
    ["", "", "Total Investasi", totals.invest],
    ["", "", "Total Keuntungan", totals.profit],
    ["", "", "Total Pengeluaran", totalExpensesAll],
    ["", "", "", ""],
    ["", "", "Jumlah Anggota", totals.investors],
    ["", "", "Jumlah Kontrak", toNum(summary?.contractsCount)],
    ["", "", "", ""],
    ["", "", "No", "Jenis Tanaman", "Total Investasi", "Total Pemasukan", "Total Pengeluaran"],
  ];

  let no = 1;
  for (const r of perTypeRows) {
    S.push(["", "", String(no++), r.name, r.totalInvestment, r.totalIncome, r.totalExpenses] as any);
  }

  const ws = (XLSX as any).utils.aoa_to_sheet(S);

  // column widths C..G (A,B narrow like your file)
  ws["!cols"] = [{ width: 2 }, { width: 2 }, { width: 22 }, { width: 28 }, { width: 20 }, { width: 20 }, { width: 20 }];

  // bold rows (title, METRIK UTAMA, header table) -> rows 1, 4, 12 (0-based)
  const boldRows = [0, 3, 11];
  const currencyFmt = '"Rp" #,##0';
  const border = { top: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } };

  function applyBorder(r1: number, c1: number, r2: number, c2: number) {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const addr = (XLSX as any).utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = { ...(cell.s || {}), border };
      }
    }
  }

  for (const r of boldRows) {
    for (let c = 2; c <= 6; c++) {
      const addr = (XLSX as any).utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell) cell.s = { ...(cell.s || {}), font: { bold: true } };
    }
  }

  // top block border (C1..D10)
  applyBorder(0, 2, 10, 3);

  // table border (C12..G[last])
  const startDataRow = 12;
  const lastRow = 11 + perTypeRows.length + 1;
  applyBorder(11, 2, lastRow, 6);

  // currency formats
  for (let r = 4; r <= 6; r++) {
    const addr = (XLSX as any).utils.encode_cell({ r, c: 3 });
    const cell = ws[addr];
    if (cell) (cell as any).z = currencyFmt;
  }
  for (let r = startDataRow; r <= lastRow; r++) {
    for (const c of [4, 5, 6]) {
      const addr = (XLSX as any).utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell) (cell as any).z = currencyFmt;
    }
  }
  return ws;
}

// ---- /laporan-pengeluaran template (Ringkasan, Bulanan, Detail)
function buildSheetPengeluaran(plants: any[]) {
  const ws: any = {};
  let r = 0;

  // Title like your HTML export title
  setCell(ws, 0, r, "Laporan Pengeluaran - Semua Tanaman", STYLE.title); r++;
  setCell(ws, 0, r, "Periode:", STYLE.subBold); setCell(ws, 1, r, "Semua (server time)", STYLE.cell); r += 2;

  // Aggregate
  const allCosts: any[] = [];
  const allIncome: any[] = [];
  plants.forEach((p: any) => {
    (p.operationalCosts || []).forEach((e: any) => allCosts.push(e));
    (p.incomeRecords || []).forEach((i: any) => allIncome.push(i));
  });
  const totalExpenses = allCosts.reduce((s, x) => s + toNum(x.amount), 0);
  const totalIncome = allIncome.reduce((s, x) => s + toNum(x.amount), 0);
  const totalTransactions = (allCosts?.length || 0) + (allIncome?.length || 0);
  const average = totalTransactions > 0 ? (totalExpenses + totalIncome) / totalTransactions : 0;

  // RINGKASAN
  setCell(ws, 0, r, "RINGKASAN NOMINAL", STYLE.thLightGreen); merge(ws, A1(0, r), A1(1, r)); r++;
  [["Total Pendapatan", totalIncome], ["Total Pengeluaran", totalExpenses], ["Jumlah Transaksi", totalTransactions], ["Rata-rata per Transaksi", average]].forEach(([k, v]) => {
    setCell(ws, 0, r, k as string, STYLE.cell);
    setCell(ws, 1, r, /jumlah transaksi/i.test(String(k)) ? Number(v) : toNum(v), /jumlah transaksi/i.test(String(k)) ? STYLE.cellRight : STYLE.cellRp);
    r++;
  });
  r += 2;

  // BULANAN
  setCell(ws, 0, r, "PENGELUARAN / PENDAPATAN BULANAN", STYLE.thLightGreen); merge(ws, A1(0, r), A1(3, r)); r++;
  ["Bulan", "Total Nominal", "Jumlah Transaksi", "Rata-rata per Transaksi"].forEach((h, i) => setCell(ws, i, r, h, STYLE.headGreen)); r++;

  const monthAgg: Record<string, { t: number; c: number }> = {};
  const all = [...allCosts.map((x) => ({ ...x })), ...allIncome.map((x) => ({ ...x }))];
  all.forEach((it) => {
    const d = new Date(it.date);
    if (isNaN(+d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthAgg[key] = monthAgg[key] || { t: 0, c: 0 };
    monthAgg[key].t += toNum(it.amount);
    monthAgg[key].c += 1;
  });
  Object.keys(monthAgg).sort().forEach((key) => {
    const m = monthAgg[key];
    setCell(ws, 0, r, key, STYLE.cell);
    setCell(ws, 1, r, m.t, STYLE.cellRp);
    setCell(ws, 2, r, m.c, STYLE.cellRight);
    setCell(ws, 3, r, m.c ? m.t / m.c : 0, STYLE.cellRp);
    r++;
  });
  r += 2;

  // DETAIL
  setCell(ws, 0, r, "DETAIL TRANSAKSI NOMINAL", STYLE.thLightGreen); merge(ws, A1(0, r), A1(3, r)); r++;
  ["Tanggal", "Deskripsi", "Jumlah", "Input Oleh"].forEach((h, i) => setCell(ws, i, r, h, STYLE.headGreen)); r++;

  const detail = all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => ({ tanggal: fmtDate(d.date), deskripsi: d.description || "", jumlah: toNum(d.amount), input: d.addedBy || "" }));
  detail.forEach((d) => {
    setCell(ws, 0, r, d.tanggal, STYLE.cell);
    setCell(ws, 1, r, d.deskripsi, STYLE.cell);
    setCell(ws, 2, r, d.jumlah, STYLE.cellRp);
    setCell(ws, 3, r, d.input, STYLE.cell);
    r++;
  });

  endRef(ws, 8, r + 4);
  autoCols(ws, [18, 60, 18, 22, 12, 12, 12, 12]);
  return ws;
}

// ---- /daily-incoming-investor template (Ringkasan, bulanan, detail)
function buildSheetDailyIncoming(raw: any) {
  const ws: any = {};
  let r = 0;

  setCell(ws, 0, r, "Daily Incoming Investor", STYLE.title); r++;
  setCell(ws, 0, r, "Periode:", STYLE.subBold); setCell(ws, 1, r, String(raw?.range ?? `Tahun ${raw?.year ?? ""}`).trim(), STYLE.cell); r += 2;

  // RINGKASAN
  const sum = raw?.summary || {};
  setCell(ws, 0, r, "RINGKASAN", STYLE.thLightGreen); merge(ws, A1(0, r), A1(1, r)); r++;
  [
    ["Total pemasukan", toNum(sum.totalPemasukan)],
    ["Total pemasukan sudah dibayar", toNum(sum.totalSudahDibayar)],
    ["Total pemasukan belum dibayar (Sisa cicilan)", toNum(sum.totalBelumDibayar)],
  ].forEach(([k, v]) => { setCell(ws, 0, r, k as string, STYLE.cell); setCell(ws, 1, r, Number(v), STYLE.cellRp); r++; });
  r += 2;

  // BULANAN
  setCell(ws, 0, r, `PEMASUKAN BULANAN ${raw?.year ?? ""}`, STYLE.thLightGreen); merge(ws, A1(0, r), A1(2, r)); r++;
  ["Bulan", "Total", "Jumlah Transaksi"].forEach((h, i) => setCell(ws, i, r, h, STYLE.headGreen)); r++;

  const monthly = Array.isArray(raw?.monthly) ? raw.monthly : (raw?.days || []).reduce((acc: any, d: any) => {
    const dt = new Date(d.date);
    const key = isNaN(+dt) ? "-" : dt.toLocaleString("id-ID", { month: "short" });
    const v = toNum(d.total ?? d.totalAmount ?? d.amountPaid);
    acc[key] = acc[key] || { total: 0, count: 0 };
    acc[key].total += v; acc[key].count += 1;
    return acc;
  }, {});
  Object.keys(monthly).forEach((k) => {
    setCell(ws, 0, r, k, STYLE.cell);
    setCell(ws, 1, r, monthly[k].total, STYLE.cellRp);
    setCell(ws, 2, r, monthly[k].count, STYLE.cellRight);
    r++;
  });
  r += 2;

  // HEADER BLUE BAR + DETAIL (seperti HTML)
  setCell(ws, 0, r, "Detail Tarikan Repot Harian", STYLE.blueBar); merge(ws, A1(0, r), A1(8, r)); r++;
  const head = ["No", "Tanggal", "Nama Investor", "Kode Blok/Paket", "Kode Transaksi/INV ID", "Jenis Transaksi", "Tanaman/Produk", "Jumlah", "Status"];
  head.forEach((h, i) => setCell(ws, i, r, h, STYLE.headGreen)); r++;

  // rows
  const rows = Array.isArray(raw?.rows) ? raw.rows : [];
  let no = 1;
  rows
    .slice()
    .sort((a: any, b: any) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
    .forEach((rr: any) => {
      setCell(ws, 0, r, no++, STYLE.cell);
      setCell(ws, 1, r, rr.date ? new Date(rr.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "-", STYLE.cell);
      setCell(ws, 2, r, rr.investorName || "-", STYLE.cell);
      setCell(ws, 3, r, "-", STYLE.cell);
      setCell(ws, 4, r, rr.investmentId || "-", STYLE.cell);
      const pt = (rr.paymentType || "").toString();
      setCell(ws, 5, r, pt ? pt.charAt(0).toUpperCase() + pt.slice(1) : "-", STYLE.cell);
      setCell(ws, 6, r, rr.productName || "-", STYLE.cell);
      setCell(ws, 7, r, toNum(rr.totalAmount ?? rr.amountPaid ?? rr.gross_amount), STYLE.cellRp);
      setCell(ws, 8, r, "Lunas", STYLE.cell);
      r++;
    });

  endRef(ws, 12, r + 3);
  autoCols(ws, [6, 12, 26, 16, 26, 18, 26, 18, 12, 10, 10, 10]);
  return ws;
}

/* ================= fetch helpers ================= */
async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`(${res.status}) ${url}`);
  return res.json();
}
async function fetchInvoiceSheet() {
  const res = await fetch(ENDPOINTS.invoiceExport, { cache: "no-store" });
  if (!res.ok) throw new Error(`(${res.status}) /api/admin/invoice/export`);
  const buf = await res.arrayBuffer();
  const XLSX = await getXLSX();
  const wb = XLSX.read(buf, { type: "array" });
  // keep the first sheet exactly as server exports (styling preserved)
  const sheetName = wb.SheetNames[0];
  return { ws: wb.Sheets[sheetName], name: sheetName || "Laporan Invoice" };
}

/* ===== UI PATCH: rapikan tampilan sheet "Laporan Invoice" (garis, header, Rp, lebar kolom) */
function tidyInvoiceSheetUI(ws: any, XLSX: any) {
  const BORDER_THIN = { top:{style:"thin"}, right:{style:"thin"}, bottom:{style:"thin"}, left:{style:"thin"} };
  const BORDER_MED  = { top:{style:"medium"}, right:{style:"medium"}, bottom:{style:"medium"}, left:{style:"medium"} };
  const HEAD_GREEN = {
    font: { bold: true, color: { rgb: "0B2239" } },
    fill: { fgColor: { rgb: "A9D08E" } },
    border: BORDER_THIN,
    alignment: { horizontal: "center", vertical: "center" },
  };

  const ref = ws["!ref"] || "A1:H200";
  const range = XLSX.utils.decode_range(ref);

  // cari baris "DAFTAR INVOICE"
  let daftarRow = -1;
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 80); r++) {
    const cell = ws[A1(0, r)];
    if (cell && String(cell.v).toUpperCase().includes("DAFTAR INVOICE")) {
      daftarRow = r; break;
    }
  }
  if (daftarRow < 0) return ws;

  const headerRow = daftarRow + 1; // baris header tabel

  // style header tabel (A..H)
  for (let c = 0; c <= 7; c++) {
    const a1 = A1(c, headerRow);
    if (ws[a1]) ws[a1].s = { ...(ws[a1].s || {}), ...HEAD_GREEN };
  }

  // cari last data row (kolom A non-kosong)
  let r = headerRow + 1, emptyStreak = 0, last = headerRow + 1;
  while (r <= range.e.r && emptyStreak < 25) {
    const a = ws[A1(0, r)];
    const has = a && String(a.v ?? "").trim() !== "";
    if (has) { last = r; emptyStreak = 0; } else { emptyStreak++; }
    r++;
  }

  // border tipis tabel data (A..H)
  for (let rr = headerRow; rr <= last; rr++) {
    for (let cc = 0; cc <= 7; cc++) {
      const a1 = A1(cc, rr);
      if (!ws[a1]) ws[a1] = { t: "s", v: "" };
      ws[a1].s = { ...(ws[a1].s || {}), border: BORDER_THIN };
    }
  }

  // format Rp dan rata kanan kolom "Total Pembayaran" (kolom G index 6)
  for (let rr = headerRow + 1; rr <= last; rr++) {
    const a1 = A1(6, rr);
    if (ws[a1]) {
      ws[a1].t = "n";
      (ws[a1] as any).z = '"Rp" #,##0';
      ws[a1].s = { ...(ws[a1].s || {}), alignment: { horizontal: "right" }, border: BORDER_THIN };
    }
  }

  // kotak garis medium di blok judul "LAPORAN INVOICE" + "Dibuat pada"
  for (let rr = range.s.r; rr <= Math.min(range.s.r + 25, range.e.r); rr++) {
    const cell = ws[A1(0, rr)];
    if (cell && String(cell.v).toUpperCase().includes("LAPORAN INVOICE")) {
      const top = rr, bottom = rr + 1;
      for (let r2 = top; r2 <= bottom; r2++) {
        for (let c2 = 0; c2 <= 7; c2++) {
          const a1 = A1(c2, r2);
          if (!ws[a1]) ws[a1] = { t: "s", v: "" };
          ws[a1].s = { ...(ws[a1].s || {}), border: BORDER_MED };
        }
      }
      break;
    }
  }

  // lebar kolom mirip template
  ws["!cols"] = [
    { wch: 4 },   // No.
    { wch: 16 },  // No.Anggota
    { wch: 18 },  // Nama Anggota
    { wch: 32 },  // No.Inv
    { wch: 32 },  // ID transaksi
    { wch: 12 },  // Tanggal
    { wch: 16 },  // Total Pembayaran
    { wch: 18 },  // Status Pembayaran
  ];

  return ws;
}

/* ==================== PAGE ==================== */
export default function FinanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleExportBukuBesar = async () => {
    try {
      setExporting(true);
      const XLSX = await getXLSX();

      // Grab data
      const [summary, extra, plants, incoming, invoicePart] = await Promise.all([
        fetchJSON(ENDPOINTS.financeSummary),
        fetchJSON(ENDPOINTS.financeExtra),
        fetchJSON(ENDPOINTS.plants),
        fetchJSON(ENDPOINTS.dailyIncoming),
        fetchInvoiceSheet(), // returns parsed sheet
      ]);

      // Build each sheet following original templates
      const wsRingkasan = buildSheetRingkasan(XLSX, summary, extra);
      const wsPengeluaran = buildSheetPengeluaran(Array.isArray(plants) ? plants : []);
      const wsDaily = buildSheetDailyIncoming(incoming);

      // Invoice: rapikan UI tanpa mengubah datanya
      tidyInvoiceSheetUI(invoicePart.ws, XLSX);
      const wsInvoice = invoicePart.ws;

      // Make a single workbook with 4 sheets
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan");
      XLSX.utils.book_append_sheet(wb, wsPengeluaran, "Laporan Pengeluaran");
      XLSX.utils.book_append_sheet(wb, wsDaily, "Daily Incoming Investor");
      XLSX.utils.book_append_sheet(wb, wsInvoice, "Laporan Invoice");

      XLSX.writeFile(wb, `Buku-Besar_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e: any) {
      console.error(e);
      alert("Gagal menyusun Buku Besar:\n" + (e?.message || e));
    } finally {
      setExporting(false);
    }
  };

  if (!mounted) return null;

  return (
    <FinanceSidebar>
      <div className="p-6 space-y-8 font-[family-name:var(--font-poppins)]">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-8 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white">Pengaturan Finance</h1>
              <p className="text-[#889063] dark:text-gray-300">Konfigurasi tampilan dan preferensi sistem</p>
            </div>
          </div>
        </motion.header>

        {/* Mode & theme (tetap) */}
        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 border border-[#324D3E]/10 dark:border-gray-700 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold text-[#324D3E] dark:text-white mb-4">Tampilan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { value: "light", label: "Mode Terang", icon: Sun },
              { value: "dark", label: "Mode Gelap", icon: Moon },
              { value: "pink", label: "Mode Pink", icon: Heart },
              { value: "system", label: "Ikuti Sistem", icon: Monitor },
            ].map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`p-6 rounded-2xl border-2 ${
                    active ? "border-[#324D3E] bg-[#324D3E]/5" : "border-[#324D3E]/20 hover:border-[#324D3E]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${active ? "bg-[#324D3E] text-white" : "bg-[#324D3E]/10 text-[#324D3E]"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-[#324D3E]">{opt.label}</h3>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Export Buku Besar */}
        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-8 border border-[#324D3E]/10 dark:border-gray-700 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#324D3E] dark:text-white">Export Buku Besar (Satukan 4 Template)</h2>
              {/* <p className="text-[#889063] dark:text-gray-300 text-sm">
                Hasilnya 1 file XLSX dengan 4 sheet: <b>Ringkasan</b>, <b>Laporan Pengeluaran</b>, <b>Daily Incoming Investor</b>, dan <b>Laporan Invoice</b>.
              </p> */}
            </div>
            <Button onClick={handleExportBukuBesar} disabled={exporting} className="gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {exporting ? "Menyusun Buku Besar..." : "Export Buku Besar (XLS)"}
            </Button>
          </div>
        </motion.div>
      </div>
    </FinanceSidebar>
  );
}
