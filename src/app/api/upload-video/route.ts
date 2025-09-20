import { NextResponse } from "next/server";
import ImageKit from "imagekit";
import { Readable } from "stream";

// Wajib Node.js (bukan edge), & jangan cache
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const imagekit = new ImageKit({
  publicKey:
    process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
    process.env.IMAGEKIT_PUBLIC_KEY ||
    "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint:
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ||
    process.env.IMAGEKIT_URL_ENDPOINT ||
    "",
});

function ensureEnv() {
  if (
    !(
      process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
      process.env.IMAGEKIT_PUBLIC_KEY
    ) ||
    !process.env.IMAGEKIT_PRIVATE_KEY ||
    !(
      process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ||
      process.env.IMAGEKIT_URL_ENDPOINT
    )
  ) {
    throw new Error(
      "ENV ImageKit belum lengkap. Wajib: IMAGEKIT_PRIVATE_KEY, dan salah satu dari (NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY/IMAGEKIT_PUBLIC_KEY) serta (NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT/IMAGEKIT_URL_ENDPOINT)."
    );
  }
}

export async function POST(req: Request) {
  try {
    ensureEnv();

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const folder = (form.get("folder") as string) || "/plant-photos";
    const tagsRaw = (form.get("tags") as string) || "checker,video";

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan. Kirim field 'file' di form-data." },
        { status: 400 }
      );
    }

    if (!file.type?.startsWith("video/")) {
      return NextResponse.json(
        { error: "Tipe tidak didukung. Hanya file video yang diperbolehkan." },
        { status: 400 }
      );
    }

    // === STREAM ke ImageKit (hindari buffer besar di memory) ===
    const webStream = file.stream(); // ReadableStream (WHATWG)
    // Ubah ke Node.js Readable agar SDK ImageKit bisa konsumsi
    const nodeStream = Readable.fromWeb(webStream as any);
    const originalName = (file as any).name || "upload-video.mp4";

    const uploaded = await imagekit.upload({
      file: nodeStream, // kirim stream, bukan Buffer
      fileName: originalName,
      folder,
      useUniqueFileName: true,
      tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
    });

    return NextResponse.json(
      {
        ok: true,
        videoUrl: uploaded.url,     // dipakai UI untuk video
        imageUrl: uploaded.url,     // kompatibel dengan field imageUrl pada UI/history
        fileId: uploaded.fileId,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Upload video error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal mengunggah video ke ImageKit." },
      { status: 500 }
    );
  }
}
