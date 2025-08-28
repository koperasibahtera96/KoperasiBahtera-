// app/tanaman/[id]/page.tsx
"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  FileDown,
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { ThemeProvider } from "@/components/theme-provider"

// util lama (dipakai untuk INVESTASI per investor)
import { PLANT_TYPES, generateEnhancedMemberData } from "@/lib/finance"

// ================== helpers ==================
const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Math.round(n || 0),
  )

const BRUTALIST_COLORS = ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5", "#118AB2", "#073B4C"]

// Unwrap params untuk Next 15 (params bisa Promise)
function useParamId(params: { id: string } | Promise<{ id: string }>) {
  const p: any = params
  if (p && typeof p.then === "function") {
    // @ts-ignore – React.use() boleh dipakai untuk unwrapping promise di Client Component
    return (React as any).use(p).id as string
  }
  return p.id as string
}

/* ======== SATU TOMBOL EXPORT: gabung semua section jadi satu .xls ======== */
function exportAllAsXls(args: {
  plantTypeId: string
  plantTypeName: string
  selectedYear: number
  totalInvestAll: number
  totalNet: number
  investorCount: number
  monthlySelectedYear: Array<{ month: string; net: number }>
  yearlyRows: Array<{ year: number; totalProfit: number }>
  perInvestorRows: Array<{ name: string; invest: number; profit: number }>
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
    perInvestorRows,
  } = args

  const roiPct = totalInvestAll > 0 ? (totalNet / totalInvestAll) * 100 : 0

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
    </style>
  </head>
  <body>
    <div class="title">Laporan ${plantTypeName}</div>

    <div class="header">RINGKASAN</div>
    <table>
      <tr><th>Keterangan</th><th>Nilai</th></tr>
      <tr><td>Total Investasi</td><td>${fmtIDR(totalInvestAll)}</td></tr>
      <tr><td>Total Profit (Net)</td><td>${fmtIDR(totalNet)}</td></tr>
      <tr><td>ROI (Profit/Invest)</td><td>${roiPct.toFixed(2)}%</td></tr>
      <tr><td>Jumlah Investor</td><td>${investorCount}</td></tr>
    </table>

    <div class="header">LAPORAN BULANAN ${selectedYear}</div>
    <table>
      <tr><th>Bulan</th><th>Net Profit</th></tr>
      ${monthlySelectedYear
        .map(
          (r) => `
        <tr>
          <td>${r.month}</td>
          <td>${fmtIDR(r.net)}</td>
        </tr>`,
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
          <td>${fmtIDR(y.totalProfit)}</td>
        </tr>`,
        )
        .join("")}
    </table>

    <div class="header">RINCIAN PER INVESTOR</div>
    <table>
      <tr><th>Nama</th><th>Total Investasi</th><th>Total Profit</th><th>ROI Individu</th></tr>
      ${perInvestorRows
        .map(
          (p) => `
        <tr>
          <td>${p.name}</td>
          <td>${fmtIDR(p.invest)}</td>
          <td>${fmtIDR(p.profit)}</td>
          <td>${p.invest > 0 ? ((p.profit / p.invest) * 100).toFixed(2) + "%" : "0%"}</td>
        </tr>`,
        )
        .join("")}
    </table>
  </body>
  </html>
  `

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `laporan-${plantTypeId}-${selectedYear}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ================== page ==================
export default function Page({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const plantTypeId = useParamId(params) // "gaharu", "jengkol", dll
  const plantTypeMeta = PLANT_TYPES.find((p) => p.id === plantTypeId) ?? {
    id: plantTypeId,
    name: plantTypeId,
    payoutEveryMonths: 0,
    baseAnnualROI: 0,
  }

  // ---------- fetch DB: semua plant instances ----------
  const [instances, setInstances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/plants")
        const data = res.ok ? await res.json() : []
        if (mounted) setInstances(data || [])
      } catch {
        if (mounted) setInstances([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // ---------- AGREGASI dari DB untuk plantType yang dipilih ----------
  const dbAgg = useMemo(() => {
    // filter hanya instance dengan plantType == halaman ini
    const list = instances.filter((x) => x.plantType === plantTypeId)

    // map nama instance => net profit (income - cost)
    const netPerInstance = new Map<string, number>()
    // monthly net "YYYY-MM" => number
    const monthly = new Map<string, number>()
    // yearly net  YYYY => number
    const yearly = new Map<string, number>()

    let totalNet = 0

    list.forEach((inst: any) => {
      const incomes = inst?.incomeRecords || []
      const costs = inst?.operationalCosts || []

      const sumIncome = incomes.reduce((s: number, r: any) => s + (r.amount || 0), 0)
      const sumCost = costs.reduce((s: number, r: any) => s + (r.amount || 0), 0)
      const net = sumIncome - sumCost
      netPerInstance.set(inst.instanceName, net)
      totalNet += net

      // monthly
      incomes.forEach((r: any) => {
        const d = new Date(r.date)
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        monthly.set(ym, (monthly.get(ym) || 0) + (r.amount || 0))
      })
      costs.forEach((r: any) => {
        const d = new Date(r.date)
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        monthly.set(ym, (monthly.get(ym) || 0) - (r.amount || 0)) // kurangi biaya
      })

      // yearly
      incomes.forEach((r: any) => {
        const y = new Date(r.date).getFullYear()
        yearly.set(y.toString(), (yearly.get(y.toString()) || 0) + (r.amount || 0))
      })
      costs.forEach((r: any) => {
        const y = new Date(r.date).getFullYear()
        yearly.set(y.toString(), (yearly.get(y.toString()) || 0) - (r.amount || 0))
      })
    })

    // sort monthly asc
    const monthlyArr = Array.from(monthly.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([ym, value]) => ({ ym, value }))
    const yearlyArr = Array.from(yearly.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, value]) => ({ year: Number(year), value }))

    return {
      instancesOfType: list,
      netPerInstance,
      monthly: monthlyArr,
      yearly: yearlyArr,
      totalNet,
    }
  }, [instances, plantTypeId])

  // ---------- PER INVESTOR ----------
  const members = useMemo(() => generateEnhancedMemberData(), [])
  const perInvestor = useMemo(() => {
    const nameSet = new Set(dbAgg.instancesOfType.map((x) => x.instanceName))

    const investPerInstance = new Map<string, number>()
    members.forEach((m) => {
      m.investments.forEach((inv: any) => {
        if (nameSet.has(inv.plantName)) {
          investPerInstance.set(inv.plantName, (investPerInstance.get(inv.plantName) || 0) + inv.amount)
        }
      })
    })

    const map = new Map<
      string,
      { name: string; invest: number; profit: number }
    >()

    members.forEach((m) => {
      m.investments.forEach((inv: any) => {
        if (!nameSet.has(inv.plantName)) return
        const totalInst = investPerInstance.get(inv.plantName) || 0
        const netInst = dbAgg.netPerInstance.get(inv.plantName) || 0
        const share = totalInst > 0 ? (inv.amount || 0) / totalInst : 0
        const profitShare = netInst * share

        const prev = map.get(m.name) || { name: m.name, invest: 0, profit: 0 }
        map.set(m.name, {
          name: m.name,
          invest: prev.invest + (inv.amount || 0),
          profit: prev.profit + profitShare,
        })
      })
    })

    const rows = Array.from(map.values()).sort((a, b) => b.invest - a.invest)
    const totalInvestAll = rows.reduce((s, r) => s + r.invest, 0)
    return { rows, totalInvestAll }
  }, [members, dbAgg.instancesOfType, dbAgg.netPerInstance])

  // ========= UI data =========
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const availableYears = useMemo(
    () =>
      [...new Set(dbAgg.monthly.map((m) => Number(m.ym.split("-")[0])))].sort((a, b) => b - a),
    [dbAgg.monthly],
  )

  const monthlySeries = useMemo(
    () =>
      dbAgg.monthly
        .filter((m) => Number(m.ym.split("-")[0]) === selectedYear)
        .map((m) => ({ month: m.ym, net: m.value })),
    [dbAgg.monthly, selectedYear],
  )

  const yearlyRows = useMemo(
    () => dbAgg.yearly.map((y) => ({ year: y.year, totalProfit: y.value })),
    [dbAgg.yearly],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="h-64 flex items-center justify-center">Memuat ringkasan…</div>
      </div>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <div className="bg-slate-900 min-h-screen text-white">
        <div className="p-6">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">🌱</div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Ringkasan Investasi {plantTypeMeta.name}</h1>
                  <p className="text-slate-400">
                    Data berasal dari transaksi di database (income &amp; operational costs)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* SATU TOMBOL DOWNLOAD SEMUA */}
                <button
                  onClick={() =>
                    exportAllAsXls({
                      plantTypeId,
                      plantTypeName: plantTypeMeta.name,
                      selectedYear,
                      totalInvestAll: perInvestor.totalInvestAll,
                      totalNet: dbAgg.totalNet,
                      investorCount: perInvestor.rows.length,
                      monthlySelectedYear: monthlySeries,
                      yearlyRows,
                      perInvestorRows: perInvestor.rows,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  <FileDown className="h-4 w-4" />
                  Download .xls
                </button>

                <Link
                  href="/finance"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </Link>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                title="Total Investasi"
                value={fmtIDR(perInvestor.totalInvestAll)}
                icon={<DollarSign className="h-5 w-5" />}
                bgColor="from-blue-500 to-blue-600"
              />
              <SummaryCard
                title="Total Profit (Net)"
                value={fmtIDR(dbAgg.totalNet)}
                icon={<TrendingUp className="h-5 w-5" />}
                bgColor="from-green-500 to-green-600"
                highlight
              />
              <SummaryCard
                title="ROI (Profit/Invest)"
                value={
                  perInvestor.totalInvestAll > 0
                    ? `${((dbAgg.totalNet / perInvestor.totalInvestAll) * 100).toFixed(2)}%`
                    : "0%"
                }
                icon={<BarChart3 className="h-5 w-5" />}
                bgColor="from-purple-500 to-purple-600"
              />
              <SummaryCard
                title="Jumlah Investor"
                value={`${perInvestor.rows.length}`}
                icon={<Users className="h-5 w-5" />}
                bgColor="from-orange-500 to-orange-600"
              />
            </div>

            {/* Chart Net Bulanan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-600 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 text-center border-b-2 border-slate-600 pb-2">
                  Net Profit Bulanan {selectedYear}
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlySeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeWidth={2} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} fontWeight="bold" />
                      <YAxis stroke="#94a3b8" fontSize={12} fontWeight="bold" />
                      <Tooltip
                        formatter={(value: number) => [fmtIDR(value), "Net Profit"]}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "3px solid #000000",
                          borderRadius: "8px",
                          color: "#000000",
                          fontWeight: "bold",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke="#06FFA5"
                        strokeWidth={4}
                        dot={{ fill: "#06FFA5", strokeWidth: 3, stroke: "#000", r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Distribusi Investasi Per Investor */}
              <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-600 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 text-center border-b-2 border-slate-600 pb-2">
                  Distribusi Investasi per Investor
                </h3>
                <div className="h-80">
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
                        label={({ name }) => name}
                        outerRadius={100}
                        dataKey="value"
                        stroke="#000"
                        strokeWidth={3}
                      >
                        {perInvestor.rows.map((_, i) => (
                          <Cell key={i} fill={BRUTALIST_COLORS[i % BRUTALIST_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [fmtIDR(v), "Investasi"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </header>

          {/* Laporan Bulanan (table) + pilih tahun */}
          <section className="mb-8 rounded-xl bg-slate-800 border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-emerald-400" />
                  Laporan Bulanan {plantTypeMeta.name}
                </h2>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              {/* tombol download per-section dihapus */}
              <div />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="py-3 pr-4 text-left font-semibold text-white">Bulan</th>
                    <th className="py-3 pr-4 text-right font-semibold text-white">Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySeries.map((m, idx) => (
                    <tr
                      key={m.month}
                      className={`border-b border-slate-700 ${idx % 2 === 0 ? "bg-slate-800" : "bg-slate-750"}`}
                    >
                      <td className="py-3 pr-4 font-medium text-white">{m.month}</td>
                      <td className="py-3 pr-4 text-right text-slate-300">{fmtIDR(m.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Ringkasan Tahunan */}
          <section className="mb-8 rounded-xl bg-slate-800 border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Ringkasan Tahunan</h2>
              {/* tombol download per-section dihapus */}
              <div />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="py-3 pr-4 text-left font-semibold text-white">Tahun</th>
                    <th className="py-3 pr-4 text-right font-semibold text-white">Total Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyRows.map((y, idx) => (
                    <tr
                      key={y.year}
                      className={`border-b border-slate-700 ${idx % 2 === 0 ? "bg-slate-800" : "bg-slate-750"}`}
                    >
                      <td className="py-3 pr-4 font-medium text-white">{y.year}</td>
                      <td className="py-3 pr-4 text-right text-green-400">{fmtIDR(y.totalProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Per Investor */}
          <section className="mb-8 rounded-xl bg-slate-800 border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Rincian Per Investor</h2>
              {/* tombol download per-section dihapus */}
              <div />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="py-3 pr-4 text-left font-semibold text-white">Nama</th>
                    <th className="py-3 pr-4 text-right font-semibold text-white">Total Investasi</th>
                    <th className="py-3 pr-4 text-right font-semibold text-white">Total Profit</th>
                    <th className="py-3 pr-4 text-right font-semibold text-white">ROI Individu</th>
                  </tr>
                </thead>
                <tbody>
                  {perInvestor.rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        Belum ada data investasi untuk tipe ini.
                      </td>
                    </tr>
                  ) : (
                    perInvestor.rows.map((r, idx) => (
                      <tr
                        key={r.name}
                        className={`border-b border-slate-700 ${idx % 2 === 0 ? "bg-slate-800" : "bg-slate-750"}`}
                      >
                        <td className="py-3 pr-4 font-medium text-white">{r.name}</td>
                        <td className="py-3 pr-4 text-right text-slate-300">{fmtIDR(r.invest)}</td>
                        <td className="py-3 pr-4 text-right text-green-400">{fmtIDR(r.profit)}</td>
                        <td className="py-3 pr-4 text-right font-medium text-white">
                          {r.invest > 0 ? `${((r.profit / r.invest) * 100).toFixed(2)}%` : "0%"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </ThemeProvider>
  )
}

// ================== small UI ==================
function SummaryCard({
  title,
  value,
  icon,
  bgColor,
  highlight,
}: {
  title: string
  value: string
  icon: React.ReactNode
  bgColor: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-slate-700 border-green-500" : "bg-slate-700 border-slate-600"} border`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${bgColor} text-white`}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className={`text-xl font-bold ${highlight ? "text-green-400" : "text-white"}`}>{value}</p>
      </div>
    </div>
  )
}
