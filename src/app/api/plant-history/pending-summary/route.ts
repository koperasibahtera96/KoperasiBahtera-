import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import PlantInstance from "@/models/PlantInstance";
import PlantAssignment from "@/models/PlantAssignment";

// GET - Get summary of plants with pending approvals (for notification bar)
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;

    if (role !== "asisten" && role !== "manajer" && role !== "mandor") {
      return NextResponse.json(
        { error: "Only asisten, manajer, and mandor can view pending approvals" },
        { status: 403 }
      );
    }

    await dbConnect();

    let plantIds: string[] = [];

    if (role === "asisten") {
      // Get plants assigned to this asisten
      const assignment = await PlantAssignment.findOne({
        assignedTo: userId,
        assignedRole: "asisten",
        isActive: true,
      });

      if (!assignment) {
        return NextResponse.json({
          totalPlantsWithPending: 0,
          plants: []
        });
      }

      plantIds = assignment.plantInstanceIds;
    } else if (role === "manajer") {
      // Manajer can see all plants assigned to any asisten
      const assignments = await PlantAssignment.find({
        assignedRole: "asisten",
        isActive: true,
      });

      plantIds = assignments.flatMap((a) => a.plantInstanceIds);
    } else if (role === "mandor") {
      // Get plants assigned to this mandor
      const assignment = await PlantAssignment.findOne({
        assignedTo: userId,
        assignedRole: "mandor",
        isActive: true,
      });

      if (!assignment) {
        return NextResponse.json({
          totalPlantsWithPending: 0,
          plants: []
        });
      }

      plantIds = assignment.plantInstanceIds;
    }

    if (plantIds.length === 0) {
      return NextResponse.json({
        totalPlantsWithPending: 0,
        plants: []
      });
    }

    // Get all plants with these IDs
    const plants = await PlantInstance.find({
      id: { $in: plantIds },
    });

    // Group pending histories by plant
    const plantsWithPending: any[] = [];

    plants.forEach((plant) => {
      if (plant.history && Array.isArray(plant.history)) {
        const pendingHistories = plant.history.filter((h: any) => {
          let shouldInclude = false;

          if (role === "asisten") {
            // Asisten sees pending approvals from mandor
            shouldInclude = h.approvalStatus === "pending";
          } else if (role === "manajer") {
            // Manajer sees approvals pending from asisten
            shouldInclude = h.approvalStatus === "approved_by_asisten";
          } else if (role === "mandor") {
            // Mandor sees ALL rejected approvals (both from asisten and manajer)
            // When asisten rejects: status is "rejected", approvedByAsisten is NOT set
            // When manajer rejects: status is "rejected", approvedByAsisten IS set
            // Mandor should see both cases, so just check if status is "rejected"
            shouldInclude = h.approvalStatus === "rejected";
          }

          return shouldInclude;
        });

        if (pendingHistories.length > 0) {
          // Get the most recent pending history for preview
          const sortedPending = [...pendingHistories].sort((a: any, b: any) => {
            const dateA = new Date(a.addedAt).getTime();
            const dateB = new Date(b.addedAt).getTime();
            return dateB - dateA;
          });

          plantsWithPending.push({
            plantId: plant.id,
            plantName: plant.instanceName,
            plantType: plant.plantType,
            location: plant.location,
            pendingCount: pendingHistories.length,
            latestPending: {
              type: sortedPending[0].type,
              date: sortedPending[0].date,
              addedBy: sortedPending[0].addedBy,
              addedAt: sortedPending[0].addedAt,
            },
          });
        }
      }
    });

    // Sort by latest pending date (newest first)
    plantsWithPending.sort((a, b) => {
      const dateA = new Date(a.latestPending.addedAt).getTime();
      const dateB = new Date(b.latestPending.addedAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      totalPlantsWithPending: plantsWithPending.length,
      plants: plantsWithPending,
    });
  } catch (error: any) {
    console.error("Error fetching pending summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending summary", details: error.message },
      { status: 500 }
    );
  }
}
