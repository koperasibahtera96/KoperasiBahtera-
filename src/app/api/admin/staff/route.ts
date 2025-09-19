import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import {
  handleMongooseError,
  isMongooseError,
} from "@/lib/mongooseErrorHandler";
import { generateReferralCode } from "@/lib/referral";
import { logAdminAction } from "@/lib/utils/admin";
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
    let prefix = "ST"; // Default for Staff
    let dbRole = "staff"; // Default for Staff
    
    switch (role) {
      case "SPV Staff":
        prefix = "SPV";
        dbRole = "spv_staff";
        break;
      case "Admin":
        prefix = "ADM";
        dbRole = "admin";
        break;
      case "Finance":
        prefix = "FIN";
        dbRole = "finance";
        break;
      case "Staff Finance":
        prefix = "SFN";
        dbRole = "staff_finance";
        break;
      case "Ketua":
        prefix = "KET";
        dbRole = "ketua";
        break;
      case "Marketing":
        prefix = "MKT";
        dbRole = "marketing";
        break;
      case "Marketing Head":
        prefix = "MKH";
        dbRole = "marketing_head";
        break;
      default:
        prefix = "ST";
        dbRole = "staff";
    }

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

    // Generate referral code for marketing staff (both marketing and marketing_head)
    let referralCode;
    if (dbRole === "marketing" || dbRole === "marketing_head") {
      let isUnique = false;
      while (!isUnique) {
        referralCode = generateReferralCode();
        const existingCode = await User.findOne({ referralCode });
        if (!existingCode) {
          isUnique = true;
        }
      }
    }

    const user = new User({
      fullName: fullName.trim(),
      nik: "0000000000000000", // Default NIK for staff - should be updated later
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      email: email.trim().toLowerCase(),
      dateOfBirth: new Date(),
      // KTP Address - default values for staff
      ktpAddress: "Alamat KTP belum diisi",
      ktpVillage: "Desa KTP belum diisi",
      ktpCity: "Kota KTP belum diisi",
      ktpProvince: "Provinsi KTP belum diisi",
      ktpPostalCode: "00000",
      // Domisili Address - default values for staff
      domisiliAddress: "Alamat domisili belum diisi",
      domisiliVillage: "Desa domisili belum diisi",
      domisiliCity: "Kota domisili belum diisi",
      domisiliProvince: "Provinsi domisili belum diisi",
      domisiliPostalCode: "00000",
      occupation: role === "SPV Staff" ? "SPV Staff" :
                  role === "Admin" ? "Administrator" :
                  role === "Finance" ? "Staff Keuangan" :
                  role === "Staff Finance" ? "Staff Finance" :
                  role === "Ketua" ? "Ketua" :
                  role === "Marketing" ? "Marketing Staff" :
                  role === "Marketing Head" ? "Marketing Head" : "Staff Lapangan",
      occupationCode: prefix,
      userCode: userCode,
      role: dbRole,
      ...(referralCode && { referralCode }),
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      verificationStatus: "approved",
      verifiedBy: session?.user.id,
      verifiedAt: new Date(),
      canPurchase: true,
    });

    await user.save();

    // Log admin action
    if (session?.user) {
      await logAdminAction({
        adminId: session.user.id,
        adminName: session.user.name || 'Unknown',
        adminEmail: session.user.email || 'Unknown',
        action: 'create_staff',
        description: `Created new staff: ${user.fullName} (${user.userCode}) with role ${user.role}`,
        targetType: 'staff',
        targetId: user._id.toString(),
        targetName: user.fullName,
        newData: {
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          userCode: user.userCode,
          role: user.role,
          occupation: user.occupation
        },
        request
      });
    }

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
            { $or: [{ role: "staff" }, { role: "spv_staff" }, { role: "admin" }, { role: "finance" }, { role: "staff_finance" }, { role: "marketing" }] },
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
      : { $or: [{ role: "staff" }, { role: "spv_staff" }, { role: "admin" }, { role: "finance" }, { role: "staff_finance" }, { role: "ketua" }, { role: "marketing" }] };

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
    const session = await getServerSession(authOptions);
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

    // Store old data for logging
    const oldData = {
      fullName: staffUser.fullName,
      email: staffUser.email,
      phoneNumber: staffUser.phoneNumber,
      role: staffUser.role,
      occupation: staffUser.occupation
    };

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
    let updateDbRole = "staff";
    let updatePrefix = "ST";
    let updateOccupation = "Staff Lapangan";
    
    switch (role) {
      case "SPV Staff":
        updateDbRole = "spv_staff";
        updatePrefix = "SPV";
        updateOccupation = "SPV Staff";
        break;
      case "Admin":
        updateDbRole = "admin";
        updatePrefix = "ADM";
        updateOccupation = "Administrator";
        break;
      case "Finance":
        updateDbRole = "finance";
        updatePrefix = "FIN";
        updateOccupation = "Staff Keuangan";
        break;
      case "Staff Finance":
        updateDbRole = "staff_finance";
        updatePrefix = "SFN";
        updateOccupation = "Staff Finance";
        break;
      case "Ketua":
        updateDbRole = "ketua";
        updatePrefix = "KET";
        updateOccupation = "Ketua";
        break;
      case "Marketing":
        updateDbRole = "marketing";
        updatePrefix = "MKT";
        updateOccupation = "Marketing Staff";
        break;
      default:
        updateDbRole = "staff";
        updatePrefix = "ST";
        updateOccupation = "Staff Lapangan";
    }
    
    const updateData: any = {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim().toLowerCase(),
      role: updateDbRole,
      occupation: updateOccupation,
      occupationCode: updatePrefix,
    };

    // Generate referral code if role is changed to marketing and doesn't have one
    if (updateDbRole === "marketing" && !staffUser.referralCode) {
      let referralCode;
      let isUnique = false;
      while (!isUnique) {
        referralCode = generateReferralCode();
        const existingCode = await User.findOne({ referralCode });
        if (!existingCode) {
          isUnique = true;
        }
      }
      updateData.referralCode = referralCode;
    }

    // If password is provided, hash and update it
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password.trim(), 12);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    // Log admin action
    if (session?.user && updatedUser) {
      const newData = {
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
        occupation: updatedUser.occupation
      };

      await logAdminAction({
        adminId: session.user.id,
        adminName: session.user.name || 'Unknown',
        adminEmail: session.user.email || 'Unknown',
        action: 'update_staff',
        description: `Updated staff: ${updatedUser.fullName} (${updatedUser.userCode})`,
        targetType: 'staff',
        targetId: updatedUser._id.toString(),
        targetName: updatedUser.fullName,
        oldData,
        newData,
        request
      });
    }

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
