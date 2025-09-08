import connectDB from "../mongodb";

export async function ensureConnection() {
  try {
    await connectDB();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

export async function generateUniqueId(prefix = ""): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}-${random}`;
}
