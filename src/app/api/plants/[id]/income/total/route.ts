import { NextResponse } from "next/server";
import mongoose from "mongoose";
// sesuaikan impor di bawah ini dengan projectmu
import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureConnection();
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const url = new URL(_req.url);
    const month = url.searchParams.get("month"); // "YYYY-MM" (opsional)

    const proj = await PlantInstance.findById(id, { incomeRecords: 1 }).lean();
    if (!proj) return NextResponse.json({ total: 0 });

    const total = (proj.incomeRecords || [])
      .filter((r: any) =>
        month ? String(r.date).slice(0, 7) === month : true
      )
      .reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);

    return NextResponse.json({ total });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
