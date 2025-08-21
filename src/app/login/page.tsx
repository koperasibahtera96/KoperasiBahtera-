'use client';

import { FormActions, FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
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
    <div className="min-h-screen bg-gray-50 flex-center">
      <div className="w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-600 rounded-full flex-center">
              <span className="text-white font-bold text-xl">IH</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-green-700">Investasi Hijau</h1>
              <p className="text-sm text-green-600">Tanaman Berkualitas</p>
            </div>
          </Link>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Masuk ke Akun Anda</h2>
          <p className="text-gray-600">Kelola investasi tanaman Anda dengan mudah</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Masuk</CardTitle>
          </CardHeader>
          <CardContent>
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
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-600">Ingat saya</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-green-600 hover:text-green-700 hover:underline"
                >
                  Lupa password?
                </Link>
              </div>

              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              <FormActions align="center">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Sedang masuk...' : 'Masuk'}
                </Button>
              </FormActions>
            </form>
          </CardContent>
        </Card>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Belum punya akun?{' '}
            <Link
              href="/register"
              className="text-green-600 hover:text-green-700 font-medium hover:underline"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>


        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            ← Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}