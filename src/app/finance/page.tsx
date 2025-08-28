// src/app/finance/page.tsx
"use client"

import Link from "next/link"
import { ArrowUpRight, TrendingUp, DollarSign, BarChart3, Users, Download } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { SidebarLayout } from "@/components/sidebar-layout"
import { Button } from "@/components/ui-finance/button"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import React from "react"

// ===== XLSX (pakai dynamic import agar aman SSR) =====
let XLSXMod: any
async function getXLSX() {
  if (XLSXMod) return XLSXMod
  XLSXMod = await import("xlsx-js-style")
  return XLSXMod as any
}

const BRUTALIST_COLORS = ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5", "#118AB2", "#073B4C"]

// ==== Response type dari /api/finance/summary ====
type Summary = {
  totalInvestment: number
  totalProfit: number
  roi: number
  investorsCount: number
  distribution: { name: string; value: number }[]
  topPlantTypes: {
    plantTypeId: string
    plantTypeName: string
    totalInvestment: number
    paidProfit: number
    roi: number
    treeCount: number
    activeInvestors: number
  }[]
}

export default function FinancePage() {
  // Top plants tetap dipakai komponen kartu yang sama
  const [topPlants, setTopPlants] = React.useState<
    { id: string; name: string; totalInvestment: number; totalProfit: number; roi: number; instanceCount: number; investorCount: number }[]
  >([])

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

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

        // set ringkasan
        setTotals({
          invest: data.totalInvestment || 0,
          profit: data.totalProfit || 0,
          roi: data.roi || 0,
          investors: data.investorsCount || 0,
        })

        // set distribusi (pie)
        const dist = (data.distribution || []).map((d, i) => ({
          name: d.name,
          value: d.value,
          color: BRUTALIST_COLORS[i % BRUTALIST_COLORS.length],
        }))
        setDistribution(dist)

        // set top tanaman (mapping ke bentuk lama kartu) -> TAMPILKAN 1 TANAMAN DENGAN INVESTOR TERBANYAK
        const mapped = (data.topPlantTypes || []).map((t) => ({
          id: t.plantTypeId,
          name: t.plantTypeName,
          totalInvestment: t.totalInvestment || 0,
          totalProfit: t.paidProfit || 0,
          roi: t.roi || 0,
          instanceCount: t.treeCount || 0, // jumlah pohon
          investorCount: t.activeInvestors || 0,
        }))
        // pilih satu dengan investorCount terbanyak (kalau seri, ambil yang pertama)
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
      alert("Terjadi kesalahan saat membuat file Excel.")
    }
  }

  // Pie data pakai state 'distribution'
  const investmentData = distribution
  const totalInvestPie = investmentData.reduce((s, d) => s + d.value, 0)

  // Custom tooltip menampilkan nama + nominal
  function PieTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null
    const p = payload[0]
    // name ada di payload.name, value ada di payload.value
    return (
      <div style={{ background: "#fff", border: "1px solid #000", padding: "8px 10px", borderRadius: 6, fontWeight: 600 }}>
        <div style={{ marginBottom: 4 }}>{p?.name}</div>
        <div>Investasi : {formatCurrency(Number(p?.value) || 0)}</div>
      </div>
    )
  }

  return (
    <SidebarLayout>
      <div className="p-6 space-y-8">
        <header>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            {error && (
              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-chart-2 mb-2">Ringkasan Investasi</h2>
                <p className="text-muted-foreground">Analisis detail per jenis tanaman dan kinerja anggota</p>
              </div>
              <Button className="gap-2" onClick={handleDownloadSummary}>
                <Download className="w-4 h-4" />
                Download Ringkasan
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-xl bg-muted p-4 border border-border animate-pulse">
                    <div className="h-10 w-10 bg-muted-foreground/20 rounded-lg mb-3"></div>
                    <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                    <div className="h-6 bg-muted-foreground/20 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            <div className="bg-muted rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Distribusi Investasi</h3>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
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
                          {investmentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend mapping warna → nama tanaman + nilai + persentase */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                    {investmentData.map((d) => {
                      const pct = totalInvestPie > 0 ? (d.value / totalInvestPie) * 100 : 0
                      return (
                        <div key={d.name} className="flex items-center gap-3 text-sm">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: d.color }}
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Top Investasi Tanaman</h2>
            <Link href="/semua-investasi" className="text-primary hover:text-primary/80 text-sm font-medium">
              Lihat Semua →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(1)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-card border border-border p-6 animate-pulse">
                  <div className="h-6 bg-muted rounded mb-4 w-1/3"></div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl bg-muted p-4">
                      <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                      <div className="h-6 bg-muted-foreground/20 rounded"></div>
                    </div>
                    <div className="rounded-xl bg-muted p-4">
                      <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                      <div className="h-6 bg-muted-foreground/20 rounded"></div>
                    </div>
                  </div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {topPlants.map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
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
  return (
    <div className="rounded-xl bg-card p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ${colorClass}`}>{icon}</div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}

function PlantCard({ plant }: { plant: any }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2 capitalize">{plant.name}</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                ROI {formatPercentage(plant.roi || 0)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {plant.instanceCount} pohon
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl bg-muted p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-chart-1" />
              <span className="text-sm font-medium text-muted-foreground">Total Investasi</span>
            </div>
            <div className="text-lg font-bold text-foreground">{formatCurrency(plant.totalInvestment)}</div>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-chart-2" />
              <span className="text-sm font-medium text-muted-foreground">Total Profit</span>
            </div>
            <div className="text-lg font-bold text-chart-2">{formatCurrency(plant.totalProfit)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-chart-3" />
            <span className="text-sm font-medium text-muted-foreground">ROI Aktual</span>
          </div>
          <div className="text-lg font-bold text-chart-3">{formatPercentage(plant.roi || 0)}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{plant.investorCount} investor aktif</span>
          </div>
          <Button asChild size="sm" className="gap-2">
            {/* <Link href={`/tanaman/${plant.id}`}>
              Lihat Detail
              <ArrowUpRight className="h-4 w-4" />
            </Link> */}
          </Button>
        </div>
      </div>
    </div>
  )
}
