import { type NextRequest, NextResponse } from "next/server"
import { PlantInstance } from "@/models"
import { ensureConnection } from "@/lib/utils/utils/database";

export async function DELETE(request: NextRequest, { params }: { params: { id: string; incomeId: string } }) {
  try {
    console.log("[v0] DELETE income API called with params:", params)
    console.log("[v0] Plant ID:", params.id, "Income ID:", params.incomeId)

    await ensureConnection()

    const plant = await PlantInstance.findOneAndUpdate(
      { id: params.id },
      { $pull: { incomeRecords: { id: params.incomeId } } },
      { new: true },
    )

    console.log("[v0] Plant found:", !!plant)

    if (!plant) {
      console.log("[v0] Plant not found for ID:", params.id)
      return NextResponse.json({ error: "Plant not found" }, { status: 404 })
    }

    console.log("[v0] Income record deleted successfully")
    return NextResponse.json({ message: "Income record deleted successfully" })
  } catch (error) {
    console.error("[v0] Delete income error:", error)
    return NextResponse.json({ error: "Failed to delete income record" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string; incomeId: string } }) {
  try {
    console.log("[v0] PUT income API called with params:", params)

    await ensureConnection()
    const body = await request.json()

    const plant = await PlantInstance.findOneAndUpdate(
      {
        id: params.id,
        "incomeRecords.id": params.incomeId,
      },
      {
        $set: {
          "incomeRecords.$.description": body.description,
          "incomeRecords.$.amount": body.amount,
          "incomeRecords.$.date": body.date,
          "incomeRecords.$.addedBy": body.addedBy || "admin",
          "incomeRecords.$.updatedAt": new Date().toISOString(),
        },
      },
      { new: true },
    )

    if (!plant) {
      console.log("[v0] Plant or income record not found for ID:", params.id, params.incomeId)
      return NextResponse.json({ error: "Plant or income record not found" }, { status: 404 })
    }

    const updatedRecord = plant.incomeRecords.find((record) => record.id === params.incomeId)
    console.log("[v0] Income record updated successfully")
    return NextResponse.json(updatedRecord)
  } catch (error) {
    console.error("[v0] Update income error:", error)
    return NextResponse.json({ error: "Failed to update income record" }, { status: 500 })
  }
}
