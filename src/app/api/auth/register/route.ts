import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { occupationOptions } from '@/constant/OCCUPATION';
import generateUserCode from '@/lib/userCodeGenerator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      fullName,
      nik,
      email,
      phoneNumber,
      password,
      dateOfBirth,
      ktpAddress,
      ktpVillage,
      ktpCity,
      ktpProvince,
      ktpPostalCode,
      domisiliAddress,
      domisiliVillage,
      domisiliCity,
      domisiliProvince,
      domisiliPostalCode,
      occupation,
      beneficiaryName,
      beneficiaryNik,
      beneficiaryDateOfBirth,
      beneficiaryRelationship,
      ktpImageUrl,
      faceImageUrl
    } = body;

    // Log received data for debugging
    console.log('Registration data received:', {
      fullName: fullName ? 'Present' : 'Missing',
      nik: nik ? 'Present' : 'Missing',
      email: email ? 'Present' : 'Missing',
      phoneNumber: phoneNumber ? 'Present' : 'Missing',
      dateOfBirth: dateOfBirth ? 'Present' : 'Missing',
      ktpAddress: ktpAddress ? 'Present' : 'Missing',
      ktpVillage: ktpVillage ? 'Present' : 'Missing',
      ktpCity: ktpCity ? 'Present' : 'Missing',
      ktpProvince: ktpProvince ? 'Present' : 'Missing',
      ktpPostalCode: ktpPostalCode ? 'Present' : 'Missing',
      domisiliAddress: domisiliAddress ? 'Present' : 'Missing',
      domisiliVillage: domisiliVillage ? 'Present' : 'Missing',
      domisiliCity: domisiliCity ? 'Present' : 'Missing',
      domisiliProvince: domisiliProvince ? 'Present' : 'Missing',
      domisiliPostalCode: domisiliPostalCode ? 'Present' : 'Missing',
      occupation: occupation ? 'Present' : 'Missing',
      ktpImageUrl: ktpImageUrl ? 'Present' : 'Missing',
      faceImageUrl: faceImageUrl ? 'Present' : 'Missing',
    });

    // Server-side validation
    if (!fullName || !nik || !email || !phoneNumber || !password || !dateOfBirth || !ktpAddress || !ktpVillage || !ktpCity || !ktpProvince || !ktpPostalCode || !domisiliAddress || !domisiliVillage || !domisiliCity || !domisiliProvince || !domisiliPostalCode || !occupation || !beneficiaryName || !beneficiaryNik || !beneficiaryDateOfBirth || !beneficiaryRelationship || !ktpImageUrl || !faceImageUrl) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi, termasuk NIK, alamat KTP, alamat domisili, data penerima manfaat, KTP dan foto wajah' },
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

    if (!/(?=.*[@$!%*?&.])/.test(password)) {
      return NextResponse.json(
        { error: 'Password harus mengandung karakter khusus (@$!%*?&.)' },
        { status: 400 }
      );
    }

    // Validate date of birth
    const dobDate = new Date(dateOfBirth);


    // Validate NIK
    if (!/^[0-9]{16}$/.test(nik)) {
      return NextResponse.json(
        { error: 'NIK harus berisi 16 digit angka' },
        { status: 400 }
      );
    }

    // Validate postal codes
    if (!/^[0-9]{5}$/.test(ktpPostalCode)) {
      return NextResponse.json(
        { error: 'Kode pos KTP harus 5 digit angka' },
        { status: 400 }
      );
    }

    if (!/^[0-9]{5}$/.test(domisiliPostalCode)) {
      return NextResponse.json(
        { error: 'Kode pos domisili harus 5 digit angka' },
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

    // Validate beneficiary name
    if (beneficiaryName.length < 2 || beneficiaryName.length > 100) {
      return NextResponse.json(
        { error: 'Nama penerima manfaat harus antara 2-100 karakter' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z\s\.]+$/.test(beneficiaryName)) {
      return NextResponse.json(
        { error: 'Nama penerima manfaat hanya boleh berisi huruf, spasi, dan titik' },
        { status: 400 }
      );
    }

    // Validate beneficiary NIK
    if (!/^[0-9]{16}$/.test(beneficiaryNik)) {
      return NextResponse.json(
        { error: 'NIK penerima manfaat harus berisi 16 digit angka' },
        { status: 400 }
      );
    }

    // Validate beneficiary relationship
    const validRelationships = ['orangtua', 'suami_istri', 'anak_kandung', 'saudara_kandung'];
    if (!validRelationships.includes(beneficiaryRelationship)) {
      return NextResponse.json(
        { error: 'Hubungan dengan penerima manfaat tidak valid' },
        { status: 400 }
      );
    }

    // Validate beneficiary date of birth
    const beneficiaryDobDate = new Date(beneficiaryDateOfBirth);

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

    // Generate a unique userCode using an atomic counter to avoid duplicates under concurrency
    const { userCode } = await generateUserCode(occupationCode);

    // Use the already validated date of birth
    // dobDate was already parsed and validated above

    // Create user
    const user = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName.trim(),
      nik: nik.trim(),
      phoneNumber: phoneNumber.trim(),
      dateOfBirth: dobDate,
      ktpAddress: ktpAddress.trim(),
      ktpVillage: ktpVillage.trim(),
      ktpCity: ktpCity.trim(),
      ktpProvince: ktpProvince.trim(),
      ktpPostalCode: ktpPostalCode.trim(),
      domisiliAddress: domisiliAddress.trim(),
      domisiliVillage: domisiliVillage.trim(),
      domisiliCity: domisiliCity.trim(),
      domisiliProvince: domisiliProvince.trim(),
      domisiliPostalCode: domisiliPostalCode.trim(),
      occupation: occupation.trim(),
      occupationCode: occupationCode,
      userCode: userCode,
      beneficiaryName: beneficiaryName.trim(),
      beneficiaryNik: beneficiaryNik.trim(),
      beneficiaryDateOfBirth: beneficiaryDobDate,
      beneficiaryRelationship: beneficiaryRelationship,
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
      nik: user.nik,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      ktpAddress: user.ktpAddress,
      ktpVillage: user.ktpVillage,
      ktpCity: user.ktpCity,
      ktpProvince: user.ktpProvince,
      ktpPostalCode: user.ktpPostalCode,
      domisiliAddress: user.domisiliAddress,
      domisiliVillage: user.domisiliVillage,
      domisiliCity: user.domisiliCity,
      domisiliProvince: user.domisiliProvince,
      domisiliPostalCode: user.domisiliPostalCode,
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
          nik: user.nik,
          phoneNumber: user.phoneNumber,
          dateOfBirth: user.dateOfBirth,
          ktpAddress: user.ktpAddress,
          ktpVillage: user.ktpVillage,
          ktpCity: user.ktpCity,
          ktpProvince: user.ktpProvince,
          ktpPostalCode: user.ktpPostalCode,
          domisiliAddress: user.domisiliAddress,
          domisiliVillage: user.domisiliVillage,
          domisiliCity: user.domisiliCity,
          domisiliProvince: user.domisiliProvince,
          domisiliPostalCode: user.domisiliPostalCode,
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
                       field === 'phoneNumber' ? 'Nomor telepon' :
                       field === 'userCode' ? 'Kode pengguna' : field;

      if (field === 'userCode') {
        return NextResponse.json(
          { error: 'Terjadi kesalahan dalam membuat kode pengguna. Silakan coba lagi.' },
          { status: 500 }
        );
      }

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