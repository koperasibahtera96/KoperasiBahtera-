// app/api/manajemen-anggota/kv/route.ts
import { NextResponse } from "next/server";
import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";

// GET /api/manajemen-anggota/kv?ids=ID1,ID2,...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = (searchParams.get("ids") || "").trim();
    if (!idsParam) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    // URLSearchParams sudah decode %2C -> ,
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await ensureConnection();

    // Ambil field minimum agar ringan
    const docs = await PlantInstance.find({ _id: { $in: ids } })
      .select("_id blok kavling instanceName")
      .lean();

    const items = (docs || []).map((d: any) => ({
      instanceId: String(d._id),
      blok: d?.blok ?? null,
      kavling: d?.kavling ?? null,
      instanceName: d?.instanceName ?? null, // tidak dipakai UI, tapi berguna kalau diperlukan
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("[/api/manajemen-anggota/kv] error:", err);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
