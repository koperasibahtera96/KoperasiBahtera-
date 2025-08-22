"use client"
import { useState, use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  Users,
} from "lucide-react"
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
import { generateMemberData, exportMemberDetailCSV } from "@/lib/finance"

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n))

// Neo brutalism colors for charts
const BRUTALIST_COLORS = ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5", "#118AB2", "#073B4C", "#EF476F", "#FFB3C6"]

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [selectedYear, setSelectedYear] = useState(2025)
  const members = generateMemberData()
  const member = members.find((m) => m.id === resolvedParams.id)

  if (!member) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Anggota Tidak Ditemukan</h1>
          <Link href="/finance">
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              Kembali ke Dashboard
            </button>
          </Link>
        </div>
      </div>
    )
  }

  // Prepare pie chart data for investment distribution
  const pieData = member.investments.map((inv, index) => ({
    name: inv.plantName,
    value: inv.amount,
    color: BRUTALIST_COLORS[index % BRUTALIST_COLORS.length],
  }))

  // Generate monthly performance data
  const monthlyData = Array.from({ length: 8 }, (_, i) => {
    const month = i + 1
    const totalInvestment = member.investments.reduce((sum, inv) => sum + inv.amount, 0)
    const monthlyProfit = member.investments.reduce((sum, inv) => sum + inv.profit / 8, 0)

    return {
      month: `2025-${month.toString().padStart(2, "0")}`,
      investment: totalInvestment,
      profit: monthlyProfit * month,
      roi: ((monthlyProfit * month) / totalInvestment) * 100,
    }
  })

  const handleDownload = () => {
    exportMemberDetailCSV(member, selectedYear)
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/finance">
              <button className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-2xl">
                {member.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{member.name}</h1>
                <p className="text-slate-400">Portfolio investasi dan kinerja anggota</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Lengkap
          </button>
        </div>

        {/* Member Info */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-4 w-4" />
                <span className="text-sm">Email</span>
              </div>
              <p className="text-white font-medium">{member.email}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="h-4 w-4" />
                <span className="text-sm">Telepon</span>
              </div>
              <p className="text-white font-medium">{member.phone}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Lokasi</span>
              </div>
              <p className="text-white font-medium">{member.location}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Bergabung</span>
              </div>
              <p className="text-white font-medium">{new Date(member.joinDate).toLocaleDateString("id-ID")}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Investasi</p>
                <p className="text-xl font-bold text-white">{fmtIDR(member.totalInvestment)}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Keuntungan</p>
                <p className="text-xl font-bold text-green-400">{fmtIDR(member.totalProfit)}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">ROI Keseluruhan</p>
                <p className="text-xl font-bold text-purple-400">{member.overallROI.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Jumlah Investasi</p>
                <p className="text-xl font-bold text-orange-400">{member.investments.length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Investment Distribution Pie Chart */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6">Distribusi Investasi per Tanaman</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
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
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [fmtIDR(value), "Investasi"]}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "2px solid #000",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-black" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-slate-300 font-bold">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Performance Line Chart */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6">Perkembangan Keuntungan 2025</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: "12px", fontWeight: "bold" }} />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: "12px", fontWeight: "bold" }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "profit" ? fmtIDR(value) : `${value.toFixed(1)}%`,
                    name === "profit" ? "Keuntungan" : "ROI",
                  ]}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "3px solid #000",
                    borderRadius: "8px",
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={4}
                  dot={{ fill: "#10b981", strokeWidth: 3, stroke: "#000", r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Investment Portfolio Table */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Portfolio Investasi Detail</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Tanaman</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Investasi</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Keuntungan</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">ROI</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {member.investments.map((investment, index) => (
                <tr key={index} className="border-b border-slate-700 hover:bg-slate-700">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full border-2 border-black"
                        style={{ backgroundColor: BRUTALIST_COLORS[index % BRUTALIST_COLORS.length] }}
                      />
                      <span className="text-white font-medium">{investment.plantName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-white font-medium">{fmtIDR(investment.amount)}</td>
                  <td className="py-4 px-4 text-right text-green-400 font-medium">{fmtIDR(investment.profit)}</td>
                  <td className="py-4 px-4 text-right text-purple-400 font-medium">{investment.roi.toFixed(1)}%</td>
                  <td className="py-4 px-4 text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">Aktif</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
