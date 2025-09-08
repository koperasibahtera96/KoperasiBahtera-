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
  Plus,
} from "lucide-react"
import { getPlantTypesSummary } from "@/lib/finance"
import { useState, useEffect } from "react"

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n))

export default function LaporanKeuanganPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [plantsSummary, setPlantsSummary] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const plantsPerPage = 5

  useEffect(() => {
    try {
      const summary = getPlantTypesSummary()
      setPlantsSummary(summary)
    } catch {
      // If no cached data, set empty array
      setPlantsSummary([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const totalPages = Math.ceil(plantsSummary.length / plantsPerPage)
  const startIndex = (currentPage - 1) * plantsPerPage
  const currentPlants = plantsSummary.slice(startIndex, startIndex + plantsPerPage)

  const overallTotals = plantsSummary.reduce(
    (acc: { invest: number; profit: number; investors: number }, plant: any) => ({
      invest: acc.invest + plant.totalInvestment,
      profit: acc.profit + plant.totalProfit,
      investors: acc.investors + plant.totalInvestors,
    }),
    { invest: 0, profit: 0, investors: 0 },
  )

  const overallROI = overallTotals.invest > 0 ? (overallTotals.profit / overallTotals.invest) * 100 : 0

  const handleDownloadSummary = () => {
    const generateExcelReport = () => {
      let html = `
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th { background-color: #90EE90; font-weight: bold; padding: 8px; border: 2px solid #000000; text-align: left; }
            td { padding: 8px; border: 1px solid #000000; }
            .header { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          </style>
        </head>
        <body>
      `

      html += `<div class="title">Ringkasan Investasi - Semua Tanaman</div>`

      // RINGKASAN KESELURUHAN Section
      html += `<div class="header">RINGKASAN KESELURUHAN</div>`
      html += `<table>`
      html += `<tr><th>Keterangan</th><th>Nilai</th></tr>`
      html += `<tr><td>Total Investasi</td><td>Rp ${overallTotals.invest.toLocaleString("id-ID")}</td></tr>`
      html += `<tr><td>Total Keuntungan</td><td>Rp ${overallTotals.profit.toLocaleString("id-ID")}</td></tr>`
      html += `<tr><td>ROI Keseluruhan</td><td>${overallROI.toFixed(2)}%</td></tr>`
      html += `<tr><td>Jumlah Investor</td><td>${overallTotals.investors}</td></tr>`
      html += `</table>`

      // DETAIL PER TANAMAN Section
      html += `<div class="header">DETAIL PER TANAMAN</div>`
      html += `<table>`
      html += `<tr><th>Nama Tanaman</th><th>Total Investasi</th><th>Total Keuntungan</th><th>ROI Rata-rata</th><th>Jumlah Investor</th><th>Jumlah Pohon</th></tr>`
      plantsSummary.forEach((plant: any) => {
        html += `<tr><td>${plant.name}</td><td>Rp ${plant.totalInvestment.toLocaleString("id-ID")}</td><td>Rp ${plant.totalProfit.toLocaleString("id-ID")}</td><td>${(plant.averageROI * 100).toFixed(2)}%</td><td>${plant.totalInvestors}</td><td>${plant.instanceCount}</td></tr>`
      })
      html += `</table>`

      html += `</body></html>`

      // Create and download file
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)

      link.setAttribute("href", url)
      link.setAttribute("download", "ringkasan-investasi.xls")
      link.style.visibility = "hidden"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    generateExcelReport()
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

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
          <h2 className="text-xl font-bold text-white">Daftar Tanaman ({plantsSummary.length})</h2>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Tambahkan tanaman baru
            </button>
            <button
              onClick={handleDownloadSummary}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
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
          {currentPlants.map((plant: any) => (
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
                        ROI {(plant.averageROI * 100).toFixed(1)}%/tahun
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {plant.instanceCount} pohon aktif
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
                    <div className="text-lg font-bold text-white">{fmtIDR(plant.totalInvestment)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-700 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium text-slate-300">Profit Dibayar</span>
                    </div>
                    <div className="text-lg font-bold text-green-400">{fmtIDR(plant.totalProfit)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-slate-300">ROI Aktual</span>
                  </div>
                  <div className="text-lg font-bold text-purple-400">{(plant.averageROI * 100).toFixed(2)}%</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Users className="h-4 w-4" />
                    <span>{plant.totalInvestors} investor aktif</span>
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
          ))}
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
