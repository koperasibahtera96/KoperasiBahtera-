import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { ensureConnection } from "@/lib/utils/database"; // sesuaikan jika path beda
import { PlantInstance } from "@/models";

type UpdateItem = {
  instanceId: string;
  income?: number;
  expense?: number;
  note?: string;
  addedBy?: string; // <-- optional dari FE (fallback)
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

/** Ambil nama user yang sedang login via cookie/header (tanpa NextAuth).
 *  Urutan prioritas:
 *  1) Cookie "user" / "me" (JSON url-encoded: { name: "...", ... })
 *  2) Header "x-user-name" (atau "x-user")
 *
 *  NOTE: versi async untuk menghindari error TS pada Next 14/15
 */
async function getActorName(): Promise<string> {
  // 1) Cookie
  try {
    const jar = await cookies(); // <-- pakai await
    const raw = jar.get("user")?.value || jar.get("me")?.value;
    if (raw) {
      try {
        const u = JSON.parse(decodeURIComponent(raw));
        const n =
          u?.name ||
          u?.user?.name ||
          u?.profile?.name ||
          u?.data?.name ||
          "";
        if (n) return String(n);
      } catch {
        // raw bukan JSON url-encoded, coba pakai apa adanya
        if (raw && typeof raw === "string") return raw;
      }
    }
  } catch {
    // ignore
  }

  // 2) Header
  try {
    const h = await headers(); // <-- pakai await
    const n =
      h.get("x-user-name") ||
      h.get("x-user") ||
      h.get("x-auth-name") ||
      "";
    if (n) return n;
  } catch {
    // ignore
  }

  return "";
}

export async function POST(req: Request) {
  try {
    await ensureConnection();

    const body = await req.json().catch(() => ({}));
    const updates = parseUpdates(body);

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "updates harus berupa array" },
        { status: 400 }
      );
    }

    // Nama user yang login (kalau ada)
    const actor = await getActorName(); // <-- await

    let updated = 0;

    for (const u of updates) {
      const instanceId = String(u?.instanceId ?? "");
      const income = Number(u?.income ?? 0);
      const expense = Number(u?.expense ?? 0);
      const note = String(u?.note ?? "Bulk input");

      if (!instanceId) continue;
      if (income <= 0 && expense <= 0) continue;

      const now = new Date();

      // Sumber nilai addedBy:
      // 1) actor (nama user login dari cookie/header)
      // 2) u.addedBy (jika dikirim FE)
      // 3) fallback "bulk-finance"
      const addedBy =
        actor || (u?.addedBy ? String(u.addedBy) : "") || "bulk-finance";

      // bentuk record sesuai schema: WAJIB ada 'date'
      const $push: Record<string, any> = {};

      if (income > 0) {
        const incomeRecord = {
          id: makeId("INC"),
          date: now, // wajib
          amount: income,
          description: note,
          addedAt: now,
          addedBy,
        };
        $push.incomeRecords = { $each: [incomeRecord] };
      }

      if (expense > 0) {
        const costRecord = {
          id: makeId("EXP"),
          date: now, // jaga konsisten
          amount: expense,
          description: note,
          addedAt: now,
          addedBy,
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
