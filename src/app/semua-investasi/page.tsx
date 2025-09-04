"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, TrendingUp, Users, Leaf } from "lucide-react"
import Link from "next/link"
import { FinanceSidebar } from "@/components/finance/FinanceSidebar"
import { motion } from "framer-motion"

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

// helper angka aman (string/number → number)
const toNum = (v: any): number => {
  if (v === null || v === undefined) return 0
  if (typeof v === "number" && isFinite(v)) return v
  const n = Number(String(v).replace(/[^0-9.-]/g, ""))
  return isFinite(n) ? n : 0
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
      // ➜ ambil dari API baru
      const response = await fetch("/api/finance/summary", { cache: "no-store" })
      if (!response.ok) throw new Error("Failed to fetch /api/finance/summary")
      const data = await response.json()

      // data.topPlantTypes → map ke bentuk PlantSummary
      const mapped: PlantSummary[] = (data?.topPlantTypes ?? []).map((t: any) => {
        const type = String(t.plantTypeName ?? t.type ?? "")
        return {
          id: String(t.plantTypeId ?? t.type ?? type),
          name: type,                       // tampilkan nama tipe tanaman
          plantType: type,                  // dipakai untuk link detail
          totalInvestment: toNum(t.totalInvestment),
          totalProfit: toNum(t.paidProfit),
          roi: toNum(t.roi),
          investorCount: toNum(t.activeInvestors),
          instanceCount: toNum(t.treeCount), // jumlah pohon/instance
        }
      })

      // urutkan sesuai kebutuhan (mis. investasi terbesar dulu)
      mapped.sort((a, b) => b.totalInvestment - a.totalInvestment)

      setPlantSummaries(mapped)
    } catch (error) {
      console.error("Failed to load plant summaries:", error)
      setPlantSummaries([])
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
            <p className="text-[#324D3E] text-lg font-medium mt-4">Memuat data investasi...</p>
          </div>
        </div>
      </FinanceSidebar>
    )
  }

  return (
    <FinanceSidebar>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8 sm:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/finance">
            <motion.button 
              className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-[#324D3E]/10 text-[#324D3E] hover:bg-[#324D3E] hover:text-white transition-all duration-300 self-start"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm sm:text-base">Kembali</span>
            </motion.button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] mb-1 sm:mb-2">Semua Investasi Tanaman</h1>
            <p className="text-[#889063] text-sm sm:text-base lg:text-lg">Daftar lengkap semua jenis tanaman investasi</p>
          </div>
        </motion.div>

        {/* Plant Investment Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {plantSummaries.map((plant, index) => (
            <motion.div
              key={plant.id}
              className="group bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl border border-[#324D3E]/10 p-4 sm:p-6 hover:shadow-2xl hover:scale-105 transition-all duration-500"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {/* Header - Stack on mobile, side by side on larger screens */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-[#324D3E]/10 rounded-xl sm:rounded-2xl text-[#324D3E]">
                    <Leaf className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#324D3E] capitalize break-words">{plant.plantType}</h3>
                </div>
                <div className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-500/10 rounded-full text-green-600 self-start sm:self-auto">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm font-medium">ROI {plant.roi.toFixed(1)}%</span>
                </div>
              </div>

              {/* Financial Info */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[#889063] font-medium text-sm sm:text-base">Total Investasi</span>
                  <span className="text-[#324D3E] font-bold text-sm sm:text-base break-all text-right">{formatCurrency(plant.totalInvestment)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#889063] font-medium text-sm sm:text-base">Total Profit</span>
                  <span className="text-green-600 font-bold text-sm sm:text-base break-all text-right">{formatCurrency(plant.totalProfit)}</span>
                </div>
              </div>

              {/* ROI Section */}
              <div className="bg-gradient-to-r from-green-500/10 to-[#324D3E]/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="text-center">
                  <p className="text-[#889063] text-xs sm:text-sm font-medium mb-1">ROI Aktual</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#324D3E]">{plant.roi.toFixed(1)}%</p>
                </div>
              </div>

              {/* Footer - Stack on mobile, side by side on larger screens */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 gap-3">
                <div className="flex items-center gap-2 text-[#889063]">
                  <div className="p-1.5 sm:p-2 bg-purple-500/10 rounded-lg sm:rounded-xl text-purple-600">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <span className="font-medium text-sm sm:text-base">{plant.investorCount} investor</span>
                </div>
                <Link href={`/tanaman/${plant.plantType.toLowerCase()}`} className="w-full sm:w-auto">
                  <motion.button 
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Lihat Detail
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {plantSummaries.length === 0 && (
          <motion.div 
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-12 max-w-md mx-auto">
              <div className="p-6 bg-[#324D3E]/10 rounded-3xl inline-block mb-6">
                <Leaf className="h-12 w-12 text-[#324D3E]" />
              </div>
              <h3 className="text-xl font-bold text-[#324D3E] mb-2">Belum Ada Data</h3>
              <p className="text-[#889063]">Tidak ada data investasi tanaman saat ini</p>
            </div>
          </motion.div>
        )}
      </div>
    </FinanceSidebar>
  )
}
