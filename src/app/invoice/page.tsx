// src/app/invoice/page.tsx
"use client";

// import InvoiceCard from "@/components/invoice/InvoiceCard";
import InvoiceControls from "@/components/invoice/InvoiceControls";
import { InvoiceLayout } from "@/components/invoice/InvoiceLayout";
import { downloadInvoiceImage } from "@/lib/invoiceImage";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useMemo, useState } from "react";

// ===== XLSX (dynamic import, tidak ganggu SSR) =====
let XLSXMod: any;
async function getXLSX() {
  if (XLSXMod) return XLSXMod;
  XLSXMod = await import("xlsx-js-style");
  return XLSXMod as any;
}

interface PaymentData {
  ref: string;
  _id: string;
  orderId: string;
  amount: number;
  totalAmount?: number;
  gross_amount?: number;
  currency: string;
  paymentType: string;
  status: string;
  adminStatus?: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  userName: string;
  userImage?: string;
  buyerEmail?: string;
  userEmail?: string;
  [key: string]: any;
}

interface InvoiceResponse {
  payments: PaymentData[];
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
}

// tampilkan 10 per halaman (label kontrol UI). Back-end tetap sumber kebenaran pagination.
const PER_PAGE = 10;

function InvoicePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<InvoiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- read query params ---
  const q = searchParams.get("q") || "";
  const sort = (searchParams.get("sort") as "asc" | "desc") || "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const category = searchParams.get("category") || "";

  const [catDraft, setCatDraft] = useState(category);
  useEffect(() => setCatDraft(category), [category]);

  const buildQS = (next: Record<string, string | number | undefined | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") sp.delete(k);
      else sp.set(k, String(v));
    });
    if ("category" in next || "q" in next || "sort" in next) {
      sp.set("page", "1");
    }
    return sp.toString();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("sort", sort);
      params.set("page", page.toString());
      if (category) params.set("category", category);

      const response = await fetch(`/api/invoice?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, page, category]);

  // helper (tetap seperti sebelumnya)
  const isApproved = (p: PaymentData) =>
    String((p as any).adminStatus || p.status || "").toLowerCase() === "approved";

  // group cicilan -> [{ orderId, items(sorted), paidCount, totalInstallments, userName }]
  const installmentGroups = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, PaymentData[]>();
    for (const p of data.payments) {
      if (
        p.paymentType === "cicilan-installment" &&
        isApproved(p) &&
        (p as any).cicilanOrderId
      ) {
        const oid = String((p as any).cicilanOrderId);
        if (!map.has(oid)) map.set(oid, []);
        map.get(oid)!.push(p);
      }
    }
    return Array.from(map.entries()).map(([orderId, items]) => {
      const sorted = items
        .slice()
        .sort(
          (a, b) =>
            ((a as any).installmentNumber ?? 0) - ((b as any).installmentNumber ?? 0)
        );

      const totalInstallments =
        ((sorted[0] as any)?.totalInstallments ??
          Math.max(
            ...sorted.map((x) => ((x as any).totalInstallments ?? 0) as number),
            0
          )) || undefined;

      return {
        orderId,
        items: sorted,
        paidCount: sorted.length,
        totalInstallments,
        userName: sorted[0]?.userName,
      };
    });
  }, [data]);

  // non cicilan + sisanya (tetap)
  const otherPayments = useMemo(() => {
    if (!data) return [];
    const skip = new Set<string>();
    for (const g of installmentGroups) {
      for (const it of g.items) skip.add(it.ref || it._id);
    }
    return data.payments.filter((p) => !skip.has(p.ref || p._id));
  }, [data, installmentGroups]);

  // ====== UI tabel ======
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleGroup = (orderId: string) =>
    setExpanded((s) => ({ ...s, [orderId]: !s[orderId] }));

  const emailOf = (p: PaymentData) =>
    (p as any).userEmail || (p as any).buyerEmail || (p as any).email || p.userName || "—";

  const nominalOf = (p: PaymentData) =>
    Number(p.amount ?? p.totalAmount ?? p.gross_amount ?? 0);

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n || 0);

  const fmtDatePretty = (v?: any) => {
    const d = v ? new Date(v) : new Date();
    return isNaN(d.getTime())
      ? "—"
      : new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(d);
  };

  // --- Status badge (hanya cicilan pending → Belum Dibayar; lainnya Lunas) ---
  const renderStatus = (p: PaymentData) => {
    const t = (p.paymentType || "").toLowerCase();
    const st = (p.adminStatus || p.status || "").toLowerCase();
    if ((t.includes("cicilan") || t.includes("installment")) && st === "pending") {
      return (
        <span className="inline-flex rounded-full bg-red-100 text-red-700 px-2 py-1 text-xs font-semibold">
          Belum Dibayar
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-semibold">
        Lunas
      </span>
    );
  };

  // ================= XLS: No, No.Anggota, Nama Anggota, No.Inv, Tanggal INV, Total Pembayaran, Status Pembayaran =================

  // cache no anggota per userId (tidak mengubah logic fetch yang ada)
  const memberCodeCache = React.useRef<Map<string, string>>(new Map());

  async function getMemberCode(userId?: string): Promise<string> {
    if (!userId) return "—";
    const cached = memberCodeCache.current.get(userId);
    if (cached) return cached;
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error("not ok");
      const js = await res.json();
      const code =
        js?.user?.userCode || js?.user?.memberCode || js?.userCode || js?.memberCode || "—";
      memberCodeCache.current.set(userId, String(code));
      return String(code);
    } catch {
      return "—";
    }
  }

  function statusForXls(p: PaymentData): string {
    const t = (p.paymentType || "").toLowerCase();
    const st = (p.adminStatus || p.status || "").toLowerCase();
    if (t.includes("full")) return "Lunas";
    if (t.includes("reg")) return "Lunas";
    if (t.includes("cicilan") || t.includes("installment")) {
      return st === "pending" ? "Belum Dibayar" : "Cicilan";
    }
    return "—";
  }

  const fmtDateShort = (v?: any) => {
    const d = v ? new Date(v) : new Date();
    return isNaN(d.getTime())
      ? "—"
      : new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(d);
  };

  /**
   * ======== BARU (KHUSUS EXPORT): Ambil SEMUA halaman sesuai filter aktif ========
   * Tidak mengubah state/list UI. Hanya dipakai saat klik Export.
   */
  async function fetchAllInvoicesForExport() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("sort", sort);
    params.set("page", "1");
    if (category) params.set("category", category);
    // Jika API dukung perPage, set besar untuk mengurangi jumlah request (abaikan jika tidak dipakai backend)
    params.set("perPage", "200");

    const first = await fetch(`/api/invoice?${params.toString()}`, { cache: "no-store" });
    if (!first.ok) throw new Error(await first.text());
    const firstJson: InvoiceResponse = await first.json();

    let all: PaymentData[] = Array.isArray(firstJson.payments) ? [...firstJson.payments] : [];
    const totalPages = Number(firstJson.totalPages || 1);

    for (let p = 2; p <= totalPages; p++) {
      params.set("page", String(p));
      const res = await fetch(`/api/invoice?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const js: InvoiceResponse = await res.json();
      if (Array.isArray(js.payments)) all = all.concat(js.payments);
    }

    return all;
  }

  // Export XLS sesuai format yang kamu minta
  const handleExportXLS = async () => {
    try {
      // === KUNCI: Ambil SEMUA data sesuai filter aktif, TANPA mengubah UI/logic lain ===
      const allPayments = await fetchAllInvoicesForExport();

      // Replikasi logic grouping yang sama seperti di UI,
      // tetapi berbasis allPayments agar export mencakup keseluruhan data.
      const map = new Map<string, PaymentData[]>();
      const _cicilanItems: PaymentData[] = [];
      const nonCicilanItems: PaymentData[] = [];

      for (const p of allPayments) {
        if (
          p.paymentType === "cicilan-installment" &&
          isApproved(p) &&
          (p as any).cicilanOrderId
        ) {
          const oid = String((p as any).cicilanOrderId);
          if (!map.has(oid)) map.set(oid, []);
          map.get(oid)!.push(p);
        } else {
          nonCicilanItems.push(p);
        }
      }

      const groupsAll = Array.from(map.entries()).map(([orderId, items]) => {
        const sorted = items
          .slice()
          .sort(
            (a, b) =>
              ((a as any).installmentNumber ?? 0) - ((b as any).installmentNumber ?? 0)
          );
        return { orderId, items: sorted };
      });

      // kumpulkan semua rows yang akan diekspor (tiap transaksi = 1 baris)
      type Row = {
        "No": number | string;
        "No.Anggota": string;
        "Nama Anggota": string;
        "No.Inv": string;
        "Tanggal INV": string;
        "Total Pembayaran": string; // sudah Rp
        "Status Pembayaran": string;
      };
      const rows: Row[] = [];

      // Prefetch member codes (supaya hemat hit API)
      const userIds = new Set<string>();
      groupsAll.forEach((g) => g.items.forEach((p) => p.userId && userIds.add(String(p.userId))));
      nonCicilanItems.forEach((p) => p.userId && userIds.add(String(p.userId)));
      await Promise.all(Array.from(userIds).map((id) => getMemberCode(id)));

      let no = 1;

      // Cicilan (setiap item cicilan diekspor baris sendiri)
      for (const g of groupsAll) {
        for (const p of g.items) {
          const noAnggota = await getMemberCode(p.userId as any);
          rows.push({
            "No": no++,
            "No.Anggota": noAnggota,
            "Nama Anggota": String(p.userName ?? "—"),
            "No.Inv": String(p.orderId || p.ref || p._id),
            "Tanggal INV": fmtDateShort(p.updatedAt || p.createdAt),
            "Total Pembayaran": fmtCurrency(nominalOf(p)),
            "Status Pembayaran": statusForXls(p),
          });
        }
      }

      // Non-cicilan
      for (const p of nonCicilanItems) {
        const noAnggota = await getMemberCode(p.userId as any);
        rows.push({
          "No": no++,
          "No.Anggota": noAnggota,
          "Nama Anggota": String(p.userName ?? "—"),
          "No.Inv": String(p.orderId || p.ref || p._id),
          "Tanggal INV": fmtDateShort(p.updatedAt || p.createdAt),
          "Total Pembayaran": fmtCurrency(nominalOf(p)),
          "Status Pembayaran": statusForXls(p),
        });
      }

      // tulis XLS (tetap gunakan styling yang sama)
      const XLSX = await getXLSX();
      const ws = XLSX.utils.json_to_sheet(rows);

      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddr]) continue;
          ws[cellAddr].s = {
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } },
            },
            font:
              R === 0
                ? { bold: true, color: { rgb: "000000" } }
                : { bold: false, color: { rgb: "000000" } },
          };
        }
      }

      // optional: auto width
      const colWidths = [
        { wch: 6 },  // No
        { wch: 14 }, // No.Anggota
        { wch: 28 }, // Nama
        { wch: 28 }, // No.Inv
        { wch: 14 }, // Tanggal
        { wch: 18 }, // Total Pembayaran
        { wch: 18 }, // Status Pembayaran
      ];
      (ws["!cols"] as any) = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Invoice");
      XLSX.writeFile(wb, `Tarikan_Invoice_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Gagal mengekspor XLSX.");
    }
  };

  // --- UI states ---
  if (loading) {
    return (
      <InvoiceLayout>
        <div className="p-4 sm:p-6">
          <Loader2 className="animate-spin" />
        </div>
      </InvoiceLayout>
    );
  }
  if (error) {
    return (
      <InvoiceLayout>
        <div className="p-6 text-red-500">Error: {error}</div>
      </InvoiceLayout>
    );
  }
  if (!data) {
    return (
      <InvoiceLayout>
        <div className="p-6">Tidak ada data</div>
      </InvoiceLayout>
    );
  }

  // penomoran: 1 grup cicilan = 1 nomor (sub-row tidak menambah) — hanya untuk TABEL UI
  let rowNo = (page - 1) * PER_PAGE + 1;

  return (
    <InvoiceLayout>
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 font-[family-name:var(--font-poppins)]">
        <header>
          <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-2">
                Invoice
              </h1>
              <p className="text-[#889063] dark:text-gray-200">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Tombol Export XLS (tidak mengubah logic lain) */}
            <button
              onClick={handleExportXLS}
              className="h-10 px-4 rounded-xl border bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-semibold"
              title="Export Excel semua baris di halaman ini"
            >
              Export XLS
            </button>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-4 sm:p-6 lg:p-8 border shadow-xl">
            <InvoiceControls
              q={q}
              sort={sort}
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              perPage={PER_PAGE}
            />

            {/* Filter Kategori (tetap) */}
            <div className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-2">
                  Filter Kategori
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={catDraft}
                    onChange={(e) => setCatDraft(e.target.value)}
                    className="min-w-[220px] border rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="">Semua</option>
                    <option value="registration">Registration</option>
                    <option value="cicilan">Cicilan (Approved)</option>
                    <option value="full">Full Investment</option>
                  </select>
                  <button
                    onClick={() => {
                      const qs = buildQS({ category: catDraft });
                      router.push(`${pathname}?${qs}`);
                    }}
                    className="px-4 py-2 text-sm rounded-xl border"
                  >
                    Terapkan
                  </button>
                  <button
                    onClick={() => {
                      setCatDraft("");
                      const qs = buildQS({ category: "" });
                      router.push(`${pathname}?${qs}`);
                    }}
                    className="px-4 py-2 text-sm rounded-xl border"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* ====================== TABEL ====================== */}
            <div className="mt-6 sm:mt-8 overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-sm text-[#324D3E] dark:text-white">
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Jenis</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Nominal</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {/* Grup Cicilan (parent row + sub rows) */}
                  {installmentGroups.map((g) => {
                    const first = g.items[0];
                    const userEmail = emailOf(first);
                    const tanggal = fmtDatePretty(first.updatedAt || first.createdAt);

                    return (
                      <React.Fragment key={`grpwrap-${g.orderId}`}>
                        <tr
                          key={`grp-${g.orderId}`}
                          className="bg-white dark:bg-gray-800 rounded-xl shadow border border-[#324D3E]/10 dark:border-gray-700"
                        >
                          <td className="px-4 py-3 align-top">{rowNo++}</td>
                          <td className="px-4 py-3 align-top">Pembayaran Cicilan</td>
                          <td className="px-4 py-3 align-top">{userEmail}</td>
                          <td className="px-4 py-3 align-top">-</td>
                          <td className="px-4 py-3 align-top">{tanggal}</td>
                          <td className="px-4 py-3 align-top break-all">{g.orderId}</td>
                          <td className="px-4 py-3 align-top">{renderStatus(first)}</td>
                          <td className="px-4 py-3 align-top">
                            <button
                              onClick={() => toggleGroup(g.orderId)}
                              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50"
                            >
                              {expanded[g.orderId] ? "Sembunyikan" : "Lihat detail"}
                            </button>
                          </td>
                        </tr>

                        {expanded[g.orderId] &&
                          g.items.map((p, idx) => (
                            <tr
                              key={(p.ref || p._id) + "-sub"}
                              className="bg-white dark:bg-gray-800 rounded-xl shadow border border-[#324D3E]/10 dark:border-gray-700"
                            >
                              <td className="px-4 py-3 align-top" />
                              <td className="px-4 py-3 align-top">
                                Cicilan #{(p as any).installmentNumber ?? idx + 1}
                              </td>
                              <td className="px-4 py-3 align-top">{emailOf(p)}</td>
                              <td className="px-4 py-3 align-top">
                                {fmtCurrency(nominalOf(p))}
                              </td>
                              <td className="px-4 py-3 align-top">
                                {fmtDatePretty(p.updatedAt || p.createdAt)}
                              </td>
                              <td className="px-4 py-3 align-top break-all">
                                {String(p.orderId || p.ref || p._id)}
                              </td>
                              <td className="px-4 py-3 align-top">{renderStatus(p)}</td>
                              <td className="px-4 py-3 align-top">
                                <button
                                  onClick={() => downloadInvoiceImage(p)}
                                  className="px-3 py-1.5 text-sm rounded-lg bg-[#2f3e33] text-white"
                                >
                                  Unduh
                                </button>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}

                  {/* Baris lain (full, registration, dll) */}
                  {otherPayments.map((p) => (
                    <tr
                      key={p.ref || p._id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow border border-[#324D3E]/10 dark:border-gray-700"
                    >
                      <td className="px-4 py-3 align-top">{rowNo++}</td>
                      <td className="px-4 py-3 align-top">
                        {(() => {
                          const x = (p.paymentType || "").toLowerCase();
                          if (x.includes("full")) return "Pembayaran Penuh";
                          if (x.includes("cicilan") || x.includes("installment"))
                            return "Pembayaran Cicilan";
                          if (x.includes("reg")) return "Pendaftaran";
                          return "—";
                        })()}
                      </td>
                      <td className="px-4 py-3 align-top">{emailOf(p)}</td>
                      <td className="px-4 py-3 align-top">{fmtCurrency(nominalOf(p))}</td>
                      <td className="px-4 py-3 align-top">
                        {fmtDatePretty(p.updatedAt || p.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top break-all">
                        {String(p.orderId || p.ref || p._id)}
                      </td>
                      <td className="px-4 py-3 align-top">{renderStatus(p)}</td>
                      <td className="px-4 py-3 align-top">
                        <button
                          onClick={() => downloadInvoiceImage(p)}
                          className="px-3 py-1.5 text-sm rounded-lg bg-[#2f3e33] text-white"
                        >
                          Unduh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {installmentGroups.length === 0 && otherPayments.length === 0 && (
                <div className="text-center py-8">Tidak ada invoice yang cocok.</div>
              )}
            </div>
            {/* =================================================== */}
          </div>
        </header>
      </div>
    </InvoiceLayout>
  );
}

export default function InvoicePage() {
  return (
    <Suspense
      fallback={
        <InvoiceLayout>
          <div className="p-4 sm:p-6">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Memuat halaman invoice...</span>
          </div>
        </InvoiceLayout>
      }
    >
      <InvoicePageContent />
    </Suspense>
  );
}
