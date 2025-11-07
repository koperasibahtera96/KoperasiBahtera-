import { NextResponse } from "next/server";

const METERAIKU_API_URL = "https://event.meteraiku.co.id/api/profile/check-saldo";

export async function GET() {
  try {
    const apiKey = process.env.PROD_STAMP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(METERAIKU_API_URL, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
      },
    });

    if (!response.ok) {
      console.error(
        `[Materai] Failed to check saldo: ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        { success: false, error: "Failed to fetch saldo from MeteraIku API" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.data,
    });
  } catch (error) {
    console.error("[Materai] Error checking saldo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check materai saldo" },
      { status: 500 }
    );
  }
}
