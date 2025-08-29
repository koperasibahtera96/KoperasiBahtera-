"use client"

export type Investor = { name: string; amount: number; date: string }

export type OperationalCost = {
  id: string
  date: string
  description: string
  amount: number
  category: "fertilizer" | "pesticide" | "labor" | "maintenance" | "other"
  inputBy: string
  inputDate: string
}

export type IncomeRecord = {
  id: string
  date: string
  description: string
  amount: number
  addedBy: string
  inputDate: string
}

export type PlantInstance = {
  id: string
  plantType: string
  plantTypeName: string
  instanceName: string
  baseAnnualROI: number
  payoutEveryMonths: number
  investors: Investor[]
  operationalCosts: OperationalCost[]
  incomeRecords: IncomeRecord[]
  location?: string
  plantedDate: string
  status: "active" | "inactive" | "harvested"
}

export type PlantType = {
  id: string
  name: string
  baseAnnualROI: number
  payoutEveryMonths: number
  description?: string
}

export type Member = {
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
    totalUang?: number
  }[]
  totalInvestment: number
  totalProfit: number
  overallROI: number
}

export const PLANT_TYPES: PlantType[] = [
  {
    id: "gaharu",
    name: "Gaharu",
    baseAnnualROI: 0.125,
    payoutEveryMonths: 2,
    description: "Tanaman penghasil resin aromatik bernilai tinggi",
  },
  {
    id: "alpukat",
    name: "Alpukat",
    baseAnnualROI: 0.2,
    payoutEveryMonths: 3,
    description: "Tanaman buah dengan permintaan pasar tinggi",
  },
  {
    id: "jengkol",
    name: "Jengkol",
    baseAnnualROI: 0.15,
    payoutEveryMonths: 2,
    description: "Tanaman polong dengan nilai ekonomi stabil",
  },
  {
    id: "aren",
    name: "Aren",
    baseAnnualROI: 0.18,
    payoutEveryMonths: 3,
    description: "Tanaman penghasil gula aren dan nira",
  },
]

export const PLANT_INSTANCES: PlantInstance[] = [
  {
    id: "gaharu-001",
    plantType: "gaharu",
    plantTypeName: "Gaharu",
    instanceName: "Gaharu #001",
    baseAnnualROI: 0.125,
    payoutEveryMonths: 2,
    investors: [
      { name: "Ahmad Suryadi", amount: 50000000, date: "2024-01-15" },
      { name: "Siti Nurhaliza", amount: 75000000, date: "2024-03-20" },
    ],
    operationalCosts: [
      {
        id: "oc-001",
        date: "2024-01-20",
        description: "Pupuk organik",
        amount: 500000,
        category: "fertilizer",
        inputBy: "Admin",
        inputDate: "2024-01-20",
      },
    ],
    incomeRecords: [
      {
        id: "ir-001",
        date: "2024-02-15",
        description: "Hasil panen perdana",
        amount: 2000000,
        addedBy: "Admin",
        inputDate: "2024-02-15",
      },
    ],
    location: "Kebun A, Blok 1",
    plantedDate: "2024-01-01",
    status: "active",
  },
  {
    id: "alpukat-001",
    plantType: "alpukat",
    plantTypeName: "Alpukat",
    instanceName: "Alpukat #001",
    baseAnnualROI: 0.2,
    payoutEveryMonths: 3,
    investors: [{ name: "Budi Santoso", amount: 30000000, date: "2024-02-10" }],
    operationalCosts: [],
    incomeRecords: [],
    location: "Kebun B, Blok 2",
    plantedDate: "2024-02-01",
    status: "active",
  },
  {
    id: "jengkol-001",
    plantType: "jengkol",
    plantTypeName: "Jengkol",
    instanceName: "Jengkol #001",
    baseAnnualROI: 0.15,
    payoutEveryMonths: 2,
    investors: [{ name: "Siti Nurhaliza", amount: 25000000, date: "2024-04-05" }],
    operationalCosts: [],
    incomeRecords: [],
    location: "Kebun C, Blok 1",
    plantedDate: "2024-04-01",
    status: "active",
  },
  {
    id: "aren-001",
    plantType: "aren",
    plantTypeName: "Aren",
    instanceName: "Aren #001",
    baseAnnualROI: 0.18,
    payoutEveryMonths: 3,
    investors: [{ name: "Dewi Sartika", amount: 40000000, date: "2024-05-12" }],
    operationalCosts: [],
    incomeRecords: [],
    location: "Kebun D, Blok 3",
    plantedDate: "2024-05-01",
    status: "active",
  },
]

