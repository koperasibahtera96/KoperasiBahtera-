"use client"

import type React from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  FileDown,
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  PLANTS,
  generateReport,
  exportMonthlyReportCSV,
  exportYearlyReportCSV,
  exportInvestorReportCSV,
  exportCompleteReportCSV,
  downloadCSV,
} from "@/lib/finance"
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

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n))

const BRUTALIST_COLORS = ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5", "#118AB2", "#073B4C"]

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null // Don't show label for slices smaller than 5%

  return (
    <text
      x={x}
      y={y}
      fill="#000"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
      stroke="#fff"
      strokeWidth="2"
      paintOrder="stroke"
    >
      {name}
    </text>
  )
}

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-4">
      {payload.map((entry: any, index: number) => (
        <div
          key={index}
          className="flex items-center gap-2 bg-slate-700 px-3 py-2 rounded-lg border-2 border-slate-600"
        >
          <div className="w-4 h-4 rounded-sm border-2 border-black" style={{ backgroundColor: entry.color }} />
          <span className="text-sm font-bold text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Page({ params }: { params: { id: string } }) {
  const plant = PLANTS.find((p) => p.id === params.id) ?? PLANTS[0]
  const { monthly, yearly, perInvestor, totals } = useMemo(() => generateReport(plant, new Date()), [plant])

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // Get available years from monthly data
  const availableYears = [...new Set(monthly.map((m) => Number.parseInt(m.ym.split("-")[0])))].sort((a, b) => b - a)

  // Filter monthly data by selected year
  const filteredMonthly = monthly.filter((m) => Number.parseInt(m.ym.split("-")[0]) === selectedYear)

  const investorData = perInvestor.map((investor, index) => ({
    name: investor.name,
    value: investor.invest,
    color: BRUTALIST_COLORS[index % BRUTALIST_COLORS.length],
  }))

  const progressData = filteredMonthly.map((m) => ({
    month: m.ym,
    capital: m.capital,
    profit: m.payout,
    accrual: m.accrualSinceLastPayout,
  }))

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <div className="p-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">🌱</div>
              <div>
                <h1 className="text-2xl font-bold text-white">Ringkasan Investasi {plant.name}</h1>
                <p className="text-slate-400">Akrual bulanan, payout tiap {plant.payoutEveryMonths} bulan</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadCSV(`laporan-lengkap-${plant.id}.csv`, exportCompleteReportCSV(plant))}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <FileDown className="h-4 w-4" />
                Download Lengkap
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
              value={fmtIDR(totals.invest)}
              icon={<DollarSign className="h-5 w-5" />}
              bgColor="from-blue-500 to-blue-600"
            />
            <SummaryCard
              title="Total Keuntungan (Dibayar)"
              value={fmtIDR(totals.profit)}
              icon={<TrendingUp className="h-5 w-5" />}
              bgColor="from-green-500 to-green-600"
              highlight
            />
            <SummaryCard
              title="ROI Aktual"
              value={`${totals.roiPct.toFixed(2)}%`}
              icon={<BarChart3 className="h-5 w-5" />}
              bgColor="from-purple-500 to-purple-600"
            />
            <SummaryCard
              title="Jumlah Investor"
              value={`${totals.investors}`}
              icon={<Users className="h-5 w-5" />}
              bgColor="from-orange-500 to-orange-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-600 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4 text-center border-b-2 border-slate-600 pb-2">
                Distribusi Investasi per Investor
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={investorData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#000"
                      strokeWidth={3}
                    >
                      {investorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [fmtIDR(value), "Investasi"]}
                      labelFormatter={(label) => `Investor: ${label}`}
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "3px solid #000",
                        borderRadius: "8px",
                        color: "#fff",
                        fontWeight: "bold",
                        boxShadow: "4px 4px 0px #000",
                      }}
                    />
                    <Legend content={<CustomLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-600 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4 text-center border-b-2 border-slate-600 pb-2">
                Perkembangan Bulanan {selectedYear}
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeWidth={2} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} fontWeight="bold" />
                    <YAxis stroke="#94a3b8" fontSize={12} fontWeight="bold" />
                    <Tooltip
                      formatter={(value: number, name: string) => [fmtIDR(value), name]}
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "3px solid #000",
                        borderRadius: "8px",
                        color: "#fff",
                        fontWeight: "bold",
                        boxShadow: "4px 4px 0px #000",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="capital"
                      stroke="#06FFA5"
                      strokeWidth={4}
                      name="Modal"
                      dot={{ fill: "#06FFA5", strokeWidth: 3, stroke: "#000", r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#FF6B35"
                      strokeWidth={4}
                      name="Payout"
                      dot={{ fill: "#FF6B35", strokeWidth: 3, stroke: "#000", r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-8 rounded-xl bg-slate-800 border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Calendar className="h-5 w-5 text-emerald-400" />
                Laporan Bulanan {plant.name}
              </h2>

              {/* Year Pagination */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const currentIndex = availableYears.indexOf(selectedYear)
                    if (currentIndex < availableYears.length - 1) {
                      setSelectedYear(availableYears[currentIndex + 1])
                    }
                  }}
                  disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
                  className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 bg-slate-700 rounded-lg text-white font-medium">{selectedYear}</span>
                <button
                  onClick={() => {
                    const currentIndex = availableYears.indexOf(selectedYear)
                    if (currentIndex > 0) {
                      setSelectedYear(availableYears[currentIndex - 1])
                    }
                  }}
                  disabled={availableYears.indexOf(selectedYear) === 0}
                  className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() =>
                downloadCSV(
                  `laporan-bulanan-${plant.id}-${selectedYear}.csv`,
                  exportMonthlyReportCSV(plant, selectedYear),
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Download
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="py-3 pr-4 text-left font-semibold text-white">Bulan</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">Invest Baru</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">Modal Akhir</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">Akrual</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">Akrual Sejak Payout</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">Payout</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthly.map((m, index) => (
                  <tr
                    key={m.ym}
                    className={`border-b border-slate-700 hover:bg-slate-700 ${index % 2 === 0 ? "bg-slate-800" : "bg-slate-750"}`}
                  >
                    <td className="py-3 pr-4 font-medium text-white">{m.ym}</td>
                    <td className="py-3 pr-4 text-right text-slate-300">{m.newInvest ? fmtIDR(m.newInvest) : "-"}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{fmtIDR(m.capital)}</td>
                    <td className="py-3 pr-4 text-right text-slate-300">{m.accrual ? fmtIDR(m.accrual) : "-"}</td>
                    <td className="py-3 pr-4 text-right text-slate-300">
                      {m.accrualSinceLastPayout ? fmtIDR(m.accrualSinceLastPayout) : "-"}
                    </td>
                    <td
                      className={`py-3 pr-4 text-right font-semibold ${m.payout ? "text-green-400" : "text-slate-500"}`}
                    >
                      {m.payout ? fmtIDR(m.payout) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Yearly Summary */}
        <section className="mb-8 rounded-xl bg-slate-800 border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Ringkasan Tahunan</h2>
            <button
              onClick={() => downloadCSV(`ringkasan-tahunan-${plant.id}.csv`, exportYearlyReportCSV(plant))}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Download CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="py-3 pr-4 text-left font-semibold text-white">Tahun</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">Total Invest</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">Profit Dibayar</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">ROI / th</th>
                </tr>
              </thead>
              <tbody>
                {yearly.map((y, index) => (
                  <tr
                    key={y.year}
                    className={`border-b border-slate-700 hover:bg-slate-700 ${index % 2 === 0 ? "bg-slate-800" : "bg-slate-750"}`}
                  >
                    <td className="py-3 pr-4 font-medium text-white">{y.year}</td>
                    <td className="py-3 pr-4 text-right text-slate-300">{fmtIDR(y.invest)}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-green-400">{fmtIDR(y.profit)}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{y.roiPct.toFixed(2)}%</td>
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
            <button
              onClick={() => downloadCSV(`per-investor-${plant.id}.csv`, exportInvestorReportCSV(plant))}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Download CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="py-3 pr-4 text-left font-semibold text-white">Nama</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">Total Investasi</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">Total Profit Dibayar</th>
                  <th className="py-3 pr-4 text-right font-semibold text-white">ROI Individu</th>
                </tr>
              </thead>
              <tbody>
                {perInvestor.map((p, index) => (
                  <tr
                    key={p.name}
                    className={`border-b border-slate-700 hover:bg-slate-700 ${index % 2 === 0 ? "bg-slate-800" : "bg-slate-750"}`}
                  >
                    <td className="py-3 pr-4 font-medium text-white">{p.name}</td>
                    <td className="py-3 pr-4 text-right text-slate-300">{fmtIDR(p.invest)}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-green-400">{fmtIDR(p.profit)}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{p.roiPct.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Methodology Note */}
        <div className="rounded-xl bg-slate-700 border border-slate-600 p-6">
          <p className="text-sm text-slate-300 leading-relaxed">
            <strong>Metodologi:</strong> Akrual bulanan (non-compound) berdasarkan modal akhir bulan. Payout tiap{" "}
            {plant.payoutEveryMonths} bulan dan didistribusikan proporsional terhadap porsi modal investor di bulan
            payout. ROI aktual dihitung dari profit dibayar / total invest.
          </p>
        </div>
      </div>
    </ThemeProvider>
  )
}

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
    <div
      className={`rounded-xl p-4 ${highlight ? "bg-slate-700 border-green-500" : "bg-slate-700 border-slate-600"} border`}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${bgColor} text-white`}
        >
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
