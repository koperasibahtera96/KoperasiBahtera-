import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getWhatsAppConnectionStatus } from "@/lib/whatsapp-client";

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
    const number = searchParams.get('number');

    if (!number) {
      return NextResponse.json(
        { error: "WhatsApp number is required" },
        { status: 400 }
      );
    }

    const result = await getWhatsAppConnectionStatus(number);
    
    if (result.success) {
      return NextResponse.json({
        hasSession: result.status?.isActive || false,
        status: result.status?.state || 'disconnected'
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to get connection status" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error checking WhatsApp session:", error);
    return NextResponse.json(
      { error: "Failed to check WhatsApp session" },
      { status: 500 }
    );
  }
}