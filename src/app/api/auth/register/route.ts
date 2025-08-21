import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { fullName, email, phoneNumber, password } = body;

    // Server-side validation
    if (!fullName || !email || !phoneNumber || !password) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    // Validate full name
    if (fullName.length < 2 || fullName.length > 100) {
      return NextResponse.json(
        { error: 'Nama lengkap harus antara 2-100 karakter' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z\s\.]+$/.test(fullName)) {
      return NextResponse.json(
        { error: 'Nama hanya boleh berisi huruf, spasi, dan titik' },
        { status: 400 }
      );
    }

    // Validate email
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Validate phone number
    if (!/^(\+62|0)[0-9]{9,13}$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Format nomor telepon Indonesia tidak valid' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return NextResponse.json(
        { error: 'Password harus mengandung huruf kecil' },
        { status: 400 }
      );
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return NextResponse.json(
        { error: 'Password harus mengandung huruf besar' },
        { status: 400 }
      );
    }

    if (!/(?=.*\d)/.test(password)) {
      return NextResponse.json(
        { error: 'Password harus mengandung angka' },
        { status: 400 }
      );
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return NextResponse.json(
        { error: 'Password harus mengandung karakter khusus (@$!%*?&)' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phoneNumber: phoneNumber.trim() }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase().trim()) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar' },
          { status: 400 }
        );
      }
      if (existingUser.phoneNumber === phoneNumber.trim()) {
        return NextResponse.json(
          { error: 'Nomor telepon sudah terdaftar' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      role: 'user',
      isEmailVerified: false,
      isPhoneVerified: false,
      isActive: true,
    });

    await user.save();

    return NextResponse.json(
      {
        message: 'Akun berhasil dibuat',
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        }
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('Registration error:', error);

    if (error && typeof error === 'object' && 'code' in error && error.code === 11000 && 'keyPattern' in error) {
      // Duplicate key error
      const keyPattern = (error as { keyPattern: Record<string, unknown> }).keyPattern;
      const field = Object.keys(keyPattern)[0];
      const fieldName = field === 'email' ? 'Email' :
                       field === 'phoneNumber' ? 'Nomor telepon' : field;
      return NextResponse.json(
        { error: `${fieldName} sudah terdaftar` },
        { status: 400 }
      );
    }

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
      const errors = (error as { errors: Record<string, { message: string }> }).errors;
      const firstError = Object.values(errors)[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Terjadi kesalahan internal server' },
      { status: 500 }
    );
  }
}