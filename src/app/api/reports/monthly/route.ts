import { ensureConnection } from "@/lib/utils/utils/database"
import { PlantInstance } from "@/models"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    await ensureConnection()
    const { searchParams } = new URL(request.url)
    const year = Number.parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "12")

    const plants = await PlantInstance.find({}).lean()

    const monthlyData = []
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${month.toString().padStart(2, "0")}`

      let totalInvestment = 0
      let totalIncome = 0
      let totalExpenses = 0

      plants.forEach((plant) => {
        // Calculate investment for this month
        const investmentDate = new Date(plant.investmentDate)
        if (investmentDate.getFullYear() === year && investmentDate.getMonth() + 1 === month) {
          totalInvestment += plant.investmentAmount
        }

        // Calculate income for this month
        plant.incomeRecords?.forEach((income: any) => {
          const incomeDate = new Date(income.date)
          if (incomeDate.getFullYear() === year && incomeDate.getMonth() + 1 === month) {
            totalIncome += income.amount
          }
        })

        // Calculate expenses for this month
        plant.operationalCosts?.forEach((cost: any) => {
          const costDate = new Date(cost.date)
          if (costDate.getFullYear() === year && costDate.getMonth() + 1 === month) {
            totalExpenses += cost.amount
          }
        })
      })

      monthlyData.push({
        month: monthStr,
        monthName: new Date(year, month - 1).toLocaleString("id-ID", { month: "long" }),
        totalInvestment,
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
      })
    }

    const skip = (page - 1) * limit
    const paginatedData = monthlyData.slice(skip, skip + limit)
    const totalPages = Math.ceil(monthlyData.length / limit)

    return NextResponse.json({
      year,
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: monthlyData.length,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error('Error generating monthly report:', error);
    return NextResponse.json({ error: "Failed to generate monthly report" }, { status: 500 })
  }
}
