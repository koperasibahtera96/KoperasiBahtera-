// src/app/api/finance/extra/route.ts
import { NextResponse } from "next/server"
import mongoose, { Schema, model, models } from "mongoose"

/**
 * API ini mengembalikan:
 *  {
 *    contractsCount: number,               // jumlah plantInstances
 *    totalsByType: [                       // agregasi per jenis tanaman
 *      { name: string, totalIncome: number, totalExpenses: number }
 *    ]
 *  }
 *
 * Catatan:
 * - Supaya tidak ganggu codebase kamu, schema dibuat "loose" (strict:false)
 *   sehingga tetap jalan walau struktur field berbeda-beda.
 * - Menggunakan MONGODB_URI dari env. Tidak menyentuh util DB lain.
 */

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || ""

const PlantInstanceSchema = new Schema({}, { strict: false })
const PlantInstance =
  (models.PlantInstance as mongoose.Model<any>) ||
  model<any>("PlantInstance", PlantInstanceSchema, "plantinstances") // nama koleksi umum; jika koleksi kamu beda, set ENV PLANT_COLLECTION

async function connectMongo() {
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI")
  if (mongoose.connection.readyState === 1) return
  await mongoose.connect(MONGODB_URI)
}

export async function GET() {
  try {
    await connectMongo()

    // Ambil semua instance, hanya field yang kita perlu supaya ringan
    const docs: any[] = await PlantInstance.find(
      {},
      {
        plantType: 1,
        plantTypeName: 1,
        instanceName: 1,
        incomeRecords: 1,
        operationalCosts: 1,
      }
    ).lean()

    const contractsCount = docs.length

    // Kelompokkan per jenis (pakai plantTypeName || plantType)
    const map = new Map<
      string,
      { name: string; totalIncome: number; totalExpenses: number }
    >()

    for (const d of docs) {
      const rawName =
        (d.plantTypeName && String(d.plantTypeName)) ||
        (d.plantType && String(d.plantType)) ||
        "Unknown"

      // Normalisasi nama agar konsisten (Alpukat, Gaharu, Aren, Jengkol)
      const n = rawName.toLowerCase()
      const name =
        n.includes("alpukat")
          ? "Alpukat"
          : n.includes("gaharu")
          ? "Gaharu"
          : n.includes("aren")
          ? "Aren"
          : n.includes("jengkol")
          ? "Jengkol"
          : rawName

      if (!map.has(name)) map.set(name, { name, totalIncome: 0, totalExpenses: 0 })

      const bucket = map.get(name)!

      // incomeRecords: [{ amount: number }]
      const incomes = Array.isArray(d.incomeRecords) ? d.incomeRecords : []
      for (const inc of incomes) {
        const v = Number(inc?.amount ?? 0)
        if (Number.isFinite(v)) bucket.totalIncome += v
      }

      // operationalCosts: [{ amount: number }]
      const costs = Array.isArray(d.operationalCosts) ? d.operationalCosts : []
      for (const cs of costs) {
        const v = Number(cs?.amount ?? 0)
        if (Number.isFinite(v)) bucket.totalExpenses += v
      }
    }

    const totalsByType = Array.from(map.values())

    return NextResponse.json({ contractsCount, totalsByType })
  } catch (err: any) {
    console.error("[finance/extra] error:", err)
    return NextResponse.json(
      { error: "failed", message: err?.message || "unknown error" },
      { status: 500 }
    )
  }
}
