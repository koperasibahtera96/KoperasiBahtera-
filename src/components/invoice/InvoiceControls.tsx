"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowUpWideNarrow, ArrowDownWideNarrow, ChevronLeft, ChevronRight } from "lucide-react";

export default function InvoiceControls({
  q,
  sort,
  page,
  totalPages,
  total,
  perPage,
}: {
  q: string;
  sort: "asc" | "desc";
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
}) {
  const [localQ, setLocalQ] = useState(q);
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();

  // keep input in sync when user navigates
  useEffect(() => setLocalQ(q), [q]);

  function pushParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === null || v === "") params.delete(k);
      else params.set(k, String(v));
    }
    // reset page if q/sort changed
    if (("q" in next || "sort" in next) && !("page" in next)) params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pages = useMemo(() => {
    const out: number[] = [];
    const max = totalPages;
    const cur = page;
    const span = 2; // show current ±2
    const start = Math.max(1, cur - span);
    const end = Math.min(max, cur + span);
    for (let i = start; i <= end; i++) out.push(i);
    if (!out.includes(1)) out.unshift(1);
    if (!out.includes(max)) out.push(max);
    return Array.from(new Set(out));
  }, [page, totalPages]);

  return (
    <section className="rounded-3xl border border-[#324D3E]/10 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg p-4 sm:p-6 shadow-lg transition-colors duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            pushParams({ q: localQ });
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1 sm:flex-none">
            <input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Cari REF / OrderId / Tanggal (yyyy-mm-dd)"
              className="w-full sm:w-64 md:w-72 lg:w-80 xl:w-96 pl-10 pr-4 py-3 rounded-2xl border border-[#324D3E]/20 dark:border-gray-600 bg-white/90 dark:bg-gray-700/80 text-sm text-[#324D3E] dark:text-white placeholder:text-[#889063] dark:placeholder:text-gray-300 focus:border-[#324D3E]/50 focus:ring-2 focus:ring-[#324D3E]/10 transition-all duration-300"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#889063] dark:text-gray-300" />
          </div>
          <button
            type="submit"
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white text-sm font-semibold hover:shadow-lg transition-all duration-300 whitespace-nowrap"
          >
            Search
          </button>
        </form>

        {/* Right side: sort + page info + pagination */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-start sm:items-center gap-3 lg:gap-4">
          {/* Sort */}
          <button
            onClick={() => pushParams({ sort: sort === "desc" ? "asc" : "desc" })}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-[#324D3E]/20 dark:border-gray-600 bg-white/80 dark:bg-gray-700/80 text-sm hover:bg-[#324D3E]/5 dark:hover:bg-gray-700 transition-all duration-300 whitespace-nowrap"
            title={sort === "desc" ? "Urutkan: Terlama" : "Urutkan: Terbaru"}
          >
            {sort === "desc" ? <ArrowUpWideNarrow size={16} /> : <ArrowDownWideNarrow size={16} />}
            <span className="text-[#324D3E] dark:text-white font-medium">{sort === "desc" ? "Terbaru" : "Terlama"}</span>
          </button>

          {/* Info */}
          <span className="text-sm text-[#889063] dark:text-gray-200 font-medium whitespace-nowrap">
            {total} hasil · {perPage}/hal
          </span>

          {/* Pagination */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => canPrev && pushParams({ page: page - 1 })}
              disabled={!canPrev}
              className="p-2 rounded-xl border border-[#324D3E]/20 dark:border-gray-600 disabled:opacity-40 hover:bg-[#324D3E]/5 dark:hover:bg-gray-700 transition-all duration-300 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
              {pages.map((p) => (
                <button
                  key={p}
                  onClick={() => pushParams({ page: p })}
                  className={`px-2 sm:px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-300 flex-shrink-0 min-w-[36px] cursor-pointer ${
                    p === page 
                      ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white border-[#324D3E] shadow-lg" 
                      : "bg-white/80 dark:bg-gray-700/80 text-[#324D3E] dark:text-white border-[#324D3E]/20 dark:border-gray-600 hover:bg-[#324D3E]/5 dark:hover:bg-gray-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => canNext && pushParams({ page: page + 1 })}
              disabled={!canNext}
              className="p-2 rounded-xl border border-[#324D3E]/20 dark:border-gray-600 disabled:opacity-40 hover:bg-[#324D3E]/5 dark:hover:bg-gray-700 transition-all duration-300 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
