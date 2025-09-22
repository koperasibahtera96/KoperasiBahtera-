import { NextResponse } from "next/server";
import { ensureConnection } from "@/lib/utils/database"; // sesuaikan jika path beda
import { PlantInstance } from "@/models";

type UpdateItem = {
  instanceId: string;
  income?: number;
  expense?: number;
  note?: string;
};

// generator id simple
function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// terima { updates: [...] } atau langsung array [...]
function parseUpdates(body: any): UpdateItem[] {
  if (Array.isArray(body)) return body as UpdateItem[];
  if (Array.isArray(body?.updates)) return body.updates as UpdateItem[];
  return [];
}

export async function POST(req: Request) {
  try {
    await ensureConnection();

    const body = await req.json();
    const updates = parseUpdates(body);

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "updates harus berupa array" },
        { status: 400 }
      );
    }

    let updated = 0;

    for (const u of updates) {
      const instanceId = String(u?.instanceId ?? "");
      const income = Number(u?.income ?? 0);
      const expense = Number(u?.expense ?? 0);
      const note = String(u?.note ?? "Bulk input");

      if (!instanceId) continue;
      if (income <= 0 && expense <= 0) continue;

      const now = new Date();

      // bentuk record sesuai schema: WAJIB ada 'date'
      const $push: Record<string, any> = {};

      if (income > 0) {
        const incomeRecord = {
          id: makeId("INC"),
          date: now,            // ⬅️ WAJIB (fix error)
          amount: income,
          description: note,
          addedAt: now,
          addedBy: "bulk-finance",
        };
        $push.incomeRecords = { $each: [incomeRecord] };
      }

      if (expense > 0) {
        const costRecord = {
          id: makeId("EXP"),
          date: now,            // ⬅️ WAJIB (antisipasi schema sama)
          amount: expense,
          description: note,
          addedAt: now,
          addedBy: "bulk-finance",
        };
        $push.operationalCosts = { $each: [costRecord] };
      }

      const res = await PlantInstance.updateOne(
        { _id: instanceId },
        {
          $push,
          $set: { updatedAt: now },
        },
        { runValidators: true }
      );

      if (res.modifiedCount > 0) updated += 1;
    }

    return NextResponse.json({ success: true, updated });
  } catch (err: any) {
    console.error("[bulk-finance] error:", err);
    return NextResponse.json(
      {
        error: "Gagal memproses bulk-finance",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
