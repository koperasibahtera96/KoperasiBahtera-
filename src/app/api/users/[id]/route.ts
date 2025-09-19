import { NextResponse } from "next/server"
import { ensureConnection } from "@/lib/utils/database"
import { User } from "@/models"

// API tambahan ambil user by id
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureConnection()
    const user = await User.findById((await params).id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    return NextResponse.json({
      user: {
        id: String(user._id),
        email: user.email,
        fullName: user.fullName,
        userCode: user.userCode,
      },
    })
  } catch (err) {
    console.error("[api/users/[id]] error", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
