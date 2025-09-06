import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import WhatsAppSession from "@/models/WhatsAppSession";

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

    await dbConnect();
    
    const whatsappSession = await WhatsAppSession.findOne({ 
      whatsappNumber: number,
      isActive: true 
    });
    
    return NextResponse.json({
      hasSession: !!whatsappSession && Object.keys(whatsappSession.authData || {}).length > 0,
      status: whatsappSession?.connectionStatus || 'disconnected'
    });
  } catch (error) {
    console.error("Error checking WhatsApp session:", error);
    return NextResponse.json(
      { error: "Failed to check WhatsApp session" },
      { status: 500 }
    );
  }
}