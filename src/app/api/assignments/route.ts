import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import PlantAssignment from "@/models/PlantAssignment";
import User from "@/models/User";

// GET - Get assignments (for manajer, asisten, or mandor)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const assignedRole = searchParams.get("role"); // Filter by role (asisten or mandor)
    const assignedTo = searchParams.get("assignedTo"); // Filter by user ID

    const query: any = { isActive: true };

    // Manajer can see all assignments
    if (role === "manajer") {
      if (assignedRole) {
        query.assignedRole = assignedRole;
      }
      if (assignedTo) {
        query.assignedTo = assignedTo;
      }
    }
    // Asisten can only see their own assignments and mandor they assigned
    else if (role === "asisten") {
      query.$or = [
        { assignedTo: userId }, // Their own assignment from manajer
        { assignedBy: userId, assignedRole: "mandor" }, // Mandor they assigned
      ];
    }
    // Mandor can only see their own assignment
    else if (role === "mandor") {
      query.assignedTo = userId;
      query.assignedRole = "mandor";
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignments = await PlantAssignment.find(query)
      .populate("assignedTo", "fullName email role")
      .populate("assignedBy", "fullName email role")
      .sort({ assignedAt: -1 });

    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments", details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new assignment (manajer assigns asisten, asisten assigns mandor)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;

    const body = await req.json();
    const { plantInstanceIds, assignedToId, assignedRole } = body;

    // Validation
    if (
      !plantInstanceIds ||
      !Array.isArray(plantInstanceIds) ||
      plantInstanceIds.length === 0
    ) {
      return NextResponse.json(
        { error: "plantInstanceIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!assignedToId || !assignedRole) {
      return NextResponse.json(
        { error: "assignedToId and assignedRole are required" },
        { status: 400 }
      );
    }

    if (!["asisten", "mandor"].includes(assignedRole)) {
      return NextResponse.json(
        { error: "assignedRole must be 'asisten' or 'mandor'" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check permissions
    if (role === "manajer" && assignedRole !== "asisten") {
      return NextResponse.json(
        { error: "Manajer can only assign asisten" },
        { status: 403 }
      );
    }

    if (role === "asisten" && assignedRole !== "mandor") {
      return NextResponse.json(
        { error: "Asisten can only assign mandor" },
        { status: 403 }
      );
    }

    if (role !== "manajer" && role !== "asisten") {
      return NextResponse.json(
        { error: "Only manajer and asisten can create assignments" },
        { status: 403 }
      );
    }

    // For asisten, verify they have access to these plants
    if (role === "asisten") {
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

      // Check if all plantInstanceIds are within asisten's assignment
      const unauthorizedPlants = plantInstanceIds.filter(
        (id: string) => !asistenAssignment.plantInstanceIds.includes(id)
      );

      if (unauthorizedPlants.length > 0) {
        return NextResponse.json(
          {
            error: "You can only assign plants that are assigned to you",
            unauthorizedPlants,
          },
          { status: 403 }
        );
      }
    }

    // Verify the user being assigned exists and has correct role
    const assignedUser = await User.findById(assignedToId);
    if (!assignedUser) {
      return NextResponse.json(
        { error: "Assigned user not found" },
        { status: 404 }
      );
    }

    if (assignedUser.role !== assignedRole) {
      return NextResponse.json(
        { error: `User must have role '${assignedRole}'` },
        { status: 400 }
      );
    }

    // Handle reassignment: remove plants from other users' assignments if they're being reassigned
    const conflictingAssignments = await PlantAssignment.find({
      plantInstanceIds: { $in: plantInstanceIds },
      assignedRole,
      isActive: true,
      assignedTo: { $ne: assignedToId }, // Different user
    });

    // Remove the plants from conflicting assignments (reassignment)
    for (const conflictAssignment of conflictingAssignments) {
      const plantsToRemove = plantInstanceIds.filter((id: string) =>
        conflictAssignment.plantInstanceIds.includes(id)
      );

      if (plantsToRemove.length > 0) {
        // Remove these plants from the old assignment
        conflictAssignment.plantInstanceIds =
          conflictAssignment.plantInstanceIds.filter(
            (id: string) => !plantsToRemove.includes(id)
          );

        // If no plants left in old assignment, delete it
        if (conflictAssignment.plantInstanceIds.length === 0) {
          await PlantAssignment.findByIdAndDelete(conflictAssignment._id);
        } else {
          await conflictAssignment.save();
        }
      }
    }

    // Check if user already has an active assignment
    const existingAssignment = await PlantAssignment.findOne({
      assignedTo: assignedToId,
      assignedRole,
      isActive: true,
    });

    let assignment;

    if (existingAssignment) {
      // Update existing assignment by adding new plant IDs (avoid duplicates)
      const existingPlantIds = existingAssignment.plantInstanceIds;
      const newPlantIds = plantInstanceIds.filter(
        (id: string) => !existingPlantIds.includes(id)
      );

      existingAssignment.plantInstanceIds = [
        ...existingPlantIds,
        ...newPlantIds,
      ];
      existingAssignment.assignedBy = userId; // Update assignedBy to current user
      existingAssignment.assignedAt = new Date(); // Update timestamp

      await existingAssignment.save();
      assignment = existingAssignment;
    } else {
      // Create new assignment
      const newAssignment = new PlantAssignment({
        plantInstanceIds,
        assignedTo: assignedToId,
        assignedBy: userId,
        assignedRole,
        assignedAt: new Date(),
        isActive: true,
      });

      await newAssignment.save();
      assignment = newAssignment;
    }

    // Populate before returning
    await assignment.populate("assignedTo", "fullName email role");
    await assignment.populate("assignedBy", "fullName email role");

    return NextResponse.json({
      message: existingAssignment
        ? "Assignment updated successfully"
        : "Assignment created successfully",
      assignment: assignment,
    });
  } catch (error: any) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { error: "Failed to create assignment", details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update assignment (modify plant list)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;

    const body = await req.json();
    const { assignmentId, plantInstanceIds } = body;

    if (
      !assignmentId ||
      !plantInstanceIds ||
      !Array.isArray(plantInstanceIds)
    ) {
      return NextResponse.json(
        { error: "assignmentId and plantInstanceIds array are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const assignment = await PlantAssignment.findById(assignmentId);

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (role === "manajer") {
      // Manajer can update any assignment
    } else if (role === "asisten") {
      // Asisten can only update mandor assignments they created
      if (assignment.assignedBy.toString() !== userId) {
        return NextResponse.json(
          { error: "You can only update assignments you created" },
          { status: 403 }
        );
      }

      // Verify asisten has access to new plants
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

      const unauthorizedPlants = plantInstanceIds.filter(
        (id: string) => !asistenAssignment.plantInstanceIds.includes(id)
      );

      if (unauthorizedPlants.length > 0) {
        return NextResponse.json(
          {
            error: "You can only assign plants that are assigned to you",
            unauthorizedPlants,
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Only manajer and asisten can update assignments" },
        { status: 403 }
      );
    }

    assignment.plantInstanceIds = plantInstanceIds;
    await assignment.save();

    await assignment.populate("assignedTo", "fullName email role");
    await assignment.populate("assignedBy", "fullName email role");

    return NextResponse.json({
      message: "Assignment updated successfully",
      assignment,
    });
  } catch (error: any) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      { error: "Failed to update assignment", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove assignment or specific plants from assignment
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user as any;

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("id");
    const plantIds = searchParams.get("plantIds"); // Optional: comma-separated plant IDs to remove

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const assignment = await PlantAssignment.findById(assignmentId);

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (role === "manajer") {
      // Manajer can delete any assignment
    } else if (role === "asisten") {
      // Asisten can only delete mandor assignments they created
      if (
        assignment.assignedBy.toString() !== userId ||
        assignment.assignedRole !== "mandor"
      ) {
        return NextResponse.json(
          { error: "You can only delete mandor assignments you created" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Only manajer and asisten can delete assignments" },
        { status: 403 }
      );
    }

    // If plantIds specified, remove only those plants
    if (plantIds) {
      const plantsToRemove = plantIds.split(",");
      assignment.plantInstanceIds = assignment.plantInstanceIds.filter(
        (id: string) => !plantsToRemove.includes(id)
      );

      // If no plants left, delete the assignment
      if (assignment.plantInstanceIds.length === 0) {
        await PlantAssignment.findByIdAndDelete(assignment._id);
        return NextResponse.json({
          message: "All plants removed. Assignment deleted.",
        });
      }

      await assignment.save();
      return NextResponse.json({
        message: "Plants removed from assignment successfully",
        assignment,
      });
    }

    // Otherwise, delete the entire assignment
    await PlantAssignment.findByIdAndDelete(assignment._id);

    return NextResponse.json({
      message: "Assignment deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment", details: error.message },
      { status: 500 }
    );
  }
}
