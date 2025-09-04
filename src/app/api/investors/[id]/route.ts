import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { ensureConnection } from "@/lib/utils/utils/database"
import { Investor, PlantInstance } from "@/models"

/** util angka aman */
const num = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0
const getAmount = (iv: any) =>
  num(iv?.totalAmount ?? iv?.amountPaid ?? iv?.amount ?? iv?.invested ?? 0)

const netProfitOf = (p: any) => {
  const inc = (p?.incomeRecords ?? []).reduce((s: number, r: any) => s + num(r?.amount), 0)
  const exp = (p?.operationalCosts ?? []).reduce((s: number, r: any) => s + num(r?.amount), 0)
  return inc - exp
}

const ymd = (d: string | Date) => {
  const dd = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(dd.getTime())) return ""
  return dd.toISOString().slice(0, 10)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection()

    const { id } = await params
    const url = new URL(req.url)
    const wantRich = (url.searchParams.get("format") || "").toLowerCase() === "rich"
    const year = Number(url.searchParams.get("year")) || new Date().getFullYear()

    // --- cari investor: by _id, lalu fallback userId ---
    let investor: any = null
    if (mongoose.isValidObjectId(id)) {
      investor = await Investor.findById(id).lean()
    }
    if (!investor) {
      investor = await Investor.findOne({ userId: id }).lean()
    }
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 })
    }

    // Ambil semua investor & semua plant untuk bagi hasil proporsional
    const [allInvestors, plants] = await Promise.all([
      Investor.find({}).lean(),
      PlantInstance.find({}).lean(),
    ])

    // total investasi semua investor per instance
    const totalInvestByInstance = new Map<string, number>()
    for (const inv of allInvestors) {
      for (const iv of inv?.investments ?? []) {
        const pid = String(iv?.plantInstanceId ?? iv?.instanceId ?? "")
        if (!pid) continue
        totalInvestByInstance.set(pid, (totalInvestByInstance.get(pid) || 0) + getAmount(iv))
      }
    }

    // peta plantIndex
    const plantById = new Map<string, any>()
    for (const p of plants) {
      const pid = String(p?._id ?? p?.id ?? "")
      if (pid) plantById.set(pid, p)
    }

    // --------- Bentuk respons sederhana (tanpa format=rich) ---------
    if (!wantRich) {
      const ivs = Array.isArray(investor?.investments) ? investor.investments : []
      let totalProfit = 0

      const investments = ivs.map((iv: any) => {
        const pid = String(iv?.plantInstanceId ?? iv?.instanceId ?? "")
        const amount = getAmount(iv)
        const p = plantById.get(pid)
        const net = p ? netProfitOf(p) : 0
        const totalInst = totalInvestByInstance.get(pid) || 0
        const share = totalInst > 0 ? amount / totalInst : 0
        const profit = net * share
        totalProfit += profit

        return {
          plantInstanceId: pid,
          plantInstanceName: p?.instanceName ?? iv?.productName ?? iv?.plantName ?? "—",
          amount,
          profit,
          roi: amount > 0 ? (profit / amount) * 100 : 0,
          investmentDate: String(iv?.investmentDate ?? iv?.createdAt ?? ""),
        }
      })

      const totalInvestment =
        num(investor?.totalInvestasi) ||
        investments.reduce((s: number, x: any) => s + num(x.amount), 0)

      return NextResponse.json({
        id: String(investor?._id ?? investor?.id ?? ""),
        name: investor?.name ?? "",
        email: investor?.email ?? "",
        phoneNumber: investor?.phoneNumber ?? "",
        totalInvestment: Math.round(totalInvestment),
        totalProfit: Math.round(totalProfit),
        overallROI: totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0,
        investments,
      })
    }

    // --------- format=rich (dipakai halaman /anggota/[id]) ---------
    const invs = Array.isArray(investor?.investments) ? investor.investments : []

    // a) daftar investasi + total profit
    let totalProfit = 0
    const investments = invs.map((iv: any) => {
      const pid = String(iv?.plantInstanceId ?? iv?.instanceId ?? "")
      const amount = getAmount(iv)
      const p = plantById.get(pid)
      const net = p ? netProfitOf(p) : 0
      const totalInst = totalInvestByInstance.get(pid) || 0
      const share = totalInst > 0 ? amount / totalInst : 0
      const profit = net * share
      totalProfit += profit
      return {
        plantId: pid,
        plantName: p?.instanceName ?? iv?.productName ?? iv?.plantName ?? "—",
        amount,
        profit,
        roi: amount > 0 ? (profit / amount) * 100 : 0,
        investDate: String(iv?.investmentDate ?? iv?.createdAt ?? ""),
      }
    })

    const totalInvestment =
      num(investor?.totalInvestasi) ||
      investments.reduce((s, x) => s + num(x.amount), 0)

    // b) pie = distribusi investasi berdasarkan nominal
    const pie = investments.map((iv) => ({
      name: iv.plantName,
      value: iv.amount,
    }))

    // c) monthly untuk tahun tertentu → alokasikan pemasukan/pengeluaran per share
    const monthlyMap: Record<string, { income: number; expense: number }> = {}
    const mmKey = (m: number) => `${year}-${String(m).padStart(2, "0")}`

    // init 12 bulan
    for (let m = 1; m <= 12; m++) {
      monthlyMap[mmKey(m)] = { income: 0, expense: 0 }
    }

    for (const iv of invs) {
      const pid = String(iv?.plantInstanceId ?? iv?.instanceId ?? "")
      const amount = getAmount(iv)
      if (!pid || !amount) continue
      const p = plantById.get(pid)
      const totalInst = totalInvestByInstance.get(pid) || 0
      const share = totalInst > 0 ? amount / totalInst : 0
      if (!p) continue

      for (const r of p?.incomeRecords ?? []) {
        const d = new Date(r?.date)
        if (Number.isNaN(d.getTime()) || d.getFullYear() !== year) continue
        const key = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`
        monthlyMap[key].income += num(r?.amount) * share
      }
      for (const r of p?.operationalCosts ?? []) {
        const d = new Date(r?.date)
        if (Number.isNaN(d.getTime()) || d.getFullYear() !== year) continue
        const key = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`
        monthlyMap[key].expense += num(r?.amount) * share
      }
    }

    const monthly = Object.entries(monthlyMap)
      .sort((a, b) => a[0] < b[0] ? -1 : 1)
      .map(([month, v]) => ({
        month,
        income: Math.round(v.income),
        expense: Math.round(v.expense),
        profit: Math.round(v.income - v.expense),
      }))

    // d) daftar instances minimal (untuk dropdown pilih tanaman)
    const instances = invs.map((iv: any) => {
      const pid = String(iv?.plantInstanceId ?? iv?.instanceId ?? "")
      const p = plantById.get(pid)
      return {
        id: pid,
        instanceName: p?.instanceName ?? iv?.productName ?? iv?.plantName ?? "—",
        incomeRecords: (p?.incomeRecords ?? [])
          .filter((r: any) => new Date(r?.date).getFullYear() === year)
          .map((r: any) => ({
            id: String(r?.id ?? r?._id ?? crypto.randomUUID()),
            date: ymd(r?.date),
            description: String(r?.description ?? ""),
            amount: num(r?.amount),
            addedBy: r?.addedBy ?? "",
          })),
        operationalCosts: (p?.operationalCosts ?? [])
          .filter((r: any) => new Date(r?.date).getFullYear() === year)
          .map((r: any) => ({
            id: String(r?.id ?? r?._id ?? crypto.randomUUID()),
            date: ymd(r?.date),
            description: String(r?.description ?? ""),
            amount: num(r?.amount),
            addedBy: r?.addedBy ?? "",
          })),
      }
    })

    const member = {
      id: String(investor?._id ?? investor?.id ?? ""),
      name: investor?.name ?? "",
      email: investor?.email ?? "",
      phone: investor?.phoneNumber ?? "",
      location: investor?.location ?? "",
      joinDate: investor?.createdAt ? ymd(investor.createdAt) : "",
      totalInvestment: Math.round(totalInvestment),
      totalProfit: Math.round(totalProfit),
      overallROI: totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0,
    }

    return NextResponse.json({
      member,
      investments,
      pie,
      monthly,
      instances,
      year,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch investor" }, { status: 500 })
  }
}
