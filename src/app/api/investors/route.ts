import { ensureConnection } from "@/lib/utils/utils/database"
import { Investor, PlantInstance, Transaction } from "@/models"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    await ensureConnection()
    const { searchParams } = new URL(req.url)
    const format = searchParams.get("format")

    const investors = await Investor.find({}).lean()
    if (format !== "membersLike") {
      return NextResponse.json(investors)
      // raw investors
    }

    // Siapkan mapping untuk plantName + profit per instance
    const allProducts = new Set<string>()
    investors.forEach((inv) => (inv.investments ?? []).forEach((r) => r?.productName && allProducts.add(r.productName)))
    const productArr = Array.from(allProducts)

    const [instances, txs] = await Promise.all([
      PlantInstance.find({ id: { $in: productArr } }).lean(),
      Transaction.find({ plantInstanceId: { $in: productArr } }).lean(),
    ])

    const idToInstanceName: Record<string, string> = {}
    instances.forEach((inst) => (idToInstanceName[inst.id] = inst.instanceName))

    const profitByInstance: Record<string, number> = {}
    txs.forEach((t) => {
      const k = t.plantInstanceId
      const amt = Number(t.amount) || 0
      profitByInstance[k] = (profitByInstance[k] || 0) + (t.type === "income" ? amt : -amt)
    })

    // Bentuk seperti type Member (lama) untuk kompatibilitas Excel
    const membersLike = investors.map((inv) => {
      const joinDate =
        inv.investments?.length
          ? new Date(
              Math.min(
                ...inv.investments.map((r: any) => new Date(r.investmentDate || Date.now()).getTime()),
              ),
            ).toISOString().split("T")[0]
          : ""

      const investments = (inv.investments ?? []).map((r: any) => {
        const plantId = r.productName
        const plantName = idToInstanceName[plantId] || plantId
        const amount = Number(r.totalAmount) || 0
        const profit = profitByInstance[plantId] || 0
        const roi = amount > 0 ? (profit / amount) * 100 : 0
        const investDate = r.investmentDate
          ? new Date(r.investmentDate).toISOString().split("T")[0]
          : ""

        return {
          plantId,
          plantName,
          amount,
          profit,
          roi,
          investDate,
          totalUang: amount, // menjaga kompatibilitas lama
        }
      })

      const totalInvestment = investments.reduce((x, it) => x + it.amount, 0)
      const totalProfit = investments.reduce((x, it) => x + it.profit, 0)
      const overallROI = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0

      return {
        id: String(inv.userId || inv._id),
        name: inv.name,
        email: inv.email,
        phone: inv.phoneNumber || "",
        location: "", // tidak ada di schema investor → kosongkan
        joinDate,
        investments,
        totalInvestment,
        totalProfit,
        overallROI,
      }
    })

    return NextResponse.json(membersLike)
  } catch (err) {
    console.error("Investors API error:", err)
    return NextResponse.json({ error: "Failed to fetch investors" }, { status: 500 })
  }
}
