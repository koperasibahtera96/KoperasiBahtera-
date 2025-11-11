import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";
import { type NextRequest, NextResponse } from "next/server";

// POST - Add new history entry (without overwriting existing history)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const { id } = await params;
    const body = await request.json();

    const { historyEntry, status, lastUpdate } = body;

    if (!historyEntry) {
      return NextResponse.json(
        { error: "History entry is required" },
        { status: 400 }
      );
    }

    // Use $push to add the new history entry to the beginning of the array
    // and $set to update status and lastUpdate
    // This prevents overwriting existing history entries and their approval statuses
    const plant = await PlantInstance.findOneAndUpdate(
      { id },
      {
        $push: {
          history: {
            $each: [historyEntry],
            $position: 0, // Add to the beginning of the array
          },
        },
        $set: {
          status: status,
          lastUpdate: lastUpdate,
        },
      },
      { new: true }
    );

    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    return NextResponse.json(plant);
  } catch (error) {
    console.error("Error adding plant history:", error);
    return NextResponse.json(
      { error: "Failed to add plant history" },
      { status: 500 }
    );
  }
}

// PATCH - Update a specific history entry by id (without overwriting other history entries)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const { id } = await params;
    const body = await request.json();

    const { historyId, updates } = body;

    if (!historyId || !updates) {
      return NextResponse.json(
        { error: "historyId and updates are required" },
        { status: 400 }
      );
    }

    // Use positional operator $ to update only the matching history entry
    // First, find the index of the history entry we want to update
    const plant = await PlantInstance.findOne({ id });

    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    const historyIndex = plant.history?.findIndex((h: any) => h.id === historyId);

    if (historyIndex === -1 || historyIndex === undefined) {
      return NextResponse.json(
        { error: "History entry not found" },
        { status: 404 }
      );
    }

    // Build the update object with positional notation
    const updateFields: any = {};
    Object.keys(updates).forEach((key) => {
      updateFields[`history.${historyIndex}.${key}`] = updates[key];
    });

    // Update only the specific history entry
    const updatedPlant = await PlantInstance.findOneAndUpdate(
      { id },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedPlant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    return NextResponse.json(updatedPlant);
  } catch (error) {
    console.error("Error updating plant history:", error);
    return NextResponse.json(
      { error: "Failed to update plant history" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific history entry by id (without overwriting other history entries)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const historyId = searchParams.get("historyId");

    if (!historyId) {
      return NextResponse.json(
        { error: "historyId is required" },
        { status: 400 }
      );
    }

    // Use $pull to remove the specific history entry
    const plant = await PlantInstance.findOneAndUpdate(
      { id },
      {
        $pull: {
          history: { id: Number(historyId) },
        },
      },
      { new: true }
    );

    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    return NextResponse.json(plant);
  } catch (error) {
    console.error("Error deleting plant history:", error);
    return NextResponse.json(
      { error: "Failed to delete plant history" },
      { status: 500 }
    );
  }
}
