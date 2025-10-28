"use client";

import * as React from "react";
import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui-finance/button";

// ============== XLSX dynamic import ==============
let XLSXMod: any;
async function getXLSX() {
  if (XLSXMod) return XLSXMod;
  XLSXMod = await import("xlsx-js-style");
  return XLSXMod as any;
}

// ========= Endpoint yang SUDAH kamu pastikan =========
const FIXED = {
  summaryJSON: "/api/finance/summary?download=1",
  invoiceExport: "/api/admin/invoice/export",
  incomingDailyJSON: "/api/daily-incoming-investor?all=1",
} as const;

// ========= Kandidat Export Pengeluaran (coba sampai 200) =========
const EXPENSES_EXPORT_CANDIDATES: string[] = [
  // admin variants
  "/api/admin/pengeluaran/export",
  "/api/admin/pengeluaran/export?all=1",
  "/api/admin/pengeluaran/export?scope=all",
  "/api/admin/expenses/export",
  "/api/admin/expenses/export?all=1",
  "/api/admin/expenses/export?scope=all",
  // finance namespace
  "/api/finance/pengeluaran/export",
  "/api/finance/pengeluaran/export?all=1",
  "/api/finance/pengeluaran/export?scope=all",
  "/api/finance/expenses/export",
  "/api/finance/expenses/export?all=1",
  "/api/finance/expenses/export?scope=all",
  "/api/finance/laporan-pengeluaran/export",
  "/api/finance/laporan-pengeluaran/export?all=1",
  // generic
  "/api/pengeluaran/export",
  "/api/pengeluaran/export?all=1",
  "/api/pengeluaran/export?filter=Semua",
  "/api/expenses/export",
  "/api/expenses/export?all=1",
  "/api/expenses/export?filter=all",
];

// ============== Pilih URL pertama yang 200 ==============
async function resolveWorking(urls: string[]) {
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: "no-store" });
      if (res.ok) return u;
    } catch {}
  }
  return null;
}

