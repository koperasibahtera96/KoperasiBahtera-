import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/reviews/testimonial - Create a new testimonial (draft or featured)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name, city, email, description, rating, photoUrl, videoUrl, isFeatured } = body;

    // Validate required fields
    if (!name || !city || !email || !description) {
      return NextResponse.json(
        { success: false, error: 'Name, city, email, and description are required' },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1-5 stars' },
        { status: 400 }
      );
    }

    // If creating as featured, remove any existing featured testimonial
    if (isFeatured) {
      const existingFeatured = await Review.findOne({ isFeatured: true });
      if (existingFeatured) {
        await Review.findByIdAndUpdate(existingFeatured._id, { isFeatured: false });
      }
    }

    // Create new testimonial (auto-approved since it's admin-created)
    const newTestimonial = new Review({
      name: name.trim(),
      city: city.trim(),
      email: email.trim().toLowerCase(),
      description: description.trim(),
      photoUrl: photoUrl?.trim(),
      videoUrl: videoUrl?.trim(),
      rating: rating || 5,
      isApproved: true, // Auto-approved since it's admin-created
      isFeatured: Boolean(isFeatured), // Set featured status
      isFlagged: false,
      flaggedWords: [],
      showOnLanding: false, // Admin-created testimonials don't show on landing page by default
    });

    await newTestimonial.save();

    const responseMessage = isFeatured
      ? 'Featured testimonial created successfully'
      : 'Draft testimonial created successfully';

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: newTestimonial
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/reviews/testimonial error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create testimonial' },
      { status: 500 }
    );
  }
}