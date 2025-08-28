import { getServerSession } from 'next-auth/next';
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("[cicilan] Payment proof upload API called");

    const privateKey = "private_nmGGpZ++RRY1MW+OetGD6yr63wE=";

    console.log("[cicilan] Parsing form data");
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const orderId = formData.get("orderId") as string;

    if (!file) {
      console.log("[cicilan] No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!orderId) {
      console.log("[cicilan] No orderId provided");
      return NextResponse.json({ error: "No orderId provided" }, { status: 400 });
    }

    // Validate file type (allow common image formats)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: "Invalid file type. Only JPEG, PNG, and WebP images are allowed"
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: "File size too large. Maximum size is 5MB"
      }, { status: 400 });
    }

    console.log("[cicilan] File received:", file.name, file.size, file.type);

    console.log("[cicilan] Converting file to buffer");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const fileName = `cicilan-proof-${orderId}-${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    console.log("[cicilan] Uploading to ImageKit via REST API...");

    const uploadFormData = new FormData();
    uploadFormData.append("file", new Blob([buffer], { type: file.type }), fileName);
    uploadFormData.append("fileName", fileName);
    uploadFormData.append("folder", "/cicilan-payments");
    uploadFormData.append("tags", "cicilan,payment-proof,installment");

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
      },
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("[cicilan] ImageKit API error:", response.status, errorText);
      throw new Error(`ImageKit API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("[cicilan] ImageKit upload successful:", result.url);

    return NextResponse.json({
      success: true,
      imageUrl: result.url,
      fileId: result.fileId,
      orderId,
    });
  } catch (error) {
    console.error("[cicilan] Upload error occurred:", error);
    console.error("[cicilan] Error type:", typeof error);
    console.error("[cicilan] Error constructor:", error?.constructor?.name);

    let errorMessage = "Unknown error";
    try {
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("[cicilan] Error message:", errorMessage);
        console.error("[cicilan] Error stack:", error.stack);
      } else {
        errorMessage = String(error);
        console.error("[cicilan] Non-Error object:", errorMessage);
      }
    } catch (stringifyError) {
      console.error("[cicilan] Error stringifying error:", stringifyError);
      errorMessage = "Error occurred but could not be serialized";
    }

    return NextResponse.json(
      {
        error: "Upload failed",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}