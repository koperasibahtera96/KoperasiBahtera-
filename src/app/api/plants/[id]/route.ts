import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Plant from "@/models/Plant"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log(`[v0] Fetching plant ${id} from MongoDB...`)
    await dbConnect()
    const plant = await Plant.findOne({ id: Number.parseInt(id) })

    if (!plant) {
      console.log(`[v0] Plant ${id} not found in MongoDB`)
      return NextResponse.json({ error: "Plant not found" }, { status: 404 })
    }

    console.log(`[v0] Found plant ${id} in MongoDB`)
    return NextResponse.json(plant)
  } catch (error) {
    console.error(`[v0] Error reading plant from MongoDB:`, error)
    return NextResponse.json({ error: "Failed to fetch plant" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const updatedPlant = await request.json()
    console.log("[v0] API received plant data for MongoDB update:", JSON.stringify(updatedPlant, null, 2))

    await dbConnect()

    const plant = await Plant.findOneAndUpdate({ id: Number.parseInt(id) }, updatedPlant, {
      new: true,
      runValidators: true,
    })

    if (!plant) {
      console.log(`[v0] Plant ${id} not found in MongoDB for update`)
      return NextResponse.json({ error: "Plant not found" }, { status: 404 })
    }

    console.log("[v0] Plant updated successfully in MongoDB:", JSON.stringify(plant, null, 2))
    return NextResponse.json(plant)
  } catch (error) {
    console.error("[v0] Error updating plant in MongoDB:", error)
    return NextResponse.json({ error: "Failed to update plant" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log(`[v0] Deleting plant ${id} from MongoDB...`)
    await dbConnect()

    const plant = await Plant.findOneAndDelete({ id: Number.parseInt(id) })

    if (!plant) {
      console.log(`[v0] Plant ${id} not found in MongoDB for deletion`)
      return NextResponse.json({ error: "Plant not found" }, { status: 404 })
    }

    console.log(`[v0] Plant ${id} deleted successfully from MongoDB`)
    return NextResponse.json({ message: "Plant deleted successfully" })
  } catch (error) {
    console.error(`[v0] Error deleting plant from MongoDB:`, error)
    return NextResponse.json({ error: "Failed to delete plant" }, { status: 500 })
  }
}
