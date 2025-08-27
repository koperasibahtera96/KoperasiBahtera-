"use client"

import Link from "next/link"
import { ArrowUpRight, TrendingUp, DollarSign, BarChart3, Users, Download } from "lucide-react"
import { getTopPlantTypesByInvestment, generateMemberData, getPlantTypesSummary, PLANT_INSTANCES } from "@/lib/finance"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { SidebarLayout } from "@/components/sidebar-layout"
import { Button } from "@/components/ui-finance/button"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import React from "react"
import * as XLSX from "xlsx"

const BRUTALIST_COLORS = ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5", "#118AB2", "#073B4C"]

const FALLBACK_PLANTS = [
  {
    id: "gaharu",
    name: "Gaharu",
    totalInvestment: 850000000,
    totalProfit: 106250000,
    roi: 12.5,
    instanceCount: 45,
    investorCount: 45,
  },
  {
    id: "alpukat",
    name: "Alpukat",
    totalInvestment: 720000000,
    totalProfit: 86400000,
    roi: 12.0,
    instanceCount: 38,
    investorCount: 38,
  },
]

export default function FinancePage() {
  const [topPlants, setTopPlants] = React.useState(FALLBACK_PLANTS)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const plants = await getTopPlantTypesByInvestment(2)
        const processedPlants = plants.map((plant) => ({
          ...plant,
          roi: plant.roi || 0,
          totalInvestment: plant.totalInvestment || 0,
          totalProfit: plant.totalProfit || 0,
          investorCount: plant.investorCount || 0,
          instanceCount: plant.instanceCount || 0,
        }))
        setTopPlants(processedPlants)
        setError(null)
      } catch (err) {
        console.error("[v0] Failed to get plant data:", err)
        setError("Failed to load data from database, showing fallback data")
        setTopPlants(FALLBACK_PLANTS)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const overallTotals = topPlants.reduce(
    (acc, plant) => ({
      invest: acc.invest + plant.totalInvestment,
      profit: acc.profit + plant.totalProfit,
      investors: acc.investors + plant.investorCount,
    }),
    { invest: 0, profit: 0, investors: 0 },
  )

  const overallROI = overallTotals.invest > 0 ? (overallTotals.profit / overallTotals.invest) * 100 : 0

  const investmentData = topPlants
    .map((plant, index) => ({
      name: plant.name,
      value: plant.totalInvestment,
      color: BRUTALIST_COLORS[index % BRUTALIST_COLORS.length],
    }))
    .filter((item) => item.value > 0)

  const handleDownloadSummary = () => {
    try {
      const wb = XLSX.utils.book_new()

      const allMembers = generateMemberData()
      const allPlantTypes = getPlantTypesSummary()

      // Calculate comprehensive totals from database
      const comprehensiveTotals = {
        totalInvestment: allMembers.reduce((sum, member) => sum + member.totalInvestment, 0),
        totalProfit: allMembers.reduce((sum, member) => sum + member.totalProfit, 0),
        totalMembers: allMembers.length,
        totalPlantInstances: PLANT_INSTANCES.length,
      }

      const comprehensiveROI =
        comprehensiveTotals.totalInvestment > 0
          ? (comprehensiveTotals.totalProfit / comprehensiveTotals.totalInvestment) * 100
          : 0

      // Summary Sheet with proper borders and formatting
      const summaryData = [
        ["RINGKASAN INVESTASI KESELURUHAN", "", "", ""],
        ["Tanggal Laporan:", new Date().toLocaleDateString("id-ID"), "", ""],
        ["", "", "", ""],
        ["METRIK UTAMA", "", "", ""],
        ["Total Investasi", formatCurrency(comprehensiveTotals.totalInvestment), "", ""],
        ["Total Keuntungan", formatCurrency(comprehensiveTotals.totalProfit), "", ""],
        ["ROI Keseluruhan", formatPercentage(comprehensiveROI), "", ""],
        ["Jumlah Anggota", comprehensiveTotals.totalMembers, "", ""],
        ["Jumlah Pohon", comprehensiveTotals.totalPlantInstances, "", ""],
        ["", "", "", ""],
        ["DISTRIBUSI PER JENIS TANAMAN", "", "", ""],
        ["Jenis Tanaman", "Total Investasi", "Total Keuntungan", "ROI"],
        ...allPlantTypes.map((plant) => [
          plant.name,
          formatCurrency(plant.totalInvestment),
          formatCurrency(plant.totalProfit),
          formatPercentage(plant.averageROI),
        ]),
      ]

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
      summaryWs["!cols"] = [{ width: 25 }, { width: 20 }, { width: 20 }, { width: 15 }]

      const summaryRange = XLSX.utils.decode_range(summaryWs["!ref"] || "A1")
      for (let row = summaryRange.s.r; row <= summaryRange.e.r; row++) {
        for (let col = summaryRange.s.c; col <= summaryRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          if (!summaryWs[cellAddress]) summaryWs[cellAddress] = { v: "" }

          // Header rows styling
          if (row === 0 || row === 3 || row === 10) {
            summaryWs[cellAddress].s = {
              font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4472C4" } },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } },
              },
              alignment: { horizontal: "center", vertical: "center" },
            }
          } else if (row === 11) {
            // Table header styling
            summaryWs[cellAddress].s = {
              font: { bold: true, sz: 11 },
              fill: { fgColor: { rgb: "D9E2F3" } },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } },
              },
              alignment: { horizontal: "center", vertical: "center" },
            }
          } else {
            // Regular cells with borders
            summaryWs[cellAddress].s = {
              border: {
                top: { style: "thin", color: { rgb: "CCCCCC" } },
                bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                left: { style: "thin", color: { rgb: "CCCCCC" } },
                right: { style: "thin", color: { rgb: "CCCCCC" } },
              },
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, summaryWs, "Ringkasan Umum")

      const memberDetailData = [
        ["DETAIL ANGGOTA INVESTOR", "", "", "", "", "", ""],
        ["", "", "", "", "", "", ""],
        ["Nama", "Email", "Telepon", "Lokasi", "Total Investasi", "Total Keuntungan", "ROI"],
        ...allMembers.map((member) => [
          member.name,
          member.email,
          member.phone,
          member.location,
          member.totalInvestment,
          member.totalProfit,
          member.overallROI,
        ]),
        ["", "", "", "", "", "", ""],
        ["TOTAL", "", "", "", comprehensiveTotals.totalInvestment, comprehensiveTotals.totalProfit, comprehensiveROI],
      ]

      const memberDetailWs = XLSX.utils.aoa_to_sheet(memberDetailData)
      memberDetailWs["!cols"] = [
        { width: 20 },
        { width: 25 },
        { width: 18 },
        { width: 15 },
        { width: 18 },
        { width: 18 },
        { width: 12 },
      ]

      // Add borders to member detail sheet
      const memberRange = XLSX.utils.decode_range(memberDetailWs["!ref"] || "A1")
      for (let row = memberRange.s.r; row <= memberRange.e.r; row++) {
        for (let col = memberRange.s.c; col <= memberRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          if (!memberDetailWs[cellAddress]) memberDetailWs[cellAddress] = { v: "" }

          if (row === 0 || row === 2) {
            memberDetailWs[cellAddress].s = {
              font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "70AD47" } },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } },
              },
              alignment: { horizontal: "center", vertical: "center" },
            }
          } else {
            memberDetailWs[cellAddress].s = {
              border: {
                top: { style: "thin", color: { rgb: "CCCCCC" } },
                bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                left: { style: "thin", color: { rgb: "CCCCCC" } },
                right: { style: "thin", color: { rgb: "CCCCCC" } },
              },
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, memberDetailWs, "Detail Anggota")

      const plantInstanceData = [
        ["DETAIL POHON INVESTASI", "", "", "", "", "", ""],
        ["", "", "", "", "", "", ""],
        [
          "Nama Pohon",
          "Jenis",
          "Total Investasi",
          "Total Pemasukan",
          "Total Pengeluaran",
          "Keuntungan Bersih",
          "Status",
        ],
        ...PLANT_INSTANCES.map((instance) => {
          const totalInvestment = instance.investors.reduce((sum, inv) => sum + inv.amount, 0)
          const totalIncome = instance.incomeRecords.reduce((sum, inc) => sum + inc.amount, 0)
          const totalExpenses = instance.operationalCosts.reduce((sum, cost) => sum + cost.amount, 0)
          const netProfit = totalIncome - totalExpenses

          return [
            instance.instanceName,
            instance.plantTypeName,
            totalInvestment,
            totalIncome,
            totalExpenses,
            netProfit,
            instance.status === "active" ? "Aktif" : "Tidak Aktif",
          ]
        }),
      ]

      const plantInstanceWs = XLSX.utils.aoa_to_sheet(plantInstanceData)
      plantInstanceWs["!cols"] = [
        { width: 18 },
        { width: 15 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 12 },
      ]

      // Add borders to plant instance sheet
      const plantRange = XLSX.utils.decode_range(plantInstanceWs["!ref"] || "A1")
      for (let row = plantRange.s.r; row <= plantRange.e.r; row++) {
        for (let col = plantRange.s.c; col <= plantRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          if (!plantInstanceWs[cellAddress]) plantInstanceWs[cellAddress] = { v: "" }

          if (row === 0 || row === 2) {
            plantInstanceWs[cellAddress].s = {
              font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "E67C73" } },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } },
              },
              alignment: { horizontal: "center", vertical: "center" },
            }
          } else {
            plantInstanceWs[cellAddress].s = {
              border: {
                top: { style: "thin", color: { rgb: "CCCCCC" } },
                bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                left: { style: "thin", color: { rgb: "CCCCCC" } },
                right: { style: "thin", color: { rgb: "CCCCCC" } },
              },
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, plantInstanceWs, "Detail Pohon")

      const currentDate = new Date().toISOString().split("T")[0]
      const filename = `Ringkasan_Investasi_Lengkap_${currentDate}.xlsx`

      XLSX.writeFile(wb, filename)

      console.log("[v0] Comprehensive investment summary Excel file generated successfully")
    } catch (error) {
      console.error("[v0] Error generating Excel file:", error)
      alert("Terjadi kesalahan saat membuat file Excel. Silakan coba lagi.")
    }
  }

  return (
    <SidebarLayout>
      <div className="p-6 space-y-8">
        <header>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Jumat, 22 Agustus 2025</p>
            {error && (
              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-chart-2 mb-2">Ringkasan Investasi</h2>
                <p className="text-muted-foreground">Analisis detail per jenis tanaman dan kinerja anggota</p>
              </div>
              <Button className="gap-2" onClick={handleDownloadSummary}>
                <Download className="w-4 h-4" />
                Download Ringkasan
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-xl bg-muted p-4 border border-border animate-pulse">
                    <div className="h-10 w-10 bg-muted-foreground/20 rounded-lg mb-3"></div>
                    <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                    <div className="h-6 bg-muted-foreground/20 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <SummaryCard
                  title="Total Investasi"
                  value={formatCurrency(overallTotals.invest)}
                  icon={<DollarSign className="h-5 w-5" />}
                  colorClass="text-chart-1"
                />
                <SummaryCard
                  title="Total Keuntungan"
                  value={formatCurrency(overallTotals.profit)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  colorClass="text-chart-2"
                />
                <SummaryCard
                  title="ROI"
                  value={formatPercentage(overallROI || 0)}
                  icon={<BarChart3 className="h-5 w-5" />}
                  colorClass="text-chart-3"
                />
                <SummaryCard
                  title="Jumlah Anggota"
                  value={`${overallTotals.investors}`}
                  icon={<Users className="h-5 w-5" />}
                  colorClass="text-chart-4"
                />
              </div>
            )}

            <div className="bg-muted rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Distribusi Investasi</h3>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={investmentData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="hsl(var(--background))"
                        strokeWidth={3}
                      >
                        {investmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Investasi"]}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "2px solid #000000",
                          borderRadius: "8px",
                          color: "#000000",
                          fontWeight: "bold",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </header>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Top Investasi Tanaman</h2>
            <Link href="/semua-investasi" className="text-primary hover:text-primary/80 text-sm font-medium">
              Lihat Semua →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-card border border-border p-6 animate-pulse">
                  <div className="h-6 bg-muted rounded mb-4 w-1/3"></div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl bg-muted p-4">
                      <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                      <div className="h-6 bg-muted-foreground/20 rounded"></div>
                    </div>
                    <div className="rounded-xl bg-muted p-4">
                      <div className="h-4 bg-muted-foreground/20 rounded mb-2"></div>
                      <div className="h-6 bg-muted-foreground/20 rounded"></div>
                    </div>
                  </div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {topPlants.map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
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
    <div className="rounded-xl bg-card p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}

function PlantCard({ plant }: { plant: any }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">{plant.name}</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                ROI {formatPercentage(plant.roi || 0)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {plant.instanceCount} pohon
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl bg-muted p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-chart-1" />
              <span className="text-sm font-medium text-muted-foreground">Total Investasi</span>
            </div>
            <div className="text-lg font-bold text-foreground">{formatCurrency(plant.totalInvestment)}</div>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-chart-2" />
              <span className="text-sm font-medium text-muted-foreground">Profit Dibayar</span>
            </div>
            <div className="text-lg font-bold text-chart-2">{formatCurrency(plant.totalProfit)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-chart-3" />
            <span className="text-sm font-medium text-muted-foreground">ROI Aktual</span>
          </div>
          <div className="text-lg font-bold text-chart-3">{formatPercentage(plant.roi || 0)}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{plant.investorCount} investor aktif</span>
          </div>
          <Button asChild size="sm" className="gap-2">
            <Link href={`/tanaman/${plant.id}`}>
              Lihat Detail
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
