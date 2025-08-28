"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Download, TrendingDown, DollarSign, Calendar, BarChart3, Filter, ChevronDown } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-finance/card"
import { Button } from "@/components/ui-finance/button"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import type { PlantInstance } from "@/lib/api"

const BRUTALIST_COLORS = ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5", "#118AB2", "#073B4C", "#EF476F", "#FFB3C6"]

interface PlantType {
  id: string
  name: string
  displayName: string
}

export default function LaporanPengeluaranPage() {
  const [plantInstances, setPlantInstances] = useState<PlantInstance[]>([])
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([])
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedPlant, setSelectedPlant] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const filename = "laporan-pengeluaran.xls" // Declare the filename variable

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Fetch plant instances for expense data
      const plantsResponse = await fetch("/api/plants")
      if (!plantsResponse.ok) throw new Error("Failed to fetch plants")
      const instances = await plantsResponse.json()
      setPlantInstances(instances)

      // Fetch plant types for filter dropdown
      try {
        const typesResponse = await fetch("/api/plant-types")
        if (typesResponse.ok) {
          const types = await typesResponse.json()
          setPlantTypes(types)
        } else {
          // Fallback: extract unique plant types from instances
          const uniqueTypes = Array.from(new Set(instances.map((plant: PlantInstance) => plant.plantType))).map(
            (type) => ({
              id: type,
              name: type,
              displayName: type.charAt(0).toUpperCase() + type.slice(1),
            }),
          )
          setPlantTypes(uniqueTypes)
        }
      } catch (error) {
        console.error("Failed to fetch plant types, using fallback:", error)
        // Fallback: extract unique plant types from instances
        const uniqueTypes = Array.from(new Set(instances.map((plant: PlantInstance) => plant.plantType))).map(
          (type) => ({
            id: type,
            name: type,
            displayName: type.charAt(0).toUpperCase() + type.slice(1),
          }),
        )
        setPlantTypes(uniqueTypes)
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      setPlantInstances([])
      setPlantTypes([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("IDR", "Rp")
  }

  const filteredExpenses = plantInstances
    .filter((plant) => selectedPlant === "all" || plant.plantType === selectedPlant)
    .flatMap((plant) =>
      plant.operationalCosts
        .filter((cost) => {
          const costDate = new Date(cost.date)
          const yearMatch = costDate.getFullYear() === selectedYear
          const monthMatch = selectedMonth === null || costDate.getMonth() + 1 === selectedMonth
          return yearMatch && monthMatch
        })
        .map((cost) => ({
          ...cost,
          plantName: plant.name,
          plantType: plant.plantType,
        })),
    )

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const expensesByCategory = filteredExpenses.reduce(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    },
    {} as Record<string, number>,
  )

  const expensesByPlant = plantTypes.map((plantType) => {
    const typeExpenses = plantInstances
      .filter((plant) => plant.plantType === plantType.name)
      .flatMap((plant) => plant.operationalCosts)
      .filter((cost) => {
        const costDate = new Date(cost.date)
        return costDate.getFullYear() === selectedYear
      })
      .reduce((sum, cost) => sum + cost.amount, 0)

    return {
      name: plantType.displayName,
      value: typeExpenses,
      color: BRUTALIST_COLORS[plantTypes.indexOf(plantType) % BRUTALIST_COLORS.length],
    }
  })

  const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const monthExpenses = filteredExpenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date)
        return expenseDate.getMonth() + 1 === month
      })
      .reduce((sum, expense) => sum + expense.amount, 0)

    return {
      month: new Date(selectedYear, i, 1).toLocaleDateString("id-ID", { month: "short" }),
      expenses: monthExpenses,
    }
  })

  const handleExportCSV = async () => {
    try {
      const allPlantsResponse = await fetch("/api/plants")
      const allPlants = await allPlantsResponse.json()

      // Filter plants based on selected criteria
      const relevantPlants =
        selectedPlant === "all"
          ? allPlants
          : allPlants.filter((plant: PlantInstance) => plant.plantType === selectedPlant)

      // Calculate expense-only statistics
      const totalExpenses = relevantPlants.reduce((sum: number, plant: PlantInstance) => {
        return (
          sum +
          (plant.operationalCosts
            ?.filter((cost) => {
              const costDate = new Date(cost.date)
              const yearMatch = costDate.getFullYear() === selectedYear
              const monthMatch = selectedMonth === null || costDate.getMonth() + 1 === selectedMonth
              return yearMatch && monthMatch
            })
            .reduce((costSum, cost) => costSum + cost.amount, 0) || 0)
        )
      }, 0)

      const totalTransactions = relevantPlants.reduce((sum: number, plant: PlantInstance) => {
        return (
          sum +
          (plant.operationalCosts?.filter((cost) => {
            const costDate = new Date(cost.date)
            const yearMatch = costDate.getFullYear() === selectedYear
            const monthMatch = selectedMonth === null || costDate.getMonth() + 1 === selectedMonth
            return yearMatch && monthMatch
          }).length || 0)
        )
      }, 0)

      const averageExpense = totalTransactions > 0 ? totalExpenses / totalTransactions : 0

      // Generate monthly expense data
      const monthlyExpenseData = Array.from({ length: 12 }, (_, monthIndex) => {
        const month = monthIndex + 1
        const monthName = new Date(selectedYear, monthIndex, 1).toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        })

        const monthlyExpenses = relevantPlants.reduce((sum: number, plant: PlantInstance) => {
          return (
            sum +
            (plant.operationalCosts
              ?.filter((cost) => {
                const costDate = new Date(cost.date)
                return costDate.getFullYear() === selectedYear && costDate.getMonth() + 1 === month
              })
              .reduce((costSum, cost) => costSum + cost.amount, 0) || 0)
          )
        }, 0)

        const monthlyTransactions = relevantPlants.reduce((sum: number, plant: PlantInstance) => {
          return (
            sum +
            (plant.operationalCosts?.filter((cost) => {
              const costDate = new Date(cost.date)
              return costDate.getFullYear() === selectedYear && costDate.getMonth() + 1 === month
            }).length || 0)
          )
        }, 0)

        return {
          monthName,
          expenses: monthlyExpenses,
          transactions: monthlyTransactions,
        }
      })

      // Get all expense transactions for detail section
      const allExpenseTransactions = relevantPlants
        .flatMap((plant: PlantInstance) =>
          (plant.operationalCosts || [])
            .filter((cost) => {
              const costDate = new Date(cost.date)
              const yearMatch = costDate.getFullYear() === selectedYear
              const monthMatch = selectedMonth === null || costDate.getMonth() + 1 === selectedMonth
              return yearMatch && monthMatch
            })
            .map((cost) => ({
              ...cost,
              plantName: plant.name,
              plantType: plant.plantType,
            })),
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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
            .period { font-size: 14px; margin-bottom: 20px; color: #666; }
          </style>
        </head>
        <body>
      `

      html += `<div class="title">Laporan Pengeluaran - ${selectedPlant === "all" ? "Semua Tanaman" : selectedPlant.charAt(0).toUpperCase() + selectedPlant.slice(1)}</div>`
      html += `<div class="period">Periode: ${selectedMonth ? `${new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("id-ID", { month: "long" })} ` : ""}${selectedYear}</div>`

      // RINGKASAN PENGELUARAN Section
      html += `<div class="header">RINGKASAN PENGELUARAN</div>`
      html += `<table>`
      html += `<tr><th>Keterangan</th><th>Nilai</th></tr>`
      html += `<tr><td>Total Pengeluaran</td><td>Rp ${totalExpenses.toLocaleString("id-ID")}</td></tr>`
      html += `<tr><td>Jumlah Transaksi</td><td>${totalTransactions}</td></tr>`
      html += `<tr><td>Rata-rata per Transaksi</td><td>Rp ${averageExpense.toLocaleString("id-ID")}</td></tr>`
      html += `<tr><td>Periode</td><td>${
        selectedMonth
          ? `${new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("id-ID", { month: "long" })} ${selectedYear}`
          : selectedYear
      }</td></tr>`
      html += `</table>`

      // PENGELUARAN BULANAN Section
      html += `<div class="header">PENGELUARAN BULANAN ${selectedYear}</div>`
      html += `<table>`
      html += `<tr><th>Bulan</th><th>Total Pengeluaran</th><th>Jumlah Transaksi</th><th>Rata-rata per Transaksi</th></tr>`
      monthlyExpenseData.forEach((data) => {
        const avgPerTransaction = data.transactions > 0 ? data.expenses / data.transactions : 0
        html += `<tr><td>${data.monthName}</td><td>Rp ${data.expenses.toLocaleString("id-ID")}</td><td>${data.transactions}</td><td>Rp ${avgPerTransaction.toLocaleString("id-ID")}</td></tr>`
      })
      html += `</table>`

      // DETAIL TRANSAKSI PENGELUARAN Section
      html += `<div class="header">DETAIL TRANSAKSI PENGELUARAN</div>`
      html += `<table>`
      html += `<tr><th>Tanggal</th><th>Deskripsi</th><th>Jumlah</th><th>Input Oleh</th></tr>`
      allExpenseTransactions.forEach((expense) => {
        html += `<tr><td>${new Date(expense.date).toLocaleDateString("id-ID")}</td><td>${expense.description}</td><td>Rp ${expense.amount.toLocaleString("id-ID")}</td><td>${expense.addedBy}</td></tr>`
      })
      html += `</table>`

      html += `</body></html>`

      // Create and download file using browser APIs
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)

      const excelFilename = filename.replace(".csv", ".xls")
      link.setAttribute("href", url)
      link.setAttribute("download", excelFilename)
      link.style.visibility = "hidden"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export data:", error)
      alert("Gagal mengekspor data. Silakan coba lagi.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Memuat laporan pengeluaran...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/finance">
              <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 hover:bg-slate-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Laporan Pengeluaran</h1>
              <p className="text-slate-400 mt-1">Analisis dan manajemen pengeluaran operasional</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tahun</label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Bulan</label>
                <div className="relative">
                  <select
                    value={selectedMonth || ""}
                    onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="">Semua Bulan</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2025, i, 1).toLocaleDateString("id-ID", { month: "long" })}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tanaman</label>
                <div className="relative">
                  <select
                    value={selectedPlant}
                    onChange={(e) => setSelectedPlant(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-slate-600 transition-colors"
                  >
                    <option value="all">Semua Tanaman</option>
                    {plantTypes.map((plantType) => (
                      <option key={plantType.id} value={plantType.name}>
                        {plantType.displayName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSelectedMonth(null)
                    setSelectedPlant("all")
                  }}
                  variant="outline"
                  className="w-full bg-slate-700 border-slate-600 hover:bg-slate-600"
                >
                  Reset Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Pengeluaran</p>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
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
                  <p className="text-slate-400 text-sm">Jumlah Transaksi</p>
                  <p className="text-2xl font-bold text-blue-400">{filteredExpenses.length}</p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <BarChart3 className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Rata-rata per Transaksi</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {filteredExpenses.length > 0 ? formatCurrency(totalExpenses / filteredExpenses.length) : "Rp 0"}
                  </p>
                </div>
                <div className="bg-yellow-500/20 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Periode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Periode</p>
                  <p className="text-2xl font-bold text-green-400">
                    {selectedMonth
                      ? `${new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("id-ID", { month: "long" })} ${selectedYear}`
                      : selectedYear}
                  </p>
                </div>
                <div className="bg-green-500/20 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Pengeluaran per Tanaman</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByPlant.filter((plant) => plant.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#000"
                      strokeWidth={3}
                    >
                      {expensesByPlant.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Pengeluaran"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "3px solid #000000",
                        borderRadius: "8px",
                        color: "#000000",
                        fontWeight: "bold",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Tren Pengeluaran Bulanan {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: "12px", fontWeight: "bold" }} />
                    <YAxis
                      stroke="#9ca3af"
                      style={{ fontSize: "12px", fontWeight: "bold" }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Pengeluaran"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "3px solid #000000",
                        borderRadius: "8px",
                        color: "#000000",
                        fontWeight: "bold",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={4}
                      dot={{ fill: "#ef4444", strokeWidth: 3, stroke: "#000", r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Detail Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300">Tanggal</th>
                      <th className="text-left py-3 px-4 text-slate-300">Deskripsi</th>
                      <th className="text-right py-3 px-4 text-slate-300">Jumlah</th>
                      <th className="text-left py-3 px-4 text-slate-300">Input Oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((expense, index) => (
                        <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700">
                          <td className="py-3 px-4 text-white">{new Date(expense.date).toLocaleDateString("id-ID")}</td>
                          <td className="py-3 px-4 text-white">{expense.description}</td>
                          <td className="py-3 px-4 text-right text-red-400 font-medium">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{expense.addedBy}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada pengeluaran ditemukan untuk filter yang dipilih</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
