import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getWhatsAppQR } from "@/lib/whatsapp-client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || !['admin', 'staff'].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const whatsappNumber = searchParams.get('number');
    
    if (!whatsappNumber) {
      return NextResponse.json(
        { error: "WhatsApp number is required" },
        { status: 400 }
      );
    }

    const result = await getWhatsAppQR(whatsappNumber);
    
    if (result.success) {
      return NextResponse.json({
        qrCode: result.qrCode || null
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to get QR code" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching QR code:", error);
    return NextResponse.json(
      { error: "Failed to fetch QR code" },
      { status: 500 }
    );
  }
}