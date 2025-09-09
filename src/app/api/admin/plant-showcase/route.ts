import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { logAdminAction } from "@/lib/utils/admin";
import PlantType from "@/models/PlantType";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
    
    const plantTypes = await PlantType.find({}).sort({ name: 1 });
    
    return NextResponse.json({
      success: true,
      data: plantTypes
    });
  } catch (error) {
    console.error('GET /api/admin/plant-showcase error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plant showcase data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { plants } = await request.json();

    if (!plants || !Array.isArray(plants)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plants data' },
        { status: 400 }
      );
    }

    // Get current plant data before updates
    const currentPlants = await PlantType.find({
      name: { $in: plants.map(p => p.name) }
    });

    const currentPlantsMap = new Map(
      currentPlants.map(plant => [plant.name, plant.toObject()])
    );

    // First, update all plants in the database
    const updatePromises = plants.map(async (plant) => {
      const { name, ...updateData } = plant;
      
      // Find and update the plant type, or create if it doesn't exist
      const result = await PlantType.findOneAndUpdate(
        { name: name },
        {
          ...updateData,
          name: name,
          id: name, // Use name as id for consistency
        },
        {
          upsert: true, // Create if doesn't exist
          new: true, // Return updated document
          runValidators: true
        }
      );
      
      return result;
    });

    const updatedPlants = await Promise.all(updatePromises);
    
    // Group logs by plant type and create a single log entry per plant type
    const plantLogs = new Map();
    
    for (const updatedPlant of updatedPlants) {
      const currentPlant = currentPlantsMap.get(updatedPlant.name);
      
      if (!currentPlant) {
        // New plant
        plantLogs.set(updatedPlant.name, {
          isNew: true,
          name: updatedPlant.name,
          newData: updatedPlant,
          oldData: null
        });
        continue;
      }
      
      // Check if there are any meaningful changes
      const oldData = JSON.parse(JSON.stringify(currentPlant));
      const newData = JSON.parse(JSON.stringify(updatedPlant));
      
      // Clean up the data for comparison
      delete oldData._id;
      delete oldData.__v;
      delete oldData.updatedAt;
      delete newData._id;
      delete newData.__v;
      delete newData.updatedAt;
      
      // Only log if there are actual changes
      if (JSON.stringify(oldData) !== JSON.stringify(newData)) {
        plantLogs.set(updatedPlant.name, {
          isNew: false,
          name: updatedPlant.name,
          oldData,
          newData
        });
      }
    }
    
    // Create log entries for each plant type
    for (const [plantName, logData] of plantLogs.entries()) {
      const { isNew, oldData, newData } = logData;
      
      if (isNew) {
        await logAdminAction({
          adminId: session.user.id,
          adminName: session.user.name || 'Unknown',
          adminEmail: session.user.email || 'Unknown',
          action: 'update_plant_prices',
          description: `Added new plant: ${plantName}`,
          targetType: 'plant',
          targetName: plantName,
          oldData: null,
          newData: newData,
          request
        });
      } else {
        await logAdminAction({
          adminId: session.user.id,
          adminName: session.user.name || 'Unknown',
          adminEmail: session.user.email || 'Unknown',
          action: 'update_plant_prices',
          description: `Updated plant data: ${plantName}`,
          targetType: 'plant',
          targetName: plantName,
          oldData: oldData,
          newData: newData,
          request
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Plant showcase data updated successfully',
      data: updatedPlants
    });
  } catch (error) {
    console.error('POST /api/admin/plant-showcase error:', error);
    
    if (error && typeof error === 'object' && 'name' in error) {
      // Handle MongoDB validation errors
      if ((error as any).name === 'ValidationError') {
        const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
        return NextResponse.json(
          { success: false, error: `Validation error: ${validationErrors.join(', ')}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update plant showcase data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { plantName, updateData } = await request.json();

    if (!plantName || !updateData) {
      return NextResponse.json(
        { success: false, error: 'Plant name and update data are required' },
        { status: 400 }
      );
    }

    // Get old data for logging
    const oldPlant = await PlantType.findOne({ name: plantName });

    // Update specific plant
    const updatedPlant = await PlantType.findOneAndUpdate(
      { name: plantName },
      updateData,
      {
        new: true, // Return updated document
        runValidators: true
      }
    );

    if (!updatedPlant) {
      return NextResponse.json(
        { success: false, error: 'Plant not found' },
        { status: 404 }
      );
    }

    console.log('Single plant updated by:', session.user.email);
    console.log('Updated plant:', `${updatedPlant.name}: ${updatedPlant.investmentPlan.price}`);

    // Log admin action
    if (session?.user && oldPlant) {
      const oldData = {
        name: oldPlant.name,
        price: oldPlant.investmentPlan?.price || 'Unknown',
        description: oldPlant.description
      };
      
      const newData = {
        name: updatedPlant.name,
        price: updatedPlant.investmentPlan?.price || 'Unknown',
        description: updatedPlant.description
      };

      await logAdminAction({
        adminId: session.user.id,
        adminName: session.user.name || 'Unknown',
        adminEmail: session.user.email || 'Unknown',
        action: 'update_plant_prices',
        description: `Updated plant: ${updatedPlant.name} - Price changed from ${oldData.price} to ${newData.price}`,
        targetType: 'plant',
        targetId: updatedPlant._id.toString(),
        targetName: updatedPlant.name,
        oldData,
        newData,
        request
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Plant data updated successfully',
      data: updatedPlant
    });
  } catch (error) {
    console.error('PUT /api/admin/plant-showcase error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update plant data' },
      { status: 500 }
    );
  }
}