"use client"

import { FinanceSidebar } from "@/components/finance/FinanceSidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-finance/card"
import type { PlantInstance } from "@/lib/api"
import { motion } from "framer-motion"
import { Calendar, DollarSign, Download, TrendingDown, TrendingUp } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type Tx = {
  type: "income" | "expense"
  description: string
  plantName: string
  amount: number
  date: string
  addedBy?: string
}

interface IncomeRecord {
  description: string
  amount: number
  date: string
  addedBy?: string
}

interface CostRecord {
  description: string
  amount: number
  date: string
  addedBy?: string
}

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(Math.round(n))
    .replace("IDR", "Rp")

// 🔧 Perbaikan: helper tanggal yang robust untuk string "YYYY-MM-DD" maupun Date
const ymd = (d: Date | string) => {
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d // sudah format Y-M-D
    const dt = new Date(d)
    if (!isNaN(dt.getTime())) {
      const offset = dt.getTimezoneOffset() * 60000
      return new Date(dt.getTime() - offset).toISOString().slice(0, 10)
    }
    return ""
  }
  const dt = d as Date
  if (isNaN(dt.getTime())) return ""
  const offset = dt.getTimezoneOffset() * 60000
  return new Date(dt.getTime() - offset).toISOString().slice(0, 10)
}

