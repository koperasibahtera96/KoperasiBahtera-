"use client";

import InvoiceCard from "@/components/invoice/InvoiceCard";
import InvoiceControls from "@/components/invoice/InvoiceControls";
import { InvoiceLayout } from "@/components/invoice/InvoiceLayout";
import { Loader2, X, FileDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

// ===== XLSX (dynamic, aman SSR) =====
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
  currency: string;
  paymentType: string;
  status: string;
  createdAt: string;
  userName: string;
  userImage?: string;
  [key: string]: any;
}

interface InvoiceResponse {
  payments: PaymentData[];
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
}

const PER_PAGE = 9;

/** =========================
 *  WARNA/GRADASI KARTU (UI)
 *  =========================
 *  - Full/Registration => gradasi kuning (lebih gelap)
 *  - Cicilan => gradasi bata/merah (lebih gelap)
 *  - Border luar tipis hitam
 */
const GRAD_FULL =
  "linear-gradient(180deg, #d97706 0%, #f59e0b 45%, #fbbf24 75%, #ffd166 100%)";
const GRAD_CICIL =
  "linear-gradient(180deg, #7a1f0f 0%, #b7410e 45%, #e86f3a 75%, #ffb199 100%)";
const GRAD_DEFAULT =
  "linear-gradient(180deg, #d1d5db 0%, #e5e7eb 55%, #f3f4f6 100%)";

function cardGradientByPayment(p: PaymentData) {
  const t = (p?.paymentType || "").toLowerCase();
  if (t.includes("cicil")) return GRAD_CICIL;
  if (t.includes("full") || t.includes("registrasi") || t.includes("registration"))
    return GRAD_FULL;
  return GRAD_DEFAULT;
}

function InvoicePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<InvoiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- query params ---
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

  const isApproved = (p: PaymentData) =>
    String((p as any).adminStatus || p.status || "").toLowerCase() === "approved";

  // Group cicilan
  const installmentGroups = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, PaymentData[]>();
    for (const p of data.payments) {
      if (p.paymentType === "cicilan-installment" && isApproved(p) && (p as any).cicilanOrderId) {
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

  const otherPayments = useMemo(() => {
    if (!data) return [];
    const skip = new Set<string>();
    for (const g of installmentGroups) {
      for (const it of g.items) skip.add(it.ref || it._id);
    }
    return data.payments.filter((p) => !skip.has(p.ref || p._id));
  }, [data, installmentGroups]);

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const closeModal = () => setActiveGroup(null);

  // ===== Export Excel (logika tetap) =====
  const exportExcel = async () => {
    if (!data) return;
    const XLSX = await getXLSX();

    const userIds = Array.from(
      new Set<string>(
        data.payments
          .map((p: any) => String(p.userId || p.user_id || p.user || ""))
          .filter(Boolean)
      )
    );

    const userMap: Record<
      string,
      { id: string; email: string; fullName?: string; userCode?: string }
    > = {};

    await Promise.all(
      userIds.map(async (id) => {
        try {
          const r = await fetch(`/api/users/${id}`, { cache: "no-store" });
          if (r.ok) {
            const j = await r.json();
            if (j?.user) userMap[id] = j.user;
          }
        } catch {}
      })
    );

    const statusPembayaran = (pt: string) => {
      const s = (pt || "").toLowerCase();
      if (s.includes("cicil")) return "CICILAN";
      if (s.includes("full") || s.includes("registrasi") || s.includes("registration"))
        return "LUNAS";
      return s.toUpperCase() || "—";
    };

    const header = [
      "No",
      "No. Anggota",
      "Nama Anggota",
      "No. INV",
      "Tanggal INV",
      "Total Pembayaran",
      "Status Pembayaran",
    ];

    const rows = data.payments.map((p, i) => {
      const uid = String((p as any).userId || (p as any).user_id || (p as any).user || "");
      const u = userMap[uid];
      const tanggal = (p as any).updatedAt
        ? new Date((p as any).updatedAt).toLocaleDateString("id-ID")
        : p.createdAt
        ? new Date(p.createdAt).toLocaleDateString("id-ID")
        : "-";
      const total = Number(p.amount ?? 0);

      return [
        i + 1,
        u?.userCode || "-",
        u?.fullName || p.userName || "-",
        p.orderId,
        tanggal,
        total,
        statusPembayaran(p.paymentType),
      ];
    });

    const aoa = [["Tarikan Data Invoice"], [], header, ...rows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!cols"] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
    ];

    const border = {
      top: { style: "thin" },
      right: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
    };
    const XLSXAny: any = XLSX;
    const range = XLSXAny.utils.decode_range(ws["!ref"]);
    for (let r = 2; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddr = XLSXAny.utils.encode_cell({ r, c });
        const cell = ws[cellAddr];
        if (!cell) continue;
        cell.s = { ...(cell.s || {}), border };
        if (r === 2) cell.s = { ...(cell.s || {}), font: { bold: true } };
        if (r > 2 && c === 5) cell.z = "#,##0";
      }
    }

    XLSXAny.utils.book_append_sheet(wb, ws, "Invoice");
    XLSXAny.writeFile(
      wb,
      `Tarikan_Invoice_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // --- states UI ---
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

  const activeData = activeGroup
    ? installmentGroups.find((g) => g.orderId === activeGroup)
    : null;

  return (
    <InvoiceLayout>
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 font-[family-name:var(--font-poppins)]">
        <header>
          <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
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

            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#324D3E] to-[#4C3D19] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-95"
            >
              <FileDown className="w-4 h-4" />
              Export Excel
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

            {/* filter kategori (tetap) */}
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

            {/* grup cicilan + pembayaran lain */}
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
              {installmentGroups.map((g) => (
                <div
                  key={g.orderId}
                  className="rounded-2xl border bg-white/80 dark:bg-gray-800/80 shadow p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-[#889063]">Cicilan (Approved)</div>
                      <div className="font-semibold break-all">{g.orderId}</div>
                      <div className="text-xs mt-1">
                        {g.paidCount} payment
                        {g.totalInstallments ? ` dari ${g.totalInstallments} Cicilan` : ""}
                      </div>
                      {g.userName && (
                        <div className="text-xs text-[#889063]">Atas nama: {g.userName}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveGroup(g.orderId)}
                      className="text-sm px-3 py-1.5 rounded-xl border"
                    >
                      Lihat Detail
                    </button>
                  </div>
                </div>
              ))}

              {/* ====== KARTU DENGAN GRADASI DI BADAN & BORDER TIPIS HITAM ====== */}
              {otherPayments.map((payment) => (
                <div
                  key={payment.ref || payment._id}
                  className="rounded-3xl p-4 shadow-lg border border-black/80"
                  style={{ background: cardGradientByPayment(payment) }}
                >
                  <InvoiceCard payment={payment} />
                </div>
              ))}
            </div>

            {installmentGroups.length === 0 && otherPayments.length === 0 && (
              <div className="text-center py-8">Tidak ada invoice yang cocok.</div>
            )}
          </div>
        </header>
      </div>

      {/* ===== Modal Detail Cicilan ===== */}
      {activeData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-7xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <div className="text-xs text-[#889063]">Cicilan (Approved)</div>
              <div className="font-semibold break-all">{activeData.orderId}</div>
              <div className="text-xs">
                {activeData.paidCount} payment
                {activeData.totalInstallments
                  ? ` dari ${activeData.totalInstallments} Cicilan`
                  : ""}
              </div>
              {activeData.userName && (
                <div className="text-xs text-[#889063]">
                  Atas nama: {activeData.userName}
                </div>
              )}
            </div>

            <div className="max-h-[600px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeData.items.map((payment) => (
                  <div
                    key={payment.ref || payment._id}
                    className="rounded-3xl p-4 shadow-lg border border-black/80"
                    style={{ background: cardGradientByPayment(payment) }}
                  >
                    <InvoiceCard payment={payment} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
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
