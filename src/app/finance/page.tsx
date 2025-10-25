// src/app/finance/page.tsx
"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { Button } from "@/components/ui-finance/button";
import { useAlert } from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Download, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import React from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";
import { useTheme } from "next-themes";

// ===== XLSX (pakai dynamic import agar aman SSR) =====
let XLSXMod: any;
async function getXLSX() {
  if (XLSXMod) return XLSXMod;
  XLSXMod = await import("xlsx-js-style");
  return XLSXMod as any;
}

const BRUTALIST_COLORS = [
  "#FF6B35",
  "#F7931E",
  "#FFD23F",
  "#06FFA5",
  "#118AB2",
  "#073B4C",
];

// === HELPER WARNA PIE (hanya UI) ===
const COLOR_ALPUKAT = "#16a34a";
const COLOR_JENGKOL = "#0ea5e9";
const COLOR_AREN = "#b7410e";

function normName(s: string) {
  return (s || "").toLowerCase().trim();
}
function pickBaseColor(name: string, fallback: string) {
  const n = normName(name);
  if (n.includes("alpukat")) return COLOR_ALPUKAT;
  if (n.includes("jengkol")) return COLOR_JENGKOL;
  if (n.includes("aren")) return COLOR_AREN;
  return fallback;
}
function slugId(name: string) {
  return (name || "slice").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// ==== Response type dari /api/finance/summary ====
type Summary = {
  totals?: {
    investment?: number | string;
    totalInvestment?: number | string;
    profit?: number | string;
    totalProfit?: number | string;
    roi?: number | string;
    roiPercent?: number | string;
    members?: number | string;
    totalMembers?: number | string;
    membersCount?: number | string;
  };
  totalInvestment?: number | string;
  totalProfit?: number | string;
  roi?: number | string;
  members?: number | string;
  investorsCount?: number | string;

  // kemungkinan sumber data untuk kontrak:
  plantInstances?: any[];
  plantInstancesCount?: number | string;
  totalPlantInstances?: number | string;
  contracts?: number | string;

  distribution?: { name: string; value: number | string }[];
  topPlantTypes?: {
    type?: string;
    totalInvestment?: number | string;
    paidProfit?: number | string;
    roi?: number | string;
    treeCount?: number | string;
    activeInvestors?: number | string;
    plantTypeId?: string;
    plantTypeName?: string;
    totalIncome?: number | string;
    totalExpenses?: number | string;
  }[];
};

const toNum = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number" && isFinite(v)) return v;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? n : 0;
};

