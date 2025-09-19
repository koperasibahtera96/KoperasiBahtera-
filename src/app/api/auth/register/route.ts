import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { occupationOptions } from '@/constant/OCCUPATION';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { 
      fullName, 
      email, 
      phoneNumber, 
      password,
      dateOfBirth,
      address,
      village,
      city,
      province,
      postalCode,
      occupation,
      ktpImageUrl,
      faceImageUrl
    } = body;

    // Log received data for debugging
    console.log('Registration data received:', {
      fullName: fullName ? 'Present' : 'Missing',
      email: email ? 'Present' : 'Missing',
      phoneNumber: phoneNumber ? 'Present' : 'Missing',
      dateOfBirth: dateOfBirth ? 'Present' : 'Missing',
      address: address ? 'Present' : 'Missing',
      village: village ? 'Present' : 'Missing',
      city: city ? 'Present' : 'Missing',
      province: province ? 'Present' : 'Missing',
      postalCode: postalCode ? 'Present' : 'Missing',
      occupation: occupation ? 'Present' : 'Missing',
      ktpImageUrl: ktpImageUrl ? 'Present' : 'Missing',
      faceImageUrl: faceImageUrl ? 'Present' : 'Missing',
    });

    // Server-side validation
    if (!fullName || !email || !phoneNumber || !password || !dateOfBirth || !address || !village || !city || !province || !postalCode || !occupation || !ktpImageUrl || !faceImageUrl) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi, termasuk KTP dan foto wajah' },
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

    // Validate date of birth
    const dobDate = new Date(dateOfBirth);


    // Validate postal code
    if (!/^[0-9]{5}$/.test(postalCode)) {
      return NextResponse.json(
        { error: 'Kode pos harus 5 digit angka' },
        { status: 400 }
      );
    }

    // Validate occupation
    const validOccupation = occupationOptions.find(opt => opt.value === occupation);
    if (!validOccupation) {
      return NextResponse.json(
        { error: 'Pekerjaan tidak valid' },
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

    // Get occupation code
    const occupationData = occupationOptions.find(opt => opt.value === occupation);
    const occupationCode = occupationData?.code || '999'; // Default to 'Lainnya' if not found

    // Generate user code - format: BMS-{OccupationCode}-{Year}-{Sequential}
    const currentYear = new Date().getFullYear().toString().slice(-2); // Last 2 digits of year
    
    // Find the last user with the same occupation code in the current year
    const lastUserCode = await User.findOne({
      occupationCode: occupationCode,
      userCode: { $regex: `^BMS-${occupationCode}-${currentYear}-` }
    })
    .sort({ userCode: -1 })
    .select('userCode');

    let sequential = 1;
    if (lastUserCode && lastUserCode.userCode) {
      const lastSequential = parseInt(lastUserCode.userCode.split('-')[3]);
      sequential = lastSequential + 1;
    }

    const userCode = `BMS-${occupationCode}-${currentYear}-${sequential.toString().padStart(3, '0')}`;

    // Use the already validated date of birth
    // dobDate was already parsed and validated above

    // Create user
    const user = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      dateOfBirth: dobDate,
      address: address.trim(),
      village: village.trim(),
      city: city.trim(),
      province: province.trim(),
      postalCode: postalCode.trim(),
      occupation: occupation.trim(),
      occupationCode: occupationCode,
      userCode: userCode,
      ktpImageUrl: ktpImageUrl.trim(),
      faceImageUrl: faceImageUrl.trim(),
      role: 'user',
      isEmailVerified: false,
      isPhoneVerified: false,
      isActive: true,
    });

    await user.save();

    // Log successful user creation with all fields
    console.log('User created successfully:', {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      village: user.village,
      city: user.city,
      province: user.province,
      postalCode: user.postalCode,
      occupation: user.occupation,
      occupationCode: user.occupationCode,
      userCode: user.userCode,
      ktpImageUrl: user.ktpImageUrl,
      faceImageUrl: user.faceImageUrl,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });

    return NextResponse.json(
      {
        message: 'Akun berhasil dibuat',
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
          village: user.village,
          city: user.city,
          province: user.province,
          postalCode: user.postalCode,
          occupation: user.occupation,
          occupationCode: user.occupationCode,
          userCode: user.userCode,
          ktpImageUrl: user.ktpImageUrl,
          faceImageUrl: user.faceImageUrl,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
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