"use client"
import { useState } from "react"
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
import { generateMemberData } from "@/lib/finance"

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n))

export default function ManajemenAnggotaPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const membersPerPage = 5
  const members = generateMemberData()
  const totalPages = Math.ceil(members.length / membersPerPage)
  const startIndex = (currentPage - 1) * membersPerPage
  const currentMembers = members.slice(startIndex, startIndex + membersPerPage)

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/finance"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Manajemen Anggota</h1>
          <p className="text-slate-400">Kelola data investor dan kontrak investasi</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Anggota</p>
                <p className="text-xl font-bold text-white">{members.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Investasi</p>
                <p className="text-xl font-bold text-white">
                  {fmtIDR(members.reduce((sum, m) => sum + m.totalInvestment, 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Keuntungan</p>
                <p className="text-xl font-bold text-white">
                  {fmtIDR(members.reduce((sum, m) => sum + m.totalProfit, 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Rata-rata ROI</p>
                <p className="text-xl font-bold text-white">
                  {(members.reduce((sum, m) => sum + m.overallROI, 0) / members.length).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Member List */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Daftar Anggota ({members.length})</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-400">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Member Cards */}
        <div className="space-y-4">
          {currentMembers.map((member) => (
            <div
              key={member.id}
              className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-emerald-500 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-lg">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
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
                  <Link href={`/anggota/${member.id}`}>
                    <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2 transition-colors">
                      <Eye className="w-4 h-4" />
                      Detail
                    </button>
                  </Link>
                  <button className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="h-4 w-4" />
                    <span>{member.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>Bergabung: {new Date(member.joinDate).toLocaleDateString("id-ID")}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Investasi</p>
                    <p className="text-lg font-bold text-white">{fmtIDR(member.totalInvestment)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Keuntungan</p>
                    <p className="text-lg font-bold text-green-400">{fmtIDR(member.totalProfit)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">ROI</p>
                    <p className="text-lg font-bold text-purple-400">{member.overallROI.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Investment Details */}
              <div className="bg-slate-700 rounded-xl p-4">
                <h4 className="text-sm font-bold text-white mb-3">
                  Portfolio Investasi ({member.investments.length} tanaman)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {member.investments.map((investment, index) => (
                    <div key={index} className="bg-slate-600 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{investment.plantName}</span>
                        <span className="text-xs text-slate-400">{investment.roi.toFixed(1)}%</span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>Investasi: {fmtIDR(investment.amount)}</div>
                        <div>
                          Profit: <span className="text-green-400">{fmtIDR(investment.profit)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
