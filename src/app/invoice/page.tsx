"use client";

import InvoiceCard from "@/components/invoice/InvoiceCard";
import InvoiceControls from "@/components/invoice/InvoiceControls";
import { InvoiceLayout } from "@/components/invoice/InvoiceLayout";
import { Loader2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

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

  // helper
  const isApproved = (p: PaymentData) =>
    String((p as any).adminStatus || p.status || "").toLowerCase() === "approved";

  // group cicilan -> [{ orderId, items(sorted), paidCount, totalInstallments, userName }]
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

  // non cicilan + cicilan yg sudah digroup (hanya tampilkan sisanya)
  const otherPayments = useMemo(() => {
    if (!data) return [];
    const skip = new Set<string>();
    for (const g of installmentGroups) {
      for (const it of g.items) skip.add(it.ref || it._id);
    }
    return data.payments.filter((p) => !skip.has(p.ref || p._id));
  }, [data, installmentGroups]);

  // ===== Modal state untuk detail cicilan (UI saja) =====
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const closeModal = () => setActiveGroup(null);

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

  // data group aktif buat modal
  const activeData = activeGroup
    ? installmentGroups.find((g) => g.orderId === activeGroup)
    : null;

  return (
    <InvoiceLayout>
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 font-[family-name:var(--font-poppins)]">
        <header>
          <div className="mb-6 sm:mb-8">
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

              {otherPayments.map((payment) => (
                <InvoiceCard key={payment.ref || payment._id} payment={payment} />
              ))}
            </div>

            {installmentGroups.length === 0 && otherPayments.length === 0 && (
              <div className="text-center py-8">Tidak ada invoice yang cocok.</div>
            )}
          </div>
        </header>
      </div>

      {/* ===== Modal Detail Cicilan (UI only) ===== */}
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

            {/* Grid: maks 4 per baris, kontainer dibatasi 2 baris-an lalu scroll */}
            <div className="max-h-[600px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeData.items.map((payment) => (
                  <InvoiceCard key={payment.ref || payment._id} payment={payment} />
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
