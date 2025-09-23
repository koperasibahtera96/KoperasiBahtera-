"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, TrendingUp, Users, Leaf } from "lucide-react"
import Link from "next/link"
import { FinanceSidebar } from "@/components/finance/FinanceSidebar"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"

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
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [plantSummaries, setPlantSummaries] = useState<PlantSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Theme-aware helper function
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`
    }
    return baseClasses
  }

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
              className={getThemeClasses(
                "inline-block p-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Leaf className={getThemeClasses(
                "h-8 w-8 text-[#324D3E]",
                "!text-[#4c1d1d]"
              )} />
            </motion.div>
            <p className={getThemeClasses(
              "text-[#324D3E] dark:text-white text-lg font-medium mt-4 transition-colors duration-300",
              "!text-[#4c1d1d]"
            )}>Memuat data investasi...</p>
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
              className={getThemeClasses(
                "group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 text-[#324D3E] dark:text-white hover:bg-[#324D3E] hover:text-white transition-all duration-300 self-start",
                "!bg-white/95 !border-[#FFC1CC]/30 !text-[#4c1d1d] hover:!bg-[#FFC1CC] hover:!text-white"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm sm:text-base">Kembali</span>
            </motion.button>
          </Link>
          <div className="flex-1">
            <h1 className={getThemeClasses(
              "text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-1 sm:mb-2 transition-colors duration-300",
              "!text-[#4c1d1d]"
            )}>Semua Investasi Tanaman</h1>
            <p className={getThemeClasses(
              "text-[#889063] dark:text-gray-300 text-sm sm:text-base lg:text-lg transition-colors duration-300",
              "!text-[#6b7280]"
            )}>Daftar lengkap semua jenis tanaman investasi</p>
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
              className={getThemeClasses(
                "group bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-2xl hover:scale-105 transition-all duration-500",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {/* Header - Stack on mobile, side by side on larger screens */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                <div className="flex items-center gap-3">
                  <div className={getThemeClasses(
                    "p-2 sm:p-3 bg-[#324D3E]/10 dark:bg-[#324D3E]/20 rounded-xl sm:rounded-2xl text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!bg-[#FFC1CC]/40 !text-[#4c1d1d]"
                  )}>
                    <Leaf className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className={getThemeClasses(
                    "text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white capitalize break-words transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>{plant.plantType}</h3>
                </div>
                <div className={getThemeClasses(
                  "flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-500/10 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 self-start sm:self-auto transition-colors duration-300",
                  "!bg-[#B5EAD7]/40 !text-[#059669]"
                )}>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm font-medium">ROI {plant.roi.toFixed(1)}%</span>
                </div>
              </div>

              {/* Financial Info */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="flex justify-between items-center">
                  <span className={getThemeClasses(
                    "text-[#889063] dark:text-gray-200 font-medium text-sm sm:text-base transition-colors duration-300",
                    "!text-[#6b7280]"
                  )}>Total Investasi</span>
                  <span className={getThemeClasses(
                    "text-[#324D3E] dark:text-white font-bold text-sm sm:text-base break-all text-right transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>{formatCurrency(plant.totalInvestment)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={getThemeClasses(
                    "text-[#889063] dark:text-gray-200 font-medium text-sm sm:text-base transition-colors duration-300",
                    "!text-[#6b7280]"
                  )}>Total Profit</span>
                  <span className={getThemeClasses(
                    "text-green-600 dark:text-emerald-400 font-bold text-sm sm:text-base break-all text-right transition-colors duration-300",
                    "!text-[#059669]"
                  )}>{formatCurrency(plant.totalProfit)}</span>
                </div>
              </div>

              {/* ROI Section */}
              <div className={getThemeClasses(
                "bg-gradient-to-r from-green-500/10 to-[#324D3E]/10 dark:from-green-900/20 dark:to-gray-700/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 transition-colors duration-300",
                "!bg-gradient-to-r !from-[#FFC1CC]/20 !to-[#C7CEEA]/20"
              )}>
                <div className="text-center">
                  <p className={getThemeClasses(
                    "text-[#889063] dark:text-gray-200 text-xs sm:text-sm font-medium mb-1 transition-colors duration-300",
                    "!text-[#6b7280]"
                  )}>ROI Aktual</p>
                  <p className={getThemeClasses(
                    "text-xl sm:text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}>{plant.roi.toFixed(1)}%</p>
                </div>
              </div>

              {/* Footer - Stack on mobile, side by side on larger screens */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 gap-3">
                <div className={getThemeClasses(
                  "flex items-center gap-2 text-[#889063] dark:text-gray-200 transition-colors duration-300",
                  "!text-[#6b7280]"
                )}>
                  <div className={getThemeClasses(
                    "p-1.5 sm:p-2 bg-purple-500/10 dark:bg-purple-900/30 rounded-lg sm:rounded-xl text-purple-600 dark:text-purple-400 transition-colors duration-300",
                    "!bg-[#C7CEEA]/40 !text-[#7c3aed]"
                  )}>
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <span className="font-medium text-sm sm:text-base">{plant.investorCount} investor</span>
                </div>
                <Link href={`/tanaman/${plant.plantType.toLowerCase()}`} className="w-full sm:w-auto">
                  <motion.button
                    className={getThemeClasses(
                      "w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300",
                      "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
                    )}
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
            <div className={getThemeClasses(
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 dark:border-gray-700 p-12 max-w-md mx-auto transition-colors duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}>
              <div className={getThemeClasses(
                "p-6 bg-[#324D3E]/10 dark:bg-[#324D3E]/20 rounded-3xl inline-block mb-6 transition-colors duration-300",
                "!bg-[#FFC1CC]/40"
              )}>
                <Leaf className={getThemeClasses(
                  "h-12 w-12 text-[#324D3E] dark:text-white transition-colors duration-300",
                  "!text-[#4c1d1d]"
                )} />
              </div>
              <h3 className={getThemeClasses(
                "text-xl font-bold text-[#324D3E] dark:text-white mb-2 transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}>Belum Ada Data</h3>
              <p className={getThemeClasses(
                "text-[#889063] dark:text-gray-200 transition-colors duration-300",
                "!text-[#6b7280]"
              )}>Tidak ada data investasi tanaman saat ini</p>
            </div>
          </motion.div>
        )}
      </div>
    </FinanceSidebar>
  )
}
