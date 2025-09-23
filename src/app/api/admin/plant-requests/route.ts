import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { PlantInstance } from "@/models";
import PlantRequest from "@/models/PlantRequest";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

async function performApprovedAction(request: any) {
  switch (request.requestType) {
    case "update_history":
      await updatePlantHistory(request);
      break;
    case "delete_history":
      await deletePlantHistory(request);
      break;
    case "delete":
      await deletePlant(request);
      break;
    default:
      console.warn(`Unknown request type: ${request.requestType}`);
  }
}

async function updatePlantHistory(request: any) {
  console.log('updatePlantHistory called with:', {
    plantId: request.plantId,
    historyId: request.historyId,
    newDescription: request.newDescription
  });

  const plant = await PlantInstance.findOne({ id: request.plantId });
  if (!plant) {
    console.error(`Plant not found: ${request.plantId}`);
    throw new Error(`Plant not found: ${request.plantId}`);
  }

  console.log('Plant found, history items:', plant.history.map((h: any) => ({ id: h.id, type: typeof h.id })));

  const historyItem = plant.history.find((h: any) => h.id.toString() === request.historyId.toString());
  if (!historyItem) {
    console.error(`History item not found: ${request.historyId}, available IDs:`, plant.history.map((h: any) => h.id));
    throw new Error(`History item not found: ${request.historyId}`);
  }

  console.log('Found history item:', historyItem);
  console.log('Updating description from:', historyItem.description, 'to:', request.newDescription);
  // First attempt: use MongoDB positional operator to update nested array element using string id
  try {
    const updateResult: any = await PlantInstance.updateOne(
      { id: request.plantId, "history.id": request.historyId },
      { $set: { "history.$.description": request.newDescription } }
    );

    console.log('updateOne result:', updateResult);

    if (updateResult && (updateResult.modifiedCount === 1 || updateResult.nModified === 1)) {
      console.log('Plant updated successfully via updateOne');
    } else {
      // Fallback: update in-memory and save (handles mixed types and older mongoose versions)
      console.log('updateOne did not modify document, falling back to in-memory update');
      historyItem.description = request.newDescription;
      if (typeof plant.markModified === "function") {
        plant.markModified("history");
      }
      await plant.save();
      console.log('Plant updated successfully (saved document)');
    }
  } catch (err) {
    console.error('Error performing updateOne, falling back to save:', err);
    historyItem.description = request.newDescription;
    if (typeof plant.markModified === "function") {
      plant.markModified("history");
    }
    await plant.save();
    console.log('Plant updated successfully (saved document after catch)');
  }

  // Verify the change was persisted
  const verifyPlant = await PlantInstance.findOne({ id: request.plantId });
  const verifyHistoryItem = verifyPlant?.history.find((h: any) => h.id.toString() === request.historyId.toString());
  console.log('Verification - Updated description in DB:', verifyHistoryItem?.description);
}

async function deletePlantHistory(request: any) {
  const plant = await PlantInstance.findOne({ id: request.plantId });
  if (!plant) {
    throw new Error(`Plant not found: ${request.plantId}`);
  }

  plant.history = plant.history.filter((h: any) => h.id.toString() !== request.historyId.toString());
  await plant.save();
}

async function deletePlant(request: any) {
  const plant = await PlantInstance.findOneAndDelete({ id: request.plantId });
  if (!plant) {
    throw new Error(`Plant not found: ${request.plantId}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      (session.user.role !== "admin" && session.user.role !== "spv_staff")
    ) {
      return NextResponse.json(
        { error: "Unauthorized - Admin or SPV Staff access required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const requestType = searchParams.get("requestType");

    // Build query
    const query: any = {};

    if (session.user.role === "spv_staff") {
      // SPV staff can only see their own requests
      query.requestedBy = session.user.id;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (requestType && requestType !== "all") {
      query.requestType = requestType;
    }

    const skip = (page - 1) * limit;

    // Get requests with populated user data
    const requests = await PlantRequest.find(query)
      .populate("requestedBy", "fullName email")
      .populate("reviewedBy", "fullName")
      .sort({ requestDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PlantRequest.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching plant requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch plant requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "spv_staff") {
      return NextResponse.json(
        { error: "Unauthorized - SPV Staff access required" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const {
      plantId,
      requestType,
      deleteReason,
      historyId,
      originalDescription,
      newDescription,
    } = body;

    // Validate required fields
    if (!plantId || !requestType) {
      return NextResponse.json(
        { error: "Plant ID and request type are required" },
        { status: 400 }
      );
    }

    // Validate based on request type
    if (requestType === "delete" && !deleteReason) {
      return NextResponse.json(
        { error: "Delete reason is required for delete requests" },
        { status: 400 }
      );
    }

    if (
      (requestType === "update_history" || requestType === "delete_history") &&
      !historyId
    ) {
      return NextResponse.json(
        { error: "History ID is required for history operations" },
        { status: 400 }
      );
    }

    if (
      requestType === "update_history" &&
      (!originalDescription || !newDescription)
    ) {
      return NextResponse.json(
        {
          error:
            "Original and new descriptions are required for update requests",
        },
        { status: 400 }
      );
    }

    // Create the request
    const plantRequest = new PlantRequest({
      plantId,
      requestedBy: session.user.id,
      requestType,
      deleteReason,
      historyId,
      originalDescription,
      newDescription,
    });

    await plantRequest.save();

    // Populate the user data for response
    await plantRequest.populate("requestedBy", "fullName email");

    return NextResponse.json(
      {
        success: true,
        data: plantRequest,
        message: "Request submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating plant request:", error);
    return NextResponse.json(
      { error: "Failed to create plant request" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { requestId, status, reviewNotes } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: "Request ID and status are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be either approved or rejected" },
        { status: 400 }
      );
    }

    // Update the request
    const updatedRequest = await PlantRequest.findByIdAndUpdate(
      requestId,
      {
        status,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNotes,
      },
      { new: true }
    )
      .populate("requestedBy", "fullName email")
      .populate("reviewedBy", "fullName");

    if (!updatedRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // If approved, perform the actual operation
    if (status === "approved") {
      try {
        console.log('Performing approved action for request:', updatedRequest.requestType);
        await performApprovedAction(updatedRequest);
        console.log('Approved action completed successfully');
      } catch (error) {
        console.error("Error performing approved action:", error);
        // Still return success since the request was updated, but log the error
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Request ${status} successfully`,
    });
  } catch (error) {
    console.error("Error updating plant request:", error);
    return NextResponse.json(
      { error: "Failed to update plant request" },
      { status: 500 }
    );
  }
}
