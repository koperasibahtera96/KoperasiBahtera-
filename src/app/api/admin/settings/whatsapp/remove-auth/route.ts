import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { removeWhatsAppAuth } from "@/lib/whatsapp-client";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || !['admin', 'staff'].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { whatsappNumber } = await req.json();
    
    if (!whatsappNumber) {
      return NextResponse.json(
        { error: "WhatsApp number is required" },
        { status: 400 }
      );
    }

    const result = await removeWhatsAppAuth(whatsappNumber);
    
    if (result.success) {
      return NextResponse.json({
        message: "WhatsApp authentication removed successfully. You can now generate a new QR code."
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to remove WhatsApp authentication" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error removing WhatsApp auth:", error);
    return NextResponse.json(
      { error: "Failed to remove WhatsApp authentication" },
      { status: 500 }
    );
  }
}