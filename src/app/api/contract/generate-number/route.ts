import dbConnect from "@/lib/mongodb";
import Contract from "@/models/Contract";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

function getProductCode(productName: string): string | null {
  const productMap: { [key: string]: string } = {
    'Alpukat': 'ALP',
    'Gaharu': 'GHR',
    'Jengkol': 'JGL',
    'Aren': 'ARN'
  };

  for (const [name, code] of Object.entries(productMap)) {
    if (productName.toLowerCase().includes(name.toLowerCase())) {
      return code;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productName } = await req.json();

    if (!productName) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user creation order (member number)
    const userIndex = await User.countDocuments({
      createdAt: { $lte: user.createdAt }
    });
    const memberNumber = userIndex.toString().padStart(4, '0');

    // Get global contract sequence
    const contractCount = await Contract.countDocuments({});
    const sequenceNumber = (contractCount + 1).toString().padStart(4, '0');

    // Map product name to code
    const productCode = getProductCode(productName);
    if (!productCode) {
      return NextResponse.json(
        { error: "Invalid product name. Must contain: Alpukat, Gaharu, Jengkol, or Aren" },
        { status: 400 }
      );
    }

    // Generate date components
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();

    // Format: PKS/BMS-MRU/PRODUCT/LGL/MM/YYYY/MEMBER-SEQUENCE
    const contractNumber = `PKS/BMS-MRU/${productCode}/LGL/${month}/${year}/${memberNumber}-${sequenceNumber}`;

    // Generate contract ID for frontend use
    const contractId = `CONTRACT-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}`;

    return NextResponse.json({
      success: true,
      data: {
        contractNumber,
        contractId,
        memberNumber,
        sequenceNumber,
        productCode
      }
    });

  } catch (error) {
    console.error("Error generating contract number:", error);
    return NextResponse.json(
      {
        error: "Failed to generate contract number",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}