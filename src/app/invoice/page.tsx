"use client";

import InvoiceCard from "@/components/invoice/InvoiceCard";
import InvoiceControls from "@/components/invoice/InvoiceControls";
import { InvoiceLayout } from "@/components/invoice/InvoiceLayout";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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
  const category = searchParams.get("category") || ""; // "", "registration", "cicilan", "full"

  // Local UI state for category selector (so you can change then Apply)
  const [catDraft, setCatDraft] = useState(category);

  useEffect(() => {
    setCatDraft(category);
  }, [category]);

  // Build querystring helper
  const buildQS = (next: Record<string, string | number | undefined | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") sp.delete(k);
      else sp.set(k, String(v));
    });
    // reset to page 1 when filter changes
    if ("category" in next || "q" in next || "sort" in next) {
      sp.set("page", "1");
    }
    return sp.toString();
  };

  // Fetch data
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

      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Refetch when deps change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, page, category]);

  // Loading UI
  if (loading) {
    return (
      <InvoiceLayout>
        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 font-[family-name:var(--font-poppins)]">
          <header>
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-2 sm:mb-4 transition-colors duration-300">
                Invoice
              </h1>
              <p className="text-[#889063] dark:text-gray-200 text-base sm:text-lg transition-colors duration-300">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-4 sm:p-6 lg:p-8 border border-[#324D3E]/10 dark:border-gray-700 shadow-xl transition-colors duration-300">
              {/* Loading skeleton for controls */}
              <div className="animate-pulse">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-6"></div>
              </div>

              {/* Loading skeleton for cards */}
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
                  </div>
                ))}
              </div>

              {/* Loading indicator */}
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#324D3E]" />
                <span className="ml-2 text-[#889063] dark:text-gray-200">
                  Memuat data invoice...
                </span>
              </div>
            </div>
          </header>
        </div>
      </InvoiceLayout>
    );
  }

  // Error UI
  if (error) {
    return (
      <InvoiceLayout>
        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 font-[family-name:var(--font-poppins)]">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
              Terjadi Kesalahan
            </h2>
            <p className="text-red-500 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </InvoiceLayout>
    );
  }

  // Empty UI
  if (!data) {
    return (
      <InvoiceLayout>
        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 font-[family-name:var(--font-poppins)]">
          <div className="text-center text-[#889063] dark:text-gray-200 py-12">
            <p>Tidak ada data yang tersedia</p>
          </div>
        </div>
      </InvoiceLayout>
    );
  }

  return (
    <InvoiceLayout>
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 font-[family-name:var(--font-poppins)]">
        <header>
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-2 sm:mb-4 transition-colors duration-300">
              Invoice
            </h1>
            <p className="text-[#889063] dark:text-gray-200 text-base sm:text-lg transition-colors duration-300">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-4 sm:p-6 lg:p-8 border border-[#324D3E]/10 dark:border-gray-700 shadow-xl transition-colors duration-300">
            {/* Controls (tetap) */}
            <InvoiceControls
              q={q}
              sort={sort}
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              perPage={PER_PAGE}
            />

            {/* Tambahan: Filter Kategori tanpa mengubah logic komponen lain */}
            <div className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-2">
                  Filter Kategori
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={catDraft}
                    onChange={(e) => setCatDraft(e.target.value)}
                    className="w-full md:w-auto min-w-[220px] border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 transition-colors duration-300"
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
                    className="rounded-xl border border-[#324D3E]/20 dark:border-gray-600 px-4 py-2 text-sm hover:bg-[#324D3E] hover:text-white text-[#324D3E] dark:text-white bg-white/20 dark:bg-gray-700/50 backdrop-blur-xl transition-all duration-300"
                  >
                    Terapkan
                  </button>

                  <button
                    onClick={() => {
                      setCatDraft("");
                      const qs = buildQS({ category: "" });
                      router.push(`${pathname}?${qs}`);
                    }}
                    className="rounded-xl border border-transparent px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-[#324D3E] dark:text-white transition-colors duration-300"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
              {data.payments.map((payment) => (
                <InvoiceCard
                  key={payment.ref || payment._id}
                  payment={payment}
                />
              ))}
            </div>

            {data.payments.length === 0 && (
              <div className="text-center text-[#889063] dark:text-gray-200 py-8 sm:py-12 bg-white/60 dark:bg-gray-700/60 backdrop-blur-lg rounded-2xl border border-[#324D3E]/10 dark:border-gray-600 mt-6 sm:mt-8 transition-colors duration-300">
                <div className="text-sm sm:text-base">
                  Tidak ada invoice yang cocok.
                </div>
              </div>
            )}
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
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 font-[family-name:var(--font-poppins)]">
            <header>
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-2 sm:mb-4 transition-colors duration-300">
                  Invoice
                </h1>
                <p className="text-[#889063] dark:text-gray-200 text-base sm:text-lg transition-colors duration-300">
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-4 sm:p-6 lg:p-8 border border-[#324D3E]/10 dark:border-gray-700 shadow-xl transition-colors duration-300">
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#324D3E]" />
                  <span className="ml-2 text-[#889063] dark:text-gray-200">
                    Memuat halaman invoice...
                  </span>
                </div>
              </div>
            </header>
          </div>
        </InvoiceLayout>
      }
    >
      <InvoicePageContent />
    </Suspense>
  );
}
