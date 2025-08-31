import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

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

    // Check if email already exists
    const existingUserByEmail = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    // Check if phone number already exists
    const existingUserByPhone = await User.findOne({ 
      phoneNumber: phoneNumber.trim() 
    });

    const errors = [];

    if (existingUserByEmail) {
      errors.push('Email sudah terdaftar. Silakan gunakan email lain atau login.');
    }

    if (existingUserByPhone) {
      errors.push('Nomor telepon sudah terdaftar. Silakan gunakan nomor lain atau login.');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          available: false, 
          errors 
        },
        { status: 409 } // Conflict status
      );
    }

    return NextResponse.json({
      available: true,
      message: 'Email dan nomor telepon tersedia'
    });

  } catch (error) {
    console.error('Check availability error:', error);
    return NextResponse.json(
      { error: 'Gagal memeriksa ketersediaan data' },
      { status: 500 }
    );
  }
}