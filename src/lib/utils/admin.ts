import User from "@/models/User";
import AdminLog from "@/models/AdminLog";
import dbConnect from "@/lib/mongodb";
import { NextRequest } from 'next/server';

export async function getFirstAdminId(): Promise<string> {
  try {
    await dbConnect();
    const admin = await User.findOne({ role: "admin" }).select("_id");
    return admin?._id?.toString() || "";
  } catch (error) {
    console.error("Failed to find admin user:", error);
    return "";
  }
}

export interface LogAdminActionParams {
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: 'create_staff' | 'update_staff' | 'delete_staff' | 'update_plant_prices';
  description: string;
  targetType: 'staff' | 'plant';
  targetId?: string;
  targetName?: string;
  oldData?: any;
  newData?: any;
  request?: NextRequest;
}

export async function logAdminAction({
  adminId,
  adminName,
  adminEmail,
  action,
  description,
  targetType,
  targetId,
  targetName,
  oldData,
  newData,
  request
}: LogAdminActionParams): Promise<void> {
  try {
    // Extract IP and User Agent from request if provided
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      ipAddress = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      userAgent = request.headers.get('user-agent') || 'unknown';
    }

    const logEntry = new AdminLog({
      adminId,
      adminName,
      adminEmail,
      action,
      description,
      targetType,
      targetId,
      targetName,
      oldData,
      newData,
      ipAddress,
      userAgent
    });

    await logEntry.save();
    console.log(`Admin action logged: ${action} by ${adminEmail}`);
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw error to prevent disrupting the main operation
  }
}

// Helper function to format data changes for logging
export function formatDataChanges(oldData: any, newData: any): { oldData: any; newData: any } {
  // Remove sensitive data like passwords
  const sanitizeData = (data: any) => {
    if (!data) return data;
    const sanitized = { ...data };
    if ('password' in sanitized) {
      sanitized.password = '[HIDDEN]';
    }
    return sanitized;
  };

  return {
    oldData: sanitizeData(oldData),
    newData: sanitizeData(newData)
  };
}