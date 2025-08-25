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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';


export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [_ktpImage, setKtpImage] = useState<File | null>(null);
  const [ktpImageUrl, setKtpImageUrl] = useState<string>('');
  const [_faceImage, setFaceImage] = useState<File | null>(null);
  const [faceImageUrl, setFaceImageUrl] = useState<string>('');
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [_paymentToken, setPaymentToken] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: {  isValid },
    watch,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onSubmit',
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

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload gagal');
    }

    const result = await response.json();
    return result.imageUrl;
  }, []);

  const handleKtpUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingKtp(true);
    setSubmitError('');

    try {
      const imageUrl = await uploadImage(file);
      setKtpImage(file);
      setKtpImageUrl(imageUrl);
    } catch (error) {
      console.error(error);
      setSubmitError('Gagal upload KTP. Silakan coba lagi.');
    } finally {
      setUploadingKtp(false);
    }
  };

  const handleFaceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFace(true);
    setSubmitError('');

    try {
      const imageUrl = await uploadImage(file);
      setFaceImage(file);
      setFaceImageUrl(imageUrl);
    } catch (error) {
      console.error(error);
      setSubmitError('Gagal upload foto wajah. Silakan coba lagi.');
    } finally {
      setUploadingFace(false);
    }
  };

  const createPayment = async (formData: RegistrationFormData) => {
    setIsProcessingPayment(true);
    setSubmitError('');

    try {
      const orderIdGenerated = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const paymentData = {
        orderId: orderIdGenerated,
        amount: 1, // 1 Rupiah for registration
        customerDetails: {
          first_name: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phoneNumber.trim(),
        },
        itemDetails: [
          {
            id: 'registration-fee',
            price: 1,
            quantity: 1,
            name: 'Registration Fee',
          },
        ],
        registrationData: {
          fullName: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          phoneNumber: formData.phoneNumber.trim(),
          password: formData.password,
          dateOfBirth: new Date(formData.dateOfBirth),
          address: formData.address.trim(),
          village: formData.village.trim(),
          city: formData.city.trim(),
          province: formData.province,
          postalCode: formData.postalCode.trim(),
          occupation: formData.occupation,
          ktpImageUrl,
          faceImageUrl,
        },
      };

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment');
      }

      setPaymentToken(result.data.token);
      setPaymentUrl(result.data.redirect_url);
      setOrderId(orderIdGenerated);

      return true;
    } catch (error) {
      console.error('Payment creation error:', error);
      setSubmitError('Gagal membuat pembayaran. Silakan coba lagi.');
      return false;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleNextStep = async () => {
    setSubmitError('');
    if (currentStep === 1 && isValid) {
      setCurrentStep(2);
    } else if (currentStep === 2 && ktpImageUrl) {
      setCurrentStep(3);
    } else if (currentStep === 3 && faceImageUrl) {
      // Create payment before moving to payment step
      const watchedValues = watch();
      const success = await createPayment(watchedValues);
      if (success) {
        setCurrentStep(4);
      }
    } else if (currentStep === 4 && orderId) {
      setCurrentStep(5);
    }
  };

  const handlePrevStep = () => {
    setSubmitError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    if (currentStep !== 5) {
      handleNextStep();
      return;
    }

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
          ktpImageUrl,
          faceImageUrl,
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
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-800">Buat Akun Baru</h2>
            <p className="text-gray-600">Daftar untuk mulai berinvestasi tanaman</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[
              { step: 1, label: 'Data Diri', active: currentStep >= 1, completed: currentStep > 1 },
              { step: 2, label: 'Verifikasi KTP', active: currentStep >= 2, completed: currentStep > 2 },
              { step: 3, label: 'Verifikasi Wajah', active: currentStep >= 3, completed: currentStep > 3 },
              { step: 4, label: 'Pembayaran', active: currentStep >= 4, completed: currentStep > 4 },
              { step: 5, label: 'Selesai', active: currentStep >= 5, completed: false }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  item.completed
                    ? 'bg-green-600 text-white'
                    : item.active
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {item.completed ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    item.step
                  )}
                </div>
                {index < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    item.completed || (item.active && currentStep > item.step) ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-around mt-4 max-w-md mx-auto">
            {[
              { label: 'Data Diri', step: 1 },
              { label: 'Verifikasi KTP', step: 2 },
              { label: 'Verifikasi Wajah', step: 3 },
              { label: 'Pembayaran', step: 4 },
              { label: 'Selesai', step: 5 }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <p className={`text-xs font-medium ${
                  currentStep === item.step ? 'text-green-600' : currentStep > item.step ? 'text-green-500' : 'text-gray-500'
                }`}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Registration Form */}
        <Card className="shadow-lg border border-gray-200">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-gray-800">
              {currentStep === 1 && 'Pendaftaran - Data Diri'}
              {currentStep === 2 && 'Verifikasi KTP'}
              {currentStep === 3 && 'Verifikasi Wajah'}
              {currentStep === 4 && 'Pembayaran'}
              {currentStep === 5 && 'Konfirmasi Pendaftaran'}
            </CardTitle>
            <p className="text-gray-500 mt-2">
              {currentStep === 1 && 'Isi data diri Anda dengan lengkap dan benar'}
              {currentStep === 2 && 'Upload foto KTP Anda yang jelas dan terbaca'}
              {currentStep === 3 && 'Upload foto selfie Anda untuk verifikasi'}
              {currentStep === 4 && 'Lakukan pembayaran untuk menyelesaikan pendaftaran'}
              {currentStep === 5 && 'Periksa kembali data Anda dan selesaikan pendaftaran'}
            </p>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Step 1: Data Diri */}
              {currentStep === 1 && (
                <>
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
                      showValidation={false}
                    />
                    <ValidationInput
                      label="Tanggal Lahir"
                      type="date"
                      {...register('dateOfBirth')}
                      required
                      showValidation={false}
                    />
                  </FormRow>

                  <FormRow cols={2}>
                    <ValidationInput
                      label="Alamat Email"
                      type="email"
                      {...register('email')}
                      placeholder="nama@email.com"
                      required
                      autoComplete="email"
                      showValidation={false}
                    />
                    <ValidationInput
                      label="Nomor Telepon"
                      type="tel"
                      {...register('phoneNumber')}
                      placeholder="08123456789"
                      required
                      autoComplete="tel"
                      showValidation={false}
                    />
                  </FormRow>

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
                      showValidation={false}
                    />
                  </FormField>

                  <FormRow cols={2}>
                    <ValidationInput
                      label="Desa/Kelurahan"
                      {...register('village')}
                      placeholder="Nama desa/kelurahan"
                      required
                      showValidation={false}
                    />
                    <ValidationInput
                      label="Kota/Kabupaten"
                      {...register('city')}
                      placeholder="Nama kota/kabupaten"
                      required
                      showValidation={false}
                    />
                  </FormRow>

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
                      showValidation={false}
                    />
                  </FormRow>
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
                      showValidation={true}
                    />
                    <ValidationInput
                      label="Konfirmasi Password"
                      type="password"
                      {...register('confirmPassword')}
                      placeholder="Ulangi password Anda"
                      required
                      autoComplete="new-password"
                      showValidation={true}
                    />
                  </FormRow>
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
              </div>
                </>
              )}

              {/* Step 2: KTP Upload */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {/* <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-4 0V4a2 2 0 014 0v2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Upload KTP</h3>
                    <p className="text-gray-600 mb-6">Pastikan foto KTP jelas, tidak blur, dan semua informasi dapat terbaca dengan baik</p>
                  </div> */}

                  <div className="max-w-md mx-auto">
                    {ktpImageUrl ? (
                      <div className="text-center space-y-4">
                        <img
                          src={ktpImageUrl}
                          alt="KTP Preview"
                          className="w-full max-w-sm mx-auto rounded-lg border border-gray-300 shadow-sm"
                        />
                        <div className="flex items-center justify-center text-green-600 space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-medium">KTP berhasil diupload</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setKtpImage(null);
                            setKtpImageUrl('');
                          }}
                        >
                          Ganti Foto KTP
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleKtpUpload}
                          className="hidden"
                          id="ktp-upload"
                          disabled={uploadingKtp}
                        />
                        <label htmlFor="ktp-upload" className="cursor-pointer">
                          <div className="space-y-4">
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                              {uploadingKtp ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                              ) : (
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">
                                {uploadingKtp ? 'Mengupload...' : 'Klik untuk upload foto KTP'}
                              </p>
                              <p className="text-sm text-gray-500">PNG, JPG hingga 5MB</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Face Upload */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Verifikasi Wajah</h3>
                    <p className="text-gray-600 mb-6">Upload foto selfie Anda dengan pencahayaan yang baik dan wajah terlihat jelas</p>
                  </div> */}

                  <div className="max-w-md mx-auto">
                    {faceImageUrl ? (
                      <div className="text-center space-y-4">
                        <img
                          src={faceImageUrl}
                          alt="Face Preview"
                          className="w-48 h-48 mx-auto rounded-full border border-gray-300 shadow-sm object-cover"
                        />
                        <div className="flex items-center justify-center text-green-600 space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-medium">Foto berhasil diupload</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFaceImage(null);
                            setFaceImageUrl('');
                          }}
                        >
                          Ganti Foto
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFaceUpload}
                          className="hidden"
                          id="face-upload"
                          disabled={uploadingFace}
                        />
                        <label htmlFor="face-upload" className="cursor-pointer">
                          <div className="space-y-4">
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                              {uploadingFace ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              ) : (
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">
                                {uploadingFace ? 'Mengupload...' : 'Klik untuk upload foto wajah'}
                              </p>
                              <p className="text-sm text-gray-500">PNG, JPG hingga 5MB</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Payment */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  {/* <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Pembayaran Registration</h3>
                    <p className="text-gray-600 mb-6">Bayar biaya pendaftaran sebesar Rp 1 untuk menyelesaikan registrasi</p>
                  </div> */}

                  <div className="max-w-md mx-auto">
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">Total Pembayaran</h4>
                        <p className="text-3xl font-bold text-green-600">Rp 1</p>
                        <p className="text-sm text-gray-500">Biaya Pendaftaran</p>
                      </div>

                      {orderId && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600">Order ID: <span className="font-mono">{orderId}</span></p>
                        </div>
                      )}

                      {paymentUrl ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center text-green-600 space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-medium">Payment link berhasil dibuat</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => window.open(paymentUrl, '_blank')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                          >
                            Bayar Sekarang
                          </button>

                          <p className="text-xs text-gray-500">
                            Klik &quot;Lanjutkan&quot; di bawah setelah menyelesaikan pembayaran
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {isProcessingPayment ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="text-blue-600">Membuat link pembayaran...</span>
                            </div>
                          ) : (
                            <p className="text-gray-600">Klik &quot;Lanjutkan&quot; untuk membuat link pembayaran</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Confirmation */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Informasi Pribadi</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-600">Nama Lengkap:</span> {watchedValues.fullName}</div>
                        <div><span className="text-gray-600">Tanggal Lahir:</span> {watchedValues.dateOfBirth}</div>
                        <div><span className="text-gray-600">Email:</span> {watchedValues.email}</div>
                        <div><span className="text-gray-600">Nomor Telepon:</span> {watchedValues.phoneNumber}</div>
                        <div><span className="text-gray-600">Pekerjaan:</span> {watchedValues.occupation}</div>
                        <div><span className="text-gray-600">Kode Pekerjaan:</span> {getOccupationCode(watchedValues.occupation)}</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Informasi Alamat</h4>
                      <div className="space-y-3 text-sm">
                        <div><span className="text-gray-600">Alamat Lengkap:</span> {watchedValues.address}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><span className="text-gray-600">Desa/Kelurahan:</span> {watchedValues.village}</div>
                          <div><span className="text-gray-600">Kota/Kabupaten:</span> {watchedValues.city}</div>
                          <div><span className="text-gray-600">Provinsi:</span> {watchedValues.province}</div>
                          <div><span className="text-gray-600">Kode Pos:</span> {watchedValues.postalCode}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Verifikasi</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">KTP</p>
                          {ktpImageUrl && (
                            <img
                              src={ktpImageUrl}
                              alt="KTP"
                              className="w-32 h-20 object-cover rounded border border-gray-300"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Foto Wajah</p>
                          {faceImageUrl && (
                            <img
                              src={faceImageUrl}
                              alt="Face"
                              className="w-20 h-20 object-cover rounded-full border border-gray-300"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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


              {/* Navigation Buttons */}
              <FormActions align="center">
                <div className="flex gap-4 w-full">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={handlePrevStep}
                      className="flex-1 py-3 text-base font-semibold"
                    >
                      Kembali
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isLoading}
                    disabled={
                      (currentStep === 1 && !isValid) ||
                      (currentStep === 2 && !ktpImageUrl) ||
                      (currentStep === 3 && !faceImageUrl) ||
                      (currentStep === 4 && (!paymentUrl || isProcessingPayment)) ||
                      uploadingKtp ||
                      uploadingFace ||
                      isProcessingPayment
                    }
                    className={`${currentStep === 1 ? 'w-full' : 'flex-1'} py-3 text-base font-semibold`}
                  >
                    {isLoading ? 'Sedang mendaftar...' :
                     isProcessingPayment ? 'Membuat Pembayaran...' :
                     currentStep === 5 ? 'Daftar Sekarang' : 'Lanjutkan'}
                  </Button>
                </div>
              </FormActions>

            </form>
          </CardContent>
        </Card>

        {/* Success Alert */}
        {isSuccess && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-in zoom-in duration-200">
              {/* Header */}
              <div className="p-6 border-l-4 border-green-500 bg-green-50 text-green-800 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">✅</div>
                  <div>
                    <h3 className="text-xl font-bold">Pendaftaran Berhasil!</h3>
                    <p className="text-sm opacity-80 mt-1">{successMessage}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="text-center text-gray-600 mb-4">
                  Anda akan dialihkan ke halaman login dalam <span className="font-bold text-green-700">{redirectCountdown}</span> detik...
                </div>

                <button
                  onClick={() => {
                    if (countdownIntervalRef.current) {
                      clearInterval(countdownIntervalRef.current);
                      countdownIntervalRef.current = null;
                    }
                    router.push('/login');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Login Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

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