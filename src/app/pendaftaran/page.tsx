"use client";

import * as React from "react";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link"; // <-- tambah untuk toggle navigasi
import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { Download, Search } from "lucide-react";
import { useTheme } from "next-themes";

// ============== XLSX dynamic import ==============
let XLSXMod: any;
async function getXLSX() {
  if (XLSXMod) return XLSXMod;
  XLSXMod = await import("xlsx-js-style");
  return XLSXMod as any;
}

// ============== Types (ikuti /invoice) ==============
type PaymentData = {
  _id: string;
  orderId: string; // REG-...
  paymentType: string; // "registration"
  status: string;
  amount: number;
  totalAmount?: number;
  gross_amount?: number;
  userName?: string;
  userEmail?: string;
  userId?: string;
  userCode?: string;
  createdAt: string;
  updatedAt?: string;
  midtransResponse?: { transaction_id?: string; transactionId?: string };
  transactionId?: string;
  [k: string]: any;
};

type InvoiceResponse = {
  payments: PaymentData[];
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
};

// ============== Utils ==============
function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));
}
function formatDateText(d?: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function formatDateSheet(d?: string) {
  if (!d) return "-";
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
}
function toPaidLabel(status?: string) {
  if (!status) return "-";
  if (status === "settlement" || status === "paid" || status === "success")
    return "Lunas";
  if (status === "pending") return "Pending";
  if (status === "expire" || status === "expired") return "Kedaluwarsa";
  if (status === "cancel" || status === "cancelled") return "Dibatalkan";
  return status;
}

// ============== Content Page ==============
function Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Theme helper
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Query umum (tanpa filter kategori)
  const q = (searchParams?.get("q") || "").trim();
  const page = Number(searchParams?.get("page") || 1);
  const perPage = Number(searchParams?.get("perPage") || 10);
  const sort = (searchParams?.get("sort") || "desc") as "asc" | "desc";

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<InvoiceResponse | null>(null);

  const [totalNominal, setTotalNominal] = React.useState<number>(0);
  const [loadingTotal, setLoadingTotal] = React.useState<boolean>(false);

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.currentPage ?? page;

  // -------- Fetch list --------
  async function fetchData() {
    setLoading(true);
    try {
      const qs = new URLSearchParams(searchParams?.toString() || "");
      if (!qs.get("page")) qs.set("page", String(page || 1));
      if (!qs.get("perPage")) qs.set("perPage", String(perPage || 10));
      if (!qs.get("sort")) qs.set("sort", sort || "desc");
      const res = await fetch(`/api/pendaftaran?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: InvoiceResponse = await res.json();
      setData(json);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, perPage, sort]);

  // -------- Hitung Total Pendaftaran (sum semua halaman, tanpa duplikasi) --------
  async function computeGrandTotal() {
    try {
      setLoadingTotal(true);
      let sum = 0;

      async function fetchPageAll(p: number) {
        const qs = new URLSearchParams(searchParams?.toString() || "");
        qs.set("page", String(p));
        // gunakan perPage besar saat agregasi
        qs.set(
          "perPage",
          String(Math.max(Number(qs.get("perPage") || 0), 200) || 200)
        );
        qs.set("sort", sort || "desc");
        const r = await fetch(`/api/pendaftaran?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`Gagal memuat halaman ${p}`);
        return (await r.json()) as InvoiceResponse;
      }

      // selalu mulai dari page 1 agar tidak dobel
      const first = await fetchPageAll(1);
      first.payments.forEach((p) => {
        sum += p.amount ?? p.totalAmount ?? p.gross_amount ?? 0;
      });

      for (let pg = 2; pg <= (first.totalPages || 1); pg++) {
        const resp = await fetchPageAll(pg);
        resp.payments.forEach((p) => {
          sum += p.amount ?? p.totalAmount ?? p.gross_amount ?? 0;
        });
      }

      setTotalNominal(sum);
    } catch {
      setTotalNominal(0);
    } finally {
      setLoadingTotal(false);
    }
  }

  // Total bergantung pada filter global (q, sort)
  React.useEffect(() => {
    computeGrandTotal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort]);

  // -------- query helpers --------
  function updateQuery(next: Record<string, string | number | undefined>) {
    const p = new URLSearchParams(searchParams?.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    router.replace(`${pathname}?${p.toString()}`);
  }
  const setPage = (n: number) => updateQuery({ page: n });
  const setPerPage = (n: number) => updateQuery({ perPage: n, page: 1 });
  const setSort = (v: "asc" | "desc") => updateQuery({ sort: v, page: 1 });
  const setSearch = (val: string) => updateQuery({ q: val, page: 1 });

  // -------- Export XLS (template ala /invoice) --------
  const COMPANY = {
    name: "KOPERASI BINTANG MERAH SEJAHTERA",
    address:
      "Bintaro Business Center Jl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330",
    contact: "Tel: +62 81118893679 | Email: bintangmerahsejahtera@gmail.com",
  };

  function buildRowsForExcel(all: PaymentData[]) {
    const headerRows: any[][] = [
      [COMPANY.name],
      [COMPANY.address],
      [COMPANY.contact],
      [],
      ["LAPORAN PENDAFTARAN"],
      [
        `Dibuat pada: ${new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}`,
      ],
      [],
      ["DAFTAR PENDAFTARAN"],
      [],
      [
        "No.",
        "No.Anggota",
        "Nama Anggota",
        "No.Inv",
        "ID transaksi",
        "Tanggal INV",
        "Total Pembayaran",
        "Status Pembayaran",
      ],
    ];

    const bodyRows = all.map((p, i) => {
      const nominal = p.amount ?? p.totalAmount ?? p.gross_amount ?? 0;
      const trx =
        p.midtransResponse?.transaction_id ||
        p.midtransResponse?.transactionId ||
        p.transactionId ||
        "-";
      const noAnggota = p.userCode || p.userId || "-";
      const nama = p.userName || p.userEmail || p.userId || "-";
      return [
        i + 1,
        noAnggota,
        nama,
        p.orderId || "-",
        trx,
        formatDateSheet(p.createdAt),
        formatIDR(nominal),
        toPaidLabel(p.status),
      ];
    });

    return [...headerRows, ...bodyRows];
  }

  async function exportAllXLS() {
    const XLSX = await getXLSX();

    const all: PaymentData[] = [];
    async function fetchPageAll(p: number) {
      const qs = new URLSearchParams(searchParams?.toString() || "");
      qs.set("page", String(p));
      qs.set(
        "perPage",
        String(Math.max(Number(qs.get("perPage") || 0), 200) || 200)
      );
      qs.set("sort", sort || "desc");
      const r = await fetch(`/api/pendaftaran?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`Gagal memuat halaman ${p}`);
      return (await r.json()) as InvoiceResponse;
    }

    // Selalu mulai dari halaman 1 untuk menghindari duplikasi
    const first = await fetchPageAll(1);
    all.push(...first.payments);
    for (let pg = 2; pg <= (first.totalPages || 1); pg++) {
      const resp = await fetchPageAll(pg);
      all.push(...resp.payments);
    }

    const wb = XLSX.utils.book_new();
    const rows = buildRowsForExcel(all);
    const ws = (XLSX as any).utils.aoa_to_sheet(rows);

    ws["!cols"] = [
      { wch: 5 },
      { wch: 16 },
      { wch: 26 },
      { wch: 30 },
      { wch: 36 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
    ];

    const XLSXAny: any = XLSX;
    const borderAll = {
      top: { style: "thin" },
      right: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
    };
    const bold = { bold: true };
    const center = { horizontal: "center", vertical: "center" };
    function styleRange(
      s: any,
      r1: number,
      c1: number,
      r2: number,
      c2: number,
      style: any
    ) {
      for (let R = r1; R <= r2; R++) {
        for (let C = c1; C <= c2; C++) {
          const cell = s[XLSXAny.utils.encode_cell({ r: R, c: C })];
          if (!cell) continue;
          cell.s = { ...(cell.s || {}), ...style };
        }
      }
    }
    (ws["!merges"] ||= []).push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 7 } }
    );
    styleRange(ws, 0, 0, 0, 7, {
      font: { ...bold, sz: 14 },
      alignment: center,
    });
    styleRange(ws, 4, 0, 4, 7, {
      font: { ...bold, sz: 12 },
      alignment: center,
    });
    styleRange(ws, 7, 0, 7, 7, { font: { ...bold, sz: 12 } });

    const headerRow = 9;
    styleRange(ws, headerRow - 1, 0, headerRow - 1, 7, {
      font: { ...bold },
      alignment: center,
      border: borderAll,
    });
    for (let r = headerRow; r < rows.length; r++) {
      for (let c = 0; c <= 7; c++) {
        const cell = ws[XLSXAny.utils.encode_cell({ r, c })];
        if (!cell) continue;
        cell.s = { ...(cell.s || {}), border: borderAll };
      }
    }

    XLSXAny.utils.book_append_sheet(wb, ws, "Pendaftaran");
    XLSXAny.writeFile(wb, "laporan-pendaftaran-registration.xlsx");
  }

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="px-6 lg:px-8 py-6">
      {/* Header judul + tanggal */}
      <div className="mb-4">
        <h1
          className={getThemeClasses(
            "text-3xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300",
            "!text-[#4c1d1d]"
          )}
        >
          Pendaftaran
        </h1>
        <div
          className={getThemeClasses(
            "text-sm text-gray-600 dark:text-gray-200 transition-colors duration-300",
            "!text-[#6b7280]"
          )}
        >
          {today}
        </div>
      </div>

      {/* Bar atas: Search + kanan (sort/hasil/perPage/pager) */}
      <div
        className={getThemeClasses(
          "mb-4 rounded-3xl border border-[#324D3E]/10 dark:border-gray-700 bg-white dark:bg-gray-800/90 p-4 transition-colors duration-300",
          "!border-[#FFC1CC]/30 !bg-white/95"
        )}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* search */}
          <div className="flex-1">
            <div className="relative">
              <input
                defaultValue={q}
                placeholder="Cari REF / OrderId / Tanggal (yyyy-mm-dd)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value;
                    setSearch(val);
                  }
                }}
                className={getThemeClasses(
                  "w-full rounded-2xl border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700/80 text-[#324D3E] dark:text-white px-5 py-3 text-sm shadow-sm transition-colors duration-300",
                  "!border-[#FFC1CC]/30 !bg-white/90 !text-[#4c1d1d]"
                )}
              />
              <button
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>(
                    "input[placeholder^='Cari REF']"
                  );
                  setSearch(el?.value || "");
                }}
                className={getThemeClasses(
                  "absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 rounded-xl bg-[#324D3E] dark:bg-gray-700 hover:bg-[#4C3D19] dark:hover:bg-gray-600 px-3 py-2 text-sm text-white transition-colors duration-300",
                  "!bg-[#FFC1CC] !text-[#4c1d1d] hover:!bg-[#FFDEE9]"
                )}
                title="Search"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>

          {/* kanan controls */}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {/* sort */}
            <div className={getThemeClasses("inline-flex items-center gap-2 rounded-2xl border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700/80 px-3 py-2 text-sm transition-colors duration-300", "!border-[#FFC1CC]/30 !bg-white/90")}>
              <button
                className={getThemeClasses(
                  `rounded-lg px-2 py-1 transition-colors duration-200 ${
                    sort === "desc"
                      ? "bg-[#324D3E] dark:bg-gray-600 text-white"
                      : "text-[#324D3E] dark:text-white hover:bg-[#324D3E]/10 dark:hover:bg-gray-600"
                  }`,
                  sort === "desc" ? "!bg-[#FFC1CC] !text-[#4c1d1d]" : "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                )}
                onClick={() => setSort("desc")}
                title="Terbaru"
              >
                Terbaru
              </button>
              <button
                className={getThemeClasses(
                  `rounded-lg px-2 py-1 transition-colors duration-200 ${
                    sort === "asc"
                      ? "bg-[#324D3E] dark:bg-gray-600 text-white"
                      : "text-[#324D3E] dark:text-white hover:bg-[#324D3E]/10 dark:hover:bg-gray-600"
                  }`,
                  sort === "asc" ? "!bg-[#FFC1CC] !text-[#4c1d1d]" : "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                )}
                onClick={() => setSort("asc")}
                title="Terlama"
              >
                Terlama
              </button>
            </div>

            {/* ringkasan hasil */}
            <div className={getThemeClasses("inline-flex items-center gap-2 rounded-2xl border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700/80 px-3 py-2 text-sm text-[#324D3E] dark:text-white transition-colors duration-300", "!border-[#FFC1CC]/30 !bg-white/90 !text-[#4c1d1d]")}>
              <span className="opacity-70">{total} hasil</span>
              <span>•</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className={getThemeClasses(
                  "rounded-xl border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700 text-[#324D3E] dark:text-white px-2 py-1 transition-colors duration-300",
                  "!border-[#FFC1CC]/30 !bg-white/90 !text-[#4c1d1d]"
                )}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}/hal
                  </option>
                ))}
              </select>
            </div>

            {/* pager ringkas */}
            <div className={getThemeClasses("inline-flex items-center gap-2 rounded-2xl border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700/80 px-2 py-2 text-sm text-[#324D3E] dark:text-white transition-colors duration-300", "!border-[#FFC1CC]/30 !bg-white/90 !text-[#4c1d1d]")}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className={getThemeClasses(
                  "rounded-lg px-3 py-1 disabled:opacity-50 text-[#324D3E] dark:text-white hover:bg-[#324D3E]/10 dark:hover:bg-gray-600 transition-colors duration-200",
                  "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                )}
              >
                ‹
              </button>
              <div
                className={getThemeClasses(
                  "rounded-lg border border-[#324D3E]/20 dark:border-gray-600 px-3 py-1 text-[#324D3E] dark:text-white transition-colors duration-300",
                  "!border-[#FFC1CC]/30 !text-[#4c1d1d]"
                )}
              >
                {currentPage}
              </div>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className={getThemeClasses(
                  "rounded-lg px-3 py-1 disabled:opacity-50 text-[#324D3E] dark:text-white hover:bg-[#324D3E]/10 dark:hover:bg-gray-600 transition-colors duration-200",
                  "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                )}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bar: Total Pendaftaran (kiri) — Export XLS (kanan) */}
      <div className="mb-1 flex items-center justify-between">
        <div className={getThemeClasses("inline-flex items-center gap-2 rounded-2xl border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700/80 px-4 py-2 text-sm text-[#324D3E] dark:text-white transition-colors duration-300", "!border-[#FFC1CC]/30 !bg-white/90 !text-[#4c1d1d]")}>
          <span className="opacity-70">Total Pendaftaran</span>
          <span
            className={getThemeClasses(
              "rounded-lg bg-[#324D3E] dark:bg-gray-600 px-2 py-1 text-white transition-colors duration-300",
              "!bg-[#FFC1CC] !text-[#4c1d1d]"
            )}
          >
            {loadingTotal ? "..." : formatIDR(totalNominal)}
          </span>
        </div>

        <button
          onClick={exportAllXLS}
          className={getThemeClasses(
            "inline-flex items-center gap-2 rounded-xl border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700/80 text-[#324D3E] dark:text-white px-4 py-2 text-sm font-medium hover:bg-[#324D3E] hover:text-white dark:hover:bg-gray-600 transition-colors duration-300",
            "!border-[#FFC1CC]/30 !bg-white/90 !text-[#4c1d1d] hover:!bg-[#FFC1CC] hover:!text-white"
          )}
        >
          <Download className="h-4 w-4" />
          Export XLS
        </button>
      </div>

      {/* === Toggle Navigasi (Laporan <-> Pendaftaran) di bawah Export === */}
      <div className="mb-4 flex justify-end">
        <div
          className={getThemeClasses(
            "inline-flex overflow-hidden rounded-2xl border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700/80 transition-colors duration-300",
            "!border-[#FFC1CC]/30 !bg-white/90"
          )}
        >
          <Link href="/laporan-pengeluaran" className="contents">
            <button
              className={getThemeClasses(
                "px-3 py-1 text-xs font-bold hover:bg-black/5 dark:hover:bg-gray-600/50 text-[#324D3E] dark:text-white transition-colors duration-300",
                "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
              )}
              title="Ke halaman Laporan"
            >
              Laporan
            </button>
          </Link>
          <button
            className={getThemeClasses(
              "px-3 py-1 text-xs font-bold bg-[#E9FFEF] dark:bg-emerald-500/30 cursor-default text-[#324D3E] dark:text-white transition-colors duration-300",
              "!bg-[#B5EAD7] !text-[#4c1d1d]"
            )}
            title="Halaman Pendaftaran"
            disabled
          >
            Pendaftaran
          </button>
        </div>
      </div>

      {/* Tabel daftar */}
      <div
        className={getThemeClasses(
          "rounded-3xl border border-[#324D3E]/10 dark:border-gray-700 bg-white dark:bg-gray-800/90 p-0 transition-colors duration-300",
          "!border-[#FFC1CC]/30 !bg-white/95"
        )}
      >
        {loading ? (
          <div className="p-8 text-center text-sm opacity-70">Memuat data…</div>
        ) : err ? (
          <div className="p-8 text-center text-red-600">{err}</div>
        ) : !data || data.payments.length === 0 ? (
          <div className="p-8 text-center text-sm opacity-70">
            Tidak ada data.
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className={getThemeClasses(
                      "border-b border-gray-200 dark:border-gray-600 bg-[#F8FAF9] dark:bg-gray-700/50 text-left transition-colors duration-300",
                      "!bg-[#FFDEE9]/30 !border-[#FFC1CC]/30"
                    )}
                  >
                    <th
                      className={getThemeClasses(
                        "px-6 py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}
                    >
                      No
                    </th>
                    <th
                      className={getThemeClasses(
                        "px-6 py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}
                    >
                      Jenis
                    </th>
                    <th
                      className={getThemeClasses(
                        "px-6 py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}
                    >
                      User
                    </th>
                    <th
                      className={getThemeClasses(
                        "px-6 py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}
                    >
                      Nominal
                    </th>
                    <th
                      className={getThemeClasses(
                        "px-6 py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}
                    >
                      Tanggal
                    </th>
                    <th
                      className={getThemeClasses(
                        "px-6 py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}
                    >
                      Invoice
                    </th>
                    <th
                      className={getThemeClasses(
                        "px-6 py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p, i) => {
                    const idx = i + 1 + (currentPage - 1) * perPage;
                    const nominal =
                      p.amount ?? p.totalAmount ?? p.gross_amount ?? 0;
                    const user = p.userName || p.userEmail || p.userId || "-";
                    return (
                      <tr
                        key={p._id}
                        className={getThemeClasses(
                          "border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200",
                          "!border-[#FFC1CC]/20 hover:!bg-[#FFC1CC]/10"
                        )}
                      >
                        <td
                          className={getThemeClasses(
                            "px-6 py-3 text-[#324D3E] dark:text-white transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          {idx}
                        </td>
                        <td
                          className={getThemeClasses(
                            "px-6 py-3 text-[#324D3E] dark:text-white transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          Pendaftaran
                        </td>
                        <td
                          className={getThemeClasses(
                            "px-6 py-3 text-[#324D3E] dark:text-white transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          {user}
                        </td>
                        <td
                          className={getThemeClasses(
                            "px-6 py-3 font-medium text-[#324D3E] dark:text-white transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          {formatIDR(nominal)}
                        </td>
                        <td
                          className={getThemeClasses(
                            "px-6 py-3 text-[#324D3E] dark:text-white transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          {formatDateText(p.createdAt)}
                        </td>
                        <td
                          className={getThemeClasses(
                            "px-6 py-3 text-[#324D3E] dark:text-white transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          {p.orderId || "-"}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs ${
                              p.status === "settlement" || p.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : p.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {p.status || "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-center gap-2 p-4">
              <button
                className="rounded-xl border border-[#324D3E]/20 px-3 py-2 text-sm disabled:opacity-50"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Prev
              </button>
              <span className="rounded-xl border border-[#324D3E]/20 px-3 py-2 text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                className="rounded-xl border border-[#324D3E]/20 px-3 py-2 text-sm disabled:opacity-50"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============== Page wrapper dengan FinanceSidebar ==============
export default function PendaftaranPage() {
  return (
    <FinanceSidebar>
      {/* HANYA SEKALI: bungkus Content dengan Suspense (tidak double render) */}
      <Suspense
        fallback={
          <div className="px-6 lg:px-8 py-6">
            <div className="text-center p-8">Memuat...</div>
          </div>
        }
      >
        <Content />
      </Suspense>
    </FinanceSidebar>
  );
}
