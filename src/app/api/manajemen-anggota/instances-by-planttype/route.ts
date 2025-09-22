import { NextResponse } from "next/server";
import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";

export async function GET(req: Request) {
  try {
    await ensureConnection();

    const { searchParams } = new URL(req.url);
    const plantType = searchParams.get("plantType");

    if (!plantType) {
      return NextResponse.json(
        { error: "plantType query wajib diisi" },
        { status: 400 }
      );
    }

    // Cocokkan case-insensitive agar "Alpukat" / "alpukat" sama
    const query = { plantType: { $regex: `^${escapeRegex(plantType)}$`, $options: "i" } };

    // Ambil hanya kolom yang diperlukan agar ringan
    const instances = await PlantInstance
      .find(query, { _id: 1, owner: 1, memberId: 1 })
      .lean();

    const items = instances.map((inst: any) => ({
      instanceId: String(inst._id),
      memberId: inst.memberId ? String(inst.memberId) : "",
      memberName: inst.owner ?? "-", // pakai owner dari PlantInstance
    }));

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("[instances-by-planttype] error:", err);
    return NextResponse.json(
      { error: "Gagal memuat data", details: err.message },
      { status: 500 }
    );
  }
}

/** Escape karakter khusus untuk dipakai di RegExp mongo */
function escapeRegex(input: string) {
  // eslint-disable-next-line no-useless-escape
  return input.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}
