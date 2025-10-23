import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import PlantInstance from "@/models/PlantInstance";
import PlantAssignment from "@/models/PlantAssignment";

// POST - Approve or reject plant history (asisten or manajer)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;

    if (role !== "asisten" && role !== "manajer") {
      return NextResponse.json(
        { error: "Only asisten and manajer can approve history" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { plantId, historyId, action, rejectionReason } = body;

    if (!plantId || !historyId || !action) {
      return NextResponse.json(
        { error: "plantId, historyId, and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (action === "reject" && !rejectionReason) {
      return NextResponse.json(
        { error: "rejectionReason is required when rejecting" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get plant instance
    const plant = await PlantInstance.findOne({ id: plantId });

    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    // Find the history entry
    const historyIndex = plant.history?.findIndex(
      (h: any) => h.id === Number(historyId)
    );

    if (historyIndex === -1 || historyIndex === undefined) {
      return NextResponse.json(
        { error: "History entry not found" },
        { status: 404 }
      );
    }

    const historyEntry = plant.history[historyIndex];

    // Verify permissions based on role and current approval status
    if (role === "asisten") {
      // Asisten can only approve pending histories from mandor under their supervision
      if (historyEntry.approvalStatus !== "pending") {
        return NextResponse.json(
          { error: "This history has already been processed" },
          { status: 400 }
        );
      }

      // Check if asisten has this plant in their assignment
      const asistenAssignment = await PlantAssignment.findOne({
        assignedTo: userId,
        assignedRole: "asisten",
        isActive: true,
      });

      if (!asistenAssignment) {
        return NextResponse.json(
          { error: "You don't have any plant assignments" },
          { status: 403 }
        );
      }

      if (!asistenAssignment.plantInstanceIds.includes(plantId)) {
        return NextResponse.json(
          {
            error: "You don't have permission to approve this plant's history",
          },
          { status: 403 }
        );
      }

      // Check if the mandor who added this history is under this asisten
      if (historyEntry.addedById) {
        const mandorAssignment = await PlantAssignment.findOne({
          assignedTo: historyEntry.addedById,
          assignedBy: userId,
          assignedRole: "mandor",
          isActive: true,
        });

        if (!mandorAssignment) {
          return NextResponse.json(
            {
              error: "You can only approve histories from mandor you supervise",
            },
            { status: 403 }
          );
        }
      }

      // Update history with asisten approval
      if (action === "approve") {
        historyEntry.approvalStatus = "approved_by_asisten";
        historyEntry.approvedByAsisten = userId;
        historyEntry.approvedByAsistenAt = new Date().toISOString();
      } else {
        historyEntry.approvalStatus = "rejected";
        historyEntry.rejectionReason = rejectionReason;
      }
    } else if (role === "manajer") {
      // Manajer can approve histories that are pending or approved by asisten
      if (historyEntry.approvalStatus !== "approved_by_asisten") {
        return NextResponse.json(
          {
            error: "This history has already been processed",
          },
          { status: 400 }
        );
      }

      // Update history with manajer approval
      if (action === "approve") {
        historyEntry.approvalStatus = "approved_by_manajer";
        historyEntry.approvedByManajer = userId;
        historyEntry.approvedByManajerAt = new Date().toISOString();
      } else {
        historyEntry.approvalStatus = "rejected";
        historyEntry.rejectionReason = rejectionReason;
      }
    }

    // Save the updated plant
    plant.history[historyIndex] = historyEntry;
    plant.markModified("history");
    await plant.save();

    return NextResponse.json({
      message: `History ${
        action === "approve" ? "approved" : "rejected"
      } successfully`,
      history: historyEntry,
    });
  } catch (error: any) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { error: "Failed to process approval", details: error.message },
      { status: 500 }
    );
  }
}

// GET - Get pending histories for approval
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;

    if (role !== "asisten" && role !== "manajer") {
      return NextResponse.json(
        { error: "Only asisten and manajer can view pending approvals" },
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
        return NextResponse.json({ pendingHistories: [] });
      }

      plantIds = assignment.plantInstanceIds;
    } else if (role === "manajer") {
      // Manajer can see all plants assigned to any asisten
      const assignments = await PlantAssignment.find({
        assignedRole: "asisten",
        isActive: true,
      });

      plantIds = assignments.flatMap((a) => a.plantInstanceIds);
    }

    if (plantIds.length === 0) {
      return NextResponse.json({ pendingHistories: [] });
    }

    // Get all plants with these IDs
    const plants = await PlantInstance.find({
      id: { $in: plantIds },
    });

    // Filter histories based on approval status
    const pendingHistories: any[] = [];

    plants.forEach((plant) => {
      if (plant.history && Array.isArray(plant.history)) {
        plant.history.forEach((h: any) => {
          const shouldInclude =
            role === "asisten"
              ? h.approvalStatus === "pending"
              : h.approvalStatus === "approved_by_asisten";

          if (shouldInclude) {
            pendingHistories.push({
              plantId: plant.id,
              plantName: plant.instanceName,
              plantType: plant.plantType,
              history: h,
            });
          }
        });
      }
    });

    // Sort by date (newest first)
    pendingHistories.sort((a, b) => {
      const dateA = new Date(a.history.addedAt).getTime();
      const dateB = new Date(b.history.addedAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ pendingHistories });
  } catch (error: any) {
    console.error("Error fetching pending histories:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending histories", details: error.message },
      { status: 500 }
    );
  }
}
