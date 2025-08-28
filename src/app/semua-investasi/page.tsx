"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, TrendingUp, Users } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui-finance/card"
import { Button } from "@/components/ui-finance/button"

interface PlantSummary {
  id: string
  name: string
  plantType: string
  totalInvestment: number
  totalProfit: number
  roi: number
  investorCount: number
  instanceCount: number
}

export default function SemuaInvestasiPage() {
  const [plantSummaries, setPlantSummaries] = useState<PlantSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlantSummaries()
  }, [])

  const loadPlantSummaries = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/reports/summary")
      if (response.ok) {
        const data = await response.json()
        setPlantSummaries(data.plantSummaries || [])
      }
    } catch (error) {
      console.error("Failed to load plant summaries:", error)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Memuat data investasi...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/finance">
            <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Semua Investasi Tanaman</h1>
            <p className="text-slate-400 mt-1">Daftar lengkap semua jenis tanaman investasi</p>
          </div>
        </div>

        {/* Plant Investment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {plantSummaries.map((plant) => (
            <Card key={plant.id} className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white capitalize">{plant.plantType}</h3>
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <TrendingUp className="h-4 w-4" />
                    <span>ROI {plant.roi.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Investasi</span>
                    <span className="text-white font-medium">{formatCurrency(plant.totalInvestment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Profit </span>
                    <span className="text-green-400 font-medium">{formatCurrency(plant.totalProfit)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-orange-400 font-bold text-lg">ROI Aktual {plant.roi.toFixed(1)}%</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Users className="h-4 w-4" />
                    <span>{plant.investorCount} investor aktif</span>
                  </div>
                  <Link href={`/tanaman/${plant.plantType.toLowerCase()}`}>
                    <Button size="sm" className="bg-slate-700 hover:bg-slate-600 text-white">
                      Lihat Detail
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {plantSummaries.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 text-lg">Tidak ada data investasi tanaman</div>
          </div>
        )}
      </div>
    </div>
  )
}
