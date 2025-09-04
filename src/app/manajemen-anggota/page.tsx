"use client"
import type React from "react"
import { useEffect, useRef, useState } from "react"

import { FinanceSidebar } from "@/components/finance/FinanceSidebar"
import { Button } from "@/components/ui-finance/button"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  Mail,
  Phone,
  TrendingUp,
  Users,
} from "lucide-react"
import Link from "next/link"

type Member = {
  id: string
  name: string
  email: string
  phone: string
  location: string
  joinDate: string
  investments: {
    plantId: string
    plantName: string
    amount: number
    profit: number
    roi: number
    investDate: string
  }[]
  totalInvestment: number
  totalProfit: number
  overallROI: number
}

export default function ManajemenAnggotaPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [_, setError] = useState<string | null>(null)

  const [kpi, setKpi] = useState({
    totalInvestment: 0,
    totalProfit: 0,
    avgROI: 0,
    investors: 0,
    loading: true,
  })

  const membersPerPage = 5

  // 1) Ambil daftar anggota (bentuk yang dipakai UI)
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/investors?format=membersLike", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load investors")
        const data: Member[] = await res.json()
        setMembers(data)
        setError(null)
      } catch (e) {
        console.error(e)
        setError("Gagal memuat data anggota")
        setMembers([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // 2) KPI & metrik per-anggota dari summary
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch("/api/investors/summary", { cache: "no-store" })
        if (!r.ok) throw new Error("fail summary")
        const d = await r.json()
        if (!alive) return

        const totals = d?.totals ?? {}
        setKpi({
          totalInvestment: Number(totals.totalInvestment || 0),
          totalProfit: Number(totals.totalProfit || 0),
          avgROI: Number(totals.avgROI || 0),
          investors: Number(totals.membersCount || 0),
          loading: false,
        })

        const arr: Array<{
          id: string
          totalInvestment: number
          totalProfit: number
          roi: number
        }> = Array.isArray(d?.members)
          ? d.members.map((m: any) => ({
              id: String(m.id || m._id || ""),
              totalInvestment: Number(m.totalInvestment || 0),
              totalProfit: Number(m.totalProfit || 0),
              roi: Number(m.roi || 0),
            }))
          : []

        if (arr.length) {
          const map = new Map(arr.map((x) => [x.id, x]))
          setMembers((prev) =>
            prev.map((m) => {
              const met = map.get(m.id)
              if (!met) return m
              return {
                ...m,
                totalInvestment: met.totalInvestment,
                totalProfit: met.totalProfit,
                overallROI: met.roi,
              }
            })
          )
        }
      } catch (e) {
        console.error(e)
        if (!alive) return
        setKpi((s) => ({ ...s, loading: false }))
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 3) Perkaya detail per-anggota dari /api/investors/:id (sekali saja -> anti spam)
  const enrichedOnceRef = useRef(false)
  useEffect(() => {
    if (enrichedOnceRef.current) return
    if (members.length === 0) return

    ;(async () => {
      try {
        const resps = await Promise.all(
          members.map((m) => fetch(`/api/investors/${encodeURIComponent(m.id)}`, { cache: "no-store" }))
        )
        const details = await Promise.all(resps.map((r) => (r.ok ? r.json() : null)))

        setMembers((prev) =>
          prev.map((m, i) => {
            const det = details[i]
            if (!det) return m

            const detInvs: any[] = Array.isArray(det?.investments) ? det.investments : []
            const updated = m.investments.map((iv) => {
              const byId = detInvs.find((x: any) => String(x?.plantInstanceId ?? "") === iv.plantId)
              if (!byId) return iv
              return {
                ...iv,
                profit: Number(byId?.profit || 0),
                roi: Number(byId?.roi || 0),
              }
            })

            return {
              ...m,
              investments: updated,
              totalProfit: Number(det?.totalProfit || m.totalProfit),
              overallROI: Number(det?.overallROI || m.overallROI),
            }
          })
        )
      } catch (e) {
        console.warn("[manajemen-anggota] enrich gagal:", e)
      } finally {
        // kunci supaya efek ini TIDAK jalan berulang-ulang
        enrichedOnceRef.current = true
      }
    })()
  }, [members.length])

  const totalPages = Math.ceil(members.length / membersPerPage)
  const startIndex = (currentPage - 1) * membersPerPage
  const currentMembers = members.slice(startIndex, startIndex + membersPerPage)

  return (
    <FinanceSidebar>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-4 mb-6">
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
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] mb-2">Manajemen Anggota</h1>
            <p className="text-[#889063] text-sm sm:text-base lg:text-lg">Kelola data investor dan kontrak investasi</p>
          </div>

          {/* Summary Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 animate-pulse">
                  <div className="h-12 w-12 bg-[#324D3E]/20 rounded-2xl mb-4"></div>
                  <div className="h-4 bg-[#324D3E]/20 rounded-full mb-2"></div>
                  <div className="h-8 bg-[#324D3E]/20 rounded-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
              <SummaryCard title="Total Anggota" value={members.length.toString()} icon={<Users className="h-5 w-5" />} colorClass="text-chart-1" />
              <SummaryCard title="Total Investasi" value={kpi.loading ? "…" : formatCurrency(kpi.totalInvestment)} icon={<DollarSign className="h-5 w-5" />} colorClass="text-chart-2" />
              <SummaryCard title="Total Keuntungan" value={kpi.loading ? "…" : formatCurrency(kpi.totalProfit)} icon={<TrendingUp className="h-5 w-5" />} colorClass="text-chart-3" />
              <SummaryCard title="Rata-rata ROI" value={kpi.loading ? "…" : formatPercentage(kpi.avgROI)} icon={<BarChart3 className="h-5 w-5" />} colorClass="text-chart-4" />
            </div>
          )}
        </motion.header>

        {/* Member List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#324D3E]">Daftar Anggota ({members.length})</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="border-[#324D3E]/20 text-[#324D3E] hover:bg-[#324D3E] hover:text-white">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-[#889063] px-2">Halaman {currentPage} dari {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="border-[#324D3E]/20 text-[#324D3E] hover:bg-[#324D3E] hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Member Cards */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 animate-pulse">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-[#324D3E]/20 rounded-2xl"></div>
                      <div>
                        <div className="h-6 bg-[#324D3E]/20 rounded-full mb-2 w-32"></div>
                        <div className="h-4 bg-[#324D3E]/20 rounded-full w-48"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-16 bg-[#324D3E]/20 rounded-xl"></div>
                      <div className="h-8 w-8 bg-[#324D3E]/20 rounded-xl"></div>
                      <div className="h-8 w-8 bg-[#324D3E]/20 rounded-xl"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {currentMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      </div>
    </FinanceSidebar>
  )
}

function SummaryCard({
  title,
  value,
  icon,
  colorClass,
}: {
  title: string
  value: string
  icon: React.ReactNode
  colorClass: string
}) {
  const colors = {
    'text-chart-1': { bg: 'bg-[#324D3E]/10', text: 'text-[#324D3E]', hover: 'group-hover:bg-[#324D3E]/20' },
    'text-chart-2': { bg: 'bg-green-500/10', text: 'text-green-600', hover: 'group-hover:bg-green-500/20' },
    'text-chart-3': { bg: 'bg-blue-500/10', text: 'text-blue-600', hover: 'group-hover:bg-blue-500/20' },
    'text-chart-4': { bg: 'bg-purple-500/10', text: 'text-purple-600', hover: 'group-hover:bg-purple-500/20' },
  }

  const color = colors[colorClass as keyof typeof colors] || colors['text-chart-1']

  return (
    <div className="group rounded-3xl bg-white/90 backdrop-blur-xl p-6 border border-[#324D3E]/10 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color.bg} ${color.text} ${color.hover} transition-all duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#889063]">{title}</p>
        <p className="text-2xl font-bold text-[#324D3E] group-hover:text-[#4C3D19] transition-colors duration-300">{value}</p>
      </div>
    </div>
  )
}

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 shadow-lg hover:shadow-xl hover:border-[#324D3E]/30 transition-all duration-300">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#324D3E] text-white font-bold text-lg">
            {member.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#324D3E] mb-1">{member.name}</h3>
            <div className="flex items-center gap-4 text-sm text-[#889063]">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {member.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {member.phone}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" asChild className="bg-[#324D3E] hover:bg-[#4C3D19] text-white">
            <Link href={`/anggota/${member.id}`} className="gap-2">
              <Eye className="w-4 h-4" />
              Detail
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#889063]">
            <Calendar className="h-4 w-4" />
            <span>Bergabung: {new Date(member.joinDate).toLocaleDateString("id-ID")}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-[#889063] mb-1">Investasi</p>
            <p className="text-lg font-bold text-[#324D3E]">{formatCurrency(member.totalInvestment)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#889063] mb-1">Keuntungan</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(member.totalProfit)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#889063] mb-1">ROI</p>
            <p className="text-lg font-bold text-blue-600">{formatPercentage(member.overallROI)}</p>
          </div>
        </div>
      </div>

      {/* Investment Details */}
      <div className="bg-[#324D3E]/5 rounded-2xl p-4 border border-[#324D3E]/10">
        <h4 className="text-sm font-bold text-[#324D3E] mb-3">
          Portfolio Investasi ({member.investments.length} tanaman)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {member.investments.map((investment, index) => (
            <div key={index} className="bg-white/80 backdrop-blur-xl rounded-xl p-3 border border-[#324D3E]/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#324D3E]">{investment.plantName}</span>
                <span className="text-xs text-blue-600">{formatPercentage(investment.roi)}</span>
              </div>
              <div className="text-xs text-[#889063] space-y-1">
                <div>Investasi: {formatCurrency(investment.amount)}</div>
                <div>
                  Profit: <span className="text-green-600">{formatCurrency(investment.profit)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
