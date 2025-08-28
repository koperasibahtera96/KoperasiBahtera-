// src/app/api/investors/[id]/route.ts
import { NextResponse } from "next/server"
import { ensureConnection } from "@/lib/utils/utils/database"
import { Investor, PlantInstance, Transaction } from "@/models"

function ym(d: string | Date) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
}
function startOfYear(y: number) {
  return new Date(y, 0, 1)
}
function endOfYear(y: number) {
  return new Date(y, 11, 31, 23, 59, 59, 999)
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureConnection()
    const { id } = params
    const url = new URL(req.url)
    const format = url.searchParams.get("format") || "rich"
    const year = Number.parseInt(url.searchParams.get("year") || new Date().getFullYear().toString())

    const investor = await Investor.findOne({ userId: id }).lean()
    if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Kumpulkan semua instance yang diinvest oleh investor
    const productIds: string[] = (investor.investments ?? [])
      .map((r: any) => r?.productName)
      .filter(Boolean)

    const instances = await PlantInstance.find({ id: { $in: productIds } }).lean()

    // Fallback income/expense bila embedded kosong → pakai Transaction
    const tx = await Transaction.find({ plantInstanceId: { $in: productIds } }).lean()
    const txIncomeByInst: Record<string, number> = {}
    const txExpenseByInst: Record<string, number> = {}
    tx.forEach((t) => {
      const amt = Number(t.amount) || 0
      if (t.type === "income") txIncomeByInst[t.plantInstanceId] = (txIncomeByInst[t.plantInstanceId] || 0) + amt
      else txExpenseByInst[t.plantInstanceId] = (txExpenseByInst[t.plantInstanceId] || 0) + amt
    })

    // Total investasi per instance (untuk proporsi)
    const totalInvestByInst: Record<string, number> = {}
    ;(await Investor.find({ "investments.productName": { $in: productIds } }, { investments: 1 }).lean()).forEach(
      (iv) => {
        (iv.investments ?? []).forEach((r: any) => {
          if (!r?.productName) return
          totalInvestByInst[r.productName] = (totalInvestByInst[r.productName] || 0) + (Number(r.totalAmount) || 0)
        })
      },
    )

    // Map id -> instance
    const instById = new Map<string, any>()
    instances.forEach((p) => instById.set(p.id, p))

    // ---------- Hitung investasi per item (profit/roi) dgn rumus lama ----------
    const investments = (investor.investments ?? []).map((r: any) => {
      const plantId = r.productName
      const inst = instById.get(plantId)
      const plantName = inst?.instanceName || plantId

      const incEmbedded = Array.isArray(inst?.incomeRecords)
        ? inst.incomeRecords.reduce((s: number, it: any) => s + (Number(it.amount) || 0), 0)
        : 0
      const expEmbedded = Array.isArray(inst?.operationalCosts)
        ? inst.operationalCosts.reduce((s: number, it: any) => s + (Number(it.amount) || 0), 0)
        : 0

      const totalIncome = (incEmbedded || expEmbedded) ? incEmbedded : (txIncomeByInst[plantId] || 0)
      const totalExpense = (incEmbedded || expEmbedded) ? expEmbedded : (txExpenseByInst[plantId] || 0)

      const amount = Number(r.totalAmount) || 0
      const totalPlantInvest = totalInvestByInst[plantId] || 0
      const share = totalPlantInvest > 0 ? amount / totalPlantInvest : 0

      const profit = (totalIncome - totalExpense) * share
      const roi = amount > 0 ? (profit / amount) * 100 : 0
      const investDate = r.investmentDate ? new Date(r.investmentDate).toISOString().split("T")[0] : ""

      return {
        plantId,
        plantName,
        amount,
        profit,
        roi,
        investDate,
        totalUang: amount + profit, // sama seperti total_uang lama (initial + net)
      }
    })

    const totalInvestment = investments.reduce((s, it) => s + it.amount, 0)
    const totalProfit = investments.reduce((s, it) => s + it.profit, 0)
    const overallROI = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0

    const joinDate =
      investor.investments?.length
        ? new Date(
            Math.min(...investor.investments.map((r: any) => new Date(r.investmentDate || Date.now()).getTime())),
          )
            .toISOString()
            .split("T")[0]
        : ""

    if (format === "membersLike") {
      return NextResponse.json({
        id: String(investor.userId),
        name: investor.name,
        email: investor.email,
        phone: investor.phoneNumber || "",
        location: "",
        joinDate,
        investments,
        totalInvestment,
        totalProfit,
        overallROI,
      })
    }

    // ---------- Pie data ----------
    const pie = investments.map((it) => ({ name: it.plantName, value: it.amount }))

    // ---------- Time-series bulanan (income/expense/profit), proporsional ----------
    const months: string[] = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`)
    const monthly = months.map((m) => ({ month: m, income: 0, expense: 0, profit: 0 }))

    for (const r of investor.investments ?? []) {
      const plantId = r.productName
      const inst = instById.get(plantId)
      const amount = Number(r.totalAmount) || 0
      const totalPlantInvest = totalInvestByInst[plantId] || 0
      const share = totalPlantInvest > 0 ? amount / totalPlantInvest : 0

      // gunakan incomeRecords/operationalCosts dulu; sisanya fallback ke transactions
      const inc = Array.isArray(inst?.incomeRecords) ? inst.incomeRecords : []
      const exp = Array.isArray(inst?.operationalCosts) ? inst.operationalCosts : []

      inc.forEach((i: any) => {
        const yymm = ym(i.date)
        const recYear = new Date(i.date).getFullYear()
        if (recYear !== year) return
        const row = monthly.find((x) => x.month === yymm)
        if (row) row.income += (Number(i.amount) || 0) * share
      })
      exp.forEach((e: any) => {
        const yymm = ym(e.date)
        const recYear = new Date(e.date).getFullYear()
        if (recYear !== year) return
        const row = monthly.find((x) => x.month === yymm)
        if (row) row.expense += (Number(e.amount) || 0) * share
      })

      // fallback per-plant dari transactions bila embedded kosong
      if (inc.length === 0 && exp.length === 0) {
        tx.forEach((t) => {
          if (t.plantInstanceId !== plantId) return
          const d = new Date(t.date || t.createdAt || startOfYear(year))
          if (d.getFullYear() !== year) return
          const yymm = ym(d)
          const row = monthly.find((x) => x.month === yymm)
          const amt = (Number(t.amount) || 0) * share
          if (!row) return
          if (t.type === "income") row.income += amt
          else row.expense += amt
        })
      }
    }
    monthly.forEach((r) => (r.profit = r.income - r.expense))

    // ---------- Kirim juga detail instance untuk panel kelola ----------
    const instanceDetail = instances.map((inst) => ({
      id: inst.id,
      instanceName: inst.instanceName,
      incomeRecords: inst.incomeRecords || [],
      operationalCosts: inst.operationalCosts || [],
    }))

    return NextResponse.json({
      member: {
        id: String(investor.userId),
        name: investor.name,
        email: investor.email,
        phone: investor.phoneNumber || "",
        location: "",
        joinDate,
        totalInvestment,
        totalProfit,
        overallROI,
      },
      investments,
      pie,
      monthly,
      instances: instanceDetail,
      year,
    })
  } catch (e) {
    console.error("GET /api/investors/[id] rich error:", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
