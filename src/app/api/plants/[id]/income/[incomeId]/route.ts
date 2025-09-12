import { authOptions } from "@/lib/auth";
import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";
import { getServerSession } from "next-auth/next";
import { Types } from "mongoose";
import { type NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; incomeId: string }> }
) {
  try {
    // Check session and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prevent staff-finance from deleting income
    if (session.user.role === 'staff_finance') {
      return NextResponse.json({ error: "Forbidden: Staff Finance cannot delete income" }, { status: 403 });
    }

    const { id, incomeId } = await params;
    console.log("[v0] DELETE income API called with params:", params);
    console.log("[v0] Plant ID:", id, "Income ID:", incomeId);

    await ensureConnection();

    const plant = await PlantInstance.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { $pull: { incomeRecords: { id: incomeId } } },
      { new: true }
    );

    console.log("[v0] Plant found:", !!plant);

    if (!plant) {
      console.log("[v0] Plant not found for ID:", id);
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    console.log("[v0] Income record deleted successfully");
    return NextResponse.json({ message: "Income record deleted successfully" });
  } catch (error) {
    console.error("[v0] Delete income error:", error);
    return NextResponse.json(
      { error: "Failed to delete income record" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; incomeId: string }> }
) {
  try {
    // Check session and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prevent staff-finance from updating income
    if (session.user.role === 'staff_finance') {
      return NextResponse.json({ error: "Forbidden: Staff Finance cannot update income" }, { status: 403 });
    }

    const { id, incomeId } = await params;
    console.log("[v0] PUT income API called with params:", params);

    await ensureConnection();
    const body = await request.json();

    const plant = await PlantInstance.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        "incomeRecords.id": incomeId,
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
      { new: true }
    );

    if (!plant) {
      console.log(
        "[v0] Plant or income record not found for ID:",
        id,
        incomeId
      );
      return NextResponse.json(
        { error: "Plant or income record not found" },
        { status: 404 }
      );
    }

    const updatedRecord = plant.incomeRecords.find(
      (record: any) => record.id === incomeId
    );
    console.log("[v0] Income record updated successfully");
    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("[v0] Update income error:", error);
    return NextResponse.json(
      { error: "Failed to update income record" },
      { status: 500 }
    );
  }
}
