// src/app/api/plant-instances/by-order/route.ts
import { NextResponse } from "next/server";

/**
 * API kecil untuk mencari info PlantInstance berdasarkan orderId/contractNumber/investmentId
 * Return minimal: { kavling, plantTypeName }
 *
 * Catatan:
 * - Kalau kamu sudah punya helper/db model sendiri, silakan ganti implementasinya di bawah.
 * - Endpoint lain yang mungkin sudah ada bisa kamu panggil dari sini.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId") || "";

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    // === IMPLEMENTASI SEMENTARA ===
    // Gantilah blok ini dengan query ke database kamu.
    // Aku buat probing ke 2 endpoint kemungkinan jika kamu sudah punya:
    // 1) /api/plantInstances?orderId=...
    // 2) /api/plants/find-by-contract?contractNumber=...
    // Pilih yang ada; kalau keduanya tidak ada, kembalikan object kosong.

    // try 1:
    try {
      const res1 = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/plantInstances?orderId=${encodeURIComponent(
          orderId
        )}`,
        { cache: "no-store" }
      );
      if (res1.ok) {
        const js = await res1.json();
        // sesuaikan mapping hasil endpointmu
        const inst = Array.isArray(js) ? js[0] : js?.data || js?.instance;
        if (inst) {
          return NextResponse.json({
            kavling: inst.kavling || inst.qrCode || inst.kav || inst.blockCode || "",
            plantTypeName: inst.plantTypeName || inst.plantType || inst.instanceName || "",
            instance: inst,
          });
        }
      }
    } catch {}

    // try 2: by contractNumber
    try {
      const res2 = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/plants/find-by-contract?contractNumber=${encodeURIComponent(
          orderId
        )}`,
        { cache: "no-store" }
      );
      if (res2.ok) {
        const js = await res2.json();
        const inst = js?.data || js?.instance || js;
        if (inst) {
          return NextResponse.json({
            kavling: inst.kavling || inst.qrCode || inst.kav || inst.blockCode || "",
            plantTypeName: inst.plantTypeName || inst.plantType || inst.instanceName || "",
            instance: inst,
          });
        }
      }
    } catch {}

    // fallback kosong
    return NextResponse.json({ kavling: "", plantTypeName: "" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
