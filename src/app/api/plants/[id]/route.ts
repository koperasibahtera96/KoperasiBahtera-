import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const plant = await PlantInstance.findOne({ id: (await params).id }).lean();
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }
    return NextResponse.json(plant);
  } catch (error) {
    console.error("Error fetching plant:", error);
    return NextResponse.json(
      { error: "Failed to fetch plant" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const body = await request.json();
    const plant = await PlantInstance.findOneAndUpdate(
      { id: (await params).id },
      body,
      { new: true }
    );
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }
    return NextResponse.json(plant);
  } catch (error) {
    console.error("Error updating plant:", error);
    return NextResponse.json(
      { error: "Failed to update plant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const plant = await PlantInstance.findOneAndDelete({
      id: (await params).id,
    });
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Plant deleted successfully" });
  } catch (error) {
    console.error("Error deleting plant:", error);
    return NextResponse.json(
      { error: "Failed to delete plant" },
      { status: 500 }
    );
  }
}
