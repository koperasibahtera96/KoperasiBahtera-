import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// GET - Get users by role
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role: userRole } = session.user as any;

    // Only manajer, asisten, and admin can fetch users by role
    if (!["manajer", "asisten", "admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    if (!role) {
      return NextResponse.json(
        { error: "Role parameter is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const users = await User.find(
      { role, isActive: true },
      "fullName email role _id"
    ).sort({ fullName: 1 });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Error fetching users by role:", error);
    return NextResponse.json(
      { error: "Failed to fetch users", details: error.message },
      { status: 500 }
    );
  }
}
