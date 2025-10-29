import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { token, newPassword } = await request.json();

    // Validate input
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    if (!/(?=.*[a-z])/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password harus mengandung huruf kecil' },
        { status: 400 }
      );
    }

    if (!/(?=.*[A-Z])/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password harus mengandung huruf besar' },
        { status: 400 }
      );
    }

    if (!/(?=.*\d)/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password harus mengandung angka' },
        { status: 400 }
      );
    }

    if (!/(?=.*[@$!%*?&.])/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password harus mengandung karakter khusus (@$!%*?&.)' },
        { status: 400 }
      );
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Token reset password tidak valid atau sudah kadaluarsa' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token fields (using updateOne to bypass validation)
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: '', resetPasswordExpires: '' },
      }
    );

    return NextResponse.json(
      { message: 'Password berhasil direset' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mereset password' },
      { status: 500 }
    );
  }
}
