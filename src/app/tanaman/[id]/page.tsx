// app/tanaman/[id]/page.tsx
"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { prefetchFinanceCaches } from "@/lib/finance";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  DollarSign,
  FileDown,
  Leaf,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// util lama (tetap dipakai untuk metadata tanaman)
import { PLANT_TYPES } from "@/lib/finance";

// ================== helpers ==================
const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const BRUTALIST_COLORS = [
  "#FF6B35",
  "#F7931E",
  "#FFD23F",
  "#06FFA5",
  "#118AB2",
  "#073B4C",
];

/* ======== SATU TOMBOL EXPORT: gabung semua section jadi satu .xls ======== */
function exportAllAsXls(args: {
  plantTypeId: string;
  plantTypeName: string;
  selectedYear: number;
  totalInvestAll: number;
  totalNet: number;
  investorCount: number;
  monthlySelectedYear: Array<{ month: string; net: number }>;
  yearlyRows: Array<{ year: number; totalProfit: number }>;
  /** ==== TAMBAHAN BARU ==== */
  contractsCount: number;
  detailRows: Array<{
    no: number;
    noAnggota: string;
    namaInvestor: string;
    kavling: string;
    totalInvest: number;
    totalProfit: number;
    roiIndividuPct: string; // "12.34%"
  }>;
}) {
  const {
    plantTypeId,
    plantTypeName,
    selectedYear,
    totalInvestAll,
    totalNet,
    investorCount,
    monthlySelectedYear,
    yearlyRows,
    /** baru */
    contractsCount,
    detailRows,
  } = args;

  const roiPct = totalInvestAll > 0 ? (totalNet / totalInvestAll) * 100 : 0;

  const html = `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th { background:#90EE90; font-weight: bold; padding:8px; border:2px solid #000; text-align:left; }
      td { padding:8px; border:1px solid #000; }
      .title { font-size:22px; font-weight:700; margin: 0 0 8px 0; }
      .header { font-size:16px; font-weight:700; margin: 18px 0 8px 0; }
      .small { font-size:12px; }
      .right { text-align:right; }
      /* ====== BAR JUDUL BIRU UNTUK TABEL DETAIL ====== */
      .section-title { background:#7fb3e6; color:#0b2239; border:2px solid #000; text-align:center; padding:6px 8px; font-weight:700; }
    </style>
  </head>
  <body>
    <div class="title">Laporan ${plantTypeName}</div>

    <div class="header">RINGKASAN</div>
    <table>
      <tr><th>Keterangan</th><th>Nilai</th></tr>
      <tr><td>Total Investasi</td><td class="right">${fmtIDR(totalInvestAll)}</td></tr>
      <tr><td>Total Profit (Net)</td><td class="right">${fmtIDR(totalNet)}</td></tr>
      <tr><td>ROI (Profit/Invest)</td><td class="right">${roiPct.toFixed(2)}%</td></tr>
      <tr><td>Jumlah Investor</td><td class="right">${investorCount}</td></tr>
      <tr><td>Jumlah Kontrak</td><td class="right">${contractsCount}</td></tr>
    </table>

    <div class="header">LAPORAN BULANAN ${selectedYear}</div>
    <table>
      <tr><th>Bulan</th><th>Net Profit</th></tr>
      ${monthlySelectedYear
        .map(
          (r) => `
        <tr>
          <td>${r.month}</td>
          <td class="right">${fmtIDR(r.net)}</td>
        </tr>`
        )
        .join("")}
    </table>

    <div class="header">RINGKASAN TAHUNAN</div>
    <table>
      <tr><th>Tahun</th><th>Total Profit</th></tr>
      ${yearlyRows
        .map(
          (y) => `
        <tr>
          <td>${y.year}</td>
          <td class="right">${fmtIDR(y.totalProfit)}</td>
        </tr>`
        )
        .join("")}
    </table>

    <!-- ====== DETAIL: HEADER BAR BIRU + TABEL ====== -->
    <table>
      <tr>
        <td class="section-title" colspan="7">Detail Tarikan Repot Per Pohon</td>
      </tr>
      <tr>
        <th>No</th>
        <th>No Anggota</th>
        <th>Nama Investor</th>
        <th>Kode Blok/Paket</th>
        <th>Total Investasi</th>
        <th>Total Profit</th>
        <th>ROI Individu</th>
      </tr>
      ${detailRows
        .map(
          (d) => `
        <tr>
          <td>${d.no}</td>
          <td>${d.noAnggota || ""}</td>
          <td>${d.namaInvestor}</td>
          <td>${d.kavling || ""}</td>
          <td class="right">${fmtIDR(d.totalInvest)}</td>
          <td class="right">${fmtIDR(d.totalProfit)}</td>
          <td class="right">${d.roiIndividuPct}</td>
        </tr>`
        )
        .join("")}
    </table>
  </body>
  </html>
  `;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan-${plantTypeId}-${selectedYear}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ================== page ==================
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { id: plantTypeId } = use(params); // "gaharu", "jengkol", dll
  const plantTypeMeta = PLANT_TYPES.find((p) => p.id === plantTypeId) ?? {
    id: plantTypeId,
    name: plantTypeId,
    payoutEveryMonths: 0,
    baseAnnualROI: 0,
  };

  useEffect(() => {
    setMounted(true)
  }, [])

  // Theme-aware helper function
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`
    }
    return baseClasses
  }

  // ---------- PREFETCH CACHE (dibiarkan agar kompatibel, meskipun data investor sudah dari API) ----------
  const [ready, setReady] = useState(false);
  useEffect(() => {
    prefetchFinanceCaches().finally(() => setReady(true));
  }, []);

  // ========= STATE DATA DARI API BARU =========
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [totalNet, setTotalNet] = useState(0);

  // series bulanan untuk tahun yang dipilih
  const [monthlySeries, setMonthlySeries] = useState<
    Array<{ month: string; net: number }>
  >([]);
  // ringkasan tahunan
  const [yearlyRows, setYearlyRows] = useState<
    Array<{ year: number; totalProfit: number }>
  >([]);
  // per investor
  const [perInvestor, setPerInvestor] = useState<{
    rows: Array<{ name: string; invest: number; profit: number }>;
    totalInvestAll: number;
  }>({
    rows: [],
    totalInvestAll: 0,
  });
  // toggle daftar investor (mengganti Legend bawaan chart)
  const [showInvestorList, setShowInvestorList] = useState(false);

  // ====== TAMBAHAN: data untuk Jumlah Kontrak + No.Anggota + Kavling ======
  const [contractsCount, setContractsCount] = useState<number>(0);
  /** map by investor name (lowercased) → {noAnggota, kavlingList} */
  const [extraIndex, setExtraIndex] = useState<
    Map<string, { noAnggota?: string; kavlingList: string[] }>
  >(new Map());

  // ---------- FETCH DARI /api/plants?type=...&year=... ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const url = `/api/plants/summary?type=${encodeURIComponent(
          plantTypeId
        )}&year=${selectedYear}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch plants: ${res.status}`);
        const data = await res.json();

        // total net profit
        const net = Number(data?.totals?.netProfit ?? 0);

        // monthly series (sudah untuk tahun yang diminta)
        const monthly = (data?.charts?.monthlyNetProfit ?? []).map(
          (d: any) => ({
            month: String(d.monthLabel ?? d.month ?? d.ym ?? ""),
            net: Number(d.netProfit ?? d.value ?? d.net ?? 0),
          })
        );

        // yearly rows
        const yearly = (data?.tables?.yearly ?? []).map((y: any) => ({
          year: Number(y.year),
          totalProfit: Number(y.netProfit ?? y.totalProfit ?? 0),
        }));

        // per investor
        const rows = (data?.tables?.investors ?? []).map((r: any) => ({
          name: String(
            r.name ?? r.investorName ?? r.email ?? r.investorId ?? "-"
          ),
          invest: Number(r.totalInvestment ?? r.invest ?? 0),
          profit: Number(r.totalProfit ?? r.profit ?? 0),
        }));
        const totalInvestAll = rows.reduce(
          (s: number, r: any) => s + (r.invest || 0),
          0
        );

        if (!mounted) return;
        setTotalNet(net);
        setMonthlySeries(monthly);
        setYearlyRows(yearly);
        setPerInvestor({ rows, totalInvestAll });

        const years = yearly.map((y: any) => y.year);
        setAvailableYears(
          years.length
            ? ([...new Set(years)].sort((a: any, b: any) => b - a) as any)
            : [selectedYear]
        );
      } catch (e) {
        console.error("[tanaman] fetch error:", e);
        if (!mounted) return;
        setTotalNet(0);
        setMonthlySeries([]);
        setYearlyRows([]);
        setPerInvestor({ rows: [], totalInvestAll: 0 });
        setAvailableYears([selectedYear]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [plantTypeId, selectedYear]);

  // ---------- FETCH TAMBAHAN: /api/tanaman/[id]/extra untuk kontrak + anggota + kavling ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/tanaman/${encodeURIComponent(plantTypeId)}/extra`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("extra fail");
        const js = await res.json();

        if (!mounted) return;

        // jumlah kontrak (panjang plantInstances utk plantType ini)
        setContractsCount(Number(js?.contractsCount || 0));

        // bangun index by nama investor (lowercase)
        const m = new Map<string, { noAnggota?: string; kavlingList: string[] }>();
        for (const d of js?.details || []) {
          const key = String(d?.namaInvestor || "").toLowerCase();
          if (!key) continue;
          const prev = m.get(key) || { noAnggota: undefined, kavlingList: [] };
          const noA =
            d?.noAnggota || d?.memberCode || d?.userCode || prev.noAnggota;
          const kav = (d?.kavling || "").toString().trim();
          if (kav && !prev.kavlingList.includes(kav)) prev.kavlingList.push(kav);
          m.set(key, { noAnggota: noA, kavlingList: prev.kavlingList });
        }
        setExtraIndex(m);
      } catch {
        // biarkan kosong kalau gagal — tidak mengubah logic lain
        setContractsCount(0);
        setExtraIndex(new Map());
      }
    })();
    return () => {
      mounted = false;
    };
  }, [plantTypeId]);

  if (loading || !ready) {
    return (
      <FinanceSidebar>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className={getThemeClasses(
                "inline-block p-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Leaf className={getThemeClasses(
                "h-8 w-8 text-[#324D3E] dark:text-white transition-colors duration-300",
                "!text-[#4c1d1d]"
              )} />
            </motion.div>
            <p className={getThemeClasses(
              "text-[#324D3E] dark:text-white text-lg font-medium mt-4 transition-colors duration-300",
              "!text-[#4c1d1d]"
            )}>
              Memuat ringkasan investasi...
            </p>
          </div>
        </div>
      </FinanceSidebar>
    );
  }

  return (
    <FinanceSidebar>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.header
          className="mb-8 sm:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className={getThemeClasses(
                  "p-3 bg-[#324D3E]/10 dark:bg-[#324D3E]/20 rounded-2xl text-[#324D3E] dark:text-white transition-colors duration-300",
                  "!bg-[#FFC1CC] !text-black"
                )}>
                  <Leaf className="h-8 w-8" />
                </div>
                <div>
                  <h1 className={getThemeClasses(
                    "text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-1 transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>
                    Ringkasan Investasi {plantTypeMeta.name}
                  </h1>
                  <p className={getThemeClasses(
                    "text-[#889063] dark:text-gray-200 text-sm sm:text-base transition-colors duration-300",
                    "!text-[#6b7280]"
                  )}>
                    Data berasal dari transaksi di database (income &amp;
                    operational costs)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
              <motion.button
                onClick={() => {
                  // siapkan detailRows utk tabel baru (gabung data lama + extra)
                  const details = perInvestor.rows.map((r, idx) => {
                    const ex = extraIndex.get(String(r.name || "").toLowerCase());
                    const kav =
                      ex?.kavlingList && ex.kavlingList.length
                        ? ex.kavlingList.join(", ")
                        : "";
                    const roiPct =
                      r.invest > 0
                        ? ((r.profit / r.invest) * 100).toFixed(2) + "%"
                        : "0%";
                    return {
                      no: idx + 1,
                      noAnggota: ex?.noAnggota || "",
                      namaInvestor: r.name || "—",
                      kavling: kav,
                      totalInvest: r.invest || 0,
                      totalProfit: r.profit || 0,
                      roiIndividuPct: roiPct,
                    };
                  });

                  exportAllAsXls({
                    plantTypeId,
                    plantTypeName: plantTypeMeta.name,
                    selectedYear,
                    totalInvestAll: perInvestor.totalInvestAll,
                    totalNet: totalNet,
                    investorCount: perInvestor.rows.length,
                    monthlySelectedYear: monthlySeries,
                    yearlyRows,
                    /** tambahan */
                    contractsCount,
                    detailRows: details,
                  });
                }}
                className={getThemeClasses(
                  "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-[#324D3E] hover:from-green-600 hover:to-[#4C3D19] px-4 py-2 text-sm font-medium text-black transition-all duration-300 shadow-lg hover:shadow-xl",
                  "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FileDown className="h-4 w-4" />
                Download .xls
              </motion.button>

              <Link href="/semua-investasi">
                <motion.button
                  className={getThemeClasses(
                    "inline-flex items-center justify-center gap-2 rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-[#324D3E]/10 dark:border-gray-700 hover:bg-[#324D3E] hover:text-black px-4 py-2 text-sm font-medium text-[#324D3E] dark:text-white transition-all duration-300 shadow-lg w-full sm:w-auto",
                    "!bg-white/95 !border-[#FFC1CC]/30 !text-[#4c1d1d] hover:!bg-[#FFC1CC] hover:!text-black"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </motion.button>
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <SummaryCard
              title="Total Investasi"
              value={fmtIDR(perInvestor.totalInvestAll)}
              icon={<DollarSign className="h-5 w-5" />}
              colorClass="text-chart-1"
            />
            <SummaryCard
              title="Total Profit (Net)"
              value={fmtIDR(totalNet)}
              icon={<TrendingUp className="h-5 w-5" />}
              colorClass="text-chart-2"
              highlight
            />
            <SummaryCard
              title="ROI (Profit/Invest)"
              value={
                perInvestor.totalInvestAll > 0
                  ? `${((totalNet / perInvestor.totalInvestAll) * 100).toFixed(
                      2
                    )}%`
                  : "0%"
              }
              icon={<BarChart3 className="h-5 w-5" />}
              colorClass="text-chart-3"
            />
            <SummaryCard
              title="Jumlah Investor"
              value={`${perInvestor.rows.length}`}
              icon={<Users className="h-5 w-5" />}
              colorClass="text-chart-4"
            />
          </motion.div>

          {/* Charts Section */}
          <motion.div
            className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className={getThemeClasses(
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}>
              <h3 className={getThemeClasses(
                "text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white mb-6 text-center border-b-2 border-[#324D3E]/10 dark:border-gray-600 pb-4 transition-colors duration-300",
                "!text-[#4c1d1d] !border-[#FFC1CC]/30"
              )}>
                Net Profit Bulanan {selectedYear}
              </h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySeries}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#324D3E"
                      strokeOpacity={0.2}
                      strokeWidth={1}
                    />
                    <XAxis
                      dataKey="month"
                      stroke="#889063"
                      fontSize={12}
                      fontWeight="500"
                    />
                    <YAxis stroke="#889063" fontSize={12} fontWeight="500" />
                    <Tooltip
                      formatter={(value: number) => [
                        fmtIDR(value),
                        "Net Profit",
                      ]}
                      contentStyle={mounted && theme === "pink" ? {
                        backgroundColor: "#ffffff",
                        border: "2px solid #FFC1CC",
                        borderRadius: "12px",
                        color: "#4c1d1d",
                        fontWeight: "600",
                        boxShadow: "0 10px 25px -5px rgba(255,193,204,0.2)",
                      } : {
                        backgroundColor: "#ffffff",
                        border: "2px solid #324D3E",
                        borderRadius: "12px",
                        color: "#324D3E",
                        fontWeight: "600",
                        boxShadow: "0 10px 25px -5px rgba(50,77,62,0.2)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke={mounted && theme === "pink" ? "#4c1d1d" : "#324D3E"}
                      strokeWidth={3}
                      dot={{
                        fill: mounted && theme === "pink" ? "#4c1d1d" : "#324D3E",
                        strokeWidth: 2,
                        stroke: "#fff",
                        r: 5,
                      }}
                      activeDot={{ r: 8, fill: mounted && theme === "pink" ? "#FFC1CC" : "#4C3D19" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribusi Investasi Per Investor */}
            <div className={getThemeClasses(
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30 "
            )}>
              <h3 className={getThemeClasses(
                "text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white mb-6 text-center border-b-2 border-[#324D3E]/10 dark:border-gray-600 pb-4 transition-colors duration-300",
                "!text-[#4c1d1d] !border-[#FFC1CC]/30"
              )}>
                Distribusi Investasi per Investor
              </h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={perInvestor.rows.map((r, i) => ({
                        name: r.name,
                        value: r.invest,
                        color: BRUTALIST_COLORS[i % BRUTALIST_COLORS.length],
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={
                        typeof window !== "undefined" && window.innerWidth < 640
                          ? 80
                          : 100
                      }
                      dataKey="value"
                      stroke="#324D3E"
                      strokeWidth={2}
                    >
                      {perInvestor.rows.map((_, i) => (
                        <Cell
                          key={i}
                          fill={BRUTALIST_COLORS[i % BRUTALIST_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [fmtIDR(v), "Investasi"]}
                      contentStyle={mounted && theme === "pink" ? {
                        backgroundColor: "#ffffff",
                        border: "2px solid #FFC1CC",
                        borderRadius: "12px",
                        color: "#4c1d1d",
                        fontWeight: "600",
                        boxShadow: "0 10px 25px -5px rgba(255,193,204,0.2)",
                      } : {
                        backgroundColor: "#ffffff",
                        border: "2px solid #324D3E",
                        borderRadius: "12px",
                        color: "#324D3E",
                        fontWeight: "600",
                        boxShadow: "0 10px 25px -5px rgba(50,77,62,0.2)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Toggle daftar investor */}
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowInvestorList((v) => !v)}
                  className={getThemeClasses(
                    "inline-flex items-center justify-center gap-2 rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-[#324D3E]/10 dark:border-gray-700 hover:bg-[#324D3E] hover:text-black px-4 py-2 text-sm font-medium text-[#324D3E] dark:text-white transition-all duration-300 shadow-lg",
                    "!bg-white/95 !border-[#FFC1CC]/30 !text-[#4c1d1d] hover:!bg-[#FFC1CC] hover:!text-black "
                  )}
                >
                  {showInvestorList ? "Tutup Daftar Investor" : "Tampilkan Daftar Investor"}
                </button>
              </div>
              {showInvestorList && (
                <div className={getThemeClasses(
                  "mt-4 rounded-2xl border border-[#324D3E]/10 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl p-4 max-h-56 overflow-auto",
                  "!border-[#FFC1CC]/30 !bg-white/90"
                )}>
                  {(() => {
                    const total = perInvestor.totalInvestAll || 1;
                    const items = perInvestor.rows.map((r, i) => ({
                      name: r.name,
                      value: r.invest,
                      color: BRUTALIST_COLORS[i % BRUTALIST_COLORS.length],
                      pct: (r.invest / total) * 100,
                    }));
                    if (items.length === 0) {
                      return (
                        <p className={getThemeClasses(
                          "text-sm text-[#889063] dark:text-gray-300 text-center",
                          "!text-[#6b7280]"
                        )}>Belum ada data investor.</p>
                      );
                    }
                    return (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.map((it, idx) => (
                          <li key={idx} className={getThemeClasses(
                            "flex items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-[#324D3E]/10 dark:border-gray-700 px-3 py-2",
                            "!bg-white/90 !border-[#FFC1CC]/30"
                          )}>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: it.color }} />
                              <span className={getThemeClasses(
                                "truncate font-medium text-[#324D3E] dark:text-white",
                                "!text-[#4c1d1d]"
                              )} title={it.name}>{it.name}</span>
                            </div>
                            <div className="text-right text-xs sm:text-sm">
                              <div className={getThemeClasses(
                                "font-semibold text-[#324D3E] dark:text-white",
                                "!text-[#4c1d1d]"
                              )}>{fmtIDR(it.value)}</div>
                              <div className={getThemeClasses(
                                "text-[#889063] dark:text-gray-300",
                                "!text-[#6b7280]"
                              )}>{it.pct.toFixed(1)}%</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        </motion.header>

        {/* Laporan Bulanan (table) + pilih tahun */}
        <motion.section
          className={getThemeClasses(
            "mb-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-[#324D3E]/10 dark:border-gray-700 p-6 sm:p-8 shadow-xl transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30 "
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className={getThemeClasses(
                "text-xl font-bold text-[#324D3E] dark:text-white flex items-center gap-3 transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}>
                <Calendar className={getThemeClasses(
                  "h-5 w-5 text-emerald-600 dark:text-emerald-400",
                  "!text-[#059669]"
                )} />
                Laporan Bulanan {plantTypeMeta.name}
              </h2>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={getThemeClasses(
                  "bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2 text-[#324D3E] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 transition-colors duration-300",
                  "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]/20 focus:!border-[#FFC1CC]/40"
                )}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={getThemeClasses(
                  "border-b-2 border-[#324D3E]/10 dark:border-gray-600",
                  "!border-[#FFC1CC]/30"
                )}>
                  <th className={getThemeClasses(
                    "py-3 pr-4 text-left font-semibold text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>
                    Bulan
                  </th>
                  <th className={getThemeClasses(
                    "py-3 pr-4 text-right font-semibold text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>
                    Net Profit
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlySeries.map((m, idx) => (
                  <tr
                    key={m.month}
                    className={getThemeClasses(
                      `border-b border-[#324D3E]/5 dark:border-gray-700 ${
                        idx % 2 === 0
                          ? "bg-white/40 dark:bg-gray-800/40"
                          : "bg-[#324D3E]/5 dark:bg-gray-700/50"
                      } transition-colors duration-300`,
                      `!border-[#FFC1CC]/10 ${
                        idx % 2 === 0
                          ? "!bg-white/60"
                          : "!bg-[#FFC1CC]/5"
                      }`
                    )}
                  >
                    <td className={getThemeClasses(
                      "py-3 pr-4 font-medium text-[#324D3E] dark:text-white transition-colors duration-300",
                      "!text-[#4c1d1d]"
                    )}>
                      {m.month}
                    </td>
                    <td className={getThemeClasses(
                      "py-3 pr-4 text-right text-[#889063] dark:text-gray-200 font-semibold transition-colors duration-300",
                      "!text-[#6b7280]"
                    )}>
                      {fmtIDR(m.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Ringkasan Tahunan */}
        <motion.section
          className={getThemeClasses(
            "mb-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-[#324D3E]/10 dark:border-gray-700 p-6 sm:p-8 shadow-xl transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30 "
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className={getThemeClasses(
              "text-xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300",
              "!text-[#4c1d1d]"
            )}>
              Ringkasan Tahunan
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={getThemeClasses(
                  "border-b-2 border-[#324D3E]/10 dark:border-gray-600",
                  "!border-[#FFC1CC]/30"
                )}>
                  <th className={getThemeClasses(
                    "py-3 pr-4 text-left font-semibold text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>
                    Tahun
                  </th>
                  <th className={getThemeClasses(
                    "py-3 pr-4 text-right font-semibold text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>
                    Total Profit
                  </th>
                </tr>
              </thead>
              <tbody>
                {yearlyRows.map((y, idx) => (
                  <tr
                    key={y.year}
                    className={getThemeClasses(
                      `border-b border-[#324D3E]/5 dark:border-gray-700 ${
                        idx % 2 === 0
                          ? "bg-white/40 dark:bg-gray-800/40"
                          : "bg-[#324D3E]/5 dark:bg-gray-700/50"
                      } transition-colors duration-300`,
                      `!border-[#FFC1CC]/10 ${
                        idx % 2 === 0
                          ? "!bg-white/60"
                          : "!bg-[#FFC1CC]/5"
                      }`
                    )}
                  >
                    <td className={getThemeClasses(
                      "py-3 pr-4 font-medium text-[#324D3E] dark:text-white transition-colors duration-300",
                      "!text-[#4c1d1d]"
                    )}>
                      {y.year}
                    </td>
                    <td className={getThemeClasses(
                      "py-3 pr-4 text-right text-green-600 dark:text-emerald-400 font-semibold transition-colors duration-300",
                      "!text-[#059669]"
                    )}>
                      {fmtIDR(y.totalProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Per Investor */}
        <motion.section
          className={getThemeClasses(
            "mb-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-[#324D3E]/10 dark:border-gray-700 p-6 sm:p-8 shadow-xl transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30 "
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className={getThemeClasses(
              "text-xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300",
              "!text-[#4c1d1d]"
            )}>
              Rincian Per Investor
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={getThemeClasses(
                  "border-b-2 border-[#324D3E]/10 dark:border-gray-600",
                  "!border-[#FFC1CC]/30"
                )}>
                  <th className={getThemeClasses(
                    "py-3 pr-4 text-left font-semibold text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>
                    Nama
                  </th>
                  <th className={getThemeClasses(
                    "py-3 pr-4 text-right font-semibold text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>
                    Total Investasi
                  </th>
                  <th className={getThemeClasses(
                    "py-3 pr-4 text-right font-semibold text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>
                    Total Profit
                  </th>
                  <th className={getThemeClasses(
                    "py-3 pr-4 text-right font-semibold text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>
                    ROI Individu
                  </th>
                </tr>
              </thead>
              <tbody>
                {perInvestor.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className={getThemeClasses(
                        "py-6 text-center text-[#889063] dark:text-gray-200 transition-colors duration-300",
                        "!text-[#6b7280]"
                      )}
                    >
                      Belum ada data investasi untuk tipe ini.
                    </td>
                  </tr>
                ) : (
                  perInvestor.rows.map((r, idx) => (
                    <tr
                      key={r.name}
                      className={getThemeClasses(
                        `border-b border-[#324D3E]/5 dark:border-gray-700 ${
                          idx % 2 === 0
                            ? "bg-white/40 dark:bg-gray-800/40"
                            : "bg-[#324D3E]/5 dark:bg-gray-700/50"
                        } transition-colors duration-300`,
                        `!border-[#FFC1CC]/10 ${
                          idx % 2 === 0
                            ? "!bg-white/60"
                            : "!bg-[#FFC1CC]/5"
                        }`
                      )}
                    >
                      <td className={getThemeClasses(
                        "py-3 pr-4 font-medium text-[#324D3E] dark:text-white transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}>
                        {r.name}
                      </td>
                      <td className={getThemeClasses(
                        "py-3 pr-4 text-right text-[#889063] dark:text-gray-200 font-semibold transition-colors duration-300",
                        "!text-[#6b7280]"
                      )}>
                        {fmtIDR(r.invest)}
                      </td>
                      <td className={getThemeClasses(
                        "py-3 pr-4 text-right text-green-600 dark:text-emerald-400 font-semibold transition-colors duration-300",
                        "!text-[#059669]"
                      )}>
                        {fmtIDR(r.profit)}
                      </td>
                      <td className={getThemeClasses(
                        "py-3 pr-4 text-right font-medium text-[#324D3E] dark:text-white transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}>
                        {r.invest > 0
                          ? `${((r.profit / r.invest) * 100).toFixed(2)}%`
                          : "0%"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>
    </FinanceSidebar>
  );
}

// ================== small UI ==================
function SummaryCard({
  title,
  value,
  icon,
  colorClass,
  highlight,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  colorClass: string;
  highlight?: boolean;
}) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`
    }
    return baseClasses
  }

  const colors = {
    "text-chart-1": {
      bg: mounted && theme === "pink" ? "bg-[#FFC1CC]" : "bg-[#324D3E]/10 dark:bg-[#324D3E]/20",
      text: mounted && theme === "pink" ? "text-black" : "text-[#324D3E] dark:text-white",
      hover: mounted && theme === "pink" ? "group-hover:bg-[#4c1d1d]" : "group-hover:bg-[#324D3E]/20 dark:group-hover:bg-[#324D3E]/30",
    },
    "text-chart-2": {
      bg: mounted && theme === "pink" ? "bg-[#B5EAD7]" : "bg-green-500/10 dark:bg-green-900/30",
      text: mounted && theme === "pink" ? "text-black" : "text-green-600 dark:text-emerald-400",
      hover: mounted && theme === "pink" ? "group-hover:bg-[#059669]" : "group-hover:bg-green-500/20 dark:group-hover:bg-green-800/40",
    },
    "text-chart-3": {
      bg: mounted && theme === "pink" ? "bg-[#C7CEEA]" : "bg-blue-500/10 dark:bg-blue-900/30",
      text: mounted && theme === "pink" ? "text-black" : "text-blue-600 dark:text-blue-400",
      hover: mounted && theme === "pink" ? "group-hover:bg-[#7c3aed]" : "group-hover:bg-blue-500/20 dark:group-hover:bg-blue-800/40",
    },
    "text-chart-4": {
      bg: mounted && theme === "pink" ? "bg-[#FFF5BA]" : "bg-purple-500/10 dark:bg-purple-900/30",
      text: mounted && theme === "pink" ? "text-black" : "text-purple-600 dark:text-purple-400",
      hover: mounted && theme === "pink" ? "group-hover:bg-[#d97706]" : "group-hover:bg-purple-500/20 dark:group-hover:bg-purple-800/40",
    },
  };

  const color =
    colors[colorClass as keyof typeof colors] || colors["text-chart-1"];

  return (
    <div
      className={getThemeClasses(
        `group rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl p-6 border ${
          highlight
            ? "border-green-500/30 dark:border-emerald-600/50 shadow-lg"
            : "border-[#324D3E]/10 dark:border-gray-700"
        } shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300`,
        `!bg-white/95 ${
          highlight
            ? "!border-[#B5EAD7]/30 "
            : "!border-[#FFC1CC]/30 "
        }`
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color.bg} ${color.text} ${color.hover} transition-all duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <p className={getThemeClasses(
          "text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300",
          "!text-[#6b7280]"
        )}>
          {title}
        </p>
        <p
          className={getThemeClasses(
            `text-2xl font-bold ${
              highlight
                ? "text-green-600 dark:text-emerald-400"
                : "text-[#324D3E] dark:text-white"
            } group-hover:text-[#4C3D19] dark:group-hover:text-gray-200 transition-colors duration-300`,
            `${
              highlight
                ? "!text-[#059669]"
                : "!text-[#4c1d1d]"
            } group-hover:!text-[#6b7280]`
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
