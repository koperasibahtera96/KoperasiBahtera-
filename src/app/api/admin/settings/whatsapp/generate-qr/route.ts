import { authOptions } from "@/lib/auth";
import { createWhatsAppConnection } from "@/lib/whatsapp";
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

    // Initialize WhatsApp connection
    try {
      const { getWhatsAppConfig, hasWhatsAppAuth, removeWhatsAppAuth } = await import("@/lib/whatsapp");
      await getWhatsAppConfig(whatsappNumber);
      
      // Always remove existing auth to ensure fresh QR generation
      const authExists = await hasWhatsAppAuth(whatsappNumber);
      if (authExists) {
        console.log("Removing existing auth to generate fresh QR code");
        await removeWhatsAppAuth(whatsappNumber);
      }
      
      await createWhatsAppConnection(whatsappNumber);
      console.log("WhatsApp connection creation initiated successfully");
    } catch (connectionError) {
      console.error("Error in createWhatsAppConnection:", connectionError);
      throw connectionError;
    }

    return NextResponse.json({
      message:
        "WhatsApp connection initiated. QR code will be available shortly.",
    });
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