export async function getTopPlantTypesByInvestment(limit = 2) {
  // DB-backed: read from /api/finance/summary
  const res = await fetch("/api/finance/summary", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load finance summary")
  const data = await res.json()
  const arr = Array.isArray(data?.plantSummaries) ? data.plantSummaries : []
  return arr.slice(0, limit)
}


export function generateDailyReportsForDate(date: Date) {
  const dateStr = date.toISOString().split("T")[0]

  const dailyOperationalCosts = PLANT_INSTANCES.flatMap((instance) =>
    instance.operationalCosts
      .filter((cost) => cost.date === dateStr)
      .map((cost) => ({
        ...cost,
        plantName: instance.instanceName,
        plantType: instance.plantTypeName,
      })),
  )

  const dailyIncome = PLANT_INSTANCES.reduce((total, instance) => {
    const dailyIncomeRecords = instance.incomeRecords.filter((record) => record.date === dateStr)
    return total + dailyIncomeRecords.reduce((sum, record) => sum + record.amount, 0)
  }, 0)

  const totalExpenses = dailyOperationalCosts.reduce((sum, cost) => sum + cost.amount, 0)
  const netProfit = dailyIncome - totalExpenses

  return {
    date: dateStr,
    income: dailyIncome,
    expenses: totalExpenses,
    netProfit: netProfit,
    transactions: dailyOperationalCosts,
    summary: {
      totalTransactions: dailyOperationalCosts.length,
      avgTransactionAmount: dailyOperationalCosts.length > 0 ? totalExpenses / dailyOperationalCosts.length : 0,
    },
  }
}

export function generateMemberData(): Member[] {
  const key = "finance_membersLike_cache"
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem(key)
    if (cached) {
      try {
        return JSON.parse(cached) as Member[]
      } catch {
        // ignore parse error
      }
    }
  }
  // fallback aman agar halaman tidak crash jika prefetch belum jalan
  return []
}



