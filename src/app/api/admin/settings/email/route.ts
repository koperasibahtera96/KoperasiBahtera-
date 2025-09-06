import { authOptions } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
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

    // Return email and service, but not the password for security
    // We'll include a flag to indicate if a password is set
    return NextResponse.json({
      email: settings?.config?.email || "",
      service: settings?.config?.service || "gmail",
      hasPassword: !!settings?.config?.password,
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

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get existing settings to preserve password if not provided
    const existingSettings = await Settings.findOne({ type: "email" });
    
    let finalPassword = existingSettings?.config?.password || "";

    // If password is provided, encrypt and update it
    if (password && password.trim() !== "") {
      finalPassword = encrypt(password);
    } else if (!existingSettings?.config?.password) {
      // If no password provided and no existing password, require it
      return NextResponse.json(
        { error: "Password is required for new configuration" },
        { status: 400 }
      );
    }

    const configToUpdate = {
      email,
      service,
      password: finalPassword
    };

    // Update or create email settings
    await Settings.findOneAndUpdate(
      { type: "email" },
      {
        type: "email",
        config: configToUpdate,
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
