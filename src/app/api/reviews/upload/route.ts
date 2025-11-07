import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size too large. Maximum 5MB allowed.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueSuffix = timestamp + '-' + Math.round(Math.random() * 1E9);
    const filename = `review-${uniqueSuffix}.${file.name.split('.').pop()}`;

    // Upload to ImageKit using REST API
    const uploadFormData = new FormData();
    uploadFormData.append('file', new Blob([buffer], { type: file.type }), filename);
    uploadFormData.append('fileName', filename);
    uploadFormData.append('folder', '/reviews');
    uploadFormData.append('tags', 'review,testimonial');

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY!;
    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`,
      },
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ImageKit API error:', response.status, errorText);
      throw new Error(`ImageKit API error: ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        filename: result.name
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
