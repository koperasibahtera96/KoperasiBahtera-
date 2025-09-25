import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/reviews/featured - Create a new featured testimonial
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name, city, email, description, rating, photoUrl, videoUrl } = body;

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

    // Check if there's already a featured review and remove it
    const existingFeatured = await Review.findOne({ isFeatured: true });
    if (existingFeatured) {
      await Review.findByIdAndUpdate(existingFeatured._id, { isFeatured: false });
    }

    // Create new featured testimonial (auto-approved since it's admin-created)
    const featuredTestimonial = new Review({
      name: name.trim(),
      city: city.trim(),
      email: email.trim().toLowerCase(),
      description: description.trim(),
      photoUrl: photoUrl?.trim(),
      videoUrl: videoUrl?.trim(),
      rating: rating || 5,
      isApproved: true, // Auto-approved since it's admin-created
      isFeatured: true, // Set as featured
      isFlagged: false,
      flaggedWords: [],
      showOnLanding: false, // Featured testimonials don't need to be in regular landing reviews
    });

    await featuredTestimonial.save();

    return NextResponse.json({
      success: true,
      message: 'Featured testimonial created successfully',
      data: featuredTestimonial
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/reviews/featured error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create featured testimonial' },
      { status: 500 }
    );
  }
}