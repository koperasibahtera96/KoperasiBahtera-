import { type NextRequest, NextResponse } from "next/server"
import { PlantInstance } from "@/models"
import { ensureConnection } from "@/lib/utils/utils/database";

export async function DELETE(request: NextRequest, { params }: { params: { id: string; costId: string } }) {
  try {
    console.log("[v0] DELETE cost API called with params:", params)
    console.log("[v0] Plant ID:", params.id, "Cost ID:", params.costId)

    await ensureConnection()

    const plant = await PlantInstance.findOneAndUpdate(
      { id: params.id },
      { $pull: { operationalCosts: { id: params.costId } } },
      { new: true },
    )

    console.log("[v0] Plant found:", !!plant)

    if (!plant) {
      console.log("[v0] Plant not found for ID:", params.id)
      return NextResponse.json({ error: "Plant not found" }, { status: 404 })
    }

    console.log("[v0] Cost record deleted successfully")
    return NextResponse.json({ message: "Cost record deleted successfully" })
  } catch (error) {
    console.error("[v0] Delete cost error:", error)
    return NextResponse.json({ error: "Failed to delete cost record" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string; costId: string } }) {
  try {
    console.log("[v0] PUT cost API called with params:", params)

    await ensureConnection()
    const body = await request.json()

    const plant = await PlantInstance.findOneAndUpdate(
      {
        id: params.id,
        "operationalCosts.id": params.costId,
      },
      {
        $set: {
          "operationalCosts.$.description": body.description,
          "operationalCosts.$.amount": body.amount,
          "operationalCosts.$.date": body.date,
          "operationalCosts.$.category": body.category,
          "operationalCosts.$.addedBy": body.addedBy || "admin",
          "operationalCosts.$.updatedAt": new Date().toISOString(),
        },
      },
      { new: true },
    )

    if (!plant) {
      console.log("[v0] Plant or cost record not found for ID:", params.id, params.costId)
      return NextResponse.json({ error: "Plant or cost record not found" }, { status: 404 })
    }

    const updatedRecord = plant.operationalCosts.find((record) => record.id === params.costId)
    console.log("[v0] Cost record updated successfully")
    return NextResponse.json(updatedRecord)
  } catch (error) {
    console.error("[v0] Update cost error:", error)
    return NextResponse.json({ error: "Failed to update cost record" }, { status: 500 })
  }
}
