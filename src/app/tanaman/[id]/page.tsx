// app/tanaman/[id]/page.tsx
"use client"

import { FinanceSidebar } from "@/components/finance/FinanceSidebar"
import { prefetchFinanceCaches } from "@/lib/finance"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  DollarSign,
  FileDown,
  Leaf,
  TrendingUp,
  Users,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { use, useEffect, useMemo, useState } from "react"
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

// util lama (dipakai untuk INVESTASI per investor)
import { PLANT_TYPES, generateEnhancedMemberData } from "@/lib/finance"

// ================== types ==================
interface PlantInstance {
  plantType: string
  instanceName: string
  incomeRecords?: Array<{ amount: number; date: string }>
  operationalCosts?: Array<{ amount: number; date: string }>
}


// ================== helpers ==================
const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Math.round(n || 0),
  )

const BRUTALIST_COLORS = ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5", "#118AB2", "#073B4C"]


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
export default function Page({ params }: {params: Promise<{ id: string }> }) {
  const { id: plantTypeId } = use(params) // "gaharu", "jengkol", dll
  const plantTypeMeta = PLANT_TYPES.find((p) => p.id === plantTypeId) ?? {
    id: plantTypeId,
    name: plantTypeId,
    payoutEveryMonths: 0,
    baseAnnualROI: 0,
  }

  // ---------- PREFETCH CACHE untuk members (penting agar generateEnhancedMemberData tidak error) ----------
  const [ready, setReady] = useState(false)
  useEffect(() => {
    prefetchFinanceCaches().finally(() => setReady(true))
  }, [])

  // ---------- fetch DB: semua plant instances ----------
  const [instances, setInstances] = useState<PlantInstance[]>([])
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

    list.forEach((inst: PlantInstance) => {
      const incomes = inst?.incomeRecords || []
      const costs = inst?.operationalCosts || []

      const sumIncome = incomes.reduce((s: number, r: any) => s + (r.amount || 0), 0)
      const sumCost = costs.reduce((s: number, r: any) => s + (r.amount || 0), 0)
      const net = sumIncome - sumCost
      netPerInstance.set(inst.instanceName, net)
      totalNet += net

      // monthly
      incomes.forEach((r) => {
        const d = new Date(r.date)
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        monthly.set(ym, (monthly.get(ym) || 0) + (r.amount || 0))
      })
      costs.forEach((r) => {
        const d = new Date(r.date)
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        monthly.set(ym, (monthly.get(ym) || 0) - (r.amount || 0)) // kurangi biaya
      })

      // yearly
      incomes.forEach((r) => {
        const y = new Date(r.date).getFullYear()
        yearly.set(y.toString(), (yearly.get(y.toString()) || 0) + (r.amount || 0))
      })
      costs.forEach((r) => {
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
  // Ambil data members SETELAH prefetch selesai
  const members = useMemo(() => (ready ? generateEnhancedMemberData() : []), [ready])

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

  if (loading || !ready) {
    return (
      <FinanceSidebar>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className="inline-block p-6 bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Leaf className="h-8 w-8 text-[#324D3E]" />
            </motion.div>
            <p className="text-[#324D3E] text-lg font-medium mt-4">Memuat ringkasan investasi...</p>
          </div>
        </div>
      </FinanceSidebar>
    )
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
                <div className="p-3 bg-[#324D3E]/10 rounded-2xl text-[#324D3E]">
                  <Leaf className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] mb-1">
                    Ringkasan Investasi {plantTypeMeta.name}
                  </h1>
                  <p className="text-[#889063] text-sm sm:text-base">
                    Data berasal dari transaksi di database (income &amp; operational costs)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
              <motion.button
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
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-[#324D3E] hover:from-green-600 hover:to-[#4C3D19] px-4 py-2 text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FileDown className="h-4 w-4" />
                Download .xls
              </motion.button>

              <Link href="/semua-investasi">
                <motion.button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-[#324D3E]/10 hover:bg-[#324D3E] hover:text-white px-4 py-2 text-sm font-medium text-[#324D3E] transition-all duration-300 shadow-lg w-full sm:w-auto"
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
              value={fmtIDR(dbAgg.totalNet)}
              icon={<TrendingUp className="h-5 w-5" />}
              colorClass="text-chart-2"
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
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-[#324D3E]/10">
              <h3 className="text-lg sm:text-xl font-bold text-[#324D3E] mb-6 text-center border-b-2 border-[#324D3E]/10 pb-4">
                Net Profit Bulanan {selectedYear}
              </h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#324D3E" strokeOpacity={0.2} strokeWidth={1} />
                    <XAxis dataKey="month" stroke="#889063" fontSize={12} fontWeight="500" />
                    <YAxis stroke="#889063" fontSize={12} fontWeight="500" />
                    <Tooltip
                      formatter={(value: number) => [fmtIDR(value), "Net Profit"]}
                      contentStyle={{
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
                      stroke="#324D3E"
                      strokeWidth={3}
                      dot={{ fill: "#324D3E", strokeWidth: 2, stroke: "#fff", r: 5 }}
                      activeDot={{ r: 8, fill: "#4C3D19" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribusi Investasi Per Investor */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-[#324D3E]/10">
              <h3 className="text-lg sm:text-xl font-bold text-[#324D3E] mb-6 text-center border-b-2 border-[#324D3E]/10 pb-4">
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
                      label={({ name }) => name}
                      outerRadius={window.innerWidth < 640 ? 80 : 100}
                      dataKey="value"
                      stroke="#324D3E"
                      strokeWidth={2}
                    >
                      {perInvestor.rows.map((_, i) => (
                        <Cell key={i} fill={BRUTALIST_COLORS[i % BRUTALIST_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [fmtIDR(v), "Investasi"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #324D3E",
                        borderRadius: "12px",
                        color: "#324D3E",
                        fontWeight: "600",
                        boxShadow: "0 10px 25px -5px rgba(50,77,62,0.2)",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        </motion.header>

          {/* Laporan Bulanan (table) + pilih tahun */}
          <motion.section
            className="mb-8 bg-white/90 backdrop-blur-xl rounded-3xl border border-[#324D3E]/10 p-6 sm:p-8 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-[#324D3E] flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  Laporan Bulanan {plantTypeMeta.name}
                </h2>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white/80 backdrop-blur-xl border border-[#324D3E]/20 rounded-xl px-3 py-2 text-[#324D3E] font-medium focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40"
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
                  <tr className="border-b-2 border-[#324D3E]/10">
                    <th className="py-3 pr-4 text-left font-semibold text-[#324D3E]">Bulan</th>
                    <th className="py-3 pr-4 text-right font-semibold text-[#324D3E]">Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySeries.map((m, idx) => (
                    <tr
                      key={m.month}
                      className={`border-b border-[#324D3E]/5 ${idx % 2 === 0 ? "bg-white/40" : "bg-[#324D3E]/5"}`}
                    >
                      <td className="py-3 pr-4 font-medium text-[#324D3E]">{m.month}</td>
                      <td className="py-3 pr-4 text-right text-[#889063] font-semibold">{fmtIDR(m.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Ringkasan Tahunan */}
          <motion.section
            className="mb-8 bg-white/90 backdrop-blur-xl rounded-3xl border border-[#324D3E]/10 p-6 sm:p-8 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#324D3E]">Ringkasan Tahunan</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#324D3E]/10">
                    <th className="py-3 pr-4 text-left font-semibold text-[#324D3E]">Tahun</th>
                    <th className="py-3 pr-4 text-right font-semibold text-[#324D3E]">Total Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyRows.map((y, idx) => (
                    <tr
                      key={y.year}
                      className={`border-b border-[#324D3E]/5 ${idx % 2 === 0 ? "bg-white/40" : "bg-[#324D3E]/5"}`}
                    >
                      <td className="py-3 pr-4 font-medium text-[#324D3E]">{y.year}</td>
                      <td className="py-3 pr-4 text-right text-green-600 font-semibold">{fmtIDR(y.totalProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Per Investor */}
          <motion.section
            className="mb-8 bg-white/90 backdrop-blur-xl rounded-3xl border border-[#324D3E]/10 p-6 sm:p-8 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#324D3E]">Rincian Per Investor</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#324D3E]/10">
                    <th className="py-3 pr-4 text-left font-semibold text-[#324D3E]">Nama</th>
                    <th className="py-3 pr-4 text-right font-semibold text-[#324D3E]">Total Investasi</th>
                    <th className="py-3 pr-4 text-right font-semibold text-[#324D3E]">Total Profit</th>
                    <th className="py-3 pr-4 text-right font-semibold text-[#324D3E]">ROI Individu</th>
                  </tr>
                </thead>
                <tbody>
                  {perInvestor.rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#889063]">
                        Belum ada data investasi untuk tipe ini.
                      </td>
                    </tr>
                  ) : (
                    perInvestor.rows.map((r, idx) => (
                      <tr
                        key={r.name}
                        className={`border-b border-[#324D3E]/5 ${idx % 2 === 0 ? "bg-white/40" : "bg-[#324D3E]/5"}`}
                      >
                        <td className="py-3 pr-4 font-medium text-[#324D3E]">{r.name}</td>
                        <td className="py-3 pr-4 text-right text-[#889063] font-semibold">{fmtIDR(r.invest)}</td>
                        <td className="py-3 pr-4 text-right text-green-600 font-semibold">{fmtIDR(r.profit)}</td>
                        <td className="py-3 pr-4 text-right font-medium text-[#324D3E]">
                          {r.invest > 0 ? `${((r.profit / r.invest) * 100).toFixed(2)}%` : "0%"}
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
  )
}

// ================== small UI ==================
function SummaryCard({
  title,
  value,
  icon,
  colorClass,
  highlight,
}: {
  title: string
  value: string
  icon: React.ReactNode
  colorClass: string
  highlight?: boolean
}) {
  const colors = {
    'text-chart-1': { bg: 'bg-[#324D3E]/10', text: 'text-[#324D3E]', hover: 'group-hover:bg-[#324D3E]/20' },
    'text-chart-2': { bg: 'bg-green-500/10', text: 'text-green-600', hover: 'group-hover:bg-green-500/20' },
    'text-chart-3': { bg: 'bg-blue-500/10', text: 'text-blue-600', hover: 'group-hover:bg-blue-500/20' },
    'text-chart-4': { bg: 'bg-purple-500/10', text: 'text-purple-600', hover: 'group-hover:bg-purple-500/20' },
  }

  const color = colors[colorClass as keyof typeof colors] || colors['text-chart-1']

  return (
    <div className={`group rounded-3xl bg-white/90 backdrop-blur-xl p-6 border ${highlight ? "border-green-500/30 shadow-lg" : "border-[#324D3E]/10"} shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color.bg} ${color.text} ${color.hover} transition-all duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#889063]">{title}</p>
        <p className={`text-2xl font-bold ${highlight ? "text-green-600" : "text-[#324D3E]"} group-hover:text-[#4C3D19] transition-colors duration-300`}>{value}</p>
      </div>
    </div>
  )
}