export function generatePlantTypeReport(plantTypeId: string, date?: Date) {
  const plantType = PLANT_TYPES.find((type) => type.id === plantTypeId)
  if (!plantType) return null

  const instances = PLANT_INSTANCES.filter((instance) => instance.plantType === plantTypeId)

  const totalInvestment = instances.reduce(
    (sum, instance) => sum + instance.investors.reduce((invSum, inv) => invSum + inv.amount, 0),
    0,
  )

  const totalProfit = instances.reduce((sum, instance) => {
    const totalIncome = instance.incomeRecords.reduce((incSum, inc) => incSum + inc.amount, 0)
    const totalCosts = instance.operationalCosts.reduce((costSum, cost) => costSum + cost.amount, 0)
    return sum + (totalIncome - totalCosts)
  }, 0)

  const totalOperationalCosts = instances.reduce(
    (sum, instance) => sum + instance.operationalCosts.reduce((costSum, cost) => costSum + cost.amount, 0),
    0,
  )

  const investorCount = instances.reduce((sum, instance) => sum + instance.investors.length, 0)

  const monthly = []
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(2024, i, 1)
    const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`

    const monthlyIncome = instances.reduce((sum, instance) => {
      return (
        sum +
        instance.incomeRecords
          .filter((record) => record.date.startsWith(monthStr))
          .reduce((incSum, record) => incSum + record.amount, 0)
      )
    }, 0)

    const monthlyExpenses = instances.reduce((sum, instance) => {
      return (
        sum +
        instance.operationalCosts
          .filter((cost) => cost.date.startsWith(monthStr))
          .reduce((costSum, cost) => costSum + cost.amount, 0)
      )
    }, 0)

    monthly.push({
      ym: monthStr,
      newInvest: i === 0 ? totalInvestment : 0,
      capital: totalInvestment,
      accrual: monthlyIncome,
      accrualSinceLastPayout: monthlyIncome,
      payout: (i + 1) % plantType.payoutEveryMonths === 0 ? monthlyIncome * plantType.payoutEveryMonths : 0,
    })
  }

  const yearly = [
    {
      year: 2024,
      invest: totalInvestment,
      profit: Math.max(0, totalProfit), // Ensure profit is never negative
      roiPct: totalInvestment > 0 ? (Math.max(0, totalProfit) / totalInvestment) * 100 : 0,
    },
  ]

  const perInvestor = instances.flatMap((instance) =>
    instance.investors.map((investor) => {
      const totalIncome = instance.incomeRecords.reduce((sum, record) => sum + record.amount, 0)
      const totalCosts = instance.operationalCosts.reduce((sum, cost) => sum + cost.amount, 0)
      const totalPlantInvestment = instance.investors.reduce((sum, inv) => sum + inv.amount, 0)
      const investorShare = totalPlantInvestment > 0 ? investor.amount / totalPlantInvestment : 0

      const profit = (totalIncome - totalCosts) * investorShare
      const roi = investor.amount > 0 ? (profit / investor.amount) * 100 : 0

      return {
        name: investor.name,
        invest: investor.amount,
        profit: Math.max(0, profit), // Ensure profit is never negative
        roiPct: roi,
      }
    }),
  )

  return {
    plantType: plantType.name,
    totalInvestment,
    totalProfit: Math.max(0, totalProfit), // Ensure profit is never negative
    totalOperationalCosts,
    netProfit: Math.max(0, totalProfit - totalOperationalCosts),
    roi: totalInvestment > 0 ? (Math.max(0, totalProfit - totalOperationalCosts) / totalInvestment) * 100 : 0,
    instances: instances.length,
    investors: investorCount,
    monthly,
    yearly,
    perInvestor,
    totals: {
      invest: totalInvestment,
      profit: Math.max(0, totalProfit), // Ensure profit is never negative
      roiPct: totalInvestment > 0 ? (Math.max(0, totalProfit) / totalInvestment) * 100 : 0,
      investors: investorCount,
    },
  }
}

export function getPlantTypesSummary() {
  const key = "finance_plantTypesSummary_cache"
  const cached = typeof window !== "undefined" ? sessionStorage.getItem(key) : null
  if (cached) { try { return JSON.parse(cached) } catch { /* ignore */ } }
  throw new Error("Plant types summary not prefetched")
}


export function addOperationalCost(
  plantId: string,
  cost: {
    date: Date | string
    description: string
    amount: number
    category: string
  },
): boolean {
  const plantInstance = PLANT_INSTANCES.find((p) => p.id === plantId)
  if (plantInstance) {
    const newCost: OperationalCost = {
      id: `oc-${Date.now()}`,
      date: typeof cost.date === "string" ? cost.date : cost.date.toISOString().split("T")[0],
      description: cost.description,
      amount: cost.amount,
      category: cost.category as any,
      inputBy: "Admin",
      inputDate: new Date().toISOString(),
    }
    plantInstance.operationalCosts.push(newCost)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("plantDataUpdated", { detail: { plantId } }))
    }
    return true
  }
  return false
}

export function addIncomeRecord(
  plantId: string,
  income: {
    date: Date | string
    description: string
    amount: number
    addedBy: string
  },
): boolean {
  const plantInstance = PLANT_INSTANCES.find((p) => p.id === plantId)
  if (plantInstance) {
    const newIncome: IncomeRecord = {
      id: `ir-${Date.now()}`,
      date: typeof income.date === "string" ? income.date : income.date.toISOString().split("T")[0],
      description: income.description,
      amount: income.amount,
      addedBy: income.addedBy,
      inputDate: new Date().toISOString(),
    }
    plantInstance.incomeRecords.push(newIncome)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("plantDataUpdated", { detail: { plantId } }))
    }
    return true
  }
  return false
}

export function exportAllPlantsCSV() {
  const plantsSummary = getPlantTypesSummary()

  const csvContent = [
    "Jenis Tanaman;Total Investasi;Total Keuntungan;ROI;Jumlah Investor;Jumlah Pohon",
    ...plantsSummary.map(
      (plant) =>
        `${plant.name};${plant.totalInvestment};${plant.totalProfit};${(plant.averageROI * 100).toFixed(2)}%;${plant.totalInvestors};${plant.instanceCount}`,
    ),
  ].join("\n")

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `laporan-semua-tanaman-${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportCompleteReportCSV(plantTypeId: string) {
  const report = generatePlantTypeReport(plantTypeId)
  if (!report) return

  const csvContent = [
    "Laporan Lengkap;Nilai",
    `Jenis Tanaman;${report.plantType}`,
    `Total Investasi;${report.totalInvestment}`,
    `Total Keuntungan;${report.totalProfit}`,
    `Total Biaya Operasional;${report.totalOperationalCosts}`,
    `Keuntungan Bersih;${report.netProfit}`,
    `ROI;${report.roi.toFixed(2)}%`,
    `Jumlah Pohon;${report.instances}`,
    `Jumlah Investor;${report.investors}`,
  ].join("\n")

  downloadCSV(csvContent, `laporan-lengkap-${plantTypeId}-${new Date().toISOString().split("T")[0]}.csv`)
}

export function exportMonthlyReportCSV(plantTypeId: string) {
  const instances = PLANT_INSTANCES.filter((instance) => instance.plantType === plantTypeId)

  const monthlyData = []
  for (let i = 0; i < 12; i++) {
    const month = new Date(2024, i, 1).toLocaleString("id-ID", { month: "long" })
    const monthlyIncome = instances.reduce((sum, instance) => {
      return (
        sum +
        instance.incomeRecords
          .filter((record) => new Date(record.date).getMonth() === i)
          .reduce((incSum, record) => incSum + record.amount, 0)
      )
    }, 0)

    const monthlyExpenses = instances.reduce((sum, instance) => {
      return (
        sum +
        instance.operationalCosts
          .filter((cost) => new Date(cost.date).getMonth() === i)
          .reduce((costSum, cost) => costSum + cost.amount, 0)
      )
    }, 0)

    monthlyData.push({
      month,
      income: monthlyIncome,
      expenses: monthlyExpenses,
      netProfit: monthlyIncome - monthlyExpenses,
    })
  }

  const csvContent = [
    "Bulan;Pendapatan;Pengeluaran;Keuntungan Bersih",
    ...monthlyData.map((data) => `${data.month};${data.income};${data.expenses};${data.netProfit}`),
  ].join("\n")

  downloadCSV(csvContent, `laporan-bulanan-${plantTypeId}-${new Date().toISOString().split("T")[0]}.csv`)
}

export function exportYearlyReportCSV(plantTypeId: string) {
  const report = generatePlantTypeReport(plantTypeId)
  if (!report) return

  const csvContent = [
    "Laporan Tahunan;2024",
    `Jenis Tanaman;${report.plantType}`,
    `Total Investasi;${report.totalInvestment}`,
    `Total Pendapatan;${report.totalProfit}`,
    `Total Pengeluaran;${report.totalOperationalCosts}`,
    `Keuntungan Bersih;${report.netProfit}`,
    `ROI Tahunan;${report.roi.toFixed(2)}%`,
    `Jumlah Pohon Aktif;${report.instances}`,
    `Total Investor;${report.investors}`,
  ].join("\n")

  downloadCSV(csvContent, `laporan-tahunan-${plantTypeId}-2024.csv`)
}

export function exportInvestorReportCSV(plantTypeId: string) {
  const instances = PLANT_INSTANCES.filter((instance) => instance.plantType === plantTypeId)

  const investorData = instances.flatMap((instance) =>
    instance.investors.map((investor) => {
      const totalIncome = instance.incomeRecords.reduce((sum, record) => sum + record.amount, 0)
      const totalCosts = instance.operationalCosts.reduce((sum, cost) => sum + cost.amount, 0)
      const totalPlantInvestment = instance.investors.reduce((sum, inv) => sum + inv.amount, 0)
      const investorShare = totalPlantInvestment > 0 ? investor.amount / totalPlantInvestment : 0

      const profit = (totalIncome - totalCosts) * investorShare
      const roi = investor.amount > 0 ? (profit / investor.amount) * 100 : 0

      return {
        name: investor.name,
        plantInstance: instance.instanceName,
        investment: investor.amount,
        investDate: investor.date,
        profit: profit.toFixed(0),
        roi: roi.toFixed(2),
      }
    }),
  )

  const csvContent = [
    "Nama Investor;Pohon;Investasi;Tanggal Investasi;Keuntungan;ROI",
    ...investorData.map(
      (data) => `${data.name};${data.plantInstance};${data.investment};${data.investDate};${data.profit};${data.roi}%`,
    ),
  ].join("\n")

  downloadCSV(csvContent, `laporan-investor-${plantTypeId}-${new Date().toISOString().split("T")[0]}.csv`)
}

export function getPlantInstances(plantTypeId?: string): PlantInstance[] {
  if (plantTypeId) {
    return PLANT_INSTANCES.filter((instance) => instance.plantType === plantTypeId)
  }
  return PLANT_INSTANCES
}

export function exportMemberDetailCSV(memberId: string) {
  const members = generateMemberData()
  const member = members.find((m) => m.id === memberId)

  if (!member) return

  const csvContent = [
    "Detail Anggota;Nilai",
    `Nama;${member.name}`,
    `Email;${member.email}`,
    `Telepon;${member.phone}`,
    `Lokasi;${member.location}`,
    `Tanggal Bergabung;${member.joinDate}`,
    `Total Investasi;${member.totalInvestment}`,
    `Total Keuntungan;${member.totalProfit}`,
    `ROI Keseluruhan;${member.overallROI.toFixed(2)}%`,
    "",
    "Investasi Detail;",
    "Nama Pohon;Jumlah Investasi;Keuntungan;ROI;Tanggal Investasi",
    ...member.investments.map(
      (inv) => `${inv.plantName};${inv.amount};${inv.profit.toFixed(0)};${inv.roi.toFixed(2)}%;${inv.investDate}`,
    ),
  ].join("\n")

  downloadCSV(
    csvContent,
    `detail-anggota-${member.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`,
  )
}

export function calculateTotalUang(plantId: string, investorName: string): number {
  const plantInstance = PLANT_INSTANCES.find((p) => p.id === plantId)
  if (!plantInstance) return 0

  const investor = plantInstance.investors.find((inv) => inv.name === investorName)
  if (!investor) return 0

  const initialInvestment = investor.amount
  const totalIncome = plantInstance.incomeRecords.reduce((sum, record) => sum + record.amount, 0)
  const totalExpenses = plantInstance.operationalCosts.reduce((sum, cost) => sum + cost.amount, 0)

  const totalPlantInvestment = plantInstance.investors.reduce((sum, inv) => sum + inv.amount, 0)
  const investmentShare = totalPlantInvestment > 0 ? investor.amount / totalPlantInvestment : 0

  const proportionalIncome = totalIncome * investmentShare
  const proportionalExpenses = totalExpenses * investmentShare

  return initialInvestment + proportionalIncome - proportionalExpenses
}

export function generateEnhancedMemberData(): Member[] {
  const members = generateMemberData()

  members.forEach((member) => {
    member.investments.forEach((investment) => {
      const plantInstance = PLANT_INSTANCES.find((p) => p.id === investment.plantId)
      if (plantInstance) {
        const totalUang = calculateTotalUang(investment.plantId, member.name)
        ;(investment as any).totalUang = totalUang
      }
    })
  })

  return members
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}


/** Prefetch DB data for sync helpers used in XLSX generation */
export async function prefetchFinanceCaches() {
  try {
    const res = await fetch("/api/finance/summary", { cache: "no-store" })
    if (res.ok) {
      const data = await res.json()
      if (typeof window !== "undefined") {
        sessionStorage.setItem("finance_plantTypesSummary_cache", JSON.stringify(data?.plantTypes || []))
      }
    }
  } catch {}

  try {
    const r2 = await fetch("/api/investors?format=membersLike", { cache: "no-store" })
    if (r2.ok) {
      const members = await r2.json()
      if (typeof window !== "undefined") {
        sessionStorage.setItem("finance_membersLike_cache", JSON.stringify(members || []))
      }
    }
  } catch {}
}
