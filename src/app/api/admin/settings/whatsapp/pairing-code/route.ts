import { authOptions } from "@/lib/auth";
import { getPairingCode } from "@/lib/whatsapp";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.role ||
      !["admin", "staff"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const whatsappNumber = searchParams.get("number");

    if (!whatsappNumber) {
      return NextResponse.json(
        { error: "WhatsApp number parameter is required" },
        { status: 400 }
      );
    }

    const pairingCode = await getPairingCode(whatsappNumber);

    if (!pairingCode) {
      return NextResponse.json(
        { 
          error: "No pairing code found. Please generate a new pairing code first.",
          hasPairingCode: false
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      pairingCode,
      hasPairingCode: true,
      message: "Enter this pairing code in your WhatsApp app: Settings > Linked Devices > Link a Device > Link with phone number instead",
    });
  } catch (error) {
    console.error("Error getting pairing code:", error);
    return NextResponse.json(
      {
        error: `Failed to get pairing code: ${(error as any).message}`,
      },
      { status: 500 }
    );
  }
}