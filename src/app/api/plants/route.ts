import { ensureConnection } from "@/lib/utils/utils/database"
import { PlantInstance } from "@/models"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    await ensureConnection()
    const plants = await PlantInstance.find({}).lean()
    return NextResponse.json(plants)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch plants" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureConnection()
    const body = await request.json()
    const plant = new PlantInstance(body)
    await plant.save()
    return NextResponse.json(plant, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create plant" }, { status: 500 })
  }
}
