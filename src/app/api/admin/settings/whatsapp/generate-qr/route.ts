import { authOptions } from "@/lib/auth";
import { generateWhatsAppQR, removeWhatsAppAuth } from "@/lib/whatsapp-client";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.role ||
      !["admin", "staff"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { whatsappNumber } = await req.json();

    if (!whatsappNumber) {
      return NextResponse.json(
        { error: "WhatsApp number is required" },
        { status: 400 }
      );
    }

    console.log(
      "Attempting to create WhatsApp connection for:",
      whatsappNumber
    );

    // Remove existing auth to ensure fresh QR generation
    console.log("Removing existing auth to generate fresh QR code");
    await removeWhatsAppAuth(whatsappNumber);
    
    // Generate new QR code
    const result = await generateWhatsAppQR(whatsappNumber);
    
    if (result.success) {
      return NextResponse.json({
        message: "WhatsApp connection initiated. QR code will be available shortly.",
      });
    } else {
      throw new Error(result.error || "Failed to generate QR code");
    }
  } catch (error) {
    console.error("Error generating WhatsApp QR:", error);
    return NextResponse.json(
      {
        error: `Failed to generate WhatsApp QR code: ${(error as any).message}`,
      },
      { status: 500 }
    );
  }
}
