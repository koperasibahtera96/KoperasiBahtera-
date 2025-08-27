import type { PlantInstance, Member } from "../api"

export interface PlantTypeSummary {
  id: string
  name: string
  totalInvestment: number
  totalProfit: number
  totalOperationalCosts: number
  netProfit: number
  roi: number
  investorCount: number
  instanceCount: number
}

export interface MemberPortfolio {
  member: Member
  investments: Array<{
    plantId: string
    plantName: string
    plantType: string
    investmentAmount: number
    profit: number
    operationalCosts: number
    netProfit: number
    roi: number
  }>
  totalInvestment: number
  totalProfit: number
  totalOperationalCosts: number
  totalNetProfit: number
  averageROI: number
}

export interface MonthlyReport {
  month: string
  income: number
  expenses: number
  netProfit: number
  roi: number
}

export interface DailyReport {
  date: string
  income: number
  expenses: number
  netProfit: number
  transactions: Array<{
    type: "income" | "expense"
    description: string
    amount: number
    plantName: string
  }>
}

// Transform plant instances to plant type summaries
export function transformToPlantTypeSummaries(plantInstances: PlantInstance[]): PlantTypeSummary[] {
  const typeGroups = plantInstances.reduce(
    (acc, instance) => {
      if (!acc[instance.plantType]) {
        acc[instance.plantType] = []
      }
      acc[instance.plantType].push(instance)
      return acc
    },
    {} as Record<string, PlantInstance[]>,
  )

  return Object.entries(typeGroups).map(([plantType, instances]) => {
    const totalInvestment = instances.reduce(
      (sum, instance) => sum + instance.investors.reduce((invSum, inv) => invSum + inv.investmentAmount, 0),
      0,
    )

    const totalOperationalCosts = instances.reduce(
      (sum, instance) => sum + instance.operationalCosts.reduce((costSum, cost) => costSum + cost.amount, 0),
      0,
    )

    const totalIncome = instances.reduce(
      (sum, instance) => sum + instance.incomeRecords.reduce((incSum, inc) => incSum + inc.amount, 0),
      0,
    )

    const netProfit = totalIncome - totalOperationalCosts
    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0

    const investorCount = new Set(instances.flatMap((instance) => instance.investors.map((inv) => inv.memberId))).size

    return {
      id: plantType,
      name: plantType.charAt(0).toUpperCase() + plantType.slice(1),
      totalInvestment,
      totalProfit: totalIncome,
      totalOperationalCosts,
      netProfit,
      roi,
      investorCount,
      instanceCount: instances.length,
    }
  })
}

// Transform data for member portfolio
export function transformToMemberPortfolio(member: Member, plantInstances: PlantInstance[]): MemberPortfolio {
  const memberInvestments = plantInstances
    .filter((instance) => instance.investors.some((inv) => inv.memberId === member.id))
    .map((instance) => {
      const investment = instance.investors.find((inv) => inv.memberId === member.id)!
      const memberShare =
        investment.investmentAmount / instance.investors.reduce((sum, inv) => sum + inv.investmentAmount, 0)

      const totalIncome = instance.incomeRecords.reduce((sum, inc) => sum + inc.amount, 0)
      const totalCosts = instance.operationalCosts.reduce((sum, cost) => sum + cost.amount, 0)

      const memberProfit = totalIncome * memberShare
      const memberCosts = totalCosts * memberShare
      const netProfit = memberProfit - memberCosts
      const roi = investment.investmentAmount > 0 ? (netProfit / investment.investmentAmount) * 100 : 0

      return {
        plantId: instance.id,
        plantName: instance.name,
        plantType: instance.plantType,
        investmentAmount: investment.investmentAmount,
        profit: memberProfit,
        operationalCosts: memberCosts,
        netProfit,
        roi,
      }
    })

  const totalInvestment = memberInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0)
  const totalProfit = memberInvestments.reduce((sum, inv) => sum + inv.profit, 0)
  const totalOperationalCosts = memberInvestments.reduce((sum, inv) => sum + inv.operationalCosts, 0)
  const totalNetProfit = totalProfit - totalOperationalCosts
  const averageROI = totalInvestment > 0 ? (totalNetProfit / totalInvestment) * 100 : 0

  return {
    member,
    investments: memberInvestments,
    totalInvestment,
    totalProfit,
    totalOperationalCosts,
    totalNetProfit,
    averageROI,
  }
}

// Generate monthly reports
export function generateMonthlyReports(plantInstances: PlantInstance[], year: number): MonthlyReport[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  return months.map((month, index) => {
    const monthStart = new Date(year, index, 1)
    const monthEnd = new Date(year, index + 1, 0)

    let income = 0
    let expenses = 0

    plantInstances.forEach((instance) => {
      // Calculate income for this month
      instance.incomeRecords.forEach((record) => {
        const recordDate = new Date(record.date)
        if (recordDate >= monthStart && recordDate <= monthEnd) {
          income += record.amount
        }
      })

      // Calculate expenses for this month
      instance.operationalCosts.forEach((cost) => {
        const costDate = new Date(cost.date)
        if (costDate >= monthStart && costDate <= monthEnd) {
          expenses += cost.amount
        }
      })
    })

    const netProfit = income - expenses
    const totalInvestment = plantInstances.reduce(
      (sum, instance) => sum + instance.investors.reduce((invSum, inv) => invSum + inv.investmentAmount, 0),
      0,
    )
    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0

    return {
      month,
      income,
      expenses,
      netProfit,
      roi,
    }
  })
}

// Generate daily reports
export function generateDailyReports(plantInstances: PlantInstance[], date: Date): DailyReport {
  const dateStr = date.toISOString().split("T")[0]

  let income = 0
  let expenses = 0
  const transactions: DailyReport["transactions"] = []

  plantInstances.forEach((instance) => {
    // Process income records for this date
    instance.incomeRecords.forEach((record) => {
      if (record.date.startsWith(dateStr)) {
        income += record.amount
        transactions.push({
          type: "income",
          description: record.description,
          amount: record.amount,
          plantName: instance.name,
        })
      }
    })

    // Process operational costs for this date
    instance.operationalCosts.forEach((cost) => {
      if (cost.date.startsWith(dateStr)) {
        expenses += cost.amount
        transactions.push({
          type: "expense",
          description: cost.description,
          amount: cost.amount,
          plantName: instance.name,
        })
      }
    })
  })

  const netProfit = income - expenses

  return {
    date: dateStr,
    income,
    expenses,
    netProfit,
    transactions,
  }
}
