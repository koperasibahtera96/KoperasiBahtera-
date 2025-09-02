import dbConnect from '@/lib/mongodb';
import Review from '@/models/Review';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/reviews - Get all reviews for admin
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'rejected', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    let filter = {};
    if (status && status !== 'all') {
      if (status === 'pending') filter = { isApproved: false };
      else if (status === 'approved') filter = { isApproved: true };
    }

    const [reviews, totalCount] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('GET /api/admin/reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/reviews - Update review status or landing page display
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { reviewId, isApproved, showOnLanding } = body;

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      );
    }

    // Prepare update object
    const updateData: any = {};
    if (typeof isApproved === 'boolean') {
      updateData.isApproved = isApproved;
      // If rejecting, also remove from landing page
      if (!isApproved) {
        updateData.showOnLanding = false;
      }
    }
    
    if (typeof showOnLanding === 'boolean') {
      // Only allow showing on landing if review is approved
      if (showOnLanding) {
        const reviewToCheck = await Review.findById(reviewId);
        if (!reviewToCheck || !reviewToCheck.isApproved) {
          return NextResponse.json(
            { success: false, error: 'Only approved reviews can be shown on landing page' },
            { status: 400 }
          );
        }

        // Check if we already have 3 reviews on landing page
        const currentLandingReviews = await Review.countDocuments({ 
          showOnLanding: true, 
          _id: { $ne: reviewId } 
        });
        
        if (currentLandingReviews >= 3) {
          return NextResponse.json(
            { success: false, error: 'Maximum 3 reviews can be shown on landing page' },
            { status: 400 }
          );
        }
      }
      updateData.showOnLanding = showOnLanding;
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      updateData,
      { new: true }
    );

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    let message = 'Review updated successfully';
    if (typeof isApproved === 'boolean') {
      message = `Review ${isApproved ? 'approved' : 'rejected'} successfully`;
    } else if (typeof showOnLanding === 'boolean') {
      message = `Review ${showOnLanding ? 'added to' : 'removed from'} landing page`;
    }

    return NextResponse.json({
      success: true,
      message,
      data: review
    });
  } catch (error) {
    console.error('PUT /api/admin/reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/reviews - Delete review
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('id');

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const review = await Review.findByIdAndDelete(reviewId);

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /api/admin/reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}