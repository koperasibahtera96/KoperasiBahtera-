import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { ensureConnection } from "@/lib/utils/database"    // <-- sesuaikan path helper koneksi-mu
import User from "@/models/User";                   // <-- sesuaikan path model-mu

export async function GET(req: Request) {
  try {
    await ensureConnection();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      userCode: (user as any).userCode ?? (user as any).memberCode ?? null,
      user, // tetap kirim user bila perlu
    });
  } catch (e) {
    console.error("[api/users/by-id] error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
