"use client"

import type React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  BarChart3,
  Users,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react"
import { PLANTS, generateReport } from "@/lib/finance"
import { useState } from "react"

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n))

export default function LaporanKeuanganPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const plantsPerPage = 5
  const totalPages = Math.ceil(PLANTS.length / plantsPerPage)
  const startIndex = (currentPage - 1) * plantsPerPage
  const currentPlants = PLANTS.slice(startIndex, startIndex + plantsPerPage)

  // Calculate overall totals across all plants
  const overallTotals = PLANTS.reduce(
    (acc, plant) => {
      const { totals } = generateReport(plant, new Date())
      return {
        invest: acc.invest + totals.invest,
        profit: acc.profit + totals.profit,
        investors: acc.investors + totals.investors,
      }
    },
    { invest: 0, profit: 0, investors: 0 },
  )

  const overallROI = overallTotals.invest > 0 ? (overallTotals.profit / overallTotals.invest) * 100 : 0

  return (
    <div className="p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/finance"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Laporan Keuangan</h1>
          <p className="text-slate-400">Investasi per Jenis Tanaman</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Total Investasi"
            value={fmtIDR(overallTotals.invest)}
            icon={<DollarSign className="h-5 w-5" />}
            bgColor="from-blue-500 to-blue-600"
          />
          <SummaryCard
            title="Total Keuntungan"
            value={fmtIDR(overallTotals.profit)}
            icon={<TrendingUp className="h-5 w-5" />}
            bgColor="from-green-500 to-green-600"
          />
          <SummaryCard
            title="ROI"
            value={`${overallROI.toFixed(1)}%`}
            icon={<BarChart3 className="h-5 w-5" />}
            bgColor="from-purple-500 to-purple-600"
          />
          <SummaryCard
            title="Jumlah Anggota"
            value={`${overallTotals.investors}`}
            icon={<Users className="h-5 w-5" />}
            bgColor="from-orange-500 to-orange-600"
          />
        </div>
      </header>

      {/* Plant Cards Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Daftar Tanaman ({PLANTS.length})</h2>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" />
              Download Ringkasan
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-400">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Plant Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {currentPlants.map((plant) => {
            const { totals } = generateReport(plant, new Date())
            return (
              <div
                key={plant.id}
                className="group relative overflow-hidden rounded-2xl bg-slate-800 border border-slate-700 hover:border-emerald-500 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-2">{plant.name}</h2>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4" />
                          ROI {(plant.annualROI * 100).toFixed(1)}%/tahun
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          Payout tiap {plant.payoutEveryMonths} bulan
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl bg-slate-700 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-slate-300">Total Investasi</span>
                      </div>
                      <div className="text-lg font-bold text-white">{fmtIDR(totals.invest)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-700 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-medium text-slate-300">Profit Dibayar</span>
                      </div>
                      <div className="text-lg font-bold text-green-400">{fmtIDR(totals.profit)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium text-slate-300">ROI Aktual</span>
                    </div>
                    <div className="text-lg font-bold text-purple-400">{totals.roiPct.toFixed(2)}%</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Users className="h-4 w-4" />
                      <span>{totals.investors} investor aktif</span>
                    </div>
                    <Link
                      href={`/tanaman/${plant.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors"
                    >
                      Lihat Detail
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon,
  bgColor,
}: {
  title: string
  value: string
  icon: React.ReactNode
  bgColor: string
}) {
  return (
    <div className="rounded-xl bg-slate-700 p-4 border border-slate-600">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${bgColor} text-white`}
        >
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  )
}