export default function LaporanHarianPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [instances, setInstances] = useState<PlantInstance[]>([])
  const [loading, setLoading] = useState(true)

  // load from DB like laporan pengeluaran
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/plants")
        const data = res.ok ? await res.json() : []
        setInstances(data)
      } catch (e) {
        console.error(e)
        setInstances([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // build daily transactions from DB
  const daily = useMemo(() => {
    const day = ymd(selectedDate)
    const tx: Tx[] = []

    instances.forEach((p) => {
      // incomes
      ;(p.incomeRecords || []).forEach((r: IncomeRecord) => {
        if (ymd(r.date) === day) {
          tx.push({
            type: "income",
            description: r.description,
            plantName: (p as any).instanceName || (p as any).name || (p as any).id,
            amount: r.amount,
            date: r.date,
            addedBy: r.addedBy,
          })
        }
      })
      // expenses
      ;(p.operationalCosts || []).forEach((c: CostRecord) => {
        if (ymd(c.date) === day) {
          tx.push({
            type: "expense",
            description: c.description,
            plantName: (p as any).instanceName || (p as any).name || (p as any).id,
            amount: c.amount,
            date: c.date,
            addedBy: c.addedBy,
          })
        }
      })
    })

    const income = tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
    const expenses = tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    const net = income - expenses

    return { date: day, income, expenses, net, transactions: tx.sort((a, b) => b.amount - a.amount) }
  }, [instances, selectedDate])

  const handleExportExcel = () => {
    const html = `
<html><head><meta charset="utf-8">
<style>
body{font-family:Arial} table{border-collapse:collapse;width:100%}
th{background:#90EE90;border:2px solid #000;padding:8px;text-align:left}
td{border:1px solid #000;padding:8px}
.header{font-weight:bold;font-size:18px;margin:20px 0 10px}
.title{font-weight:bold;font-size:24px;margin-bottom:10px}
</style></head><body>
<div class="title">Laporan Harian - ${new Date(daily.date).toLocaleDateString("id-ID")}</div>
<div class="header">RINGKASAN HARIAN</div>
<table>
<tr><th>Keterangan</th><th>Nilai</th></tr>
<tr><td>Tanggal</td><td>${new Date(daily.date).toLocaleDateString("id-ID")}</td></tr>
<tr><td>Total Pemasukan</td><td>${fmtIDR(daily.income)}</td></tr>
<tr><td>Total Pengeluaran</td><td>${fmtIDR(daily.expenses)}</td></tr>
<tr><td>Keuntungan Bersih</td><td>${fmtIDR(daily.net)}</td></tr>
<tr><td>Total Transaksi</td><td>${daily.transactions.length}</td></tr>
</table>

<div class="header">DETAIL TRANSAKSI</div>
<table>
<tr><th>Jenis</th><th>Deskripsi</th><th>Tanaman</th><th>Jumlah</th></tr>
${daily.transactions
  .map(
    (t) =>
      `<tr><td>${t.type === "income" ? "Pemasukan" : "Pengeluaran"}</td><td>${t.description}</td><td>${
        t.plantName
      }</td><td>${fmtIDR(t.amount)}</td></tr>`,
  )
  .join("")}
</table></body></html>`

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `laporan-harian-${daily.date}.xls`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/5 to-[#4C3D19]/5 dark:from-gray-900 dark:to-gray-800 p-6 transition-colors duration-300">
        <div className="flex items-center justify-center h-64">
          <motion.div
            className="inline-block p-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Calendar className="h-8 w-8 text-[#324D3E] dark:text-white transition-colors duration-300" />
          </motion.div>
          <p className="text-[#324D3E] dark:text-white text-lg font-medium ml-4 transition-colors duration-300">Memuat laporan harian...</p>
        </div>
      </div>
    )
  }

  return (
    <FinanceSidebar>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* header */}
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-1 sm:mb-2 transition-colors duration-300">Laporan Harian</h1>
                <p className="text-[#889063] dark:text-gray-200 text-sm sm:text-base lg:text-lg transition-colors duration-300">
                  Ringkasan aktivitas keuangan harian (langsung dari database)
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        {/* date picker with download button */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-xl transition-colors duration-300">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <CardTitle className="text-[#324D3E] dark:text-white flex items-center gap-2 text-base sm:text-lg transition-colors duration-300">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#324D3E] dark:text-white transition-colors duration-300" />
                  Pilih Tanggal
                </CardTitle>
                <motion.button
                  onClick={handleExportExcel}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-[#324D3E] hover:from-green-600 hover:to-[#4C3D19] px-4 py-2 text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl self-start sm:self-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </motion.button>
              </div>
            </CardHeader>
            <CardContent>
              <input
                type="date"
                value={ymd(selectedDate)}
                onChange={(e) => {
                  const v = e.target.value
                  if (!v) return
                  // 🔧 Perbaikan: tambahkan waktu agar tidak "Invalid Date"
                  setSelectedDate(new Date(`${v}T00:00:00`))
                }}
                className="w-full sm:w-auto min-w-[200px] bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl border border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 font-medium text-sm sm:text-base transition-colors duration-300"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* summary cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 h-full">
            <CardContent className="p-4 sm:p-6 h-full">
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 min-h-0">
                  <p className="text-[#889063] dark:text-gray-200 text-xs sm:text-sm font-medium mb-2 transition-colors duration-300">Total Pemasukan</p>
                  <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-green-600 dark:text-emerald-400 break-all leading-tight transition-colors duration-300">
                    {fmtIDR(daily.income)}
                  </p>
                </div>
                <div className="flex justify-end mt-3 sm:mt-4">
                  <div className="bg-green-500/10 dark:bg-green-900/30 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 transition-colors duration-300">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600 dark:text-emerald-400 transition-colors duration-300" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 h-full">
            <CardContent className="p-4 sm:p-6 h-full">
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 min-h-0">
                  <p className="text-[#889063] dark:text-gray-200 text-xs sm:text-sm font-medium mb-2 transition-colors duration-300">Total Pengeluaran</p>
                  <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-red-600 dark:text-red-400 break-all leading-tight transition-colors duration-300">
                    {fmtIDR(daily.expenses)}
                  </p>
                </div>
                <div className="flex justify-end mt-3 sm:mt-4">
                  <div className="bg-red-500/10 dark:bg-red-900/30 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 transition-colors duration-300">
                    <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-600 dark:text-red-400 transition-colors duration-300" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 h-full">
            <CardContent className="p-4 sm:p-6 h-full">
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 min-h-0">
                  <p className="text-[#889063] dark:text-gray-200 text-xs sm:text-sm font-medium mb-2 transition-colors duration-300">Keuntungan Bersih</p>
                  <p
                    className={`text-base sm:text-lg lg:text-xl xl:text-2xl font-bold ${
                      daily.net >= 0 ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    } break-all leading-tight transition-colors duration-300`}
                  >
                    {fmtIDR(daily.net)}
                  </p>
                </div>
                <div className="flex justify-end mt-3 sm:mt-4">
                  <div
                    className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${
                      daily.net >= 0 ? "bg-green-500/10 dark:bg-green-900/30" : "bg-red-500/10 dark:bg-red-900/30"
                    } flex-shrink-0 transition-colors duration-300`}
                  >
                    <DollarSign
                      className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 ${
                        daily.net >= 0 ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      } transition-colors duration-300`}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 h-full">
            <CardContent className="p-4 sm:p-6 h-full">
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 min-h-0">
                  <p className="text-[#889063] dark:text-gray-200 text-xs sm:text-sm font-medium mb-2 transition-colors duration-300">Total Transaksi</p>
                  <p className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-blue-600 dark:text-blue-400 break-all leading-tight transition-colors duration-300">
                    {daily.transactions.length}
                  </p>
                </div>
                <div className="flex justify-end mt-3 sm:mt-4">
                  <div className="bg-blue-500/10 dark:bg-blue-900/30 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 transition-colors duration-300">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400 transition-colors duration-300" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}>
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-xl transition-colors duration-300">
            <CardHeader>
              <CardTitle className="text-[#324D3E] dark:text-white transition-colors duration-300">
                Detail Transaksi - {new Date(daily.date).toLocaleDateString("id-ID")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {daily.transactions.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b-2 border-[#324D3E]/10 dark:border-gray-600">
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-semibold text-xs sm:text-sm transition-colors duration-300">Jenis</th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-semibold text-xs sm:text-sm transition-colors duration-300">Deskripsi</th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-semibold text-xs sm:text-sm transition-colors duration-300">Tanaman</th>
                        <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-semibold text-xs sm:text-sm transition-colors duration-300">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.transactions.map((t, i) => (
                        <tr key={i} className={`border-b border-[#324D3E]/5 dark:border-gray-700 ${i % 2 === 0 ? "bg-white/40 dark:bg-gray-800/40" : "bg-[#324D3E]/5 dark:bg-gray-700/50"} transition-colors duration-300`}>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            <span
                              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${
                                t.type === "income" ? "bg-green-500/10 dark:bg-green-900/30 text-green-600 dark:text-emerald-400" : "bg-red-500/10 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                              } transition-colors duration-300`}
                            >
                              {t.type === "income" ? "Pemasukan" : "Pengeluaran"}
                            </span>
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-medium text-xs sm:text-sm break-words transition-colors duration-300">
                            {t.description}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-[#889063] dark:text-gray-200 text-xs sm:text-sm break-words transition-colors duration-300">{t.plantName}</td>
                          <td
                            className={`py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-xs sm:text-sm ${
                              t.type === "income" ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                            } transition-colors duration-300`}
                          >
                            {fmtIDR(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-[#889063] dark:text-gray-200 transition-colors duration-300">
                  <motion.div
                    className="inline-block p-6 bg-[#324D3E]/10 dark:bg-[#324D3E]/20 rounded-3xl mb-4 transition-colors duration-300"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Calendar className="h-12 w-12 text-[#324D3E] dark:text-white opacity-70 transition-colors duration-300" />
                  </motion.div>
                  <p className="text-lg font-medium">Tidak ada transaksi pada tanggal ini</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </FinanceSidebar>
  )
}
