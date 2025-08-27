// app/anggota/[id]/page.tsx
"use client"

import { use ,useEffect, useMemo, useState } from "react"
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
  Plus,
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

import { generateEnhancedMemberData, PLANT_INSTANCES } from "@/lib/finance"
import IncomeHistory from "@/components/finance/IncomeHistory"
import ExpenseHistory from "@/components/finance/ExpenseHistory"

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Math.round(n),
  )

const COLORS = ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5", "#118AB2", "#073B4C", "#EF476F", "#FFB3C6"]

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;   // ⟵ params sekarang Promise
}) {
  const { id } = use(params);        // ⟵ unwrap dulu
  const members = generateEnhancedMemberData();
  const member = members.find((m) => m.id === id);

  const [plantInstances, setPlantInstances] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // toggle panel detail seperti UI awal
  const [showPlant, setShowPlant] = useState<string | null>(null)
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear())
  const availableYears = [2024, 2025, 2026]

  // form add (dipakai ketika panel terbuka)
  const [newIncome, setNewIncome] = useState({ description: "", amount: "", date: "" })
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", date: "" })

  // tick untuk memaksa remount komponen riwayat/tabel (auto-refresh)
  const [refreshTick, setRefreshTick] = useState(0)

  // ====== data source ======
  const fetchPlantInstances = async () => {
    try {
      const res = await fetch("/api/plants")
      if (res.ok) setPlantInstances(await res.json())
      else setPlantInstances(PLANT_INSTANCES)
    } catch {
      setPlantInstances(PLANT_INSTANCES)
    }
  }
  useEffect(() => {
    fetchPlantInstances()
  }, [])

  // helpers ambil data transaksi dari state/instance (bukan dari komponen riwayat)
  const getCosts = (plantName: string) =>
    plantInstances.find((p) => p.instanceName === plantName)?.operationalCosts || []
  const getIncomes = (plantName: string) =>
    plantInstances.find((p) => p.instanceName === plantName)?.incomeRecords || []

  // ringkasan total
  const totals = useMemo(() => {
    if (!member) return { profit: 0, roi: 0 }
    const totalInvestment = member.investments.reduce((s, i) => s + i.amount, 0)
    const net = member.investments.reduce((s, inv) => {
      const inc = getIncomes(inv.plantName).reduce((a: number, r: any) => a + r.amount, 0)
      const out = getCosts(inv.plantName).reduce((a: number, r: any) => a + r.amount, 0)
      return s + (inc - out)
    }, 0)
    return { profit: net, roi: totalInvestment ? (net / totalInvestment) * 100 : 0 }
  }, [member, plantInstances])

  // laporan bulanan – murni dari seluruh transaksi di plantInstances
  const monthlyBreakdown = (plantInstance: any, year: number, investedAmount: number) => {
    const incomes = plantInstance?.incomeRecords || []
    const costs = plantInstance?.operationalCosts || []
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const income = incomes
        .filter((r: any) => {
          const d = new Date(r.date)
          return d.getFullYear() === year && d.getMonth() + 1 === m
        })
        .reduce((s: number, r: any) => s + r.amount, 0)
      const expense = costs
        .filter((r: any) => {
          const d = new Date(r.date)
          return d.getFullYear() === year && d.getMonth() + 1 === m
        })
        .reduce((s: number, r: any) => s + r.amount, 0)
      const net = income - expense
      return {
        monthName: new Date(year, i, 1).toLocaleDateString("id-ID", { month: "long" }),
        income,
        expense,
        net,
        roi: investedAmount ? (net / investedAmount) * 100 : 0,
      }
    })
  }

  // add transaksi (panel) + auto-refresh
  const afterMutate = async () => {
    await fetchPlantInstances()
    setRefreshTick((t) => t + 1) // paksa IncomeHistory/ExpenseHistory & tabel remount
  }

  const handleAddIncome = async (plantName: string) => {
    const p = plantInstances.find((x) => x.instanceName === plantName)
    if (!p || !newIncome.description || !newIncome.amount || !newIncome.date) return
    setLoading(true)
    try {
      await fetch(`/api/plants/${p.id}/income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newIncome.description,
          amount: Number(newIncome.amount),
          date: newIncome.date,
          addedBy: "Admin",
        }),
      })
      setNewIncome({ description: "", amount: "", date: "" })
      await afterMutate()
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async (plantName: string) => {
    const p = plantInstances.find((x) => x.instanceName === plantName)
    if (!p || !newExpense.description || !newExpense.amount || !newExpense.date) return
    setLoading(true)
    try {
      await fetch(`/api/plants/${p.id}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newExpense.description,
          amount: Number(newExpense.amount),
          date: newExpense.date,
          category: "operasional",
        }),
      })
      setNewExpense({ description: "", amount: "", date: "" })
      await afterMutate()
    } finally {
      setLoading(false)
    }
  }

  // ====== DOWNLOAD LENGKAP (agregasi dari seluruh transaksi di plantInstances) ======
  const handleExportMemberDetail = async () => {
    if (!member) return

    const totalInvestment = member.investments.reduce((s, inv) => s + inv.amount, 0)
    const totalProfit = totals.profit
    const overallROI = totalInvestment ? (totalProfit / totalInvestment) * 100 : 0

    // tahun-tahun yang punya transaksi
    const years = new Set<number>()
    member.investments.forEach((inv) => {
      getIncomes(inv.plantName).forEach((r: any) => years.add(new Date(r.date).getFullYear()))
      getCosts(inv.plantName).forEach((r: any) => years.add(new Date(r.date).getFullYear()))
    })
    const yearsWithData = Array.from(years).sort((a, b) => a - b)

    let html = `
      <html><head><meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th { background-color: #90EE90; font-weight: bold; padding: 8px; border: 2px solid #000; text-align: left; }
        td { padding: 8px; border: 1px solid #000; }
        .header { font-size: 18px; font-weight: bold; margin: 20px 0 10px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
      </style></head><body>
      <div class="title">Laporan Detail Anggota - ${member.name}</div>
      <div class="header">INFORMASI ANGGOTA</div>
      <table>
        <tr><th>Keterangan</th><th>Nilai</th></tr>
        <tr><td>Nama</td><td>${member.name}</td></tr>
        <tr><td>Email</td><td>${member.email}</td></tr>
        <tr><td>Telepon</td><td>${member.phone}</td></tr>
        <tr><td>Lokasi</td><td>${member.location}</td></tr>
        <tr><td>Tanggal Bergabung</td><td>${new Date(member.joinDate).toLocaleDateString("id-ID")}</td></tr>
      </table>

      <div class="header">RINGKASAN INVESTASI</div>
      <table>
        <tr><th>Keterangan</th><th>Nilai</th></tr>
        <tr><td>Total Investasi</td><td>${fmtIDR(totalInvestment)}</td></tr>
        <tr><td>Total Keuntungan</td><td>${fmtIDR(totalProfit)}</td></tr>
        <tr><td>ROI Keseluruhan</td><td>${overallROI.toFixed(2)}%</td></tr>
        <tr><td>Jumlah Investasi</td><td>${member.investments.length}</td></tr>
      </table>

      <div class="header">DETAIL INVESTASI PER TANAMAN</div>
      <table>
        <tr><th>Nama Tanaman</th><th>Jumlah Investasi</th><th>Keuntungan</th><th>ROI</th><th>Status</th></tr>
    `

    member.investments.forEach((inv) => {
      const inc = getIncomes(inv.plantName).reduce((s: number, r: any) => s + r.amount, 0)
      const out = getCosts(inv.plantName).reduce((s: number, r: any) => s + r.amount, 0)
      const net = inc - out
      const roi = inv.amount ? (net / inv.amount) * 100 : 0
      html += `<tr>
        <td>${inv.plantName}</td>
        <td>${fmtIDR(inv.amount)}</td>
        <td>${fmtIDR(net)}</td>
        <td>${roi.toFixed(2)}%</td>
        <td>Aktif</td>
      </tr>`
    })
    html += `</table>`

    yearsWithData.forEach((year) => {
      // agregat bulanan semua investasi untuk tahun tsb
      const monthlyAgg = Array.from({ length: 12 }, (_, i) => ({
        label: new Date(year, i, 1).toLocaleDateString("id-ID", { month: "long" }) + ` ${year}`,
        income: 0,
        expense: 0,
      }))
      member.investments.forEach((inv) => {
        getIncomes(inv.plantName).forEach((r: any) => {
          const d = new Date(r.date)
          if (d.getFullYear() === year) monthlyAgg[d.getMonth()].income += r.amount
        })
        getCosts(inv.plantName).forEach((r: any) => {
          const d = new Date(r.date)
          if (d.getFullYear() === year) monthlyAgg[d.getMonth()].expense += r.amount
        })
      })

      html += `<div class="header">LAPORAN BULANAN ${year}</div>
      <table>
        <tr><th>Bulan</th><th>Pemasukan</th><th>Pengeluaran</th><th>Keuntungan Bersih</th><th>ROI</th></tr>`
      monthlyAgg.forEach((r) => {
        const net = r.income - r.expense
        const roi = totalInvestment ? (net / totalInvestment) * 100 : 0
        html += `<tr>
          <td>${r.label}</td>
          <td>${fmtIDR(r.income)}</td>
          <td>${fmtIDR(r.expense)}</td>
          <td>${fmtIDR(net)}</td>
          <td>${roi.toFixed(2)}%</td>
        </tr>`
      })
      html += `</table>`
    })

    html += `</body></html>`

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `detail-anggota-${member.name.replace(/\s+/g, "-").toLowerCase()}-lengkap.xls`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 text-white">
        Anggota tidak ditemukan.{" "}
        <Link className="underline" href="/finance">
          Kembali
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* ====== Header ====== */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/finance">
              <button className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-2xl">
                {member.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{member.name}</h1>
                <p className="text-slate-400">Portfolio investasi dan kinerja anggota</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleExportMemberDetail}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Lengkap
          </button>
        </div>

        {/* info bar */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={member.email} />
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Telepon" value={member.phone} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Lokasi" value={member.location} />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Bergabung"
              value={new Date(member.joinDate).toLocaleDateString("id-ID")}
            />
          </div>
        </div>

        {/* ringkasan angka */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat
            color="from-blue-500 to-blue-600"
            icon={<DollarSign className="h-5 w-5" />}
            title="Total Investasi"
            value={fmtIDR(member.totalInvestment ?? member.investments.reduce((s, i) => s + i.amount, 0))}
          />
          <Stat
            color="from-green-500 to-green-600"
            icon={<TrendingUp className="h-5 w-5" />}
            title="Total Keuntungan"
            value={fmtIDR(totals.profit)}
            strong
          />
          <Stat
            color="from-purple-500 to-purple-600"
            icon={<BarChart3 className="h-5 w-5" />}
            title="ROI Keseluruhan"
            value={`${totals.roi.toFixed(1)}%`}
            strong
          />
          <Stat
            color="from-orange-500 to-orange-600"
            icon={<Users className="h-5 w-5" />}
            title="Jumlah Investasi"
            value={String(member.investments.length)}
          />
        </div>
      </div>

      {/* ====== Performa Individual per Tanaman ====== */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Performa Individual per Tanaman</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {member.investments.map((inv, idx) => {
            const inc = getIncomes(inv.plantName)
            const out = getCosts(inv.plantName)
            const totalIncome = inc.reduce((s: number, r: any) => s + r.amount, 0)
            const totalExpense = out.reduce((s: number, r: any) => s + r.amount, 0)
            const net = totalIncome - totalExpense
            const roi = inv.amount ? (net / inv.amount) * 100 : 0
            const cash = inv.amount + totalIncome - totalExpense

            return (
              <div key={idx} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-black"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <h3 className="text-lg font-bold text-white">{inv.plantName}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <MiniStat title="Investasi Awal" value={fmtIDR(inv.amount)} />
                  <MiniStat title="Total Pemasukan" value={fmtIDR(totalIncome)} tone="green" />
                  <MiniStat title="Total Pengeluaran" value={fmtIDR(totalExpense)} tone="red" />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <BigPill
                    title="Total Uang Saat Ini"
                    desc="Investasi Awal + Pemasukan - Pengeluaran"
                    value={fmtIDR(cash)}
                  />
                  <BigPill title="Keuntungan Bersih / ROI" desc={`${fmtIDR(net)} • ROI ${roi.toFixed(1)}%`} value="" />
                </div>

                <div className="mt-4 flex justify-between items-center text-sm text-slate-400">
                  <span>Transaksi Pemasukan: {inc.length}</span>
                  <span>Transaksi Pengeluaran: {out.length}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ====== Grafik distribusi & perkembangan ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6">Distribusi Investasi per Tanaman</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={member.investments.map((inv) => ({ name: inv.plantName, value: inv.amount }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                  stroke="#000"
                  strokeWidth={3}
                >
                  {member.investments.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [fmtIDR(v), "Investasi"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6">Perkembangan Keuntungan 2025</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={Array.from({ length: 12 }, (_, i) => {
                  const month = i + 1
                  const income = member.investments.reduce((sum, inv) => {
                    const rec = getIncomes(inv.plantName)
                    const mInc = rec
                      .filter((r: any) => {
                        const d = new Date(r.date)
                        return d.getFullYear() === 2025 && d.getMonth() + 1 === month
                      })
                      .reduce((s: number, r: any) => s + r.amount, 0)
                    return sum + mInc
                  }, 0)
                  return { month: `2025-${String(month).padStart(2, "0")}`, income }
                })}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => [fmtIDR(v), "Pendapatan"]} />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ====== Portfolio tabel + tombol Kelola ====== */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-8">
        <h3 className="text-xl font-bold text-white mb-4">Portfolio Investasi Detail</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400">Tanaman</th>
                <th className="text-right py-3 px-4 text-slate-400">Investasi</th>
                <th className="text-right py-3 px-4 text-slate-400">Keuntungan</th>
                <th className="text-right py-3 px-4 text-slate-400">ROI</th>
                <th className="text-center py-3 px-4 text-slate-400">Status</th>
                <th className="text-center py-3 px-4 text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {member.investments.map((inv, i) => {
                const inc = getIncomes(inv.plantName)
                const out = getCosts(inv.plantName)
                const net =
                  inc.reduce((s: number, r: any) => s + r.amount, 0) -
                  out.reduce((s: number, r: any) => s + r.amount, 0)
                const roi = inv.amount ? (net / inv.amount) * 100 : 0

                return (
                  <tr key={i} className="border-b border-slate-700 hover:bg-slate-700/40">
                    <td className="py-3 px-4 text-white">{inv.plantName}</td>
                    <td className="py-3 px-4 text-right text-white">{fmtIDR(inv.amount)}</td>
                    <td className="py-3 px-4 text-right text-green-400">{fmtIDR(net)}</td>
                    <td className="py-3 px-4 text-right text-purple-400">{roi.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">Aktif</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setShowPlant(showPlant === inv.plantName ? null : inv.plantName)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
                      >
                        Kelola Keuangan
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== PANEL DETAIL (muncul setelah klik Kelola Keuangan) ====== */}
      {member.investments.map((inv) => {
        if (showPlant !== inv.plantName) return null
        const instance = plantInstances.find((p) => p.instanceName === inv.plantName)
        const rows = monthlyBreakdown(instance, currentYear, inv.amount)
        const sumIncome = rows.reduce((s, r) => s + r.income, 0)
        const sumExpense = rows.reduce((s, r) => s + r.expense, 0)
        const sumNet = sumIncome - sumExpense
        const sumROI = inv.amount ? (sumNet / inv.amount) * 100 : 0

        return (
          <div key={`${inv.plantName}-${refreshTick}`} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Kelola Keuangan - {inv.plantName}</h3>
              <button onClick={() => setShowPlant(null)} className="text-slate-300 hover:text-white">
                Tutup
              </button>
            </div>

            {/* form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-slate-700 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Tambah Pemasukan Baru</h4>
                <Labeled label="Deskripsi">
                  <input
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                    value={newIncome.description}
                    onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                  />
                </Labeled>
                <Labeled label="Jumlah (Rp)">
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                    value={newIncome.amount}
                    onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                  />
                </Labeled>
                <Labeled label="Tanggal">
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                    value={newIncome.date}
                    onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
                  />
                </Labeled>
                <button
                  disabled={loading}
                  onClick={() => handleAddIncome(inv.plantName)}
                  className="w-full mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Tambah Pemasukan
                </button>
              </div>

              <div className="bg-slate-700 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Tambah Pengeluaran Baru</h4>
                <Labeled label="Deskripsi">
                  <input
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </Labeled>
                <Labeled label="Jumlah (Rp)">
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </Labeled>
                <Labeled label="Tanggal">
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </Labeled>
                <button
                  disabled={loading}
                  onClick={() => handleAddExpense(inv.plantName)}
                  className="w-full mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Tambah Pengeluaran
                </button>
              </div>
            </div>

            {/* laporan bulanan */}
            <div className="bg-slate-700 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-white">
                  Laporan Bulanan {currentYear} - {inv.plantName}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 text-sm">Tahun:</span>
                  <select
                    value={currentYear}
                    onChange={(e) => setCurrentYear(Number(e.target.value))}
                    className="bg-slate-600 text-white px-3 py-1 rounded text-sm border border-slate-500"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-3 px-4 text-slate-300">Bulan</th>
                      <th className="text-right py-3 px-4 text-slate-300">Pendapatan</th>
                      <th className="text-right py-3 px-4 text-slate-300">Pengeluaran</th>
                      <th className="text-right py-3 px-4 text-slate-300">Keuntungan Bersih</th>
                      <th className="text-right py-3 px-4 text-slate-300">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m: any, i: number) => (
                      <tr key={i} className="border-b border-slate-600 hover:bg-slate-600/70">
                        <td className="py-3 px-4 text-white">
                          {m.monthName} {currentYear}
                        </td>
                        <td className="py-3 px-4 text-right text-green-400">{fmtIDR(m.income)}</td>
                        <td className="py-3 px-4 text-right text-red-400">{fmtIDR(m.expense)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={m.net >= 0 ? "text-green-400" : "text-red-400"}>{fmtIDR(m.net)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={m.roi >= 0 ? "text-green-400" : "text-red-400"}>{m.roi.toFixed(2)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-500 bg-slate-600">
                      <td className="py-3 px-4 text-white font-bold">Total</td>
                      <td className="py-3 px-4 text-right text-green-400 font-bold">{fmtIDR(sumIncome)}</td>
                      <td className="py-3 px-4 text-right text-red-400 font-bold">{fmtIDR(sumExpense)}</td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={sumNet >= 0 ? "text-green-400" : "text-red-400"}>{fmtIDR(sumNet)}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={sumROI >= 0 ? "text-green-400" : "text-red-400"}>{sumROI.toFixed(2)}%</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* riwayat: dipaksa remount via key => langsung refetch */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <IncomeHistory key={`inc-${instance?.id}-${refreshTick}`} plantId={instance?.id} />
              <ExpenseHistory key={`exp-${instance?.id}-${refreshTick}`} plantId={instance?.id} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ====== small components ====== */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-white font-medium">{value}</p>
    </div>
  )
}
function Stat({
  color,
  icon,
  title,
  value,
  strong,
}: {
  color: string
  icon: React.ReactNode
  title: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3 mb-2">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className={`text-xl font-bold ${strong ? "text-green-400" : "text-white"}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}
function MiniStat({ title, value, tone }: { title: string; value: string; tone?: "green" | "red" }) {
  const color = tone === "green" ? "text-emerald-400" : tone === "red" ? "text-red-400" : "text-white"
  return (
    <div className="bg-slate-700 rounded-xl p-4">
      <p className="text-sm font-medium text-slate-400 mb-2">{title}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}
function BigPill({ title, desc, value }: { title: string; desc: string; value: string }) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-4">
      <p className="text-sm font-medium text-indigo-100 mb-1">{title}</p>
      {value && <p className="text-2xl font-bold text-white">{value}</p>}
      <p className="text-xs text-indigo-200 mt-1">{desc}</p>
    </div>
  )
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      {children}
    </div>
  )
}
