import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || !['admin', 'staff'].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const settings = await Settings.findOne({ type: 'whatsapp' });
    
    return NextResponse.json({
      whatsappNumber: settings?.config?.whatsappNumber || '',
      status: settings?.config?.status || 'disconnected',
    });
  } catch (error) {
    console.error("Error fetching WhatsApp settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch WhatsApp settings" },
      { status: 500 }
    );
  }
}

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

    // Validate WhatsApp number format
    const cleanNumber = whatsappNumber.replace(/[^\d]/g, '');
    if (!cleanNumber.startsWith('62') || cleanNumber.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid Indonesian WhatsApp number (628xxxxxxxx)" },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Update or create WhatsApp settings
    await Settings.findOneAndUpdate(
      { type: 'whatsapp' },
      {
        type: 'whatsapp',
        config: {
          whatsappNumber: cleanNumber,
          status: 'disconnected', // Reset status when number changes
        },
        updatedAt: new Date(),
        updatedBy: session.user.id
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: "WhatsApp settings saved successfully"
    });
  } catch (error) {
    console.error("Error saving WhatsApp settings:", error);
    return NextResponse.json(
      { error: "Failed to save WhatsApp settings" },
      { status: 500 }
    );
  }
}