import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import {
  handleMongooseError,
  isMongooseError,
} from "@/lib/mongooseErrorHandler";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { fullName, phoneNumber, email, role, password } = body;

    if (!fullName || !phoneNumber || !email || !role || !password) {
      return NextResponse.json(
        {
          error:
            "Nama lengkap, nomor telepon, email, role, dan password wajib diisi",
        },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check for existing phone number
    const existingPhoneUser = await User.findOne({
      phoneNumber: phoneNumber.trim(),
    });

    if (existingPhoneUser) {
      return NextResponse.json(
        { error: "Nomor telepon sudah terdaftar" },
        { status: 400 }
      );
    }

    // Check for existing email
    const existingEmailUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmailUser) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const currentYear = new Date().getFullYear().toString().slice(-2);

    // Determine prefix based on role
    const prefix = role === "SPV Staff" ? "SPV" : "ST";

    const dbRole = role === "SPV Staff" ? "spv_staff" : "staff";

    const lastStaffUser = await User.findOne({
      role: dbRole,
      userCode: { $regex: `^${prefix}-${currentYear}-` },
    })
      .sort({ userCode: -1 })
      .select("userCode");

    let sequential = 1;
    if (lastStaffUser && lastStaffUser.userCode) {
      const lastSequential = parseInt(lastStaffUser.userCode.split("-")[2]);
      sequential = lastSequential + 1;
    }
    const userCode = `${prefix}-${currentYear}-${sequential
      .toString()
      .padStart(3, "0")}`;

    const user = new User({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      email: email.trim().toLowerCase(),
      dateOfBirth: new Date(),
      address: "Alamat belum diisi",
      village: "Desa belum diisi",
      city: "Kota belum diisi",
      province: "Provinsi belum diisi",
      postalCode: "00000",
      occupation: role === "SPV Staff" ? "SPV Staff" : "Staff Lapangan",
      occupationCode: prefix,
      userCode: userCode,
      role: dbRole,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      verificationStatus: "approved",
      verifiedBy: session?.user.id,
      verifiedAt: new Date(),
    });

    await user.save();

    return NextResponse.json(
      {
        message: "Staff berhasil dibuat",
        user: {
          id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          email: user.email,
          userCode: user.userCode,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Staff creation error:", error);

    // Check if it's a Mongoose error
    if (isMongooseError(error)) {
      const mongooseResponse = handleMongooseError(error, {
        customMessages: {
          phoneNumber: "Nomor telepon sudah terdaftar",
          email: "Email sudah terdaftar",
        },
      });

      if (mongooseResponse) {
        return mongooseResponse;
      }
    }

    // Handle non-Mongoose errors
    if (error && typeof error === "object" && "message" in error) {
      return NextResponse.json(
        {
          success: false,
          error: (error as { message: string }).message,
        },
        { status: 500 }
      );
    }

    // Generic fallback error
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal server",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = search
      ? {
          $and: [
            { $or: [{ role: "staff" }, { role: "spv_staff" }] },
            {
              $or: [
                { fullName: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { userCode: { $regex: search, $options: "i" } },
              ],
            },
          ],
        }
      : { $or: [{ role: "staff" }, { role: "spv_staff" }] };

    // Get total count
    const total = await User.countDocuments(searchQuery);

    // Get staff users
    const staffUsers = await User.find(searchQuery)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: staffUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching staff users:", error);

    // Check if it's a Mongoose error
    if (isMongooseError(error)) {
      const mongooseResponse = handleMongooseError(error);

      if (mongooseResponse) {
        return mongooseResponse;
      }
    }

    // Handle non-Mongoose errors
    if (error && typeof error === "object" && "message" in error) {
      return NextResponse.json(
        {
          success: false,
          error: (error as { message: string }).message,
        },
        { status: 500 }
      );
    }

    // Generic fallback error
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal server",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, fullName, phoneNumber, email, role, password } = body;

    if (!id || !fullName || !phoneNumber || !email || !role) {
      return NextResponse.json(
        {
          error: "ID, nama lengkap, nomor telepon, email, dan role wajib diisi",
        },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the staff user
    const staffUser = await User.findById(id);
    if (!staffUser) {
      return NextResponse.json(
        { error: "Staff tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check for existing phone number (excluding current user)
    const existingPhoneUser = await User.findOne({
      phoneNumber: phoneNumber.trim(),
      _id: { $ne: id },
    });

    if (existingPhoneUser) {
      return NextResponse.json(
        { error: "Nomor telepon sudah terdaftar" },
        { status: 400 }
      );
    }

    // Check for existing email (excluding current user)
    const existingEmailUser = await User.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: id },
    });

    if (existingEmailUser) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 400 }
      );
    }

    // Update user fields
    const updateDbRole = role === "SPV Staff" ? "spv_staff" : "staff";
    const updateData: any = {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim().toLowerCase(),
      role: updateDbRole,
      occupation: role === "SPV Staff" ? "SPV Staff" : "Staff Lapangan",
      occupationCode: role === "SPV Staff" ? "SPV" : "ST",
    };

    // If password is provided, hash and update it
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password.trim(), 12);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return NextResponse.json(
      {
        message: "Staff berhasil diperbarui",
        user: {
          id: updatedUser._id,
          fullName: updatedUser.fullName,
          phoneNumber: updatedUser.phoneNumber,
          email: updatedUser.email,
          userCode: updatedUser.userCode,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Staff update error:", error);

    // Check if it's a Mongoose error
    if (isMongooseError(error)) {
      const mongooseResponse = handleMongooseError(error, {
        customMessages: {
          phoneNumber: "Nomor telepon sudah terdaftar",
          email: "Email sudah terdaftar",
        },
      });

      if (mongooseResponse) {
        return mongooseResponse;
      }
    }

    // Handle non-Mongoose errors
    if (error && typeof error === "object" && "message" in error) {
      return NextResponse.json(
        {
          success: false,
          error: (error as { message: string }).message,
        },
        { status: 500 }
      );
    }

    // Generic fallback error
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal server",
      },
      { status: 500 }
    );
  }
}
