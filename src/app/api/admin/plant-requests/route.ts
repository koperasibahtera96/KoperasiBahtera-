import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import PlantRequest from "@/models/PlantRequest";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

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
