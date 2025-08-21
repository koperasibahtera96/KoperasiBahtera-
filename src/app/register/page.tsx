'use client';

import { FormActions, FormField, FormRow } from '@/components/forms/FormField';
import { Select } from '@/components/forms/Select';
import { ValidationInput } from '@/components/forms/ValidationInput';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { occupationOptions } from '@/constant/OCCUPATION';
import { provinceOptions } from '@/constant/PROVINCE';
import { RegistrationFormData, registrationSchema } from '@/schemas/User';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';


export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onChange',
  });

  // Watch form values for real-time validation
  const watchedValues = watch();

  // Cleanup effect for countdown interval
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Options for select fields

  // Get occupation code based on selected value
  const getOccupationCode = (value: string) => {
    const occupation = occupationOptions.find(opt => opt.value === value);
    return occupation?.code || '';
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          email: data.email.toLowerCase().trim(),
          phoneNumber: data.phoneNumber.trim(),
          password: data.password,
          dateOfBirth: data.dateOfBirth,
          address: data.address.trim(),
          village: data.village.trim(),
          city: data.city.trim(),
          province: data.province,
          postalCode: data.postalCode.trim(),
          occupation: data.occupation,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setSubmitError(responseData.error || 'Terjadi kesalahan saat mendaftar');
        return;
      }

      // Registration successful, show success message and redirect
      setIsSuccess(true);
      setSuccessMessage('Akun berhasil dibuat. Silakan login.');

      // Start countdown and redirect
      let countdown = 3;
      setRedirectCountdown(countdown);

      countdownIntervalRef.current = setInterval(() => {
        countdown--;
        setRedirectCountdown(countdown);

        if (countdown <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          router.push('/login');
        }
      }, 1000);
    } catch (error: unknown) {
      console.error(error);
      setSubmitError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-600 rounded-full flex-center shadow-lg">
              <span className="text-white font-bold text-xl">IH</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-green-700">Investasi Hijau</h1>
              <p className="text-sm text-green-600">Tanaman Berkualitas</p>
            </div>
          </Link>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-800">Buat Akun Baru</h2>
            <p className="text-gray-600">Daftar untuk mulai berinvestasi tanaman</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[
              { step: 1, label: 'Data Diri', active: true },
              { step: 2, label: 'Pembayaran', active: false },
              { step: 3, label: 'Verifikasi KTP', active: false },
              { step: 4, label: 'Verifikasi Wajah', active: false }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`relative w-10 h-10 rounded-full flex-center text-sm font-medium ${
                  item.active
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {item.step}
                  {!item.active && item.step > 1 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex-center">
                      <span className="text-xs text-white font-bold">!</span>
                    </div>
                  )}
                </div>
                {index < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    item.active ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4 space-x-8">
            {[
              { label: 'Data Diri', status: 'active' },
              { label: 'Pembayaran', status: 'wip' },
              { label: 'Verifikasi KTP', status: 'wip' },
              { label: 'Verifikasi Wajah', status: 'wip' }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <p className={`text-xs font-medium ${
                  item.status === 'active' ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {item.label}
                </p>
                {item.status === 'wip' && (
                  <p className="text-xs text-yellow-600 font-medium">WIP</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Registration Form */}
        <Card className="shadow-lg border border-gray-200">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-gray-800">Pendaftaran - Data Diri</CardTitle>
            <p className="text-gray-500 mt-2">Isi data diri Anda dengan lengkap dan benar</p>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                  Informasi Pribadi
                </h3>
                <div className="space-y-6">
                  <FormRow cols={2}>
                    <ValidationInput
                      label="Nama Lengkap"
                      {...register('fullName')}
                      placeholder="Masukkan nama lengkap Anda"
                      required
                      autoComplete="name"
                    />
                    <ValidationInput
                      label="Tanggal Lahir"
                      type="date"
                      {...register('dateOfBirth')}
                      required
                    />
                  </FormRow>
                  {(errors.fullName || errors.dateOfBirth) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {errors.fullName && (
                        <p className="text-sm text-red-600">{errors.fullName.message}</p>
                      )}
                      {errors.dateOfBirth && (
                        <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p>
                      )}
                    </div>
                  )}

                  <FormRow cols={2}>
                    <ValidationInput
                      label="Alamat Email"
                      type="email"
                      {...register('email')}
                      placeholder="nama@email.com"
                      required
                      autoComplete="email"
                    />
                    <ValidationInput
                      label="Nomor Telepon"
                      type="tel"
                      {...register('phoneNumber')}
                      placeholder="08123456789"
                      required
                      autoComplete="tel"
                    />
                  </FormRow>
                  {(errors.email || errors.phoneNumber) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                      )}
                      {errors.phoneNumber && (
                        <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>
                      )}
                    </div>
                  )}

                  <FormRow cols={2}>
                    <Select
                      label="Pekerjaan"
                      {...register('occupation')}
                      options={occupationOptions}
                      required
                    />
                    <div className="form-group">
                      <label className="form-label text-gray-800 font-medium">
                        Kode Pekerjaan
                      </label>
                      <input
                        type="text"
                        value={getOccupationCode(watchedValues.occupation)}
                        className="form-input bg-gray-100 text-gray-600 cursor-not-allowed"
                        placeholder="Kode otomatis"
                        disabled
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">Kode akan muncul setelah memilih pekerjaan</p>
                    </div>
                  </FormRow>
                  {errors.occupation && (
                    <p className="text-sm text-red-600">{errors.occupation.message}</p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                  Informasi Alamat
                </h3>
                <div className="space-y-6">
                  <FormField>
                    <ValidationInput
                      label="Alamat Lengkap"
                      {...register('address')}
                      placeholder="Jalan, RT/RW, Nomor Rumah"
                      required
                    />
                    {errors.address && (
                      <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>
                    )}
                  </FormField>

                  <FormRow cols={2}>
                    <ValidationInput
                      label="Desa/Kelurahan"
                      {...register('village')}
                      placeholder="Nama desa/kelurahan"
                      required
                    />
                    <ValidationInput
                      label="Kota/Kabupaten"
                      {...register('city')}
                      placeholder="Nama kota/kabupaten"
                      required
                    />
                  </FormRow>
                  {(errors.village || errors.city) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {errors.village && (
                        <p className="text-sm text-red-600">{errors.village.message}</p>
                      )}
                      {errors.city && (
                        <p className="text-sm text-red-600">{errors.city.message}</p>
                      )}
                    </div>
                  )}

                  <FormRow cols={2}>
                    <Select
                      label="Provinsi"
                      {...register('province')}
                      options={provinceOptions}
                      required
                    />
                    <ValidationInput
                      label="Kode Pos"
                      {...register('postalCode')}
                      placeholder="12345"
                      required
                    />
                  </FormRow>
                  {(errors.province || errors.postalCode) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {errors.province && (
                        <p className="text-sm text-red-600">{errors.province.message}</p>
                      )}
                      {errors.postalCode && (
                        <p className="text-sm text-red-600">{errors.postalCode.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Account Security */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                  Keamanan Akun
                </h3>
                <div className="space-y-6">
                  <FormRow cols={2}>
                    <ValidationInput
                      label="Password"
                      type="password"
                      {...register('password')}
                      placeholder="Buat password yang kuat"
                      required
                      autoComplete="new-password"
                    />
                    <ValidationInput
                      label="Konfirmasi Password"
                      type="password"
                      {...register('confirmPassword')}
                      placeholder="Ulangi password Anda"
                      required
                      autoComplete="new-password"
                    />
                  </FormRow>
                  {(errors.password || errors.confirmPassword) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {errors.password && (
                        <p className="text-sm text-red-600">{errors.password.message}</p>
                      )}
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...register('agreeToTerms')}
                    className="w-5 h-5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500 focus:ring-2 mt-0.5"
                    required
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    Saya menyetujui{' '}
                    <Link href="/terms" className="text-green-600 hover:text-green-700 hover:underline font-medium">
                      Syarat dan Ketentuan
                    </Link>
                    {' '}yang berlaku
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <p className="text-sm text-red-600 mt-1">{errors.agreeToTerms.message}</p>
                )}

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...register('agreeToPrivacy')}
                    className="w-5 h-5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500 focus:ring-2 mt-0.5"
                    required
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    Saya menyetujui{' '}
                    <Link href="/privacy" className="text-green-600 hover:text-green-700 hover:underline font-medium">
                      Kebijakan Privasi
                    </Link>
                    {' '}yang berlaku
                  </span>
                </label>
                {errors.agreeToPrivacy && (
                  <p className="text-sm text-red-600 mt-1">{errors.agreeToPrivacy.message}</p>
                )}
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700 font-medium">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {isSuccess && (
                <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-green-800">Pendaftaran Berhasil!</h4>
                      <p className="text-green-700">{successMessage}</p>
                    </div>
                  </div>
                  <div className="text-sm text-green-600">
                    Anda akan dialihkan ke halaman login dalam <span className="font-bold text-green-700">{redirectCountdown}</span> detik...
                  </div>
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (countdownIntervalRef.current) {
                          clearInterval(countdownIntervalRef.current);
                          countdownIntervalRef.current = null;
                        }
                        router.push('/login');
                      }}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      Login Sekarang
                    </Button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <FormActions align="center">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  disabled={!isValid}
                  className="w-full py-3 text-base font-semibold"
                >
                  {isLoading ? 'Sedang mendaftar...' : 'Daftar Sekarang'}
                </Button>
              </FormActions>

              {/* Form Status */}
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium border ${
                  isValid
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {isValid ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Semua data sudah valid - Siap untuk daftar!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Lengkapi form di atas dengan benar
                    </>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Login Link */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            Sudah punya akun?{' '}
            <Link
              href="/login"
              className="text-green-600 hover:text-green-700 font-semibold hover:underline"
            >
              Masuk di sini
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}