import dbConnect from "@/lib/mongodb"
import { handleMongooseError, isMongooseError } from "@/lib/mongooseErrorHandler"
import User from "@/models/User"
import bcrypt from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, phoneNumber, password } = body

    if (!fullName || !phoneNumber || !password) {
      return NextResponse.json(
        { error: 'Nama lengkap, nomor telepon, dan password wajib diisi' },
        { status: 400 }
      )
    }

    await dbConnect()

    const existingUser = await User.findOne({
      phoneNumber: phoneNumber.trim()
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Nomor telepon sudah terdaftar' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const currentYear = new Date().getFullYear().toString().slice(-2)
    const lastStaffUser = await User.findOne({
      role: 'staff',
      userCode: { $regex: `^ST-${currentYear}-` }
    }).sort({ userCode: -1 }).select('userCode')

    let sequential = 1
    if (lastStaffUser && lastStaffUser.userCode) {
      const lastSequential = parseInt(lastStaffUser.userCode.split('-')[2])
      sequential = lastSequential + 1
    }
    const userCode = `ST-${currentYear}-${sequential.toString().padStart(3, '0')}`

    const user = new User({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      email: `${userCode.toLowerCase()}@staff.local`,
      dateOfBirth: new Date(),
      address: 'Alamat belum diisi',
      village: 'Desa belum diisi',
      city: 'Kota belum diisi',
      province: 'Provinsi belum diisi',
      postalCode: '00000',
      occupation: 'Staff Lapangan',
      occupationCode: 'ST',
      userCode: userCode,
      role: 'staff',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    })

    await user.save()

    return NextResponse.json(
      {
        message: 'Staff berhasil dibuat',
        user: {
          id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          userCode: user.userCode,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        }
      },
      { status: 201 }
    )

  } catch (error: unknown) {
    console.error('Staff creation error:', error)

    // Check if it's a Mongoose error
    if (isMongooseError(error)) {
      const mongooseResponse = handleMongooseError(error, {
        customMessages: {
          phoneNumber: 'Nomor telepon sudah terdaftar',
          email: 'Email sudah terdaftar'
        }
      })

      if (mongooseResponse) {
        return mongooseResponse
      }
    }

    // Handle non-Mongoose errors
    if (error && typeof error === 'object' && 'message' in error) {
      return NextResponse.json({
        success: false,
        error: (error as { message: string }).message
      }, { status: 500 })
    }

    // Generic fallback error
    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan internal server'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Build search query
    const searchQuery = search
      ? {
          role: 'staff',
          $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } },
            { userCode: { $regex: search, $options: 'i' } }
          ]
        }
      : { role: 'staff' }

    // Get total count
    const total = await User.countDocuments(searchQuery)

    // Get staff users
    const staffUsers = await User.find(searchQuery)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    return NextResponse.json({
      success: true,
      data: staffUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error: unknown) {
    console.error('Error fetching staff users:', error)

    // Check if it's a Mongoose error
    if (isMongooseError(error)) {
      const mongooseResponse = handleMongooseError(error)

      if (mongooseResponse) {
        return mongooseResponse
      }
    }

    // Handle non-Mongoose errors
    if (error && typeof error === 'object' && 'message' in error) {
      return NextResponse.json({
        success: false,
        error: (error as { message: string }).message
      }, { status: 500 })
    }

    // Generic fallback error
    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan internal server'
    }, { status: 500 })
  }
}