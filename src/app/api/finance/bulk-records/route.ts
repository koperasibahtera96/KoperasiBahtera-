import { NextResponse } from "next/server";
import mongoose from "mongoose";
// ⬇️ sesuaikan dua import ini dengan struktur projectmu
import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";

type Body = {
  type: "income" | "expense";
  plantInstanceIds: string[];
  amount: number;
  date?: string;
  note?: string;      // dipakai utk description (income) — dari "catatan" UI
  category?: string;  // dipakai utk description (expense)
  createdBy?: string; // nama user (mis. member.name)
};

export async function POST(req: Request) {
  try {
    await ensureConnection();
    const body = (await req.json()) as Body;

    if (!body || !Array.isArray(body.plantInstanceIds)) {
      return NextResponse.json({ error: "plantInstanceIds wajib array" }, { status: 400 });
    }
    const ids = body.plantInstanceIds
      .filter((x) => typeof x === "string" && x.trim() && mongoose.Types.ObjectId.isValid(x))
      .map((x) => new mongoose.Types.ObjectId(x));

    if (ids.length === 0) {
      return NextResponse.json({ error: "Semua plantInstanceIds tidak valid" }, { status: 400 });
    }
    if (body.type !== "income" && body.type !== "expense") {
      return NextResponse.json({ error: "type harus 'income' atau 'expense'" }, { status: 400 });
    }
    if (typeof body.amount !== "number" || !isFinite(body.amount) || body.amount <= 0) {
      return NextResponse.json({ error: "amount harus angka > 0" }, { status: 400 });
    }

    const when = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
    }

    const nowISO = new Date().toISOString();
    // description: ambil dari note (income) atau category (expense)
    const description =
      (body.type === "income" ? body.note : (body.category ?? body.note))?.trim() || "";

    const common = {
      amount: body.amount,
      date: when.toISOString(),
      description,                 // ⬅️ disamakan dengan input manual
      addedBy: body.createdBy || "system",
      addedAt: nowISO,
      source: "bulk",
    };

    const update =
      body.type === "income"
        ? { $push: { incomeRecords: common } }
        : { $push: { operationalCosts: common } };

    const res = await PlantInstance.updateMany(
      { _id: { $in: ids } },
      update,
      { timestamps: false }
    );

    const anyRes: any = res;
    const matched = anyRes.matchedCount ?? anyRes.nMatched ?? 0;
    const modified = anyRes.modifiedCount ?? anyRes.nModified ?? 0;

    return NextResponse.json({
      ok: true,
      matched,
      modified,
      payload: { type: body.type, amount: body.amount, date: when.toISOString() },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
