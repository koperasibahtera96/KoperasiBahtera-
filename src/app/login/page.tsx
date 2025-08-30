'use client';

import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Handle redirect after successful login
  useEffect(() => {
    if (loginSuccess && session?.user?.role) {
      let redirectPath = '/';

      // Only redirect to specific pages for staff/admin/finance
      if (['admin', 'staff', 'finance'].includes(session.user.role)) {
        switch (session.user.role) {
          case 'admin':
            redirectPath = '/admin';
            break;
          case 'staff':
            redirectPath = '/staff';
            break;
          case 'finance':
            redirectPath = '/finance';
            break;
        }
      }

      // Regular users (role: 'user') go to landing page (/)
      window.location.href = redirectPath;
    }
  }, [loginSuccess, session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (!formData.password) {
      newErrors.password = 'Password wajib diisi';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password minimal 8 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear previous errors

    try {
      const { signIn } = await import('next-auth/react');

      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      console.log('SignIn result:', result); // Debug log

      if (result?.error) {
        // Handle specific error messages
        let errorMessage = 'Email atau password salah';
        if (result.error === 'CredentialsSignin') {
          errorMessage = 'Email atau password tidak valid';
        } else if (result.error.includes('Email dan password wajib diisi')) {
          errorMessage = 'Email dan password wajib diisi';
        } else if (result.error.includes('Email atau password tidak valid')) {
          errorMessage = 'Email atau password tidak valid';
        }

        setErrors({ submit: errorMessage });
      } else if (result?.ok) {
        console.log('Login successful, setting loginSuccess to true'); // Debug log
        setLoginSuccess(true);
        // The redirect will be handled by useEffect when session is available
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      setErrors({ submit: 'Terjadi kesalahan saat masuk. Silakan coba lagi.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4 sm:px-6 font-[family-name:var(--font-poppins)]"
      style={{
        backgroundImage: 'url(/landing/hero-bg.png)',
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/30"></div>

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-3 mb-6">
            <img
              src="/images/koperasi-logo.jpg"
              alt="Koperasi Logo"
              className="w-16 h-16 rounded-full"
            />
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-poppins)]">Investasi Hijau</h1>
              <p className="text-sm text-white/80">Koperasi BAHTERA</p>
            </div>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-[family-name:var(--font-poppins)]">Masuk ke Akun Anda</h2>
          <p className="text-white/80">Kelola investasi tanaman Anda dengan mudah</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-[#4C3D19] font-[family-name:var(--font-poppins)]">Masuk</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
              <FormField>
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="masukkan@email.com"
                  error={errors.email}
                  required
                />
              </FormField>

              <FormField>
                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Masukkan password"
                  error={errors.password}
                  required
                />
              </FormField>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-[#324D3E] border-gray-300 rounded focus:ring-[#324D3E]"
                  />
                  <span className="text-sm text-gray-600">Ingat saya</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#324D3E] hover:text-[#4C3D19] hover:underline"
                >
                  Lupa password?
                </Link>
              </div>

              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#364D32] to-[#889063] text-white px-8 py-3 rounded-full text-base font-semibold hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-poppins)]"
                >
                  {isLoading ? 'Sedang masuk...' : 'Masuk'}
                </button>
              </div>
            </form>
          </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-white/90">
            Belum punya akun?{' '}
            <Link
              href="/register"
              className="text-white font-medium hover:text-white/80 hover:underline font-[family-name:var(--font-poppins)]"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link
            href="/"
            className="text-sm text-white/70 hover:text-white hover:underline font-[family-name:var(--font-poppins)]"
          >
            ← Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}