"use client";

import { CameraSelfie, CameraSelfieRef } from "@/components/forms/CameraSelfie";
import { FormActions, FormField, FormRow } from "@/components/forms/FormField";
import { Select } from "@/components/forms/Select";
import { ValidationInput } from "@/components/forms/ValidationInput";
import LandingHeader from "@/components/landing/LandingHeader";
import { KebijakanPrivasiContent } from "@/components/legal/kebijakan-privasi";
import { SyaratDanKetentuanContent } from "@/components/legal/syarat-dan-ketentuan";
import { EnhancedLegalModal } from "@/components/ui/enhanced-legal-modal";
import { occupationOptions } from "@/constant/OCCUPATION";
import { provinceOptions } from "@/constant/PROVINCE";
import { RegistrationFormData, registrationSchema } from "@/schemas/User";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

export default function RegisterPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [_ktpImage, setKtpImage] = useState<File | null>(null);
  const [ktpImageUrl, setKtpImageUrl] = useState<string>("");
  const [_faceImage, setFaceImage] = useState<File | null>(null);
  const [faceImageUrl, setFaceImageUrl] = useState<string>("");
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [_paymentToken, setPaymentToken] = useState<string>("");
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cameraSelfieRef = useRef<CameraSelfieRef>(null);

  const router = useRouter();

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: "onSubmit",
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

  // Force light theme on this page and restore on unmount
  useEffect(() => {
    const previous = theme || resolvedTheme;
    setTheme("light");
    return () => {
      if (previous) setTheme(previous);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Options for select fields

  // Get occupation code based on selected value
  const getOccupationCode = (value: string) => {
    const occupation = occupationOptions.find((opt) => opt.value === value);
    return occupation?.code || "";
  };

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload gagal");
    }

    const result = await response.json();
    return result.imageUrl;
  }, []);

  const handleKtpUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingKtp(true);
    setSubmitError("");

    try {
      const imageUrl = await uploadImage(file);
      setKtpImage(file);
      setKtpImageUrl(imageUrl);
    } catch (error) {
      console.error(error);
      setSubmitError("Gagal upload KTP. Silakan coba lagi.");
    } finally {
      setUploadingKtp(false);
    }
  };

  // Convert data URL to File object
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleCameraCapture = async (imageDataUrl: string) => {
    setUploadingFace(true);
    setSubmitError("");

    try {
      // Convert data URL to file
      const file = dataURLtoFile(imageDataUrl, `selfie_${Date.now()}.jpg`);

      // Upload the file
      const imageUrl = await uploadImage(file);
      setFaceImage(file);
      setFaceImageUrl(imageUrl);
    } catch (error) {
      console.error(error);
      setSubmitError("Gagal upload foto wajah. Silakan coba lagi.");
    } finally {
      setUploadingFace(false);
    }
  };

  const createPayment = async (formData: RegistrationFormData) => {
    setIsProcessingPayment(true);
    setSubmitError("");

    try {
      const orderIdGenerated = `REG-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

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
            id: "registration-fee",
            price: 1,
            quantity: 1,
            name: "Registration Fee",
          },
        ],
        registrationData: {
          fullName: formData.fullName.trim(),
          nik: formData.nik.trim(),
          email: formData.email.toLowerCase().trim(),
          phoneNumber: formData.phoneNumber.trim(),
          password: formData.password,
          dateOfBirth: new Date(formData.dateOfBirth),
          ktpAddress: formData.ktpAddress.trim(),
          ktpVillage: formData.ktpVillage.trim(),
          ktpCity: formData.ktpCity.trim(),
          ktpProvince: formData.ktpProvince,
          ktpPostalCode: formData.ktpPostalCode.trim(),
          domisiliAddress: formData.domisiliAddress.trim(),
          domisiliVillage: formData.domisiliVillage.trim(),
          domisiliCity: formData.domisiliCity.trim(),
          domisiliProvince: formData.domisiliProvince,
          domisiliPostalCode: formData.domisiliPostalCode.trim(),
          occupation: formData.occupation,
          ktpImageUrl,
          faceImageUrl,
        },
      };

      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create payment");
      }

      setPaymentToken(result.data.token);
      setPaymentUrl(result.data.redirect_url);
      setOrderId(orderIdGenerated);

      return true;
    } catch (error) {
      console.error("Payment creation error:", error);
      setSubmitError("Gagal membuat pembayaran. Silakan coba lagi.");
      return false;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const checkAvailability = async (email: string, phoneNumber: string) => {
    setIsCheckingAvailability(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/auth/check-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors && result.errors.length > 0) {
          setSubmitError(result.errors.join(" "));
        } else {
          setSubmitError(result.error || "Gagal memeriksa ketersediaan data");
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error("Availability check error:", error);
      setSubmitError("Gagal memeriksa ketersediaan data. Silakan coba lagi.");
      return false;
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleNextStep = async () => {
    setSubmitError("");

    if (currentStep === 1) {
      // Mark that user has attempted to submit (to show errors)
      setHasAttemptedSubmit(true);

      // Trigger validation for step 1 fields
      const fieldsToValidate: any = [
        "fullName",
        "nik",
        "dateOfBirth",
        "email",
        "phoneNumber",
        "occupation",
        "ktpAddress",
        "ktpVillage",
        "ktpCity",
        "ktpProvince",
        "ktpPostalCode",
        "domisiliAddress",
        "domisiliVillage",
        "domisiliCity",
        "domisiliProvince",
        "domisiliPostalCode",
        "password",
        "confirmPassword",
        "agreeToTerms",
        "agreeToPrivacy",
      ];

      const isFormValid = await trigger(fieldsToValidate);

      if (!isFormValid) {
        return; // Stop here, errors will show above button
      }

      // Check email and phone availability before proceeding
      const formValues = watch();
      const isAvailable = await checkAvailability(
        formValues.email,
        formValues.phoneNumber
      );

      if (isAvailable) {
        setCurrentStep(2);
      }
      // If not available, error message is already set by checkAvailability
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
    setSubmitError("");
    setHasAttemptedSubmit(false); // Reset error display when going back
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
    setSubmitError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          nik: data.nik.trim(),
          email: data.email.toLowerCase().trim(),
          phoneNumber: data.phoneNumber.trim(),
          password: data.password,
          dateOfBirth: data.dateOfBirth,
          ktpAddress: data.ktpAddress.trim(),
          ktpVillage: data.ktpVillage.trim(),
          ktpCity: data.ktpCity.trim(),
          ktpProvince: data.ktpProvince,
          ktpPostalCode: data.ktpPostalCode.trim(),
          domisiliAddress: data.domisiliAddress.trim(),
          domisiliVillage: data.domisiliVillage.trim(),
          domisiliCity: data.domisiliCity.trim(),
          domisiliProvince: data.domisiliProvince,
          domisiliPostalCode: data.domisiliPostalCode.trim(),
          occupation: data.occupation,
          ktpImageUrl,
          faceImageUrl,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setSubmitError(
          responseData.error || "Terjadi kesalahan saat mendaftar"
        );
        return;
      }

      // Registration successful, show success message and redirect
      setIsSuccess(true);
      setSuccessMessage("Akun berhasil dibuat. Silakan login.");

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
          router.push("/login");
        }
      }, 1000);
    } catch (error: unknown) {
      console.error(error);
      setSubmitError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative font-[family-name:var(--font-poppins)]">
      {/* Blurred background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url(/landing/hero-bg.png)",
          filter: "blur(8px)",
          transform: "scale(1.1)" // Prevent blur edge artifacts
        }}
      ></div>
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/30"></div>

      <LandingHeader />
      <div className="container max-w-6xl mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white font-[family-name:var(--font-poppins)]">
              Buat Akun Baru
            </h2>
            <p className="text-white/80">
              Daftar untuk mulai berinvestasi tanaman
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Mobile View - Show only current step */}
            <div className="sm:hidden flex justify-center">
              <div className="flex flex-col items-center">
                <div
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center text-base font-medium ${
                    currentStep > 0
                      ? "bg-[#324D3E] text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {currentStep > 5 ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    currentStep
                  )}
                </div>
                {/* Current Step Label */}
                <p className="text-sm font-medium mt-2 text-center text-white">
                  {currentStep === 1 && "Data Diri"}
                  {currentStep === 2 && "Verifikasi KTP"}
                  {currentStep === 3 && "Verifikasi Wajah"}
                  {currentStep === 4 && "Pembayaran"}
                  {currentStep === 5 && "Selesai"}
                </p>
                {/* Progress indicator */}
                <div className="flex items-center mt-3 space-x-1">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={`w-2 h-2 rounded-full ${
                        step <= currentStep
                          ? "bg-white"
                          : "bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop/Tablet View - Show all steps */}
            <div className="hidden sm:flex items-center justify-center overflow-x-auto">
              <div className="flex items-center min-w-max px-4">
                {[
                  {
                    step: 1,
                    label: "Data Diri",
                    active: currentStep >= 1,
                    completed: currentStep > 1,
                  },
                  {
                    step: 2,
                    label: "Verifikasi KTP",
                    active: currentStep >= 2,
                    completed: currentStep > 2,
                  },
                  {
                    step: 3,
                    label: "Verifikasi Wajah",
                    active: currentStep >= 3,
                    completed: currentStep > 3,
                  },
                  {
                    step: 4,
                    label: "Pembayaran",
                    active: currentStep >= 4,
                    completed: currentStep > 4,
                  },
                  {
                    step: 5,
                    label: "Selesai",
                    active: currentStep >= 5,
                    completed: false,
                  },
                ].map((item, index) => (
                  <div key={item.step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-medium ${
                          item.completed
                            ? "bg-[#324D3E] text-white"
                            : item.active
                            ? "bg-[#324D3E] text-white"
                            : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {item.completed ? (
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          item.step
                        )}
                      </div>
                      {/* Step Label directly below circle */}
                      <p
                        className={`text-xs sm:text-sm font-medium mt-2 text-center max-w-20 leading-tight ${
                          currentStep === item.step
                            ? "text-white"
                            : currentStep > item.step
                            ? "text-white/80"
                            : "text-white/60"
                        }`}
                      >
                        {item.label}
                      </p>
                    </div>
                    {/* Connecting Line */}
                    {index < 4 && (
                      <div
                        className={`w-12 sm:w-16 h-1 mx-2 sm:mx-3 ${
                          item.completed || (item.active && currentStep > item.step)
                            ? "bg-[#324D3E]"
                            : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20">
          <div className="text-center p-6 pb-6">
            <h3 className="text-2xl text-[#4C3D19] font-bold font-[family-name:var(--font-poppins)]">
              {currentStep === 1 && "Pendaftaran - Data Diri"}
              {currentStep === 2 && "Verifikasi KTP"}
              {currentStep === 3 && "Verifikasi Wajah"}
              {currentStep === 4 && "Pembayaran"}
              {currentStep === 5 && "Konfirmasi Pendaftaran"}
            </h3>
            <p className="text-gray-600 mt-2">
              {currentStep === 1 &&
                "Isi data diri Anda dengan lengkap dan benar"}
              {currentStep === 2 &&
                "Upload foto KTP Anda yang jelas dan terbaca"}
              {currentStep === 3 &&
                "Ambil foto selfie Anda menggunakan kamera untuk verifikasi"}
              {currentStep === 4 &&
                "Lakukan pembayaran untuk menyelesaikan pendaftaran"}
              {currentStep === 5 &&
                "Periksa kembali data Anda dan selesaikan pendaftaran"}
            </p>
          </div>

          <div className="px-8 pb-8">
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
                          {...register("fullName")}
                          placeholder="Masukkan nama lengkap Anda"
                          required
                          autoComplete="name"
                          error={errors.fullName?.message}
                          showValidation={false}
                        />
                        <ValidationInput
                          label="NIK"
                          {...register("nik")}
                          placeholder="16 digit NIK"
                          required
                          maxLength={16}
                          error={errors.nik?.message}
                          showValidation={false}
                        />
                      </FormRow>

                      <FormRow cols={2}>
                        <ValidationInput
                          label="Tanggal Lahir"
                          type="date"
                          {...register("dateOfBirth")}
                          required
                          error={errors.dateOfBirth?.message}
                          showValidation={false}
                        />
                        <div></div>
                      </FormRow>

                      <FormRow cols={2}>
                        <ValidationInput
                          label="Alamat Email"
                          type="email"
                          {...register("email")}
                          placeholder="nama@email.com"
                          required
                          autoComplete="email"
                          error={errors.email?.message}
                          showValidation={false}
                        />
                        <ValidationInput
                          label="Nomor Telepon"
                          type="tel"
                          {...register("phoneNumber")}
                          placeholder="08123456789"
                          required
                          autoComplete="tel"
                          error={errors.phoneNumber?.message}
                          showValidation={false}
                        />
                      </FormRow>

                      <FormRow cols={2}>
                        <div>
                          <Select
                            label="Pekerjaan"
                            {...register("occupation")}
                            options={occupationOptions}
                            required
                          />
                          {errors.occupation && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.occupation.message}
                            </p>
                          )}
                        </div>
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
                          <p className="text-xs text-gray-500 mt-1">
                            Kode akan muncul setelah memilih pekerjaan
                          </p>
                        </div>
                      </FormRow>
                    </div>
                  </div>

                  {/* KTP Address Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                      Informasi Alamat KTP
                    </h3>
                    <div className="space-y-6">
                      <FormField>
                        <ValidationInput
                          label="Alamat Lengkap"
                          {...register("ktpAddress")}
                          placeholder="Jalan, RT/RW, Nomor Rumah"
                          required
                          error={errors.ktpAddress?.message}
                          showValidation={false}
                        />
                      </FormField>

                      <FormRow cols={2}>
                        <ValidationInput
                          label="Desa/Kelurahan"
                          {...register("ktpVillage")}
                          placeholder="Nama desa/kelurahan"
                          required
                          error={errors.ktpVillage?.message}
                          showValidation={false}
                        />
                        <ValidationInput
                          label="Kota/Kabupaten"
                          {...register("ktpCity")}
                          placeholder="Nama kota/kabupaten"
                          required
                          error={errors.ktpCity?.message}
                          showValidation={false}
                        />
                      </FormRow>

                      <FormRow cols={2}>
                        <div>
                          <Select
                            label="Provinsi"
                            {...register("ktpProvince")}
                            options={provinceOptions}
                            required
                          />
                          {errors.ktpProvince && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.ktpProvince.message}
                            </p>
                          )}
                        </div>
                        <ValidationInput
                          label="Kode Pos"
                          {...register("ktpPostalCode")}
                          placeholder="12345"
                          required
                          error={errors.ktpPostalCode?.message}
                          showValidation={false}
                        />
                      </FormRow>
                    </div>
                  </div>

                  {/* Domisili Address Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                      Domisili Sekarang
                    </h3>
                    <div className="space-y-6">
                      {/* Copy Address Checkbox */}
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          id="copyAddressCheckbox"
                          className="w-4 h-4 text-[#324D3E] border-gray-300 rounded focus:ring-[#324D3E] focus:ring-2"
                          onChange={(e) => {
                            if (e.target.checked) {
                              const ktpValues = watch();
                              setValue("domisiliAddress", ktpValues.ktpAddress || "");
                              setValue("domisiliVillage", ktpValues.ktpVillage || "");
                              setValue("domisiliCity", ktpValues.ktpCity || "");
                              setValue("domisiliProvince", ktpValues.ktpProvince || "");
                              setValue("domisiliPostalCode", ktpValues.ktpPostalCode || "");
                            } else {
                              setValue("domisiliAddress", "");
                              setValue("domisiliVillage", "");
                              setValue("domisiliCity", "");
                              setValue("domisiliProvince", "");
                              setValue("domisiliPostalCode", "");
                            }
                          }}
                        />
                        <label htmlFor="copyAddressCheckbox" className="text-sm text-gray-700 cursor-pointer">
                          Alamat saya sekarang sama dengan di KTP
                        </label>
                      </div>

                      <FormField>
                        <ValidationInput
                          label="Alamat Lengkap"
                          {...register("domisiliAddress")}
                          placeholder="Jalan, RT/RW, Nomor Rumah"
                          required
                          error={errors.domisiliAddress?.message}
                          showValidation={false}
                        />
                      </FormField>

                      <FormRow cols={2}>
                        <ValidationInput
                          label="Desa/Kelurahan"
                          {...register("domisiliVillage")}
                          placeholder="Nama desa/kelurahan"
                          required
                          error={errors.domisiliVillage?.message}
                          showValidation={false}
                        />
                        <ValidationInput
                          label="Kota/Kabupaten"
                          {...register("domisiliCity")}
                          placeholder="Nama kota/kabupaten"
                          required
                          error={errors.domisiliCity?.message}
                          showValidation={false}
                        />
                      </FormRow>

                      <FormRow cols={2}>
                        <div>
                          <Select
                            label="Provinsi"
                            {...register("domisiliProvince")}
                            options={provinceOptions}
                            required
                          />
                          {errors.domisiliProvince && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.domisiliProvince.message}
                            </p>
                          )}
                        </div>
                        <ValidationInput
                          label="Kode Pos"
                          {...register("domisiliPostalCode")}
                          placeholder="12345"
                          required
                          error={errors.domisiliPostalCode?.message}
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
                        <div className="space-y-2">
                          <ValidationInput
                            label="Password"
                            type="password"
                            {...register("password")}
                            placeholder="Buat password yang kuat"
                            required
                            autoComplete="new-password"
                            error={errors.password?.message}
                            showValidation={false}
                          />
                          {/* Password Strength Guide */}
                          <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-gray-800 font-medium mb-3 text-sm">Syarat Password:</p>
                            <ul className="text-gray-600 space-y-2 text-sm">
                              <li className="flex items-center gap-2">
                                <span className="text-gray-500">•</span>
                                Minimal 8 karakter
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="text-gray-500">•</span>
                                Mengandung huruf kecil (a-z)
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="text-gray-500">•</span>
                                Mengandung huruf besar (A-Z)
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="text-gray-500">•</span>
                                Mengandung angka (0-9)
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="text-gray-500">•</span>
                                Mengandung karakter khusus (@$!%*?&)
                              </li>
                            </ul>
                          </div>
                        </div>
                        <ValidationInput
                          label="Konfirmasi Password"
                          type="password"
                          {...register("confirmPassword")}
                          placeholder="Ulangi password Anda"
                          required
                          autoComplete="new-password"
                          error={errors.confirmPassword?.message}
                          showValidation={false}
                        />
                      </FormRow>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="space-y-4 pt-6 border-t border-gray-200">
                    <div>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          {...register("agreeToTerms")}
                          className="w-5 h-5 text-[#324D3E] border-2 border-gray-300 rounded focus:ring-[#324D3E] focus:ring-2 mt-0.5"
                          checked={hasReadTerms}
                          readOnly
                          required
                        />
                        <span className="text-sm text-gray-700">
                          Saya menyetujui{" "}
                          <EnhancedLegalModal
                            triggerText="Syarat dan Ketentuan"
                            title="Syarat dan Ketentuan"
                            onConfirm={() => setHasReadTerms(true)}
                          >
                            <SyaratDanKetentuanContent />
                          </EnhancedLegalModal>{" "}
                          yang berlaku
                        </span>
                      </div>
                      {errors.agreeToTerms && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.agreeToTerms.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          {...register("agreeToPrivacy")}
                          className="w-5 h-5 text-[#324D3E] border-2 border-gray-300 rounded focus:ring-[#324D3E] focus:ring-2 mt-0.5"
                          checked={hasReadPrivacy}
                          readOnly
                          required
                        />
                        <span className="text-sm text-gray-700">
                          Saya menyetujui{" "}
                          <EnhancedLegalModal
                            triggerText="Kebijakan Privasi"
                            title="Kebijakan Privasi"
                            onConfirm={() => setHasReadPrivacy(true)}
                          >
                            <KebijakanPrivasiContent />
                          </EnhancedLegalModal>{" "}
                          yang berlaku
                        </span>
                      </div>
                      {errors.agreeToPrivacy && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.agreeToPrivacy.message}
                        </p>
                      )}
                    </div>
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
                        <Image
                          width={100}
                          height={100}
                          src={ktpImageUrl}
                          alt="KTP Preview"
                          className="w-full max-w-sm mx-auto rounded-lg border border-gray-300 shadow-sm"
                        />
                        <div className="flex items-center justify-center text-green-600 space-x-2">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-sm font-medium">
                            KTP berhasil diupload
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setKtpImage(null);
                            setKtpImageUrl("");
                          }}
                          className="px-6 py-2 border-2 border-[#324D3E] text-[#324D3E] rounded-full font-semibold hover:bg-[#324D3E] hover:text-white transition-all duration-300 font-[family-name:var(--font-poppins)]"
                        >
                          Ganti Foto KTP
                        </button>
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
                                <svg
                                  className="w-8 h-8 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                  />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">
                                {uploadingKtp
                                  ? "Mengupload..."
                                  : "Klik untuk upload foto KTP"}
                              </p>
                              <p className="text-sm text-gray-500">
                                PNG, JPG hingga 5MB
                              </p>
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
                  <CameraSelfie
                    ref={cameraSelfieRef}
                    onCapture={handleCameraCapture}
                    isLoading={uploadingFace}
                  />
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
                        <h4 className="text-lg font-semibold text-gray-800">
                          Total Pembayaran
                        </h4>
                        <p className="text-3xl font-bold text-green-600">
                          Rp 1
                        </p>
                        <p className="text-sm text-gray-500">
                          Biaya Pendaftaran
                        </p>
                      </div>

                      {orderId && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600">
                            Order ID:{" "}
                            <span className="font-mono">{orderId}</span>
                          </p>
                        </div>
                      )}

                      {paymentUrl ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center text-green-600 space-x-2">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span className="text-sm font-medium">
                              Payment link berhasil dibuat
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              // Stop camera before opening payment
                              cameraSelfieRef.current?.stopCamera();

                              // Store email for post-payment success page
                              const formValues = watch();
                              console.log(
                                "Storing email in localStorage before payment:",
                                formValues.email
                              );
                              localStorage.setItem(
                                "registrationEmail",
                                formValues.email
                              );

                              window.open(paymentUrl, "_blank");
                            }}
                            className="w-full bg-gradient-to-r from-[#364D32] to-[#889063] text-white px-8 py-3 rounded-full font-semibold hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 shadow-lg font-[family-name:var(--font-poppins)]"
                          >
                            Bayar Sekarang
                          </button>

                          <p className="text-xs text-gray-500">
                            Klik &quot;Lanjutkan&quot; di bawah setelah
                            menyelesaikan pembayaran
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {isProcessingPayment ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="text-blue-600">
                                Membuat link pembayaran...
                              </span>
                            </div>
                          ) : (
                            <p className="text-gray-600">
                              Klik &quot;Lanjutkan&quot; untuk membuat link
                              pembayaran
                            </p>
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
                      <h4 className="font-semibold text-gray-800 mb-4">
                        Informasi Pribadi
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Nama Lengkap:</span>{" "}
                          {watchedValues.fullName}
                        </div>
                        <div>
                          <span className="text-gray-600">NIK:</span>{" "}
                          {watchedValues.nik}
                        </div>
                        <div>
                          <span className="text-gray-600">Tanggal Lahir:</span>{" "}
                          {watchedValues.dateOfBirth}
                        </div>
                        <div>
                          <span className="text-gray-600">Email:</span>{" "}
                          {watchedValues.email}
                        </div>
                        <div>
                          <span className="text-gray-600">Nomor Telepon:</span>{" "}
                          {watchedValues.phoneNumber}
                        </div>
                        <div>
                          <span className="text-gray-600">Pekerjaan:</span>{" "}
                          {watchedValues.occupation}
                        </div>
                        <div>
                          <span className="text-gray-600">Kode Pekerjaan:</span>{" "}
                          {getOccupationCode(watchedValues.occupation)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">
                        Alamat KTP
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="text-gray-600">Alamat Lengkap:</span>{" "}
                          {watchedValues.ktpAddress}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-600">
                              Desa/Kelurahan:
                            </span>{" "}
                            {watchedValues.ktpVillage}
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Kota/Kabupaten:
                            </span>{" "}
                            {watchedValues.ktpCity}
                          </div>
                          <div>
                            <span className="text-gray-600">Provinsi:</span>{" "}
                            {watchedValues.ktpProvince}
                          </div>
                          <div>
                            <span className="text-gray-600">Kode Pos:</span>{" "}
                            {watchedValues.ktpPostalCode}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">
                        Alamat Domisili
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="text-gray-600">Alamat Lengkap:</span>{" "}
                          {watchedValues.domisiliAddress}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-600">
                              Desa/Kelurahan:
                            </span>{" "}
                            {watchedValues.domisiliVillage}
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Kota/Kabupaten:
                            </span>{" "}
                            {watchedValues.domisiliCity}
                          </div>
                          <div>
                            <span className="text-gray-600">Provinsi:</span>{" "}
                            {watchedValues.domisiliProvince}
                          </div>
                          <div>
                            <span className="text-gray-600">Kode Pos:</span>{" "}
                            {watchedValues.domisiliPostalCode}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">
                        Verifikasi
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">KTP</p>
                          {ktpImageUrl && (
                            <Image
                              width={100}
                              height={100}
                              src={ktpImageUrl}
                              alt="KTP"
                              className="w-32 h-20 object-cover rounded border border-gray-300"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            Foto Wajah
                          </p>
                          {faceImageUrl && (
                            <Image
                              width={100}
                              height={100}
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

              {/* Submit Error and Validation Errors */}
              {(submitError ||
                (hasAttemptedSubmit && Object.keys(errors).length > 0)) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="space-y-2">
                    {/* API/Submit Error */}
                    {submitError && (
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-sm text-red-700 font-medium">
                          {submitError}
                        </p>
                      </div>
                    )}

                    {/* Validation Errors */}
                    {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className="w-5 h-5 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-sm text-red-700 font-medium">
                            Mohon perbaiki kesalahan berikut:
                          </p>
                        </div>
                        <ul className="list-disc list-inside space-y-1 ml-7">
                          {Object.entries(errors).map(([field, error]) => (
                            <li key={field} className="text-sm text-red-700">
                              {error?.message || String(error)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <FormActions align="center">
                <div className="flex gap-4 w-full">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="flex-1 py-3 text-base font-semibold border-2 border-[#324D3E] text-[#324D3E] rounded-full hover:bg-[#324D3E] hover:text-white transition-all duration-300 font-[family-name:var(--font-poppins)]"
                    >
                      Kembali
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={
                      (currentStep === 1 && isCheckingAvailability) ||
                      (currentStep === 2 && !ktpImageUrl) ||
                      (currentStep === 3 && !faceImageUrl) ||
                      (currentStep === 4 &&
                        (!paymentUrl || isProcessingPayment)) ||
                      uploadingKtp ||
                      uploadingFace ||
                      isProcessingPayment ||
                      isCheckingAvailability ||
                      isLoading
                    }
                    className={`${
                      currentStep === 1 ? "w-full" : "flex-1"
                    } py-3 text-base font-semibold bg-gradient-to-r from-[#364D32] to-[#889063] text-white rounded-full hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-poppins)]`}
                  >
                    {isLoading
                      ? "Sedang mendaftar..."
                      : isProcessingPayment
                      ? "Membuat Pembayaran..."
                      : isCheckingAvailability
                      ? "Memeriksa ketersediaan..."
                      : uploadingFace
                      ? "Mengupload foto..."
                      : uploadingKtp
                      ? "Mengupload KTP..."
                      : currentStep === 5
                      ? "Daftar Sekarang"
                      : "Lanjutkan"}
                  </button>
                </div>
              </FormActions>
            </form>
          </div>
        </div>

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
                  Anda akan dialihkan ke halaman login dalam{" "}
                  <span className="font-bold text-green-700">
                    {redirectCountdown}
                  </span>{" "}
                  detik...
                </div>

                <button
                  onClick={() => {
                    if (countdownIntervalRef.current) {
                      clearInterval(countdownIntervalRef.current);
                      countdownIntervalRef.current = null;
                    }
                    router.push("/login");
                  }}
                  className="w-full bg-gradient-to-r from-[#364D32] to-[#889063] text-white px-8 py-3 rounded-full font-semibold hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 shadow-lg font-[family-name:var(--font-poppins)]"
                >
                  Login Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Link */}
        <div className="text-center mt-8">
          <p className="text-white/90">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="text-white font-semibold hover:text-white/80 hover:underline font-[family-name:var(--font-poppins)]"
            >
              Masuk di sini
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link
            href="/"
            className="text-sm text-white/70 hover:text-white hover:underline inline-flex items-center gap-1 font-[family-name:var(--font-poppins)]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
