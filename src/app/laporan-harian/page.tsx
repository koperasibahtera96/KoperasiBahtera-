"use client"

import { useState, useEffect, useMemo } from "react"
import { ArrowLeft, Calendar, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-finance/card"
import { Button } from "@/components/ui-finance/button"
import type { PlantInstance } from "@/lib/api"

type Tx = {
  type: "income" | "expense"
  description: string
  plantName: string
  amount: number
  date: string
  addedBy?: string
}

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(Math.round(n))
    .replace("IDR", "Rp")

const ymd = (d: Date | string) => {
  const dd = typeof d === "string" ? new Date(d) : d
  return dd.toISOString().slice(0, 10)
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
      ;(p.incomeRecords || []).forEach((r: any) => {
        if (ymd(r.date) === day) {
          tx.push({
            type: "income",
            description: r.description,
            plantName: p.instanceName || p.name || p.id,
            amount: r.amount,
            date: r.date,
            addedBy: r.addedBy,
          })
        }
      })
      // expenses
      ;(p.operationalCosts || []).forEach((c: any) => {
        if (ymd(c.date) === day) {
          tx.push({
            type: "expense",
            description: c.description,
            plantName: p.instanceName || p.name || p.id,
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
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="flex items-center justify-center h-64 text-lg">Memuat laporan harian...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-6">
        {/* header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/finance">
              <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 hover:bg-slate-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Laporan Harian</h1>
              <p className="text-slate-400 mt-1">Ringkasan aktivitas keuangan harian (langsung dari database)</p>
            </div>
          </div>
          <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        {/* date picker */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Pilih Tanggal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="date"
              value={ymd(selectedDate)}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="bg-slate-700 border-slate-600 text-white px-4 py-2 rounded-lg"
            />
          </CardContent>
        </Card>

        {/* summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Pemasukan</p>
                  <p className="text-2xl font-bold text-green-400">{fmtIDR(daily.income)}</p>
                </div>
                <div className="bg-green-500/20 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Pengeluaran</p>
                  <p className="text-2xl font-bold text-red-400">{fmtIDR(daily.expenses)}</p>
                </div>
                <div className="bg-red-500/20 p-3 rounded-full">
                  <TrendingDown className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Keuntungan Bersih</p>
                  <p className={`text-2xl font-bold ${daily.net >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {fmtIDR(daily.net)}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${daily.net >= 0 ? "bg-green-500/20" : "bg-red-500/20"}`}>
                  <DollarSign className={`h-6 w-6 ${daily.net >= 0 ? "text-green-400" : "text-red-400"}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Transaksi</p>
                  <p className="text-2xl font-bold text-blue-400">{daily.transactions.length}</p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Detail Transaksi - {new Date(daily.date).toLocaleDateString("id-ID")}</CardTitle>
          </CardHeader>
          <CardContent>
            {daily.transactions.length ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300">Jenis</th>
                      <th className="text-left py-3 px-4 text-slate-300">Deskripsi</th>
                      <th className="text-left py-3 px-4 text-slate-300">Tanaman</th>
                      <th className="text-right py-3 px-4 text-slate-300">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.transactions.map((t, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              t.type === "income" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {t.type === "income" ? "Pemasukan" : "Pengeluaran"}
                          </span>
                        </td>
                        <td className="py-3 px-4">{t.description}</td>
                        <td className="py-3 px-4 text-slate-300">{t.plantName}</td>
                        <td className={`py-3 px-4 text-right font-medium ${t.type === "income" ? "text-green-400" : "text-red-400"}`}>
                          {fmtIDR(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada transaksi pada tanggal ini</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
