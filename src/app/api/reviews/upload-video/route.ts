import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('video') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No video file received.' }, { status: 400 });
    }

    // Validate file size (15MB = 15 * 1024 * 1024 bytes)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: 'Video file size must be less than 15MB.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Only MP4, WebM, and OGG video files are allowed.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = path.extname(file.name) || '.mp4';
    const filename = `video_${timestamp}_${randomString}${extension}`;

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public/uploads/videos');

    try {
      await writeFile(path.join(uploadsDir, filename), buffer);
    } catch (dirError) {
      // If directory doesn't exist, create it
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
        await writeFile(path.join(uploadsDir, filename), buffer);
      } else {
        throw dirError;
      }
    }

    const videoUrl = `/uploads/videos/${filename}`;

    return NextResponse.json({
      success: true,
      data: { url: videoUrl }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}