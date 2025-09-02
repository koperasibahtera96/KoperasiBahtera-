import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import { checkFilteredWords } from '@/lib/filterWords';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/reviews - Get reviews selected for landing page
export async function GET() {
  try {
    await dbConnect();

    const reviews = await Review.find({ 
      isApproved: true,
      showOnLanding: true 
    })
      .sort({ createdAt: -1 })
      .limit(3) // Show max 3 selected reviews for landing page
      .lean();

    return NextResponse.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('GET /api/reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Submit new review
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name, city, email, description, photoUrl, rating } = body;

    // Validate required fields
    if (!name || !city || !email || !description) {
      return NextResponse.json(
        { success: false, error: 'Semua field wajib diisi kecuali foto' },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'Rating harus antara 1-5 bintang' },
        { status: 400 }
      );
    }

    // Check for filtered words in name and description
    const nameCheck = await checkFilteredWords(name);
    const descriptionCheck = await checkFilteredWords(description);
    
    const allFlaggedWords = [...nameCheck.flaggedWords, ...descriptionCheck.flaggedWords];
    const isFlagged = nameCheck.isFlagged || descriptionCheck.isFlagged;

    // Create new review (will be pending approval)
    const newReview = new Review({
      name: name.trim(),
      city: city.trim(),
      email: email.trim().toLowerCase(),
      description: description.trim(),
      photoUrl: photoUrl?.trim(),
      rating: rating || 5, // Default to 5 stars if not provided
      isApproved: false, // Needs admin approval
      isFlagged,
      flaggedWords: [...new Set(allFlaggedWords)], // Remove duplicates
    });

    await newReview.save();

    return NextResponse.json({
      success: true,
      message: 'Review berhasil dikirim dan akan ditinjau oleh admin',
      data: newReview
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/reviews error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan review' },
      { status: 500 }
    );
  }
}