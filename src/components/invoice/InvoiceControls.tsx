"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowUpWideNarrow, ArrowDownNarrowWide, ChevronLeft, ChevronRight } from "lucide-react";

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
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            pushParams({ q: localQ });
          }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Cari REF / OrderId / Tanggal (yyyy-mm-dd)"
              className="pl-9 pr-3 py-2 rounded-lg border text-sm w-72"
            />
            <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold"
          >
            Search
          </button>
        </form>

        {/* Right side: sort + page info + pagination */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sort */}
          <button
            onClick={() => pushParams({ sort: sort === "desc" ? "asc" : "desc" })}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm"
            title={sort === "desc" ? "Urutkan: Terlama" : "Urutkan: Terbaru"}
          >
            {sort === "desc" ? <ArrowUpWideNarrow size={16} /> : <ArrowDownNarrowWide size={16} />}
            {sort === "desc" ? "Terbaru" : "Terlama"}
          </button>

          {/* Info */}
          <span className="text-sm text-slate-600">
            {total} hasil · {perPage}/hal
          </span>

          {/* Pagination */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => canPrev && pushParams({ page: page - 1 })}
              disabled={!canPrev}
              className="p-2 rounded-lg border disabled:opacity-40"
              aria-label="Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            {pages.map((p) => (
              <button
                key={p}
                onClick={() => pushParams({ page: p })}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  p === page ? "bg-slate-900 text-white" : "bg-white"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => canNext && pushParams({ page: page + 1 })}
              disabled={!canNext}
              className="p-2 rounded-lg border disabled:opacity-40"
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
