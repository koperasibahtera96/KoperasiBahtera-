import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ProfileChangeRequest from "@/models/ProfileChangeRequest";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { changeType, requestedValue, reason } = await request.json();

    if (!changeType || !requestedValue) {
      return NextResponse.json(
        { error: "Change type and requested value are required" },
        { status: 400 }
      );
    }

    if (!["fullName", "email"].includes(changeType)) {
      return NextResponse.json(
        { error: "Invalid change type" },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find the user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get current value
    const currentValue = user[changeType];

    if (currentValue === requestedValue.trim()) {
      return NextResponse.json(
        {
          error: `New ${
            changeType === "fullName" ? "name" : "email"
          } must be different from current ${
            changeType === "fullName" ? "name" : "email"
          }`,
        },
        { status: 400 }
      );
    }

    // Check if user has a pending request for the same field
    const existingRequest = await ProfileChangeRequest.findOne({
      userId: user._id,
      changeType: changeType,
      status: "pending",
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          error: `You already have a pending ${
            changeType === "fullName" ? "name" : "email"
          } change request`,
        },
        { status: 400 }
      );
    }

    // If changing email, check if the new email is already in use
    if (changeType === "email") {
      const existingUser = await User.findOne({
        email: requestedValue.trim(),
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email address is already in use" },
          { status: 400 }
        );
      }

      // Check if there's already a pending request for this email
      const existingEmailRequest = await ProfileChangeRequest.findOne({
        changeType: "email",
        requestedValue: requestedValue.trim(),
        status: "pending",
      });

      if (existingEmailRequest) {
        return NextResponse.json(
          { error: "This email address is already requested by another user" },
          { status: 400 }
        );
      }
    }

    // Create new profile change request
    const profileChangeRequest = new ProfileChangeRequest({
      userId: user._id,
      changeType: changeType,
      currentValue: currentValue,
      requestedValue: requestedValue.trim(),
      reason: reason ? reason.trim() : undefined,
      status: "pending",
      requestedAt: new Date(),
    });

    await profileChangeRequest.save();

    return NextResponse.json({
      success: true,
      message: `${
        changeType === "fullName" ? "Name" : "Email"
      } change request submitted successfully`,
      requestId: profileChangeRequest._id,
    });
  } catch (error: any) {
    console.error("Error submitting profile change request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit profile change request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Find the user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's profile change requests with populated user data
    const requests = await ProfileChangeRequest.find({ userId: user._id })
      .sort({ requestedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      requests: requests,
    });
  } catch (error: any) {
    console.error("Error fetching profile change requests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile change requests" },
      { status: 500 }
    );
  }
}
