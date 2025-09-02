
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const fileName = `profile-${session.user.email}-${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Upload to ImageKit using REST API (consistent with existing upload route)
    const privateKey = "private_nmGGpZ++RRY1MW+OetGD6yr63wE=";
    
    const uploadFormData = new FormData();
    uploadFormData.append("file", new Blob([buffer], { type: file.type }), fileName);
    uploadFormData.append("fileName", fileName);
    uploadFormData.append("folder", "/profiles");
    uploadFormData.append("tags", "profile,user");

    const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`ImageKit API error: ${uploadResponse.status} ${errorText}`);
    }

    const result = await uploadResponse.json();

    // Connect to database and update user
    await dbConnect();

    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { profileImageUrl: result.url },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profileImageUrl: result.url,
      fileId: result.fileId,
      message: 'Profile image updated successfully'
    });

  } catch (error: any) {
    console.error('Error uploading profile image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload profile image' },
      { status: 500 }
    );
  }
}