// ============== Fetch fleksibel: JSON / CSV / XLSX / HTML guard ==============
async function fetchFlexible(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept:
        "application/json, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, text/plain, */*",
    },
  });

  const ctype = res.headers.get("content-type") || "";
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`(${res.status}) ${url} -> ${txt.slice(0, 160)}`);
  }

  // JSON
  if (ctype.includes("application/json")) return res.json();

  // XLSX / octet-stream
  if (
    ctype.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
    ctype.includes("application/octet-stream")
  ) {
    const XLSX = await getXLSX();
    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }

  // CSV / text
  if (ctype.includes("text/csv") || ctype.includes("text/plain")) {
    const txt = await res.text();
    const XLSX = await getXLSX();
    const wb = XLSX.read(txt, { type: "string" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }

  // HTML -> kemungkinan redirect/auth
  if (ctype.includes("text/html")) {
    const preview = (await res.text()).slice(0, 200);
    throw new Error(`Endpoint mengembalikan HTML (kemungkinan redirect/auth). URL: ${url}\nPreview: ${preview}`);
  }

  // fallback
  const txt = await res.text();
  try {
    const XLSX = await getXLSX();
    const wb = XLSX.read(txt, { type: "string" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  } catch {
    throw new Error(`Format tak dikenal dari ${url}. Content-Type: ${ctype}`);
  }
}

// ============== Normalisasi kolom ==============
function normalizeRingkasan(raw: any): any[] {
  if (Array.isArray(raw)) {
    return raw.map((it: any, i: number) => ({
      No: i + 1,
      Nama: it?.name ?? it?.title ?? it?.label ?? "-",
      Nilai: it?.value ?? it?.amount ?? it?.Nilai ?? 0,
      Keterangan: it?.note ?? it?.Keterangan ?? "",
    }));
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([k, v]: any, i) => ({
      No: i + 1,
      Nama: k,
      Nilai: typeof v === "number" ? v : v?.total ?? v?.amount ?? v ?? 0,
      Keterangan: "",
    }));
  }
  return [];
}
function normalizePengeluaran(raw: any): any[] {
  const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  return arr.map((x: any, i: number) => ({
    No: i + 1,
    Tanggal: x?.date ?? x?.createdAt ?? x?.tanggal ?? x?.Tanggal ?? "",
    Kategori: x?.category ?? x?.kategori ?? x?.Kategori ?? "-",
    Deskripsi: x?.description ?? x?.desc ?? x?.Deskripsi ?? "",
    Nominal: x?.amount ?? x?.nominal ?? x?.Nominal ?? 0,
    DibuatOleh: x?.createdBy?.name ?? x?.createdBy ?? x?.DibuatOleh ?? "",
    Ref: x?._id ?? x?.id ?? x?.Ref ?? "",
    Status: x?.status ?? x?.Status ?? "",
  }));
}
function normalizeInvoice(raw: any): any[] {
  const arr = Array.isArray(raw?.payments)
    ? raw.payments
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw)
    ? raw
    : [];
  return arr.map((x: any, i: number) => ({
    No: i + 1,
    OrderId: x?.orderId ?? x?.ref ?? x?.OrderId ?? "",
    Jenis: x?.paymentType ?? x?.type ?? x?.Jenis ?? "",
    Status: x?.status ?? x?.Status ?? "",
    Nominal: x?.totalAmount ?? x?.gross_amount ?? x?.amount ?? x?.Nominal ?? 0,
    User: x?.userName ?? x?.customerName ?? x?.User ?? "",
    Dibuat: x?.createdAt ?? x?.created ?? x?.Dibuat ?? "",
    Diperbarui: x?.updatedAt ?? x?.Diperbarui ?? "",
  }));
}
function normalizeIncoming(raw: any): any[] {
  const arr = Array.isArray(raw?.days) ? raw.days : (Array.isArray(raw) ? raw : []);
  return arr.map((x: any, i: number) => ({
    No: i + 1,
    Tanggal: x?.date ?? x?.Tanggal ?? "",
    TotalMasuk: x?.totalAmount ?? x?.total ?? x?.TotalMasuk ?? 0,
    JumlahTransaksi:
      x?.count ?? x?.transactions ?? (Array.isArray(x?.items) ? x.items.length : x?.JumlahTransaksi ?? 0),
    Catatan: x?.note ?? x?.Catatan ?? "",
  }));
}

// ============== Utils XLSX ==============
function aoaToSheet(XLSX: any, rows: any[][]) { return XLSX.utils.aoa_to_sheet(rows); }
function objArrayToSheet(XLSX: any, arr: any[], headerOrder?: string[]) {
  const keys = headerOrder?.length
    ? headerOrder
    : Array.from(arr.reduce((s: Set<string>, o: any) => { Object.keys(o||{}).forEach(k=>s.add(k)); return s; }, new Set<string>()));
  const rows = [keys, ...arr.map(o => keys.map(k => o?.[k]))];
  return aoaToSheet(XLSX, rows);
}
function autoFitColumns(ws: any) {
  const ref = ws["!ref"]; if (!ref) return;
  const [start, end] = ref.split(":");
  const colToIdx = (c: string) => c.split("").reduce((n,ch)=>n*26+(ch.charCodeAt(0)-64),0)-1;
  const parseRef = (r: string) => { const m=r.match(/([A-Z]+)(\d+)/); return m?{c:m[1],r:parseInt(m[2],10)}:null; };
  const s=parseRef(start), e=parseRef(end); if(!s||!e) return;
  const total = colToIdx(e.c)-colToIdx(s.c)+1, cols = Array.from({length:total},()=>10);
  const getCell=(ci:number,r:number)=>{let col="",d=ci+1;while(d>0){const m=(d-1)%26;col=String.fromCharCode(65+m)+col;d=Math.floor((d-1)/26);}return ws[col+r];};
  for(let r=s.r;r<=e.r;r++){for(let c=0;c<total;c++){const cell=getCell(colToIdx(s.c)+c,r);if(!cell||!cell.v)continue;cols[c]=Math.max(cols[c],Math.min(60,String(cell.v).length+2));}}
  ws["!cols"]=cols.map(w=>({wch:w}));
}

// ============== Tombol Export Buku Besar ==============
export default function ExportBukuBesarButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const XLSX = await getXLSX();

      // 1) Cari endpoint export PENGELUARAN yang valid dengan banyak variasi
      const expensesURL = await resolveWorking(EXPENSES_EXPORT_CANDIDATES);
      if (!expensesURL) {
        throw new Error("Endpoint export Pengeluaran tidak ditemukan (semua kandidat 404). Cek URL tombol 'Export CSV' di /laporan-pengeluaran dan tambahkan ke kandidat.");
      }

      // 2) Ambil data masing-masing (mengikuti cara tiap page)
      const [ringkasanRaw, pengeluaranRaw, invoiceRaw, incomingRaw] = await Promise.all([
        fetchFlexible(FIXED.summaryJSON),     // JSON — /finance
        fetchFlexible(expensesURL),           // EXPORT — /laporan-pengeluaran
        fetchFlexible(FIXED.invoiceExport),   // EXPORT — /invoice (admin)
        fetchFlexible(FIXED.incomingDailyJSON), // JSON — /daily-incoming-investor
      ]);

      // 3) Normalisasi
      const ringkasan = normalizeRingkasan(ringkasanRaw);
      const pengeluaran = normalizePengeluaran(pengeluaranRaw);
      const invoice = normalizeInvoice(invoiceRaw);
      const incoming = normalizeIncoming(incomingRaw);

      // 4) Susun workbook
      const wb = XLSX.utils.book_new();
      const now = new Date();

      const wsCover = aoaToSheet(XLSX, [
        ["BUKU BESAR — Investasi Hijau"],
        [""],
        ["Dibuat pada", now.toLocaleString()],
        ["Sumber Data", "Ringkasan (/finance JSON), Pengeluaran (export), Invoice (admin export), Incoming Investor (JSON)"],
        [""],
        ["Endpoint Pengeluaran"], [expensesURL],
        ["Endpoint Invoice"], [FIXED.invoiceExport],
      ]);
      autoFitColumns(wsCover);
      XLSX.utils.book_append_sheet(wb, wsCover, "Cover");

      const wsRingkasan = objArrayToSheet(XLSX, ringkasan, ["No","Nama","Nilai","Keterangan"]);
      autoFitColumns(wsRingkasan);
      XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan");

      const wsPengeluaran = objArrayToSheet(XLSX, pengeluaran, ["No","Tanggal","Kategori","Deskripsi","Nominal","DibuatOleh","Ref","Status"]);
      autoFitColumns(wsPengeluaran);
      XLSX.utils.book_append_sheet(wb, wsPengeluaran, "Pengeluaran_All");

      const wsInvoice = objArrayToSheet(XLSX, invoice, ["No","OrderId","Jenis","Status","Nominal","User","Dibuat","Diperbarui"]);
      autoFitColumns(wsInvoice);
      XLSX.utils.book_append_sheet(wb, wsInvoice, "Invoice_All");

      const wsIncoming = objArrayToSheet(XLSX, incoming, ["No","Tanggal","TotalMasuk","JumlahTransaksi","Catatan"]);
      autoFitColumns(wsIncoming);
      XLSX.utils.book_append_sheet(wb, wsIncoming, "IncomingInvestor_Daily");

      XLSX.writeFile(wb, `Buku-Besar_${now.toISOString().slice(0,10)}.xlsx`);
    } catch (err: any) {
      console.error(err);
      alert(`Gagal export Buku Besar:\n${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
      {loading ? "Menyusun Buku Besar..." : "Export Buku Besar (XLS)"}
    </Button>
  );
}
