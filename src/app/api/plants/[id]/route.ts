import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance, User } from "@/models";
import { Types } from "mongoose";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const { id } = await params;
    const plant = await PlantInstance.findOne({ id });
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    // Get all unique user IDs from history entries
    const userIds = [
      ...new Set(
        plant.history?.map((item: any) => item.addedBy).filter((id: any) => id)
      ),
    ] as string[];

    console.log(userIds, "user id unique");

    // Fetch user data for all user IDs
    const users = await User.find({
      _id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
    }).select("_id fullName name");
    const userMap = new Map(
      users.map((user) => [
        user._id.toString(),
        user.fullName || user.name || "Unknown User",
      ])
    );

    // Replace addedBy UUIDs with user names in history
    if (plant.history) {
      plant.history = plant.history.map((item: any) => ({
        ...item,
        addedBy: userMap.get(item.addedBy) || item.addedBy || "Unknown User",
      }));
    }

    return NextResponse.json(plant);
  } catch (error) {
    console.log(error, "fetching plant detail");
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
