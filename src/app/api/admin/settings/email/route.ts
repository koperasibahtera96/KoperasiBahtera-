import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.role ||
      !["admin", "staff"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const settings = await Settings.findOne({ type: "email" });

    return NextResponse.json({
      email: settings?.config?.email || "",
      service: settings?.config?.service || "gmail",
      // Never return password for security
    });
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.role ||
      !["admin", "staff"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, password, service } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Update or create email settings
    await Settings.findOneAndUpdate(
      { type: "email" },
      {
        type: "email",
        config: {
          email,
          password, // In production, consider encrypting this
          service,
        },
        updatedAt: new Date(),
        updatedBy: session.user.id,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: "Email settings saved successfully",
    });
  } catch (error) {
    console.error("Error saving email settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
