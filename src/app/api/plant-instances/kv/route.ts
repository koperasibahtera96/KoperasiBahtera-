// app/api/plant-instances/kv/route.ts
import { NextResponse } from "next/server";
import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";

/**
 * GET /api/plant-instances/kv?ids=ID1,ID2,...[&fields=a,b,c]
 *
 * - ids (wajib): daftar _id PlantInstance dipisah koma
 * - fields (opsional): comma-separated daftar field tambahan
 *   yang ingin ikut dikembalikan di value map. Default tetap
 *   hanya { blok, kavling, instanceName } agar kompatibel
 *   dengan pemakaian lama (Laporan Harian).
 *
 * Contoh:
 *   /api/plant-instances/kv?ids=64fa...,64fb...
 *   /api/plant-instances/kv?ids=...&fields=contractNumber,memberId,plantType
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const idsParam = (searchParams.get("ids") || "").trim();
    if (!idsParam) {
      return NextResponse.json({ map: {} }, { status: 200 });
    }

    // Daftar field tambahan (opsional, aman diabaikan jika tidak dipakai)
    const fieldsParam = (searchParams.get("fields") || "").trim();

    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await ensureConnection();

    // --- Field default (kompatibel dengan logic lama) ---
    const defaultFields = ["_id", "blok", "kavling", "instanceName"];

    // --- Whitelist field yang boleh diminta (hindari select sembarang) ---
    const allowedExtraFields = new Set([
      "contractNumber",
      "memberId",
      "owner",           // jika model punya
      "ownerName",       // jika model punya
      "plantType",
      "qrCode",
      "status",          // jika perlu
      "location",        // jika perlu
    ]);

    // Hitung select fields final
    const extras =
      fieldsParam === ""
        ? []
        : fieldsParam
            .split(",")
            .map((s) => s.trim())
            .filter((f) => allowedExtraFields.has(f));

    const selectFields = Array.from(new Set([...defaultFields, ...extras])).join(
      " "
    );

    // Ambil hanya field yang dibutuhkan agar cepat
    const docs = await PlantInstance.find({ _id: { $in: ids } })
      .select(selectFields)
      .lean();

    // Susun map hasil
    const map: Record<
      string,
      {
        blok?: string | null;
        kavling?: string | null;
        instanceName?: string | null;

        // Bidang tambahan (opsional; hanya ada jika diminta di "fields")
        contractNumber?: string | null;
        memberId?: string | null;
        owner?: any;
        ownerName?: string | null;
        plantType?: string | null;
        qrCode?: string | null;
        status?: string | null;
        location?: string | null;
      }
    > = {};

    for (const d of docs) {
      const key = String(d._id);
      const base: any = {
        blok: (d as any).blok ?? null,
        kavling: (d as any).kavling ?? null,
        instanceName: (d as any).instanceName ?? null,
      };

      // Isi hanya properti tambahan yang benar-benar dipilih
      for (const f of extras) {
        base[f] = (d as any)[f] ?? null;
      }

      map[key] = base;
    }

    return NextResponse.json({ map }, { status: 200 });
  } catch (err: any) {
    console.error("[plant-instances/kv] error:", err);
    // Tetap 200 + map kosong supaya pemanggil aman
    return NextResponse.json({ map: {} }, { status: 200 });
  }
}
