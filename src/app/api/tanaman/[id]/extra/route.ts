// src/app/api/tanaman/[id]/extra/route.ts
import { NextResponse } from "next/server"
import mongoose, { Schema, model, models } from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || ""

// skema longgar (tidak mengunci field) agar tidak ganggu struktur yang sudah ada
const PlantInstanceSchema = new Schema({}, { strict: false })
const UserSchema = new Schema({}, { strict: false })

const PlantInstance =
  (models.PlantInstance as mongoose.Model<any>) ||
  model<any>("PlantInstance", PlantInstanceSchema, "plantinstances")

const User =
  (models.User as mongoose.Model<any>) ||
  model<any>("User", UserSchema, "users")

async function connectMongo() {
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI")
  if (mongoose.connection.readyState === 1) return
  await mongoose.connect(MONGODB_URI)
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    await connectMongo()
    const rawId = decodeURIComponent(ctx.params.id || "").toLowerCase().trim()

    // cari berdasarkan plantTypeName / plantType yang mengandung [id]
    const instances: any[] = await PlantInstance.find(
      {
        $or: [
          { plantTypeName: { $regex: rawId, $options: "i" } },
          { plantType: { $regex: rawId, $options: "i" } },
        ],
      },
      {
        memberId: 1,
        owner: 1,
        kavling: 1,
        plantType: 1,
        plantTypeName: 1,
      }
    ).lean()

    const contractsCount = instances.length

    // ambil user untuk no anggota
    const memberIds = Array.from(
      new Set(instances.map((x) => String(x.memberId || "")).filter(Boolean))
    )
    const users: any[] = memberIds.length
      ? await User.find(
          { _id: { $in: memberIds } },
          { memberCode: 1, userCode: 1, name: 1, email: 1 }
        ).lean()
      : []

    const userById = new Map<string, any>()
    users.forEach((u) => userById.set(String(u._id), u))

    // detail per pohon (satu baris per instance)
    const details = instances.map((ins, idx) => {
      const u = userById.get(String(ins.memberId))
      const noAnggota =
        u?.memberCode || u?.userCode || u?.user_code || u?.usercode || ""
      const namaInvestor =
        u?.name || ins.owner || u?.email || u?.username || "—"
      const kavling = ins?.kavling || ins?.blok || ins?.kodeBlok || ""

      return {
        idx,
        noAnggota,
        namaInvestor,
        kavling,
        memberId: String(ins.memberId || ""),
      }
    })

    return NextResponse.json({ contractsCount, details })
  } catch (err: any) {
    console.error("[tanaman/extra] error:", err)
    return NextResponse.json(
      { error: "failed", message: err?.message || "unknown error" },
      { status: 500 }
    )
  }
}
