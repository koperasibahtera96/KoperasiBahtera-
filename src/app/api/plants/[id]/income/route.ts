// src/app/api/plants/[id]/income/route.ts
import { ensureConnection, generateUniqueId } from "@/lib/utils/utils/database";
import { PlantInstance } from "@/models";
import { Types } from "mongoose";
import { type NextRequest, NextResponse } from "next/server";

// Helper agar kompatibel Next 14 & 15 (params bisa object atau Promise)
async function getId(
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  const p = (ctx as any).params;
  return "then" in p ? (await p).id : p.id;
}

// ---------- POST: tambah pemasukan ----------
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const id = await getId(ctx);
    console.log(id, "id");

    const body = await request.json();
    const incomeId = await generateUniqueId("income-");

    const newIncome = {
      id: incomeId,
      date: body.date,
      description: body.description,
      amount: body.amount,
      addedBy: body.addedBy || "admin",
      addedAt: new Date().toISOString(),
    };

    const plant = await PlantInstance.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { $push: { incomeRecords: newIncome } },
      { new: true }
    );

    if (!plant)
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });

    return NextResponse.json(newIncome, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to add income record" },
      { status: 500 }
    );
  }
}

// ---------- DELETE: hapus pemasukan (by incomeId di query) ----------
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection();
    const id = await getId(ctx);

    const { searchParams } = new URL(request.url);
    const incomeId = searchParams.get("incomeId");
    if (!incomeId) {
      return NextResponse.json(
        { error: "Income ID is required" },
        { status: 400 }
      );
    }

    const plant = await PlantInstance.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { $pull: { incomeRecords: { id: incomeId } } },
      { new: true }
    );

    if (!plant)
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });

    return NextResponse.json({ message: "Income record deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete income record" },
      { status: 500 }
    );
  }
}

// ---------- GET: list pemasukan (paging + filter bulan) ----------
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
    if (!plant)
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });

    let incomeRecords: any[] = plant.incomeRecords || [];

    if (monthFilter) {
      incomeRecords = incomeRecords.filter((record) => {
        const d = new Date(record.date);
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        return mm === monthFilter;
      });
    }

    const sorted = incomeRecords.sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );

    const paginated = sorted.slice(skip, skip + limit);
    const totalRecords = incomeRecords.length;
    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      records: paginated,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch income records" },
      { status: 500 }
    );
  }
}
