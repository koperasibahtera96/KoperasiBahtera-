import { NextResponse } from "next/server";
import { ensureConnection } from "@/lib/utils/database"; // sesuaikan jika path berbeda
import { PlantInstance } from "@/models";

export async function GET(req: Request) {
  try {
    await ensureConnection();

    const url = new URL(req.url);
    const plantType = url.searchParams.get("plantType") || "";

    if (!plantType) {
      return NextResponse.json(
        { error: "plantType query wajib diisi" },
        { status: 400 }
      );
    }

    // Ambil field secukupnya + contractNumber
    const docs = await PlantInstance.find(
      { plantType },
      {
        _id: 1,
        contractNumber: 1,
        memberId: 1,
        owner: 1, // kalau owner berisi nama pemilik
      }
    )
      .lean()
      .exec();

    const items = (docs || []).map((d: any) => {
      const instanceId = String(d._id);
      const contractNumber = String(d.contractNumber ?? "");
      const memberName =
        String(d?.owner?.name ?? d?.owner ?? d?.memberName ?? "").trim() || "—";
      const memberId = String(d?.memberId ?? "");
      return { instanceId, contractNumber, memberName, memberId };
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("[instances-by-planttype] error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data instances", details: err?.message },
      { status: 500 }
    );
  }
}
