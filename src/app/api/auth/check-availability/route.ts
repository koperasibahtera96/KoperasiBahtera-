import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { email, phoneNumber } = body;

    if (!email || !phoneNumber) {
      return NextResponse.json(
        { error: 'Email and phone number are required' },
        { status: 400 }
      );
    }

    // Check if email already exists (phone uniqueness not enforced)
    const existingUserByEmail = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        {
          available: false,
          errors: ['Email sudah terdaftar. Silakan gunakan email lain atau login.'],
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      available: true,
      message: 'Email dan nomor telepon tersedia',
    });

  } catch (error) {
    console.error('Check availability error:', error);
    return NextResponse.json(
      { error: 'Gagal memeriksa ketersediaan data' },
      { status: 500 }
    );
  }
}