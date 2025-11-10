import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Generate a random secure password
function generateSecurePassword(length: number = 12): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = "";
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// PATCH - Toggle staff active status
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has finance or admin role
    const user = await User.findOne({ email: session.user.email });
    if (
      !user ||
      (user.role !== "finance" &&
        user.role !== "staff_finance" &&
        user.role !== "admin")
    ) {
      return NextResponse.json(
        {
          error: "Access denied. Finance, Admin, or Marketing Head role required.",
        },
        { status: 403 }
      );
    }

    const { staffId } = await req.json();

    if (!staffId) {
      return NextResponse.json(
        {
          error: "Staff ID is required",
        },
        { status: 400 }
      );
    }

    // Find the marketing staff
    const marketingStaff = await User.findById(staffId);
    if (
      !marketingStaff ||
      (marketingStaff.role !== "marketing" &&
        marketingStaff.role !== "marketing_head")
    ) {
      return NextResponse.json(
        {
          error: "Marketing staff not found",
        },
        { status: 404 }
      );
    }

    const newActiveStatus = !marketingStaff.isActive;
    let newPassword: string | null = null;
    let hashedPassword: string | undefined = undefined;

    // If deactivating, generate new password
    if (!newActiveStatus) {
      newPassword = generateSecurePassword(12);
      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    // Update the staff status and password if deactivating
    const updateData: any = {
      isActive: newActiveStatus,
    };

    if (hashedPassword) {
      updateData.password = hashedPassword;
    }

    await User.findByIdAndUpdate(staffId, updateData);

    // Note: NextAuth sessions are JWT-based and stateless, so we can't force logout directly
    // The user will be logged out on their next request when the middleware checks isActive
    // You could implement a token blacklist or session invalidation if needed

    const updatedStaff = await User.findById(staffId).select(
      "_id fullName email phoneNumber referralCode isActive"
    );

    return NextResponse.json({
      success: true,
      message: newActiveStatus
        ? "Staff berhasil diaktifkan"
        : "Staff berhasil dinonaktifkan dan password telah direset",
      data: {
        staff: updatedStaff,
        newPassword: newActiveStatus ? null : newPassword,
      },
    });
  } catch (error) {
    console.error("Error toggling staff status:", error);
    return NextResponse.json(
      {
        error: "Failed to toggle staff status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
