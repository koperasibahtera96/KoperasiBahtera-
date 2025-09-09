import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import AdminLog from "@/models/AdminLog";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const action = searchParams.get("action") || "";
    const targetType = searchParams.get("targetType") || "";
    const adminId = searchParams.get("adminId") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery: any = {};

    if (action) {
      searchQuery.action = action;
    }

    if (targetType) {
      searchQuery.targetType = targetType;
    }

    if (adminId) {
      searchQuery.adminId = adminId;
    }

    if (dateFrom || dateTo) {
      searchQuery.createdAt = {};
      if (dateFrom) {
        searchQuery.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        searchQuery.createdAt.$lte = new Date(dateTo);
      }
    }

    // Get total count
    const total = await AdminLog.countDocuments(searchQuery);

    // Get admin logs
    const logs = await AdminLog.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('adminId', 'fullName email userCode');

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching admin logs:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal server",
      },
      { status: 500 }
    );
  }
}