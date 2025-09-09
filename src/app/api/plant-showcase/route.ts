import dbConnect from "@/lib/mongodb";
import PlantType from "@/models/PlantType";
import { NextResponse } from "next/server";

// Public endpoint for plant showcase data (no authentication required)
export async function GET() {
  try {
    await dbConnect();
    
    // Get all plant types sorted by name
    const plantTypes = await PlantType.find({}).sort({ name: 1 });
    
    if (plantTypes.length === 0) {
      // Return empty array if no data found
      return NextResponse.json({
        success: true,
        data: []
      });
    }
    
    return NextResponse.json({
      success: true,
      data: plantTypes
    });
  } catch (error) {
    console.error('GET /api/plant-showcase error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plant showcase data' },
      { status: 500 }
    );
  }
}