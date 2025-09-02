import { ensureConnection } from "@/lib/utils/utils/database"
import { Transaction } from "@/models"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    await ensureConnection()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    // Get all transactions for the specified date
    const transactions = await Transaction.find({ date }).lean()

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

    const netProfit = totalIncome - totalExpenses

    return NextResponse.json({
      date,
      totalIncome,
      totalExpenses,
      netProfit,
      transactions,
      transactionCount: transactions.length,
    })
  } catch (error) {
    console.error('Error generating daily report:', error);
    return NextResponse.json({ error: "Failed to generate daily report" }, { status: 500 })
  }
}
