import dbConnect from '@/lib/mongodb';
import FilteredWord from '@/models/FilteredWord';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/filtered-words - Get all filtered words
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }
    if (search) {
      filter.word = { $regex: search, $options: 'i' };
    }

    const [filteredWords, totalCount] = await Promise.all([
      FilteredWord.find(filter)
        .sort({ word: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FilteredWord.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        filteredWords,
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
    console.error('GET /api/admin/filtered-words error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filtered words' },
      { status: 500 }
    );
  }
}

// POST /api/admin/filtered-words - Add new filtered word
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { word } = body;

    if (!word || typeof word !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Word is required and must be a string' },
        { status: 400 }
      );
    }

    // Create new filtered word
    const newFilteredWord = new FilteredWord({
      word: word.trim().toLowerCase(),
      isActive: true,
    });

    await newFilteredWord.save();

    return NextResponse.json({
      success: true,
      message: 'Filtered word added successfully',
      data: newFilteredWord
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/filtered-words error:', error);

    // Handle duplicate word error
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'This word is already in the filtered list' },
        { status: 409 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to add filtered word' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/filtered-words - Update filtered word status
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { wordId, isActive } = body;

    if (!wordId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Word ID and active status are required' },
        { status: 400 }
      );
    }

    const filteredWord = await FilteredWord.findByIdAndUpdate(
      wordId,
      { isActive },
      { new: true }
    );

    if (!filteredWord) {
      return NextResponse.json(
        { success: false, error: 'Filtered word not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Filtered word ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: filteredWord
    });
  } catch (error) {
    console.error('PUT /api/admin/filtered-words error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update filtered word' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/filtered-words - Delete filtered word
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const wordId = searchParams.get('id');

    if (!wordId) {
      return NextResponse.json(
        { success: false, error: 'Word ID is required' },
        { status: 400 }
      );
    }

    const filteredWord = await FilteredWord.findByIdAndDelete(wordId);

    if (!filteredWord) {
      return NextResponse.json(
        { success: false, error: 'Filtered word not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Filtered word deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /api/admin/filtered-words error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete filtered word' },
      { status: 500 }
    );
  }
}