"use client"
import { useState, useEffect } from "react"
import type React from "react"

import Link from "next/link"
import {
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
} from "lucide-react"
import { SidebarLayout } from "@/components/sidebar-layout"
import { Button } from "@/components/ui-finance/button"
import { formatCurrency, formatPercentage } from "@/lib/utils"

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

const STATIC_MEMBERS: Member[] = [
  {
    id: "member-1",
    name: "Ahmad Suryadi",
    email: "ahmad.suryadi@email.com",
    phone: "+62 812-3456-7890",
    location: "Jakarta Selatan",
    joinDate: "2024-01-15",
    investments: [
      {
        plantId: "gaharu-001",
        plantName: "Gaharu #001",
        amount: 50000000,
        profit: 6250000,
        roi: 12.5,
        investDate: "2024-01-15",
      },
    ],
    totalInvestment: 50000000,
    totalProfit: 6250000,
    overallROI: 12.5,
  },
  {
    id: "member-2",
    name: "Siti Nurhaliza",
    email: "siti.nurhaliza@outlook.com",
    phone: "+62 8421-2952-2274",
    location: "Tangerang",
    joinDate: "2024-03-20",
    investments: [
      {
        plantId: "gaharu-002",
        plantName: "Gaharu #002",
        amount: 75000000,
        profit: 9375000,
        roi: 12.5,
        investDate: "2024-03-20",
      },
      {
        plantId: "jengkol-001",
        plantName: "Jengkol #001",
        amount: 25000000,
        profit: 3750000,
        roi: 15.0,
        investDate: "2024-04-05",
      },
    ],
    totalInvestment: 100000000,
    totalProfit: 13125000,
    overallROI: 13.125,
  },
  {
    id: "member-3",
    name: "Budi Santoso",
    email: "budi.santoso@gmail.com",
    phone: "+62 813-9876-5432",
    location: "Bandung",
    joinDate: "2024-02-10",
    investments: [
      {
        plantId: "alpukat-001",
        plantName: "Alpukat #001",
        amount: 30000000,
        profit: 6000000,
        roi: 20.0,
        investDate: "2024-02-10",
      },
    ],
    totalInvestment: 30000000,
    totalProfit: 6000000,
    overallROI: 20.0,
  },
  {
    id: "member-4",
    name: "Dewi Sartika",
    email: "dewi.sartika@yahoo.com",
    phone: "+62 814-5678-9012",
    location: "Surabaya",
    joinDate: "2024-05-12",
    investments: [
      {
        plantId: "aren-001",
        plantName: "Aren #001",
        amount: 40000000,
        profit: 7200000,
        roi: 18.0,
        investDate: "2024-05-12",
      },
    ],
    totalInvestment: 40000000,
    totalProfit: 7200000,
    overallROI: 18.0,
  },
]

export default function ManajemenAnggotaPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const membersPerPage = 5

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setMembers(STATIC_MEMBERS)
      setLoading(false)
    }, 500)
  }, [])

  const totalPages = Math.ceil(members.length / membersPerPage)
  const startIndex = (currentPage - 1) * membersPerPage
  const currentMembers = members.slice(startIndex, startIndex + membersPerPage)

  const totalStats = members.reduce(
    (acc, member) => ({
      totalInvestment: acc.totalInvestment + member.totalInvestment,
      totalProfit: acc.totalProfit + member.totalProfit,
      avgROI: acc.avgROI + member.overallROI,
    }),
    { totalInvestment: 0, totalProfit: 0, avgROI: 0 },
  )

  const avgROI = members.length > 0 ? totalStats.avgROI / members.length : 0

  return (
    <SidebarLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/finance" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </Link>
            </Button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Manajemen Anggota</h1>
            <p className="text-muted-foreground">Kelola data investor dan kontrak investasi</p>
          </div>

          {/* Summary Stats */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl p-4 border border-border animate-pulse">
                  <div className="h-10 w-10 bg-muted rounded-lg mb-3"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-6 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                title="Total Anggota"
                value={members.length.toString()}
                icon={<Users className="h-5 w-5" />}
                colorClass="text-chart-1"
              />
              <SummaryCard
                title="Total Investasi"
                value={formatCurrency(totalStats.totalInvestment)}
                icon={<DollarSign className="h-5 w-5" />}
                colorClass="text-chart-2"
              />
              <SummaryCard
                title="Total Keuntungan"
                value={formatCurrency(totalStats.totalProfit)}
                icon={<TrendingUp className="h-5 w-5" />}
                colorClass="text-chart-3"
              />
              <SummaryCard
                title="Rata-rata ROI"
                value={formatPercentage(avgROI)}
                icon={<BarChart3 className="h-5 w-5" />}
                colorClass="text-chart-4"
              />
            </div>
          )}
        </header>

        {/* Member List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Daftar Anggota ({members.length})</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Member Cards */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card rounded-2xl p-6 border border-border animate-pulse">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-muted rounded-xl"></div>
                      <div>
                        <div className="h-6 bg-muted rounded mb-2 w-32"></div>
                        <div className="h-4 bg-muted rounded w-48"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-16 bg-muted rounded"></div>
                      <div className="h-8 w-8 bg-muted rounded"></div>
                      <div className="h-8 w-8 bg-muted rounded"></div>
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
    </SidebarLayout>
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
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center gap-3 mb-2">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ${colorClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  )
}

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-all duration-300">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            {member.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">{member.name}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
          <Button size="sm" asChild>
            <Link href={`/anggota/${member.id}`} className="gap-2">
              <Eye className="w-4 h-4" />
              Detail
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{member.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Bergabung: {new Date(member.joinDate).toLocaleDateString("id-ID")}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Investasi</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(member.totalInvestment)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Keuntungan</p>
            <p className="text-lg font-bold text-chart-2">{formatCurrency(member.totalProfit)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">ROI</p>
            <p className="text-lg font-bold text-chart-3">{formatPercentage(member.overallROI)}</p>
          </div>
        </div>
      </div>

      {/* Investment Details */}
      <div className="bg-muted rounded-xl p-4">
        <h4 className="text-sm font-bold text-foreground mb-3">
          Portfolio Investasi ({member.investments.length} tanaman)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {member.investments.map((investment, index) => (
            <div key={index} className="bg-card rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{investment.plantName}</span>
                <span className="text-xs text-chart-3">{formatPercentage(investment.roi)}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Investasi: {formatCurrency(investment.amount)}</div>
                <div>
                  Profit: <span className="text-chart-2">{formatCurrency(investment.profit)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
