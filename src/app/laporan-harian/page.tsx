// app/laporan-harian/page.tsx
"use client"

import { FinanceSidebar } from "@/components/finance/FinanceSidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-finance/card"
import { motion } from "framer-motion"
import { Calendar, Download, TrendingDown, TrendingUp, Search as SearchIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { Input } from "@/components/ui-staff/input"

// ================== Types ==================
type Tx = {
  type: "income" | "expense"
  description: string
  plantName: string
  amount: number
  date: string
  addedBy?: string
  // untuk kolom Blok/Kav & mapping
  plantInstanceId?: string
  blok?: string | null
  kavling?: string | null
}

interface IncomeRecord {
  id?: string
  _id?: string
  description: string
  amount: number
  date: string
  addedBy?: string
}

interface CostRecord {
  id?: string
  _id?: string
  description: string
  amount: number
  date: string
  addedBy?: string
}

// ================== Helpers ==================
const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(Math.round(n))
    .replace("IDR", "Rp")

// helper tanggal robust untuk "YYYY-MM-DD" maupun Date
const ymd = (d: Date | string) => {
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
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

// "11-Sep" seperti contoh
const ddMon = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).replace(".", "")

const toWIBString = (d = new Date()) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d) + " WIB"

// ================== Page ==================
export default function LaporanHarianPage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [instances, setInstances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // NEW: map untuk fallback blok/kav dari API (tidak mengubah logic lain)
  const [kvMap, setKvMap] = useState<Record<string, { blok?: string | null; kavling?: string | null }>>({})

  // last update text
  const [lastUpdateText, setLastUpdateText] = useState<string>("")

  // tab + search + pagination
  type Tab = "ALL" | "PEMASUKAN" | "PENGELUARAN"
  const [tab, setTab] = useState<Tab>("ALL")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 6

  useEffect(() => {
    setMounted(true)
    setLastUpdateText(`Last update: ${toWIBString()}`)
  }, [])

  // Theme-aware helper function
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`
    }
    return baseClasses
  }

  // load dari /api/plants-with-meta (atau endpointmu sekarang)
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/plants-with-meta", { cache: "no-store" })
        const data = res.ok ? await res.json() : []
        const arr = Array.isArray(data) ? data : []
        setInstances(arr)

        // === Tambahan: ambil blok/kav jika belum terisi di instances ===
        const ids = arr.map((p: any) => String(p._id || p.id || "")).filter(Boolean)
        if (ids.length) {
          try {
            const r = await fetch(
              `/api/plant-instances/kv?ids=${encodeURIComponent(ids.join(","))}`,
              { cache: "no-store" }
            )
            if (r.ok) {
              const j = await r.json()
              if (j?.map) setKvMap(j.map)
            }
          } catch {
            // diamkan: fallback tetap "-"
          }
        }
      } catch (e) {
        console.error(e)
        setInstances([])
      } finally {
        setLoading(false)
        setLastUpdateText(`Last update: ${toWIBString()}`)
      }
    }
    load()
  }, [])

  // build data harian (LOGIC LAMA DIPERTAHANKAN)
  const daily = useMemo(() => {
    const day = ymd(selectedDate)
    const tx: Tx[] = []

    instances.forEach((p) => {
      const blok = p.blok ?? null
      const kavling = p.kavling ?? null
      const instId = (p._id || p.id || "") as string
      const plantName = p.instanceName || p.name || p.id || "-"

      ;(p.incomeRecords || []).forEach((r: IncomeRecord) => {
        if (ymd(r.date) === day) {
          tx.push({
            type: "income",
            description: r.description,
            plantName,
            amount: r.amount,
            date: r.date,
            addedBy: r.addedBy,
            plantInstanceId: instId,
            blok,
            kavling,
          })
        }
      })
      ;(p.operationalCosts || []).forEach((c: CostRecord) => {
        if (ymd(c.date) === day) {
          tx.push({
            type: "expense",
            description: c.description,
            plantName,
            amount: c.amount,
            date: c.date,
            addedBy: c.addedBy,
            plantInstanceId: instId,
            blok,
            kavling,
          })
        }
      })
    })

    const income = tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
    const expenses = tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    const net = income - expenses

    return { date: day, income, expenses, net, transactions: tx.sort((a, b) => b.amount - a.amount) }
  }, [instances, selectedDate])

  // FILTER (tab + search) & PAGINATION
  const tabFiltered = useMemo(() => {
    if (tab === "ALL") return daily.transactions
    if (tab === "PEMASUKAN") return daily.transactions.filter((t) => t.type === "income")
    return daily.transactions.filter((t) => t.type === "expense")
  }, [daily.transactions, tab])

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tabFiltered
    return tabFiltered.filter((t) => {
      const pn = (t.plantName || "").toLowerCase()
      const d = (t.description || "").toLowerCase()
      return pn.includes(q) || d.includes(q)
    })
  }, [tabFiltered, search])

  const totalPages = Math.max(1, Math.ceil(searched.length / PAGE_SIZE))
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return searched.slice(start, start + PAGE_SIZE)
  }, [searched, page])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  // EXPORT EXCEL (LAYOUT SAMA, IKUTI TAB FILTER)
  const handleExportExcel = () => {
    const day = daily.date

    type Row = {
      no: number
      tanggal: string
      noAnggota: string
      namaUser: string
      kodeBlokPaket: string
      kodeTransaksi: string
      jenis: "Pemasukan" | "Pengeluaran"
      tanamanProduk: string
      jumlah: number
      status: string
      inputBy: string
    }

    const rows: Row[] = []
    let idx = 1

    instances.forEach((p) => {
      const noAnggota = (p.memberCode || p.ownerCode || p.memberId || "-") as string
      const namaUser = (p.owner || "-") as string
      const rawKode =
        (p.qrCode as string) ??
        (p.blockCode as string) ??
        (p.packageCode as string) ??
        (p.productName as string) ??
        "-"
      const kodeBlokPaketDisplay = rawKode ? String(rawKode).replace(/^QR[\s\-_:]*/i, "").trim() : "-"
      const tanamanProduk = (p.plantType || "-") as string

      ;(p.incomeRecords || []).forEach((r: IncomeRecord) => {
        if (ymd(r.date) === day && (tab !== "PENGELUARAN")) {
          rows.push({
            no: idx++,
            tanggal: ddMon(day),
            noAnggota,
            namaUser,
            kodeBlokPaket: kodeBlokPaketDisplay,
            kodeTransaksi: (r.id || r._id || "-") as string,
            jenis: "Pemasukan",
            tanamanProduk,
            jumlah: r.amount || 0,
            status: "Lunas",
            inputBy: r.addedBy || "-",
          })
        }
      })

      ;(p.operationalCosts || []).forEach((r: CostRecord) => {
        if (ymd(r.date) === day && (tab !== "PEMASUKAN")) {
          rows.push({
            no: idx++,
            tanggal: ddMon(day),
            noAnggota,
            namaUser,
            kodeBlokPaket: kodeBlokPaketDisplay,
            kodeTransaksi: (r.id || r._id || "-") as string,
            jenis: "Pengeluaran",
            tanamanProduk,
            jumlah: r.amount || 0,
            status: "Lunas",
            inputBy: r.addedBy || "-",
          })
        }
      })
    })

    const html = `
<html><head><meta charset="utf-8">
<style>
body{font-family:Arial}
table{border-collapse:collapse;width:100%}
th{background:#90EE90;border:2px solid #000;padding:8px;text-align:left}
td{border:1px solid #000;padding:8px}
.header{font-weight:bold;font-size:18px;margin:20px 0 10px}
.title{font-weight:bold;font-size:24px;margin-bottom:10px}
.right{text-align:right}
</style></head><body>

<div class="title">Laporan Harian - ${new Date(daily.date).toLocaleDateString("id-ID")} (${tab === "ALL" ? "ALL" : tab === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"})</div>

<div class="header">RINGKASAN HARIAN</div>
<table>
<tr><th>Keterangan</th><th>Nilai</th></tr>
<tr><td>Tanggal</td><td>${new Date(daily.date).toLocaleDateString("id-ID")}</td></tr>
<tr><td>Total Pemasukan</td><td>${fmtIDR(daily.income)}</td></tr>
<tr><td>Total Pengeluaran</td><td>${fmtIDR(daily.expenses)}</td></tr>
<tr><td>Keuntungan Bersih</td><td>${fmtIDR(daily.net)}</td></tr>
<tr><td>Total Transaksi (sesuai tab)</td><td>${rows.length}</td></tr>
</table>

<div class="header">DETAIL TRANSAKSI</div>
<table>
  <tr>
    <th>No</th>
    <th>Tanggal</th>
    <th>No Anggota</th>
    <th>Nama User</th>
    <th>Kode Blok/Paket</th>
    <th>Kode Transaksi</th>
    <th>Jenis Transaksi</th>
    <th>Tanaman/Produk</th>
    <th class="right">Jumlah</th>
    <th>Status</th>
    <th>Input</th>
  </tr>
  ${rows.map((r) => `
    <tr>
      <td>${r.no}</td>
      <td>${r.tanggal}</td>
      <td>${r.noAnggota}</td>
      <td>${r.namaUser}</td>
      <td>${r.kodeBlokPaket}</td>
      <td>${r.kodeTransaksi}</td>
      <td>${r.jenis}</td>
      <td>${r.tanamanProduk}</td>
      <td class="right">${fmtIDR(r.jumlah)}</td>
      <td>${r.status}</td>
      <td>${r.inputBy}</td>
    </tr>`).join("")}
</table>
</body></html>`

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `laporan-harian-${daily.date}-${tab.toLowerCase()}.xls`
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
            className={getThemeClasses(
              "inline-block p-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Calendar className={getThemeClasses(
              "h-8 w-8 text-[#324D3E] dark:text-white transition-colors duration-300",
              "!text-[#4c1d1d]"
            )} />
          </motion.div>
          <p className={getThemeClasses(
            "text-[#324D3E] dark:text-white text-lg font-medium ml-4 transition-colors duration-300",
            "!text-[#4c1d1d]"
          )}>Memuat laporan harian...</p>
        </div>
      </div>
    )
  }

  return (
    <FinanceSidebar>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h1 className={getThemeClasses(
                  "text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-1 sm:mb-2 transition-colors duration-300",
                  "!text-[#4c1d1d]"
                )}>Laporan Harian</h1>
                {/* Last update */}
                <p className={getThemeClasses(
                  "text-[#889063] dark:text-gray-200 text-sm sm:text-base lg:text-lg transition-colors duration-300",
                  "!text-[#6b7280]"
                )}>
                  {lastUpdateText}
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Date picker + Download (tanpa tab/search di sini) */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className={getThemeClasses(
            "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-xl transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <CardTitle className={getThemeClasses(
                  "text-[#324D3E] dark:text-white flex items-center gap-2 text-base sm:text-lg transition-colors duration-300",
                  "!text-[#4c1d1d]"
                )}>
                  <Calendar className={getThemeClasses(
                    "h-4 w-4 sm:h-5 sm:w-5 text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )} />
                  Pilih Tanggal
                </CardTitle>
                <motion.button
                  onClick={handleExportExcel}
                  className={getThemeClasses(
                    "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-[#324D3E] hover:from-green-600 hover:to-[#4C3D19] px-4 py-2 text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl self-start sm:self-auto",
                    "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
                  )}
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
                  setSelectedDate(new Date(`${v}T00:00:00`))
                  setPage(1)
                  setLastUpdateText(`Last update: ${toWIBString()}`)
                }}
                className={getThemeClasses(
                  "w-full sm:w-auto min-w-[200px] bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl border border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 font-medium text-sm sm:text-base transition-colors duration-300",
                  "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]/20 focus:!border-[#FFC1CC]/40"
                )}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className={getThemeClasses(
            "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 h-full",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}>
            <CardContent className="p-4 sm:p-6 h-full">
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 min-h-0">
                  <p className={getThemeClasses("text-[#889063] dark:text-gray-200 text-xs sm:text-sm font-medium mb-2 transition-colors duration-300","!text-[#6b7280]")}>
                    Total Pemasukan
                  </p>
                  <p className={getThemeClasses("text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-green-600 dark:text-emerald-400 break-all leading-tight transition-colors duration-300","!text-[#059669]")}>
                    {fmtIDR(daily.income)}
                  </p>
                </div>
                <div className="flex justify-end mt-3 sm:mt-4">
                  <div className={getThemeClasses("bg-green-500/10 dark:bg-green-900/30 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 transition-colors duration-300","!bg-[#B5EAD7]")}>
                    <TrendingUp className={getThemeClasses("w-5 h-5 text-green-600 dark:text-emerald-400","!text-black")} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={getThemeClasses(
            "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 h-full",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}>
            <CardContent className="p-4 sm:p-6 h-full">
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 min-h-0">
                  <p className={getThemeClasses("text-[#889063] dark:text-gray-200 text-xs sm:text-sm font-medium mb-2 transition-colors durataion-300","!text-[#6b7280]")}>
                    Total Pengeluaran
                  </p>
                  <p className={getThemeClasses("text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-red-600 dark:text-red-400 break-all leading-tight transition-colors duration-300","!text-[#dc2626]")}>
                    {fmtIDR(daily.expenses)}
                  </p>
                </div>
                <div className="flex justify-end mt-3 sm:mt-4">
                  <div className={getThemeClasses("bg-red-500/10 dark:bg-red-900/30 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 transition-colors duration-300","!bg-[#FFC1CC]")}>
                    <TrendingDown className={getThemeClasses("w-5 h-5 text-red-600 dark:text-red-400","!text-black")} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={getThemeClasses(
            "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 h-full",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}>
            <CardContent className="p-4 sm:p-6 h-full">
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 min-h-0">
                  <p className={getThemeClasses("text-[#889063] dark:text-gray-200 text-xs sm:text-sm font-medium mb-2 transition-colors duration-300","!text-[#6b7280]")}>
                    Keuntungan Bersih
                  </p>
                  <p className={getThemeClasses(
                    `text-base sm:text-lg lg:text-xl xl:text-2xl font-bold ${daily.net >= 0 ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} break-all leading-tight transition-colors duration-300`,
                    `${daily.net >= 0 ? "!text-[#059669]" : "!text-[#dc2626]"}`
                  )}>
                    {fmtIDR(daily.net)}
                  </p>
                </div>
                <div className="flex justify-end mt-3 sm:mt-4">
                  <div className={getThemeClasses(
                    `${daily.net >= 0 ? "bg-green-500/10 dark:bg-green-900/30" : "bg-red-500/10 dark:bg-red-900/30"} p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 transition-colors duration-300`,
                    `${daily.net >= 0 ? "!bg-[#B5EAD7]" : "!bg-[#FFC1CC]"}`
                  )}>
                    <TrendingUp className={getThemeClasses(
                      `${daily.net >= 0 ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} w-5 h-5`,
                      "!text-black"
                    )} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={getThemeClasses(
            "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 h-full",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}>
            <CardContent className="p-4 sm:p-6 h-full">
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 min-h-0">
                  <p className={getThemeClasses("text-[#889063] dark:text-gray-200 text-xs sm:text-sm font-medium mb-2 transition-colors duration-300","!text-[#6b7280]")}>
                    Total Transaksi
                  </p>
                  <p className={getThemeClasses("text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-blue-600 dark:text-blue-400 break-all leading-tight transition-colors duration-300","!text-[#7c3aed]")}>
                    {daily.transactions.length}
                  </p>
                </div>
                <div className="flex justify-end mt-3 sm:mt-4">
                  <div className={getThemeClasses("bg-blue-500/10 dark:bg-blue-900/30 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 transition-colors duration-300","!bg-[#C7CEEA]")}>
                    <Calendar className={getThemeClasses("w-5 h-5 text-blue-600 dark:text-blue-400","!text-black")} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detail + Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}>
          <Card className={getThemeClasses(
            "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-xl transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle className={getThemeClasses(
                  "text-[#324D3E] dark:text-white transition-colors duration-300",
                  "!text-[#4c1d1d]"
                )}>
                  Detail Transaksi - {new Date(daily.date).toLocaleDateString("id-ID")}
                </CardTitle>

                {/* ======= Tabs + Search di sini ======= */}
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex rounded-xl border overflow-hidden">
                    {(["ALL", "PEMASUKAN", "PENGELUARAN"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTab(t); setPage(1); }}
                        className={
                          "px-3 py-2 text-sm font-medium " +
                          (tab === t ? "bg-emerald-600 text-white" : "bg-white hover:bg-emerald-50")
                        }
                      >
                        {t === "ALL" ? "ALL" : t === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      placeholder="Cari Tanaman / Deskripsi…"
                      className="pl-9 w-72"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {searched.length ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead>
                        <tr className={getThemeClasses(
                          "border-b-2 border-[#324D3E]/10 dark:border-gray-600",
                          "!border-[#FFC1CC]/30"
                        )}>
                          <th className={getThemeClasses("text-left py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-semibold text-xs sm:text-sm transition-colors duration-300","!text-[#4c1d1d]")}>Jenis</th>
                          <th className={getThemeClasses("text-left py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-semibold text-xs sm:text-sm transition-colors duration-300","!text-[#4c1d1d]")}>Tanaman</th>
                          <th className={getThemeClasses("text-left py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-semibold text-xs sm:text-sm transition-colors duration-300","!text-[#4c1d1d]")}>Blok/Kav</th>
                          <th className={getThemeClasses("text-right py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-semibold text-xs sm:text-sm transition-colors duration-300","!text-[#4c1d1d]")}>Jumlah</th>
                          <th className={getThemeClasses("text-left py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-semibold text-xs sm:text-sm transition-colors duration-300","!text-[#4c1d1d]")}>Deskripsi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((t, i) => {
                          // Fallback tanpa mengubah logic lain: pakai kvMap jika t.blok/kavling kosong
                          const kv = t.plantInstanceId ? kvMap[t.plantInstanceId] : undefined
                          const blokKav =
                            (t.blok || t.kavling) ? `${t.blok ?? "-"} / ${t.kavling ?? "-"}`
                            : (kv?.blok || kv?.kavling) ? `${kv?.blok ?? "-"} / ${kv?.kavling ?? "-"}`
                            : "-"

                          return (
                            <tr key={`${t.plantInstanceId || i}-${i}`} className={getThemeClasses(
                              `border-b border-[#324D3E]/5 dark:border-gray-700 ${i % 2 === 0 ? "bg-white/40 dark:bg-gray-800/40" : "bg-[#324D3E]/5 dark:bg-gray-700/50"} transition-colors duration-300`,
                              `!border-[#FFC1CC]/10 ${i % 2 === 0 ? "!bg-white/60" : "!bg-[#FFC1CC]/5"}`
                            )}>
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <span className={getThemeClasses(
                                  `px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${t.type === "income" ? "bg-green-500/10 dark:bg-green-900/30 text-green-600 dark:text-emerald-400" : "bg-red-500/10 dark:bg-red-900/30 text-red-600 dark:text-red-400"} transition-colors duration-300`,
                                  `${t.type === "income" ? "!bg-[#B5EAD7]/30 !text-[#059669]" : "!bg-[#FFC1CC]/30 !text-[#dc2626]"}`
                                )}>
                                  {t.type === "income" ? "Pemasukan" : "Pengeluaran"}
                                </span>
                              </td>
                              <td className={getThemeClasses("py-2 sm:py-3 px-2 sm:px-4 text-[#889063] dark:text-gray-200 text-xs sm:text-sm break-words transition-colors duration-300","!text-[#6b7280]")}>
                                {t.plantName || "-"}
                              </td>
                              <td className={getThemeClasses("py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white text-xs sm:text-sm break-words transition-colors durataion-300","!text-[#4c1d1d]")}>
                                {blokKav}
                              </td>
                              <td className={getThemeClasses(
                                `py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-xs sm:text-sm ${t.type === "income" ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} transition-colors durataion-300`,
                                `${t.type === "income" ? "!text-[#059669]" : "!text-[#dc2626]"}`
                              )}>
                                {fmtIDR(t.amount)}
                              </td>
                              <td className={getThemeClasses("py-2 sm:py-3 px-2 sm:px-4 text-[#324D3E] dark:text-white font-medium text-xs sm:text-sm break-words transition-colors duration-300","!text-[#4c1d1d]")}>
                                {t.description || "-"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination (tetap di bagian Detail Transaksi) */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Menampilkan {(paged.length && (page - 1) * PAGE_SIZE + 1) || 0}–
                      {(page - 1) * PAGE_SIZE + paged.length} dari {searched.length} data
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1.5 rounded border hover:bg-emerald-50 disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </button>
                      <span className="text-sm">
                        {page} / {totalPages}
                      </span>
                      <button
                        className="px-3 py-1.5 rounded border hover:bg-emerald-50 disabled:opacity-50"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
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
