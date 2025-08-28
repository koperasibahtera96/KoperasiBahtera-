// src/app/api/finance/summary/route.ts
import { NextResponse } from "next/server"
import { ensureConnection } from "@/lib/utils/utils/database"
import { Investor, PlantInstance, PlantType, Transaction } from "@/models"

type NumMap = Record<string, number>

const slug = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

export async function GET() {
  try {
    await ensureConnection()

    // ---------- 1) INVESTOR + INVESTMENTS ----------
    const investors = await Investor.find({}).lean()
    const allInvestments = investors
      .flatMap((inv: any) =>
        (inv.investments ?? []).map((r: any) => ({
          userId: String(inv.userId ?? inv._id ?? ""),
          amount: Number(r.totalAmount ?? r.amount) || 0,
          // `productName` = kode instance: ex "gaharu-001"
          plantInstanceCode: String(r.productName ?? r.plantInstanceId ?? ""),
        })),
      )
      .filter((x: any) => x.plantInstanceCode)

    if (allInvestments.length === 0) {
      return NextResponse.json({
        totalInvestment: 0,
        totalProfit: 0,
        roi: 0,
        investorsCount: investors.length,
        averageRoi: 0,
        aum: 0,
        distribution: [],
        topPlantTypes: [],
      })
    }

    // ---------- 2) INSTANCES ----------
    const instCodes = Array.from(new Set(allInvestments.map((r) => r.plantInstanceCode)))
    const instances = await PlantInstance.find({ id: { $in: instCodes } }).lean()
    const instByCode = new Map<string, any>()
    instances.forEach((p: any) => instByCode.set(String(p.id), p))

    // ---------- 3) INCOME/EXPENSE ----------
    const tx = await Transaction.find({ plantInstanceId: { $in: instCodes } }).lean()
    const incomeTx: NumMap = {}
    const expenseTx: NumMap = {}
    tx.forEach((t: any) => {
      const key = String(t.plantInstanceId)
      const amt = Number(t.amount) || 0
      if (t.type === "income") incomeTx[key] = (incomeTx[key] || 0) + amt
      else expenseTx[key] = (expenseTx[key] || 0) + amt
    })

    const netByInst: NumMap = {}
    instances.forEach((inst: any) => {
      const code = String(inst.id)
      const inc = Array.isArray(inst.incomeRecords)
        ? inst.incomeRecords.reduce((s: number, v: any) => s + (Number(v.amount) || 0), 0)
        : 0
      const exp = Array.isArray(inst.operationalCosts)
        ? inst.operationalCosts.reduce((s: number, v: any) => s + (Number(v.amount) || 0), 0)
        : 0
      const hasEmbedded = (inc || exp) > 0
      const totalIncome = hasEmbedded ? inc : (incomeTx[code] || 0)
      const totalExpense = hasEmbedded ? exp : (expenseTx[code] || 0)
      netByInst[code] = totalIncome - totalExpense
    })

    // Total invest per instance (akumulasi semua investor pada instance tsb)
    const totalInvestByInst: NumMap = {}
    allInvestments.forEach((r) => {
      totalInvestByInst[r.plantInstanceCode] =
        (totalInvestByInst[r.plantInstanceCode] || 0) + r.amount
    })

    // ---------- 4) MAP PLANT TYPE ----------
    const typeKeyOfInst: Record<string, string> = {} // code -> typeKey
    const typeNameOfKey: Record<string, string> = {} // typeKey -> name

    const candIds = new Set<string>()
    const candCodes = new Set<string>()
    const candNames = new Set<string>()
    instances.forEach((inst: any) => {
      if (inst.plantTypeId) candIds.add(String(inst.plantTypeId))
      if (inst.plantType) candCodes.add(String(inst.plantType))
      if (inst.plantTypeName) candNames.add(String(inst.plantTypeName))
    })

    const types = await PlantType.find({
      $or: [
        { _id: { $in: Array.from(candIds) } as any },
        { id: { $in: Array.from(candCodes) } as any },
        { name: { $in: Array.from(candNames) } as any },
      ],
    }).lean()

    const indexType = new Map<string, any>()
    types.forEach((t: any) => {
      indexType.set(String(t._id), t)
      if (t.id) indexType.set(String(t.id), t)
      if (t.name) indexType.set(String(t.name), t)
    })

    instances.forEach((inst: any) => {
      const code = String(inst.id)
      const keys = [
        String(inst.plantTypeId ?? ""),
        String(inst.plantType ?? ""),
        String(inst.plantTypeName ?? ""),
      ].filter(Boolean)

      let pick = ""
      let label = ""
      for (const k of keys) {
        if (indexType.has(k)) {
          const t = indexType.get(k)
          pick = String(t._id ?? t.id ?? slug(t.name))
          label = String(t.name ?? t.id ?? k)
          break
        }
      }
      if (!pick) {
        pick = slug(keys[0] || "lainnya")
        label = keys[0] || "Lainnya"
      }
      typeKeyOfInst[code] = pick
      typeNameOfKey[pick] = label
    })

    // ---------- 5) TOTALS (overall & AUM) ----------
    let totalInvestment = 0
    let totalProfit = 0
    allInvestments.forEach((r) => {
      totalInvestment += r.amount
      const plantTotal = totalInvestByInst[r.plantInstanceCode] || 0
      const share = plantTotal > 0 ? r.amount / plantTotal : 0
      totalProfit += (netByInst[r.plantInstanceCode] || 0) * share
    })
    const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0
    const aum = totalInvestment // <— Total AUM

    // ---------- 6) DISTRIBUSI & TOP TYPES ----------
    const sumInvestByType: NumMap = {}
    const sumProfitByType: NumMap = {}
    const treeCountByType: NumMap = {}
    const activeInvestorByType = new Map<string, Set<string>>()

    instances.forEach((inst: any) => {
      const typeKey = typeKeyOfInst[String(inst.id)]
      if (!typeKey) return
      const trees = Number(inst.treeCount) || 1
      treeCountByType[typeKey] = (treeCountByType[typeKey] || 0) + trees
    })

    allInvestments.forEach((r) => {
      const typeKey = typeKeyOfInst[r.plantInstanceCode]
      if (!typeKey) return
      sumInvestByType[typeKey] = (sumInvestByType[typeKey] || 0) + r.amount
      const plantTotal = totalInvestByInst[r.plantInstanceCode] || 0
      const share = plantTotal > 0 ? r.amount / plantTotal : 0
      sumProfitByType[typeKey] =
        (sumProfitByType[typeKey] || 0) + (netByInst[r.plantInstanceCode] || 0) * share
      if (!activeInvestorByType.has(typeKey)) activeInvestorByType.set(typeKey, new Set<string>())
      activeInvestorByType.get(typeKey)!.add(r.userId)
    })

    const typeKeys = Array.from(
      new Set(Object.keys(sumInvestByType).concat(Object.keys(treeCountByType))),
    )

    const distribution = typeKeys.map((k) => ({
      name: typeNameOfKey[k] || k,
      value: sumInvestByType[k] || 0,
    }))

    const topPlantTypes = typeKeys
      .map((k) => {
        const invest = sumInvestByType[k] || 0
        const profit = sumProfitByType[k] || 0
        const roiType = invest > 0 ? (profit / invest) * 100 : 0
        return {
          plantTypeId: k,
          plantTypeName: typeNameOfKey[k] || k,
          totalInvestment: invest,
          paidProfit: profit,
          roi: roiType,
          treeCount: treeCountByType[k] || 0,
          activeInvestors: Array.from(activeInvestorByType.get(k) ?? []).length,
        }
      })
      .sort((a, b) => b.totalInvestment - a.totalInvestment)

    // ---------- 7) ROI RATA-RATA ----------
    // rata-rata aritmetik ROI per INSTANSI (instance) yang punya investasi
    let roiSum = 0
    let roiCnt = 0
    Object.keys(totalInvestByInst).forEach((code) => {
      const inv = totalInvestByInst[code] || 0
      if (inv > 0) {
        const net = netByInst[code] || 0
        roiSum += (net / inv) * 100
        roiCnt += 1
      }
    })
    const averageRoi = roiCnt > 0 ? roiSum / roiCnt : 0

    return NextResponse.json({
      totalInvestment,
      totalProfit,
      roi,
      investorsCount: investors.length,
      averageRoi, // <—
      aum,        // <—
      distribution,
      topPlantTypes,
    })
  } catch (e) {
    console.error("Finance summary error:", e)
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 })
  }
}
