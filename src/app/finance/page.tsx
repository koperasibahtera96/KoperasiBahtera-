// src/app/finance/page.tsx
"use client"

import { FinanceSidebar } from "@/components/finance/FinanceSidebar"
import { Button } from "@/components/ui-finance/button"
import { useAlert } from "@/components/ui/Alert"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { BarChart3, DollarSign, Download, TrendingUp, Users } from "lucide-react"
import Link from "next/link"
import React from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts"

// ===== XLSX (pakai dynamic import agar aman SSR) =====
let XLSXMod: any
async function getXLSX() {
  if (XLSXMod) return XLSXMod
  XLSXMod = await import("xlsx-js-style")
  return XLSXMod as any
}

const BRUTALIST_COLORS = ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5", "#118AB2", "#073B4C"]

// === HELPER WARNA PIE (hanya UI, tidak mengubah data/logic) ===
const COLOR_ALPUKAT = "#16a34a" // hijau
const COLOR_JENGKOL = "#0ea5e9" // biru laut
const COLOR_AREN    = "#b7410e" // bata (merah bata)

function normName(s: string) {
  return (s || "").toLowerCase().trim()
}
// function isGaharu(name: string) {
//   return normName(name).includes("gaharu")
// }
function pickBaseColor(name: string, fallback: string) {
  const n = normName(name)
  if (n.includes("alpukat")) return COLOR_ALPUKAT
  if (n.includes("jengkol")) return COLOR_JENGKOL
  if (n.includes("aren"))    return COLOR_AREN
  // khusus gaharu: biarkan fallback (warna existing)
  return fallback
}
function hexToRgb(hex: string) {
  const s = hex.replace("#", "")
  const v = s.length === 3 ? s.split("").map((x) => x + x).join("") : s
  const n = parseInt(v, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
function lighten(hex: string, amt = 0.28) {
  const { r, g, b } = hexToRgb(hex)
  const f = (x: number) => Math.max(0, Math.min(255, Math.round(x + (255 - x) * amt)))
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`
}
function slugId(name: string) {
  return (name || "slice").toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

// ==== Response type dari /api/finance/summary ====
type Summary = {
  totals?: {
    investment?: number | string
    totalInvestment?: number | string
    profit?: number | string
    totalProfit?: number | string
    roi?: number | string
    roiPercent?: number | string
    members?: number | string
    totalMembers?: number | string
    membersCount?: number | string
  }
  totalInvestment?: number | string
  totalProfit?: number | string
  roi?: number | string
  members?: number | string
  investorsCount?: number | string
  distribution?: { name: string; value: number | string }[]
  topPlantTypes?: {
    type?: string
    totalInvestment?: number | string
    paidProfit?: number | string
    roi?: number | string
    treeCount?: number | string
    activeInvestors?: number | string
    plantTypeId?: string
    plantTypeName?: string
  }[]
}

// helper angka aman
const toNum = (v: any): number => {
  if (v === null || v === undefined) return 0
  if (typeof v === "number" && isFinite(v)) return v
  const n = Number(String(v).replace(/[^0-9.-]/g, ""))
  return isFinite(n) ? n : 0
}

export default function FinancePage() {
  // Top plants tetap dipakai komponen kartu yang sama
  const [topPlants, setTopPlants] = React.useState<
    { id: string; name: string; totalInvestment: number; totalProfit: number; roi: number; instanceCount: number; investorCount: number }[]
  >([])

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const { showError, AlertComponent } = useAlert()

  // state untuk ringkasan & distribusi
  const [totals, setTotals] = React.useState({ invest: 0, profit: 0, roi: 0, investors: 0 })
  const [distribution, setDistribution] = React.useState<{ name: string; value: number; color: string }[]>([])

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const res = await fetch("/api/finance/summary", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to fetch summary")
        const data: Summary = await res.json()

        // ===== normalisasi nilai dari totals (dengan berbagai alias) =====
        const t = data?.totals ?? {}
        const invest =
          toNum(t.investment) ||
          toNum(t.totalInvestment) ||
          toNum((data as any).totalInvestment)

        const profit =
          toNum(t.profit) ||
          toNum(t.totalProfit) ||
          toNum((data as any).totalProfit)

        const roiVal =
          toNum(t.roi) ||
          toNum(t.roiPercent) ||
          toNum((data as any).roi)

        const investors =
          toNum(t.members) ||
          toNum(t.totalMembers) ||
          toNum(t.membersCount) ||
          toNum((data as any).members) ||
          toNum(data.investorsCount)

        setTotals({ invest, profit, roi: roiVal, investors })

        // ===== distribusi pie =====
        const distSrc = Array.isArray(data.distribution) ? data.distribution : []
        const dist = distSrc.map((d, i) => ({
          name: String(d.name),
          value: toNum(d.value),
          color: BRUTALIST_COLORS[i % BRUTALIST_COLORS.length],
        }))
        setDistribution(dist)

        // ===== top tanaman (map dari struktur API baru ke bentuk kartu lama) =====
        const mapped = (data.topPlantTypes || []).map((t) => ({
          id: String(t.plantTypeId ?? t.type ?? ""),
          name: String(t.plantTypeName ?? t.type ?? "—"),
          totalInvestment: toNum(t.totalInvestment),
          totalProfit: toNum(t.paidProfit),
          roi: toNum(t.roi),
          instanceCount: toNum(t.treeCount),      // jumlah pohon (tetap ditaruh di instanceCount)
          investorCount: toNum(t.activeInvestors),
        }))
        const picked = mapped.sort((a, b) => b.investorCount - a.investorCount)[0]
        setTopPlants(picked ? [picked] : [])

        setError(null)
      } catch (err) {
        console.error("[finance] fetch error:", err)
        setError("Gagal memuat data dari database")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDownloadSummary = async () => {
    try {
      const XLSX = await getXLSX()
      const wb = XLSX.utils.book_new()

      // ringkasan
      const summaryData = [
        ["RINGKASAN INVESTASI KESELURUHAN", "", "", ""],
        ["Tanggal Laporan:", new Date().toLocaleDateString("id-ID"), "", ""],
        ["", "", "", ""],
        ["METRIK UTAMA", "", "", ""],
        ["Total Investasi", totals.invest, "", ""],
        ["Total Keuntungan", totals.profit, "", ""],
        ["ROI Keseluruhan", `${totals.roi.toFixed(2)}%`, "", ""],
        ["Jumlah Anggota", totals.investors, "", ""],
        ["", "", "", ""],
        ["DISTRIBUSI PER JENIS TANAMAN", "", "", ""],
        ["Jenis Tanaman", "Total Investasi", "", ""],
        ...distribution.map((d) => [d.name, d.value, "", ""]),
        ["", "", "", ""],
        ["TOP INVESTASI TANAMAN (Investor Terbanyak)", "", "", ""],
        ["Jenis Tanaman", "Total Investasi", "Profit Dibayar", "ROI"],
        ...topPlants.map((p) => [p.name, p.totalInvestment, p.totalProfit, `${(p.roi ?? 0).toFixed(2)}%`]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(summaryData)
      ws["!cols"] = [{ width: 28 }, { width: 22 }, { width: 20 }, { width: 14 }]

      // styling sederhana
      const border = { top: { style: "thin" }, right: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" } }
      const rows = summaryData.length
      const cols = 4
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (!cell) continue
          cell.s = { ...(cell.s || {}), border }
          if (r === 0 || r === 3 || r === 10 || r === 12) {
            cell.s = { ...(cell.s || {}), font: { bold: true } }
          }
          if (r === 11 || r === 13) {
            cell.s = { ...(cell.s || {}), font: { bold: true } }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "Ringkasan")
      XLSX.writeFile(wb, `Ringkasan_Investasi_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (error) {
      console.error("[finance] export error:", error)
      showError("Error", "Terjadi kesalahan saat membuat file Excel.")
    }
  }

  // Pie data pakai state 'distribution'
  const investmentData = distribution
  const totalInvestPie = investmentData.reduce((s, d) => s + d.value, 0)

  // Custom tooltip menampilkan nama + nominal
  function PieTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null
    const p = payload[0]
    return (
      <div style={{ background: "#fff", border: "1px solid #000", padding: "8px 10px", borderRadius: 6, fontWeight: 600 }}>
        <div style={{ marginBottom: 4 }}>{p?.name}</div>
        <div>Investasi : {formatCurrency(Number(p?.value) || 0)}</div>
      </div>
    )
  }

  return (
    <FinanceSidebar>
      <AlertComponent />
      <div className="p-6 space-y-8 font-[family-name:var(--font-poppins)]">
        <header>
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-4 transition-colors duration-300">Dashboard Finance</h1>
            <p className="text-[#889063] dark:text-gray-300 text-lg transition-colors duration-300">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm transition-colors duration-300">
                ⚠️ {error}
              </div>
            )}
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 border border-[#324D3E]/10 dark:border-gray-700 shadow-xl transition-colors duration-300">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#324D3E] dark:text-white mb-2 transition-colors duration-300">Ringkasan Investasi</h2>
                <p className="text-[#889063] dark:text-gray-300 text-lg transition-colors duration-300">Analisis detail per jenis tanaman dan kinerja anggota</p>
              </div>
              <Button 
                className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:shadow-lg text-white font-semibold px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2" 
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
                  <div key={i} className="rounded-3xl bg-white/60 dark:bg-gray-700/60 p-6 border border-[#324D3E]/10 dark:border-gray-600 animate-pulse transition-colors duration-300">
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
                  colorClass="text-chart-1"
                />
                <SummaryCard
                  title="Total Keuntungan"
                  value={formatCurrency(totals.profit)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  colorClass="text-chart-2"
                />
                <SummaryCard
                  title="ROI"
                  value={formatPercentage(totals.roi || 0)}
                  icon={<BarChart3 className="h-5 w-5" />}
                  colorClass="text-chart-3"
                />
                <SummaryCard
                  title="Jumlah Anggota"
                  value={`${totals.investors}`}
                  icon={<Users className="h-5 w-5" />}
                  colorClass="text-chart-4"
                />
              </div>
            )}

            {/* PIE + LEGEND WARNA */}
            <div className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-lg rounded-3xl p-8 border border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300">
              <h3 className="text-2xl font-bold text-[#324D3E] dark:text-white mb-6 transition-colors duration-300">Distribusi Investasi</h3>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-[#324D3E] dark:border-white"></div>
                </div>
              ) : (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {/* === Gradien + Stripes per slice (arah berbeda per index) === */}
                        <defs>
                          {investmentData.map((entry, i) => {
                            const base = pickBaseColor(entry.name, entry.color) // <- PAKSA WARNA SESUAI NAMA
                            const light = lighten(base, 0.32)
                            const id = slugId(entry.name || `slice-${i}`)
                            // rotasi berbeda supaya tidak menyatu
                            const rotations = [45, -45, 60, -60, 30, -30]
                            const rot = rotations[i % rotations.length]
                            return (
                              <pattern
                                key={`pat-${id}`}
                                id={`pat-${id}`}
                                width="12"
                                height="12"
                                patternUnits="userSpaceOnUse"
                                patternTransform={`rotate(${rot})`}
                              >
                                {/* fill gradien */}
                                <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor={light} />
                                  <stop offset="100%" stopColor={base} />
                                </linearGradient>
                                <rect x="0" y="0" width="12" height="12" fill={`url(#grad-${id})`} />
                                {/* stripes tebal hitam */}
                                <rect x="0" y="0" width="4" height="12" fill="rgba(0,0,0,0.38)" />
                              </pattern>
                            )
                          })}
                        </defs>

                        <Pie
                          data={investmentData}
                          cx="50%"
                          cy="50%"
                          outerRadius={86}
                          dataKey="value"
                          stroke="hsl(var(--background))"
                          strokeWidth={3}
                          label
                        >
                          {investmentData.map((entry, index) => {
                            const id = slugId(entry.name || `slice-${index}`)
                            return <Cell key={`cell-${id}`} fill={`url(#pat-${id})`} />
                          })}
                        </Pie>
                        <RTooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend mapping warna → nama tanaman + nilai + persentase */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                    {investmentData.map((d) => {
                      const pct = totalInvestPie > 0 ? (d.value / totalInvestPie) * 100 : 0
                      // gunakan warna final yang dipakai pada slice
                      const legendColor = pickBaseColor(d.name, d.color)
                      return (
                        <div key={d.name} className="flex items-center gap-3 text-sm">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: legendColor }}
                            aria-label={`Warna ${d.name}`}
                          />
                          <span className="font-medium">{d.name}</span>
                          <span className="text-muted-foreground">
                            — {formatCurrency(d.value)} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">Top Investasi Tanaman</h2>
            <Link href="/semua-investasi" className="text-[#4C3D19] dark:text-emerald-300 hover:text-[#324D3E] dark:hover:text-emerald-200 text-lg font-semibold hover:underline transition-all duration-300">
              Lihat Semua →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-8">
              {[...Array(1)].map((_, i) => (
                <div key={i} className="rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-[#324D3E]/10 dark:border-gray-700 p-8 animate-pulse shadow-xl transition-colors duration-300">
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
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
          )}
        </div>
      </div>
    </FinanceSidebar>
  )
}

function SummaryCard({
  title,
  value,
  icon,
  colorClass,
}: {
  title: string
  value: string
  icon: React.ReactNode
  colorClass: string
}) {
  const colors = {
    'text-chart-1': { bg: 'bg-[#324D3E]/10', text: 'text-[#324D3E]', hover: 'group-hover:bg-[#324D3E]/20' },
    'text-chart-2': { bg: 'bg-green-500/10', text: 'text-green-600', hover: 'group-hover:bg-green-500/20' },
    'text-chart-3': { bg: 'bg-blue-500/10', text: 'text-blue-600', hover: 'group-hover:bg-blue-500/20' },
    'text-chart-4': { bg: 'bg-purple-500/10', text: 'text-purple-600', hover: 'group-hover:bg-purple-500/20' },
  }
  
  const color = colors[colorClass as keyof typeof colors] || colors['text-chart-1']
  
  return (
    <div className="group rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color.bg} ${color.text} ${color.hover} transition-all duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#889063] dark:text-gray-300 transition-colors duration-300">{title}</p>
        <p className="text-2xl font-bold text-[#324D3E] dark:text-white group-hover:text-[#4C3D19] dark:group-hover:text-gray-200 transition-colors duration-300">{value}</p>
      </div>
    </div>
  )
}

function PlantCard({ plant }: { plant: any }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-[#324D3E]/10 dark:border-gray-700 hover:border-[#324D3E]/30 dark:hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105">
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#324D3E] dark:text-white mb-4 capitalize group-hover:text-[#4C3D19] dark:group-hover:text-gray-200 transition-colors duration-300">{plant.name}</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2 text-[#889063] dark:text-gray-200 transition-colors duration-300">
                <BarChart3 className="h-4 w-4 text-[#324D3E] dark:text-white" />
                ROI {formatPercentage(plant.roi || 0)}
              </span>
              <span className="flex items-center gap-2 text-[#889063] dark:text-gray-200 transition-colors duration-300">
                <TrendingUp className="h-4 w-4 text-[#4C3D19] dark:text-emerald-300" />
                {plant.instanceCount} pohon
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl bg-white/60 dark:bg-gray-700/60 backdrop-blur-lg p-6 border border-[#324D3E]/10 dark:border-gray-600 group-hover:bg-white/80 dark:group-hover:bg-gray-600/80 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="h-5 w-5 text-[#324D3E] dark:text-white" />
              <span className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300">Total Investasi</span>
            </div>
            <div className="text-xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">{formatCurrency(plant.totalInvestment)}</div>
          </div>
          <div className="rounded-2xl bg-white/60 dark:bg-gray-700/60 backdrop-blur-lg p-6 border border-[#324D3E]/10 dark:border-gray-600 group-hover:bg-white/80 dark:group-hover:bg-gray-600/80 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300">Total Profit</span>
            </div>
            <div className="text-xl font-bold text-green-600 dark:text-emerald-400 transition-colors duration-300">{formatCurrency(plant.totalProfit)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8 p-4 bg-[#324D3E]/5 dark:bg-gray-600/50 rounded-2xl border border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-lg font-medium text-[#324D3E] dark:text-white transition-colors duration-300">ROI Aktual</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300">{formatPercentage(plant.roi || 0)}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[#889063] dark:text-gray-200 transition-colors duration-300">
            <Users className="h-5 w-5 text-[#324D3E] dark:text-white" />
            <span className="font-medium">{plant.investorCount} investor aktif</span>
          </div>
        </div>
      </div>
    </div>
  )
}
