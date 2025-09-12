// src/app/api/plants/[id]/costs/route.ts
import { authOptions } from "@/lib/auth";
import { ensureConnection, generateUniqueId } from "@/lib/utils/database";
import { PlantInstance } from "@/models";
import { getServerSession } from "next-auth/next";
import { Types } from "mongoose";
import { type NextRequest, NextResponse } from "next/server";

// ---------- HELPERS ----------
async function getId(
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  const p = (ctx as any).params;
  return "then" in p ? (await p).id : p.id;
}

// ---------- POST: Add cost ----------
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    // Check session and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prevent staff-finance from adding costs
    if (session.user.role === 'staff_finance') {
      return NextResponse.json({ error: "Forbidden: Staff Finance cannot add costs" }, { status: 403 });
    }

    await ensureConnection();
    const id = await getId(ctx);
    const body = await request.json();

    const costId = await generateUniqueId("cost-");
    const newCost = {
      id: costId,
      date: body.date,
      description: body.description,
      amount: body.amount,
      addedBy: body.addedBy || "admin",
      addedAt: new Date().toISOString(),
    };

    const plant = await PlantInstance.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { $push: { operationalCosts: newCost } },
      { new: true }
    );

    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    return NextResponse.json(newCost, { status: 201 });
  } catch (error) {
    console.error("Error adding operational cost:", error);
    return NextResponse.json(
      { error: "Failed to add operational cost" },
      { status: 500 }
    );
  }
}

// ---------- DELETE: Remove a cost by costId query ----------
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    // Check session and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prevent staff-finance from deleting costs
    if (session.user.role === 'staff_finance') {
      return NextResponse.json({ error: "Forbidden: Staff Finance cannot delete costs" }, { status: 403 });
    }

    await ensureConnection();
    const id = await getId(ctx);

    const { searchParams } = new URL(request.url);
    const costId = searchParams.get("costId");
    if (!costId) {
      return NextResponse.json(
        { error: "Cost ID is required" },
        { status: 400 }
      );
    }

    const plant = await PlantInstance.findOne({ _id: new Types.ObjectId(id) });
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    await PlantInstance.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { $pull: { operationalCosts: { id: costId } } },
      { new: true }
    );

    return NextResponse.json({
      message: "Operational cost deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting operational cost:", error);
    return NextResponse.json(
      { error: "Failed to delete operational cost" },
      { status: 500 }
    );
  }
}

// ---------- GET: List costs (with paging & month filter) ----------
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const id = await getId(ctx);

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "6", 10);
    const monthFilter = searchParams.get("month");
    const skip = (page - 1) * limit;

    const plant = await PlantInstance.findOne({ _id: new Types.ObjectId(id) });
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    let operationalCosts = plant.operationalCosts || [];

    if (monthFilter) {
      operationalCosts = operationalCosts.filter((record: any) => {
        const recordDate = new Date(record.date);
        const recordMonth = String(recordDate.getMonth() + 1).padStart(2, "0");
        return recordMonth === monthFilter;
      });
    }

    const sortedCosts = operationalCosts.sort(
      (a: any, b: any) =>
        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );

    const paginatedCosts = sortedCosts.slice(skip, skip + limit);
    const totalRecords = operationalCosts.length;
    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      records: paginatedCosts,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching operational costs:", error);
    return NextResponse.json(
      { error: "Failed to fetch operational costs" },
      { status: 500 }
    );
  }
}
