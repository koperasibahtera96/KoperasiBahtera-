import dbConnect from '@/lib/mongodb';
import Investor from '@/models/Investor';
import Tree from '@/models/Tree';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/trees - Get all trees
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const spesies = searchParams.get('spesies');
    const kondisi = searchParams.get('kondisi');
    const pemilik = searchParams.get('pemilik');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    // Apply search filter
    if (search) {
      query.$or = [
        { spesiesPohon: { $regex: search, $options: 'i' } },
        { lokasi: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply spesies filter
    if (spesies && spesies !== 'all') {
      query.spesiesPohon = { $regex: spesies, $options: 'i' };
    }

    // Apply kondisi filter
    if (kondisi && kondisi !== 'all') {
      query.kondisi = kondisi;
    }

    // Apply pemilik filter
    if (pemilik) {
      query.pemilik = pemilik;
    }

    // Get total count for pagination
    const totalItems = await Tree.countDocuments(query);

    // Apply pagination
    const skip = (page - 1) * limit;
    const trees = await Tree.find(query)
      .populate('pemilik', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Calculate statistics
    const allTrees = await Tree.find({});
    const stats = {
      total: allTrees.length,
      gaharu: allTrees.filter(t => t.spesiesPohon.toLowerCase().includes('gaharu')).length,
      alpukat: allTrees.filter(t => t.spesiesPohon.toLowerCase().includes('alpukat')).length,
      jengkol: allTrees.filter(t => t.spesiesPohon.toLowerCase().includes('jengkol')).length,
      sehat: allTrees.filter(t => t.kondisi === 'sehat').length,
      perlu_perawatan: allTrees.filter(t => t.kondisi === 'perlu_perawatan').length,
      sakit: allTrees.filter(t => t.kondisi === 'sakit').length
    };

    return NextResponse.json({
      success: true,
      data: trees,
      stats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('GET /api/admin/trees error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trees' },
      { status: 500 }
    );
  }
}

// POST /api/admin/trees - Create new tree
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    // Validate required fields
    const {
      spesiesPohon,
      pemilik,
      lokasi,
      umur,
      tinggi,
      tanggalTanam,
      kondisi = 'sehat'
    } = body;

    if (!spesiesPohon || !pemilik || !lokasi || umur === undefined || tinggi === undefined || !tanggalTanam) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate pemilik exists
    const investor = await Investor.findById(pemilik);
    if (!investor) {
      return NextResponse.json(
        { success: false, error: 'Investor not found' },
        { status: 400 }
      );
    }

    // Create new tree
    const newTree = new Tree({
      spesiesPohon,
      pemilik,
      lokasi,
      umur,
      tinggi,
      tanggalTanam,
      kondisi
    });

    await newTree.save();

    // Populate pemilik for response
    await newTree.populate('pemilik', 'name email');

    return NextResponse.json({
      success: true,
      data: newTree,
      message: 'Tree created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/admin/trees error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tree' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/trees - Update tree
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tree ID is required' },
        { status: 400 }
      );
    }

    // Validate pemilik exists if being updated
    if (updateData.pemilik) {
      const investor = await Investor.findById(updateData.pemilik);
      if (!investor) {
        return NextResponse.json(
          { success: false, error: 'Investor not found' },
          { status: 400 }
        );
      }
    }

    const tree = await Tree.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('pemilik', 'name email');

    if (!tree) {
      return NextResponse.json(
        { success: false, error: 'Tree not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tree,
      message: 'Tree updated successfully'
    });

  } catch (error) {
    console.error('PUT /api/admin/trees error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tree' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/trees - Delete tree
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tree ID is required' },
        { status: 400 }
      );
    }

    const tree = await Tree.findByIdAndDelete(id).populate('pemilik', 'name email');

    if (!tree) {
      return NextResponse.json(
        { success: false, error: 'Tree not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tree,
      message: 'Tree deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/admin/trees error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tree' },
      { status: 500 }
    );
  }
}