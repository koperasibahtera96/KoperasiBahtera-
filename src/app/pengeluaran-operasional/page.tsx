"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingDown, Calendar, DollarSign, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function PengeluaranOperasionalPage() {
  const [plantInstances, setPlantInstances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const costsPerPage = 10

  useEffect(() => {
    const fetchPlantInstances = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/plants")
        if (response.ok) {
          const data = await response.json()
          setPlantInstances(data)
        } else {
          setError("Failed to fetch plant data")
        }
      } catch (error) {
        console.error("Failed to fetch plant instances:", error)
        setError("Failed to connect to database")
      } finally {
        setLoading(false)
      }
    }

    fetchPlantInstances()
  }, [])

  const totalOperationalCosts = plantInstances.reduce(
    (sum, plant) =>
      sum + (plant.operationalCosts || []).reduce((plantSum: number, cost: any) => plantSum + cost.amount, 0),
    0,
  )

  const allRecentCosts = plantInstances
    .flatMap((plant) =>
      (plant.operationalCosts || []).map((cost: any) => ({
        ...cost,
        plantName: plant.instanceName || plant.name,
        plantType: plant.plantTypeName || plant.plantType,
      })),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalPages = Math.ceil(allRecentCosts.length / costsPerPage)
  const startIndex = (currentPage - 1) * costsPerPage
  const recentCosts = allRecentCosts.slice(startIndex, startIndex + costsPerPage)

  const totalTransactions = plantInstances.reduce((sum, plant) => sum + (plant.operationalCosts || []).length, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-slate-400">Memuat data pengeluaran...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Coba Lagi
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/finance">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Laporan Pengeluaran Operasional</h1>
            <p className="text-slate-400 mt-1">Overview pengeluaran operasional semua kontrak investasi</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Summary Cards */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-slate-300 text-sm">
                <DollarSign className="h-4 w-4" />
                Total Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">Rp {totalOperationalCosts.toLocaleString("id-ID")}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-slate-300 text-sm">
                <TrendingDown className="h-4 w-4" />
                Jumlah Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalTransactions}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-slate-300 text-sm">
                <Calendar className="h-4 w-4" />
                Rata-rata per Bulan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">
                Rp {Math.round(totalOperationalCosts / 12).toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Riwayat Pengeluaran</CardTitle>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">
                    Halaman {currentPage} dari {totalPages} ({allRecentCosts.length} total transaksi)
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentCosts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">Belum ada data pengeluaran operasional</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCosts.map((cost, index) => (
                  <div
                    key={`${cost.id || index}-${cost.date}`}
                    className="flex justify-between items-start p-4 bg-slate-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">Rp {cost.amount.toLocaleString("id-ID")}</span>
                        <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">{cost.plantType}</span>
                      </div>
                      <p className="text-slate-400 text-sm">{cost.description}</p>
                      <p className="text-slate-500 text-xs">{cost.plantName}</p>
                    </div>
                    <span className="text-slate-400 text-sm">{new Date(cost.date).toLocaleDateString("id-ID")}</span>
                  </div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-slate-600 flex justify-between items-center">
                <span className="text-slate-400 text-sm">
                  Menampilkan {startIndex + 1}-{Math.min(startIndex + costsPerPage, allRecentCosts.length)} dari{" "}
                  {allRecentCosts.length} transaksi
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
