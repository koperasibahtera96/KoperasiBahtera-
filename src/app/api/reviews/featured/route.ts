import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import { NextResponse } from 'next/server';

// GET /api/reviews/featured - Get the featured testimonial
export async function GET() {
  try {
    await dbConnect();

    const featuredReview = await Review.findOne({
      isApproved: true,
      isFeatured: true
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: featuredReview
    });
  } catch (error) {
    console.error('GET /api/reviews/featured error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch featured review' },
      { status: 500 }
    );
  }
}