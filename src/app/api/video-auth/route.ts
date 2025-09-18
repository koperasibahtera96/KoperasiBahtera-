// src/app/api/video-auth/route.ts
import { NextResponse } from "next/server";
import ImageKit from "imagekit";

export const runtime = "nodejs"; // WAJIB: auth butuh Node runtime

// Ambil ENV dengan fallback beberapa nama (ikuti variabel yg sudah kamu pakai)
function env(name: string, ...alts: string[]) {
  for (const key of [name, ...alts]) {
    const v = process.env[key];
    if (v && String(v).trim().length > 0) return v as string;
  }
  return "";
}

const publicKey = env(
  "IMAGEKIT_PUBLIC_KEY",
  "IK_PUBLIC",
  "NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY"
);
const privateKey = env("IMAGEKIT_PRIVATE_KEY", "IK_PRIVATE");
const urlEndpoint = env(
  "IMAGEKIT_URL_ENDPOINT",
  "IK_URL",
  "NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT"
);

export async function GET() {
  try {
    if (!publicKey || !privateKey || !urlEndpoint) {
      return NextResponse.json(
        {
          error: "Missing ImageKit environment variables",
          details: {
            publicKey: !!publicKey,
            privateKey: !!privateKey,
            urlEndpoint: !!urlEndpoint,
          },
        },
        { status: 500 }
      );
    }

    const imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });

    const auth = imagekit.getAuthenticationParameters();
    return NextResponse.json(auth);
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "ImageKit auth failed",
        details: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}
