import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Plant from "@/schemas/Plant"

export async function GET() {
  try {
    console.log("[v0] Fetching plants from MongoDB...")
    await connectDB()
    const plants = await Plant.find({}).sort({ id: 1 })
    console.log(`[v0] Found ${plants.length} plants in MongoDB`)
    return NextResponse.json(plants)
  } catch (error) {
    console.error("[v0] Error reading plants from MongoDB:", error)
    return NextResponse.json({ error: "Failed to fetch plants" }, { status: 500 })
  }
}
