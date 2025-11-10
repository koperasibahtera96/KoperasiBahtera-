import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy ke /api/invoice dengan semua query dari client,
 * tapi dipaksa category=registration (tanpa UI filter).
 */
export async function GET(req: NextRequest) {
  try {
    const incomingUrl = new URL(req.url);
    const q = new URLSearchParams(incomingUrl.search);

    // pastikan pakai category=registration (sesuai route invoice kamu)
    q.set("category", "registration");

    // fallback pagination (biar aman)
    if (!q.get("page")) q.set("page", "1");
    if (!q.get("perPage")) q.set("perPage", "9");

    // nembak ke /api/invoice (SINGULAR)
    const target = new URL(`/api/invoice2?${q.toString()}`, incomingUrl.origin);

    const res = await fetch(target, {
      cache: "no-store",
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return new NextResponse(text || "Gagal memuat data pendaftaran", {
        status: res.status,
      });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return new NextResponse(err?.message || "Gagal memuat data pendaftaran", {
      status: 500,
    });
  }
}
