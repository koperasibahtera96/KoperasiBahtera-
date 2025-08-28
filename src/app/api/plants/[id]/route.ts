import { type NextRequest, NextResponse } from "next/server"
import { PlantInstance } from "@/models"
import { ensureConnection } from "@/lib/utils/utils/database"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureConnection()
    const plant = await PlantInstance.findOne({ id: params.id }).lean()
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 })
    }
    return NextResponse.json(plant)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch plant" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureConnection()
    const body = await request.json()
    const plant = await PlantInstance.findOneAndUpdate({ id: params.id }, body, { new: true })
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 })
    }
    return NextResponse.json(plant)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update plant" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureConnection()
    const plant = await PlantInstance.findOneAndDelete({ id: params.id })
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 })
    }
    return NextResponse.json({ message: "Plant deleted successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete plant" }, { status: 500 })
  }
}