export default function FinancePage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [topPlants, setTopPlants] = React.useState<
    {
      id: string;
      name: string;
      totalInvestment: number;
      totalProfit: number;
      roi: number;
      instanceCount: number;
      investorCount: number;
    }[]
  >([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { showError, AlertComponent } = useAlert();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to get theme-aware classes
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  const [totals, setTotals] = React.useState({
    invest: 0,
    profit: 0,
    roi: 0,
    investors: 0,
  });
  const [distribution, setDistribution] = React.useState<
    { name: string; value: number; color: string }[]
  >([]);

  const PLANT_TYPES_ORDER = ["Alpukat", "Gaharu", "Aren", "Jengkol"];
  const [perTypeRows, setPerTypeRows] = React.useState<
    {
      name: string;
      totalInvestment: number;
      totalIncome: number;
      totalExpenses: number;
    }[]
  >([]);
  const [contractsCount, setContractsCount] = React.useState<number>(0);

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch("/api/finance/summary", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch summary");
        const data: Summary = await res.json();

        // ===== normalisasi totals =====
        const t = data?.totals ?? {};
        const invest =
          toNum(t.investment) ||
          toNum(t.totalInvestment) ||
          toNum((data as any).totalInvestment);
        const profit =
          toNum(t.profit) ||
          toNum(t.totalProfit) ||
          toNum((data as any).totalProfit);
        const roiVal =
          toNum(t.roi) || toNum(t.roiPercent) || toNum((data as any).roi);
        const investors =
          toNum(t.members) ||
          toNum(t.totalMembers) ||
          toNum(t.membersCount) ||
          toNum((data as any).members) ||
          toNum(data.investorsCount);

        setTotals({ invest, profit, roi: roiVal, investors });

        // ===== distribusi pie =====
        const distSrc = Array.isArray(data.distribution)
          ? data.distribution
          : [];
        const dist = distSrc.map((d, i) => ({
          name: String(d.name),
          value: toNum(d.value),
          color: BRUTALIST_COLORS[i % BRUTALIST_COLORS.length],
        }));
        setDistribution(dist);

        // ===== top tanaman (untuk kartu & tabel bawah) =====
        const mapped = (data.topPlantTypes || []).map((t) => ({
          id: String(t.plantTypeId ?? t.type ?? ""),
          name: String(t.plantTypeName ?? t.type ?? "—"),
          totalInvestment: toNum(t.totalInvestment),
          totalProfit: toNum(t.paidProfit),
          roi: toNum(t.roi),
          instanceCount: toNum(t.treeCount),
          investorCount: toNum(t.activeInvestors),
          totalIncome: toNum((t as any).totalIncome ?? t.paidProfit),
          totalExpenses: toNum((t as any).totalExpenses ?? 0),
        }));
        const picked = mapped.sort(
          (a, b) => b.investorCount - a.investorCount
        )[0];
        setTopPlants(picked ? [picked] : []);

        // ===== tabel bawah dari 4 jenis tetap =====
        const perTypeMap: Record<
          string,
          {
            totalInvestment: number;
            totalIncome: number;
            totalExpenses: number;
          }
        > = {};
        for (const m of mapped) {
          const key = (m.name || "").toLowerCase();
          perTypeMap[key] = {
            totalInvestment: m.totalInvestment || 0,
            totalIncome: m.totalIncome || 0,
            totalExpenses: m.totalExpenses || 0,
          };
        }
        setPerTypeRows(
          PLANT_TYPES_ORDER.map((nm) => {
            const k = nm.toLowerCase();
            const v = perTypeMap[k] || {
              totalInvestment: 0,
              totalIncome: 0,
              totalExpenses: 0,
            };
            return { name: nm, ...v };
          })
        );

        // ===== Jumlah Kontrak LANGSUNG dari summary =====
        // urutan prioritas: count eksplisit → length array → fallback sum treeCount
        const kontrakFromSummary =
          toNum(data.plantInstancesCount) ||
          toNum(data.totalPlantInstances) ||
          toNum((data as any).contracts) ||
          (Array.isArray(data.plantInstances) ? data.plantInstances.length : 0);

        const fallbackFromTopTypes = mapped.reduce(
          (s, m) => s + (m.instanceCount || 0),
          0
        );

        setContractsCount(kontrakFromSummary || fallbackFromTopTypes);

        // ===================== TAMBAHAN: panggil API baru untuk kontrak & agregasi pemasukan/pengeluaran =====================
        try {
          type ExtraResp = {
            contractsCount?: number;
            totalsByType?: {
              name: string;
              totalIncome: number;
              totalExpenses: number;
            }[];
          };
          const ex = await fetch("/api/finance/extra", { cache: "no-store" });
          if (ex.ok) {
            const extra: ExtraResp = await ex.json();

            // override jumlah kontrak bila tersedia
            if (typeof extra.contractsCount === "number") {
              setContractsCount(extra.contractsCount);
            }

            // override total pemasukan/pengeluaran per jenis bila tersedia
            if (
              Array.isArray(extra.totalsByType) &&
              extra.totalsByType.length
            ) {
              const mapEx = new Map<
                string,
                { totalIncome: number; totalExpenses: number }
              >();
              for (const r of extra.totalsByType) {
                mapEx.set((r.name || "").toLowerCase(), {
                  totalIncome: toNum(r.totalIncome),
                  totalExpenses: toNum(r.totalExpenses),
                });
              }
              setPerTypeRows((prev) =>
                prev.map((row) => {
                  const m = mapEx.get(row.name.toLowerCase());
                  return m
                    ? {
                        ...row,
                        totalIncome: m.totalIncome,
                        totalExpenses: m.totalExpenses,
                      }
                    : row;
                })
              );
            }
          }
        } catch (e) {
          // jika API tambahan gagal, biarkan nilai sebelumnya (tidak mengubah logic lain)
          console.warn("[finance] /api/finance/extra failed or unavailable", e);
        }
        // =====================================================================================================================

        setError(null);
      } catch (err) {
        console.error("[finance] fetch error:", err);
        setError("Gagal memuat data dari database");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =============== EXPORT: layout seperti contoh, 2 tabel & "Rp" satu sel ===============
  const handleDownloadSummary = async () => {
    try {
      const XLSX = await getXLSX();
      const wb = XLSX.utils.book_new();

      const totalExpensesAll = perTypeRows.reduce(
        (s, r) => s + (r.totalExpenses || 0),
        0
      );

      // Bangun sheet mulai kolom C (A,B kosong)
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
        ["", "", "Jumlah Kontrak", contractsCount],
        ["", "", "", ""],
        [
          "",
          "",
          "No",
          "Jenis Tanaman",
          "Total Investasi",
          "Total Pemasukan",
          "Total Pengeluaran",
        ],
      ];

      let no = 1;
      for (const r of perTypeRows) {
        S.push([
          "",
          "",
          String(no++),
          r.name,
          r.totalInvestment,
          r.totalIncome,
          r.totalExpenses,
        ] as any);
      }

      const ws = XLSX.utils.aoa_to_sheet(S);

      ws["!cols"] = [
        { width: 2 }, // A
        { width: 2 }, // B
        { width: 22 }, // C
        { width: 28 }, // D
        { width: 20 }, // E
        { width: 20 }, // F
        { width: 20 }, // G
      ];

      const border = {
        top: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
      };
      function applyBorder(r1: number, c1: number, r2: number, c2: number) {
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = ws[addr];
            if (!cell) continue;
            cell.s = { ...(cell.s || {}), border };
          }
        }
      }

      // Bold judul, section, header tabel
      const boldRows = [0, 3, 11];
      for (const r of boldRows) {
        for (let c = 2; c <= 6; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];
          if (cell) cell.s = { ...(cell.s || {}), font: { bold: true } };
        }
      }

      // TABEL ATAS (C1..D10)
      applyBorder(0, 2, 10, 3);

      // TABEL BAWAH (C12..G[akhir])
      const startDataRow = 12;
      const lastRow = 11 + perTypeRows.length + 1;
      applyBorder(11, 2, lastRow, 6);

      // Format uang: "Rp 1.234.567"
      const currencyFmt = '"Rp" #,##0';
      // baris metrik: kolom D (index 3), baris 4..6
      for (let r = 4; r <= 6; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: 3 });
        const cell = ws[addr];
        if (cell) (cell as any).z = currencyFmt;
      }
      // tabel bawah: kolom E/F/G (4..6) mulai baris data
      for (let r = startDataRow; r <= lastRow; r++) {
        for (const c of [4, 5, 6]) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];
          if (cell) (cell as any).z = currencyFmt;
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "Ringkasan");
      XLSX.writeFile(
        wb,
        `Ringkasan_Investasi_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("[finance] export error:", error);
      showError("Error", "Terjadi kesalahan saat membuat file Excel.");
    }
  };

  // Pie data
  const investmentData = distribution;
  const totalInvestPie = investmentData.reduce((s, d) => s + d.value, 0);

  function PieTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const tooltipClasses = getThemeClasses(
      "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white",
      "!bg-[#FFC1CC] !border-[#FFDEE9] !text-[#4c1d1d]"
    );
    return (
      <div
        className={`${tooltipClasses} rounded-lg shadow-lg transition-colors duration-300`}
        style={{ padding: "8px 10px", fontWeight: 600 }}
      >
        <div style={{ marginBottom: 4 }}>{p?.name}</div>
        <div>Investasi : {formatCurrency(Number(p?.value) || 0)}</div>
      </div>
    );
  }

  return (
    <FinanceSidebar>
      <AlertComponent />
      <div className="p-6 space-y-8 font-[family-name:var(--font-poppins)]">
        <header>
          <div className="mb-8">
            <h1
              className={getThemeClasses(
                "text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-4 transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              Dashboard Finance
            </h1>
            <p
              className={getThemeClasses(
                "text-[#889063] dark:text-gray-300 text-lg transition-colors duration-300",
                "!text-[#6b7280]"
              )}
            >
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm transition-colors duration-300">
                ⚠️ {error}
              </div>
            )}
          </div>

          <div
            className={getThemeClasses(
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 border border-[#324D3E]/10 dark:border-gray-700 shadow-xl transition-colors duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
              <div>
                <h2
                  className={getThemeClasses(
                    "text-2xl font-bold text-[#324D3E] dark:text-white mb-2 transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}
                >
                  Ringkasan Investasi
                </h2>
                <p
                  className={getThemeClasses(
                    "text-[#889063] dark:text-gray-300 text-lg transition-colors duration-300",
                    "!text-[#6b7280]"
                  )}
                >
                  Analisis detail per jenis tanaman dan kinerja anggota
                </p>
              </div>
              <Button
                className={getThemeClasses(
                  "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:shadow-lg text-white font-semibold px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2",
                  "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
                )}
                onClick={handleDownloadSummary}
              >
                <Download className="w-4 h-4" />
                Download Ringkasan
              </Button>
            </div>

            {/* KARTU RINGKASAN */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-3xl bg-white/60 dark:bg-gray-700/60 p-6 border border-[#324D3E]/10 dark:border-gray-600 animate-pulse transition-colors duration-300"
                  >
                    <div className="h-12 w-12 bg-[#324D3E]/20 dark:bg-gray-600/50 rounded-2xl mb-4"></div>
                    <div className="h-4 bg-[#324D3E]/20 dark:bg-gray-600/50 rounded-full mb-2"></div>
                    <div className="h-8 bg-[#324D3E]/20 dark:bg-gray-600/50 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <SummaryCard
                  title="Total Investasi"
                  value={formatCurrency(totals.invest)}
                  icon={<DollarSign className="h-5 w-5" />}
                  colorClass="card-a"
                  theme={theme}
                />
                <SummaryCard
                  title="Total Keuntungan"
                  value={formatCurrency(totals.profit)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  colorClass="card-b"
                  theme={theme}
                />
                {/* <SummaryCard title="ROI" value={formatPercentage(totals.roi || 0)} icon={<BarChart3 className="h-5 w-5" />} colorClass="card-c" theme={theme} /> */}
                <SummaryCard
                  title="Jumlah Anggota"
                  value={`${totals.investors}`}
                  icon={<Users className="h-5 w-5" />}
                  colorClass="card-d"
                  theme={theme}
                />
              </div>
            )}

            {/* PIE + LEGEND WARNA */}
            <div
              className={getThemeClasses(
                "bg-white/60 dark:bg-gray-700/60 backdrop-blur-lg rounded-3xl p-8 border border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300",
                "!bg-white/80 !border-[#FFC1CC]/30"
              )}
            >
              <h3
                className={getThemeClasses(
                  "text-2xl font-bold text-[#324D3E] dark:text-white mb-6 transition-colors duration-300",
                  "!text-[#4c1d1d]"
                )}
              >
                Distribusi Investasi
              </h3>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div
                    className={getThemeClasses(
                      "animate-spin rounded-full h-20 w-20 border-b-4 border-[#324D3E] dark:border-white",
                      "!border-[#FFC1CC]"
                    )}
                  ></div>
                </div>
              ) : (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {/* Slice solid + stroke hitam tebal */}
                        <Pie
                          data={distribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={86}
                          dataKey="value"
                          stroke="#0B0B0B"
                          strokeWidth={3}
                          label
                        >
                          {distribution.map((entry, idx) => (
                            <Cell
                              key={`cell-${slugId(
                                entry.name || `slice-${idx}`
                              )}`}
                              fill={pickBaseColor(entry.name, entry.color)}
                            />
                          ))}
                        </Pie>
                        <RTooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg-grid-cols-3 lg:grid-cols-3 gap-3 mt-6">
                    {distribution.map((d) => {
                      const total = totalInvestPie || 1;
                      const pct = (d.value / total) * 100;
                      return (
                        <div
                          key={d.name}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: pickBaseColor(d.name, d.color),
                            }}
                          />
                          <span className="font-medium">{d.name}</span>
                          <span className="text-muted-foreground">
                            — {formatCurrency(d.value)} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div>
          <div className="flex items-center justify-between mb-8">
            <h2
              className={getThemeClasses(
                "text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              Top Investasi Tanaman
            </h2>
            <Link
              href="/semua-investasi"
              className={getThemeClasses(
                "text-[#4C3D19] dark:text-emerald-300 hover:text-[#324D3E] dark:hover:text-emerald-200 text-lg font-semibold hover:underline transition-all duration-300",
                "!text-[#6b7280] hover:!text-[#4c1d1d]"
              )}
            >
              Lihat Semua →
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 gap-8">
              {[...Array(1)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-[#324D3E]/10 dark:border-gray-700 p-8 animate-pulse shadow-xl transition-colors duration-300"
                >
                  <div className="h-8 bg-[#324D3E]/20 rounded-full mb-6 w-1/3"></div>
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="rounded-2xl bg-white/60 dark:bg-gray-700/60 p-6">
                      <div className="h-4 bg-[#324D3E]/20 rounded-full mb-3"></div>
                      <div className="h-8 bg-[#324D3E]/20 dark:bg-gray-600/50 rounded-full"></div>
                    </div>
                    <div className="rounded-2xl bg-white/60 dark:bg-gray-700/60 p-6">
                      <div className="h-4 bg-[#324D3E]/20 rounded-full mb-3"></div>
                      <div className="h-8 bg-[#324D3E]/20 dark:bg-gray-600/50 rounded-full"></div>
                    </div>
                  </div>
                  <div className="h-12 bg-[#324D3E]/20 rounded-2xl"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {topPlants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  getThemeClasses={getThemeClasses}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </FinanceSidebar>
  );
}

/** SummaryCard — warna cerah + angka hijau/kuning dinamis */
function SummaryCard({
  title,
  value,
  icon,
  colorClass,
  theme,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  colorClass: string;
  theme?: string;
}) {
  const palette: Record<
    string,
    { card: string; iconBg: string; iconText: string }
  > = {
    "card-a": {
      card: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20",
      iconBg: "bg-emerald-200 dark:bg-emerald-700",
      iconText: "text-emerald-900 dark:text-emerald-100",
    },
    "card-b": {
      card: "bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/30 dark:to-sky-800/20",
      iconBg: "bg-sky-200 dark:bg-sky-700",
      iconText: "text-sky-900 dark:text-sky-100",
    },
    "card-c": {
      card: "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-emerald-800/20",
      iconBg: "bg-indigo-200 dark:bg-indigo-700",
      iconText: "text-indigo-900 dark:text-indigo-100",
    },
    "card-d": {
      card: "bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 dark:from-fuchsia-900/30 dark:to-fuchsia-800/20",
      iconBg: "bg-fuchsia-200 dark:bg-fuchsia-700",
      iconText: "text-fuchsia-900 dark:text-fuchsia-100",
    },
  };

  // Apply pink theme overrides with lighter, more subtle pastel palette
  const getCardClasses = (baseClasses: string) => {
    if (theme === "pink") {
      if (colorClass === "card-a")
        return "bg-gradient-to-br from-white to-[#FFDEE9]/50";
      if (colorClass === "card-b")
        return "bg-gradient-to-br from-white to-[#B5EAD7]/50";
      if (colorClass === "card-c")
        return "bg-gradient-to-br from-white to-[#C7CEEA]/50";
      if (colorClass === "card-d")
        return "bg-gradient-to-br from-white to-[#FFF5BA]/50";
    }
    return baseClasses;
  };

  const getIconClasses = (baseClasses: string) => {
    if (theme === "pink") {
      if (colorClass === "card-a") return "bg-[#FFC1CC]/30 text-[#4c1d1d]";
      if (colorClass === "card-b") return "bg-[#B5EAD7]/50 text-[#1f2937]";
      if (colorClass === "card-c") return "bg-[#C7CEEA]/50 text-[#1f2937]";
      if (colorClass === "card-d") return "bg-[#FFF5BA]/50 text-[#1f2937]";
    }
    return baseClasses;
  };

  const pal = palette[colorClass] ?? palette["card-a"];
  const isNegative = typeof value === "string" && value.trim().startsWith("-");
  const valueColor = isNegative
    ? "text-yellow-500"
    : theme === "pink"
    ? "text-[#4c1d1d]"
    : "text-green-800 dark:text-green-100";

  const cardClasses = getCardClasses(pal.card);
  const iconClasses = getIconClasses(pal.iconBg + " " + pal.iconText);

  return (
    <div
      className={`group rounded-3xl ${cardClasses} p-6 border border-black/5 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClasses} transition-all duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <p
          className={
            theme === "pink"
              ? "text-sm font-medium text-[#4c1d1d] transition-colors duration-300"
              : "text-sm font-medium text-[#324D3E] dark:text-gray-100/90 transition-colors duration-300"
          }
        >
          {title}
        </p>
        <p
          className={`text-2xl font-bold ${valueColor} transition-colors duration-300`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function PlantCard({
  plant,
  getThemeClasses,
}: {
  plant: any;
  getThemeClasses: (base: string, pink: string) => string;
}) {
  return (
    <div
      className={getThemeClasses(
        "group relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-[#324D3E]/10 dark:border-gray-700 hover:border-[#324D3E]/30 dark:hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105",
        "!bg-white/95 !border-[#FFC1CC]/30 !hover:border-[#FFC1CC]/50"
      )}
    >
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2
              className={getThemeClasses(
                "text-2xl font-bold text-[#324D3E] dark:text-white mb-4 capitalize group-hover:text-[#4C3D19] dark:group-hover:text-gray-200 transition-colors duration-300",
                "!text-[#4c1d1d] group-hover:!text-[#831843]"
              )}
            >
              {plant.name}
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span
                className={getThemeClasses(
                  "flex items-center gap-2 text-[#889063] dark:text-gray-200 transition-colors duration-300",
                  "!text-[#6b7280]"
                )}
              >
                {/* <BarChart3 className={getThemeClasses("h-4 w-4 text-[#324D3E] dark:text-white", "!text-[#FFC1CC]")} /> */}
                {/* ROI {formatPercentage(plant.roi || 0)} */}
              </span>
              <span
                className={getThemeClasses(
                  "flex items-center gap-2 text-[#889063] dark:text-gray-200 transition-colors duration-300",
                  "!text-[#6b7280]"
                )}
              >
                <TrendingUp
                  className={getThemeClasses(
                    "h-4 w-4 text-[#4C3D19] dark:text-emerald-300",
                    "!text-[#FFC1CC]"
                  )}
                />
                {plant.instanceCount}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div
            className={getThemeClasses(
              "rounded-2xl bg-white/60 dark:bg-gray-700/60 backdrop-blur-lg p-6 border border-[#324D3E]/10 dark:border-gray-600 group-hover:bg-white/80 dark:group-hover:bg-gray-600/80 transition-all duration-300",
              "!bg-white/70 !border-[#FFC1CC]/30 group-hover:!bg-white/90"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <DollarSign
                className={getThemeClasses(
                  "h-5 w-5 text-[#324D3E] dark:text-white",
                  "!text-[#FFC1CC]"
                )}
              />
              <span
                className={getThemeClasses(
                  "text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300",
                  "!text-[#6b7280]"
                )}
              >
                Total Investasi
              </span>
            </div>
            <div
              className={getThemeClasses(
                "text-xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              {formatCurrency(plant.totalInvestment)}
            </div>
          </div>
          <div
            className={getThemeClasses(
              "rounded-2xl bg-white/60 dark:bg-gray-700/60 backdrop-blur-lg p-6 border border-[#324D3E]/10 dark:border-gray-600 group-hover:bg-white/80 dark:group-hover:bg-gray-600/80 transition-all duration-300",
              "!bg-white/70 !border-[#FFC1CC]/30 group-hover:!bg-white/90"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp
                className={getThemeClasses(
                  "h-5 w-5 text-green-600 dark:text-emerald-400",
                  "!text-[#B5EAD7]"
                )}
              />
              <span
                className={getThemeClasses(
                  "text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300",
                  "!text-[#6b7280]"
                )}
              >
                Total Profit
              </span>
            </div>
            <div
              className={getThemeClasses(
                "text-xl font-bold text-green-600 dark:text-emerald-400 transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              {formatCurrency(plant.totalProfit)}
            </div>
          </div>
        </div>

        <div
          className={getThemeClasses(
            "flex items-center justify-between mb-8 p-4 bg-[#324D3E]/5 dark:bg-gray-600/50 rounded-2xl border border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300",
            "!bg-[#FFDEE9]/30 !border-[#FFC1CC]/30"
          )}
        >
          {/* <div className="flex items-center gap-3">
            <BarChart3 className={getThemeClasses("h-5 w-5 text-blue-600 dark:text-blue-400", "!text-[#C7CEEA]")} />
            <span className={getThemeClasses("text-lg font-medium text-[#324D3E] dark:text-white transition-colors duration-300", "!text-[#4c1d1d]")}>ROI Aktual</span>
          </div> */}
          {/* <div className={getThemeClasses("text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300", "!text-[#4c1d1d]")}>{formatPercentage(plant.roi || 0)}</div> */}
        </div>

        <div className="flex items-center justify-between">
          <div
            className={getThemeClasses(
              "flex items-center gap-3 text-[#889063] dark:text-gray-200 transition-colors duration-300",
              "!text-[#6b7280]"
            )}
          >
            <Users
              className={getThemeClasses(
                "h-5 w-5 text-[#324D3E] dark:text-white",
                "!text-[#FFC1CC]"
              )}
            />
            <span className="font-medium">
              {plant.investorCount} investor aktif
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
