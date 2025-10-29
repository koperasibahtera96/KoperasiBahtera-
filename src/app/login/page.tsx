"use client";

import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAlert } from "@/components/ui/Alert";

function LoginContent() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '';
  
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'phone' | 'otp'>('phone');
  const [forgotPasswordData, setForgotPasswordData] = useState({
    phoneNumber: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState<Record<string, string>>({});
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const { showSuccess, AlertComponent } = useAlert();

  // Force light theme on this page and restore on unmount
  useEffect(() => {
    const previous = theme || resolvedTheme;
    setTheme("light");
    return () => {
      if (previous) setTheme(previous);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => {
        setOtpCountdown(otpCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.identifier) {
      newErrors.identifier = "Email/No. HP wajib diisi";
    } else {
      const value = formData.identifier.trim();
      const isEmail = value.includes("@");
      const emailValid = /\S+@\S+\.\S+/.test(value);
      const phoneValid = /^(\+62|62|0)[0-9]{9,13}$/.test(
        value.replace(/\s|\-|[().]/g, "")
      );
      if (isEmail && !emailValid) {
        newErrors.identifier = "Format email tidak valid";
      } else if (!isEmail && !phoneValid) {
        newErrors.identifier = "Format No. HP Indonesia tidak valid";
      }
    }

    if (!formData.password) {
      newErrors.password = "Password wajib diisi";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password minimal 8 karakter";
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
      const { signIn } = await import("next-auth/react");

      const result = await signIn("credentials", {
        identifier: formData.identifier,
        password: formData.password,
        redirect: false, // Keep false to handle errors
      });

      if (result?.error) {
        // Handle specific error messages
        let errorMessage = "Email/No. HP atau password salah";
        if (result.error === "CredentialsSignin") {
          errorMessage = "Email/No. HP atau password tidak valid";
        } else if (
          result.error.includes("Email/No. HP dan password wajib diisi") ||
          result.error.includes("Email dan password wajib diisi")
        ) {
          errorMessage = "Email/No. HP dan password wajib diisi";
        } else if (
          result.error.includes("Email/No. HP atau password tidak valid") ||
          result.error.includes("Email atau password tidak valid")
        ) {
          errorMessage = "Email/No. HP atau password tidak valid";
        }

        setErrors({ submit: errorMessage });
      } else if (result?.ok) {
        // Get session data after successful login
        const { getSession } = await import("next-auth/react");

        try {
          // Wait a moment for session to be established
          await new Promise((resolve) => setTimeout(resolve, 100));

          const session = await getSession();

          if (session?.user?.role) {
            let redirectPath = "";
            
            // First, try to use callback URL if provided and valid
            if (callbackUrl) {
              // If it's a relative URL (starts with /), use it directly
              if (callbackUrl.startsWith('/')) {
                redirectPath = callbackUrl;
                console.log(`🔗 Using callback URL: ${redirectPath}`);
              } else {
                // If it's an absolute URL, validate the domain
                try {
                  const url = new URL(callbackUrl);
                  const currentUrl = new URL(window.location.href);
                  if (url.hostname === currentUrl.hostname) {
                    redirectPath = callbackUrl;
                    console.log(`🔗 Using callback URL: ${redirectPath}`);
                  } else {
                    console.warn('⚠️ Invalid callback URL domain, using role-based redirect');
                  }
                } catch (error) {
                  console.warn('⚠️ Invalid callback URL format, using role-based redirect', error);
                }
              }
            }
            
            // If no valid callback URL, use role-based redirect
            if (!redirectPath) {
              switch (session.user.role) {
                case "staff_admin":
                  redirectPath = "/admin/verification";
                  break;
                case "admin":
                  redirectPath = "/admin";
                  break;
                case "ketua":
                  redirectPath = "/admin/investors";
                  break;
                case "staff":
                case "spv_staff":
                case "mandor":
                case "asisten":
                case "manajer":
                  redirectPath = "/checker";
                  break;
                case "finance":
                case "staff_finance":
                  redirectPath = "/finance";
                  break;
                case "marketing":
                  redirectPath = "/staff";
                  break;
                case "marketing_head":
                  redirectPath = "/marketing";
                  break;
                default:
                  redirectPath = "/";
              }
              console.log(`👤 Using role-based redirect for ${session.user.role}: ${redirectPath}`);
            }

            console.log(
              `✅ Login successful, redirecting ${session.user.role} to: ${redirectPath}`
            );

            // Use window.location.href for all redirects to ensure they work properly
            window.location.href = redirectPath;
            return;
          }

          // Fallback: if no role found, redirect to home
          console.log("⚠️ No user role found, redirecting to home");
          window.location.href = "/";
        } catch (error) {
          console.error("Error during redirect:", error);
          // Fallback: reload the page to ensure fresh session
          window.location.reload();
        }
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      setErrors({ submit: "Terjadi kesalahan saat masuk. Silakan coba lagi." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4 sm:px-6 font-[family-name:var(--font-poppins)]"
      style={{
        backgroundImage: "url(/landing/hero-bg.png)",
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/30"></div>

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-3 mb-6"
          >
            <Image
              src="/images/koperasi-logo.jpg"
              alt="Koperasi Logo"
              className="w-16 h-16 rounded-full"
              width={64}
              height={64}
            />
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-[family-name:var(--font-poppins)]">
                Koperasi BAHTERA
              </h1>
            </div>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-[family-name:var(--font-poppins)]">
            Masuk ke Akun Anda
          </h2>
          <p className="text-white/80">
            Kelola tanaman Anda dengan mudah
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-[#4C3D19] font-[family-name:var(--font-poppins)]">
              Masuk
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField>
              <Input
                label="Email atau No. HP"
                type="text"
                name="identifier"
                value={formData.identifier}
                onChange={handleInputChange}
                placeholder="Masukkan Email / No. HP"
                error={errors.identifier}
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
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-[#324D3E] hover:text-[#889063] font-medium"
              >
                Lupa password?
              </button>
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
                {isLoading ? "Sedang masuk..." : "Masuk"}
              </button>
            </div>
          </form>
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-white/90">
            Belum punya akun?{" "}
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

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#4C3D19]">
                {forgotPasswordStep === 'phone' ? 'Lupa Password' : 'Verifikasi OTP'}
              </h3>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordStep('phone');
                  setForgotPasswordData({ phoneNumber: '', otp: '', newPassword: '', confirmPassword: '' });
                  setForgotPasswordErrors({});
                  setOtpCountdown(0); // Reset countdown
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {forgotPasswordStep === 'phone' ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const newErrors: Record<string, string> = {};

                if (!forgotPasswordData.phoneNumber) {
                  newErrors.phoneNumber = 'No. HP wajib diisi';
                } else {
                  const phoneValid = /^(\+62|62|0)[0-9]{9,13}$/.test(
                    forgotPasswordData.phoneNumber.replace(/\s|\-|[().]/g, '')
                  );
                  if (!phoneValid) {
                    newErrors.phoneNumber = 'Format No. HP Indonesia tidak valid';
                  }
                }

                if (Object.keys(newErrors).length > 0) {
                  setForgotPasswordErrors(newErrors);
                  return;
                }

                setIsForgotPasswordLoading(true);
                setForgotPasswordErrors({});

                try {
                  const response = await fetch('/api/auth/forgot-password/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: forgotPasswordData.phoneNumber }),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    setForgotPasswordErrors({ submit: data.error || 'Gagal mengirim OTP' });
                  } else {
                    setForgotPasswordStep('otp');
                    setOtpCountdown(60); // Start 60 second countdown
                  }
                } catch (error) {
                  console.error('Send OTP error:', error);
                  setForgotPasswordErrors({ submit: 'Terjadi kesalahan saat mengirim OTP' });
                } finally {
                  setIsForgotPasswordLoading(false);
                }
              }} className="space-y-4">
                <FormField>
                  <Input
                    label="No. HP"
                    type="text"
                    name="phoneNumber"
                    value={forgotPasswordData.phoneNumber}
                    onChange={(e) => {
                      setForgotPasswordData(prev => ({ ...prev, phoneNumber: e.target.value }));
                      if (forgotPasswordErrors.phoneNumber) {
                        setForgotPasswordErrors(prev => ({ ...prev, phoneNumber: '' }));
                      }
                    }}
                    placeholder="Masukkan No. HP Anda"
                    error={forgotPasswordErrors.phoneNumber}
                    required
                  />
                </FormField>

                {forgotPasswordErrors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{forgotPasswordErrors.submit}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isForgotPasswordLoading}
                  className="w-full bg-gradient-to-r from-[#364D32] to-[#889063] text-white px-6 py-3 rounded-full font-semibold hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isForgotPasswordLoading ? 'Mengirim OTP...' : 'Kirim OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const newErrors: Record<string, string> = {};

                if (!forgotPasswordData.otp) {
                  newErrors.otp = 'Kode OTP wajib diisi';
                } else if (forgotPasswordData.otp.length !== 6) {
                  newErrors.otp = 'Kode OTP harus 6 digit';
                }

                if (!forgotPasswordData.newPassword) {
                  newErrors.newPassword = 'Password baru wajib diisi';
                } else if (forgotPasswordData.newPassword.length < 8) {
                  newErrors.newPassword = 'Password minimal 8 karakter';
                } else if (!/(?=.*[a-z])/.test(forgotPasswordData.newPassword)) {
                  newErrors.newPassword = 'Password harus mengandung huruf kecil';
                } else if (!/(?=.*[A-Z])/.test(forgotPasswordData.newPassword)) {
                  newErrors.newPassword = 'Password harus mengandung huruf besar';
                } else if (!/(?=.*\d)/.test(forgotPasswordData.newPassword)) {
                  newErrors.newPassword = 'Password harus mengandung angka';
                } else if (!/(?=.*[@$!%*?&.])/.test(forgotPasswordData.newPassword)) {
                  newErrors.newPassword = 'Password harus mengandung karakter khusus (@$!%*?&.)';
                }

                if (!forgotPasswordData.confirmPassword) {
                  newErrors.confirmPassword = 'Konfirmasi password wajib diisi';
                } else if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
                  newErrors.confirmPassword = 'Password tidak cocok';
                }

                if (Object.keys(newErrors).length > 0) {
                  setForgotPasswordErrors(newErrors);
                  return;
                }

                setIsForgotPasswordLoading(true);
                setForgotPasswordErrors({});

                try {
                  // First verify OTP
                  const verifyResponse = await fetch('/api/auth/forgot-password/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      phoneNumber: forgotPasswordData.phoneNumber,
                      otp: forgotPasswordData.otp,
                    }),
                  });

                  const verifyData = await verifyResponse.json();

                  if (!verifyResponse.ok) {
                    setForgotPasswordErrors({ submit: verifyData.error || 'Kode OTP tidak valid' });
                    return;
                  }

                  // Then reset password
                  const resetResponse = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      token: verifyData.resetToken,
                      newPassword: forgotPasswordData.newPassword,
                    }),
                  });

                  const resetData = await resetResponse.json();

                  if (!resetResponse.ok) {
                    setForgotPasswordErrors({ submit: resetData.error || 'Gagal mereset password' });
                  } else {
                    // Success - close modal and show success message
                    showSuccess('Berhasil!', 'Password berhasil direset! Silakan login dengan password baru Anda.');
                    setShowForgotPassword(false);
                    setForgotPasswordStep('phone');
                    setForgotPasswordData({ phoneNumber: '', otp: '', newPassword: '', confirmPassword: '' });
                    setForgotPasswordErrors({});
                  }
                } catch (error) {
                  console.error('Reset password error:', error);
                  setForgotPasswordErrors({ submit: 'Terjadi kesalahan saat mereset password' });
                } finally {
                  setIsForgotPasswordLoading(false);
                }
              }} className="space-y-4">
                <FormField>
                  <Input
                    label="Kode OTP"
                    type="text"
                    name="otp"
                    value={forgotPasswordData.otp}
                    onChange={(e) => {
                      setForgotPasswordData(prev => ({ ...prev, otp: e.target.value }));
                      if (forgotPasswordErrors.otp) {
                        setForgotPasswordErrors(prev => ({ ...prev, otp: '' }));
                      }
                    }}
                    placeholder="Masukkan kode OTP 6 digit"
                    error={forgotPasswordErrors.otp}
                    maxLength={6}
                    required
                  />
                </FormField>

                {/* Resend OTP Button */}
                <div className="text-center">
                  {otpCountdown > 0 ? (
                    <p className="text-sm text-gray-600">
                      Kirim ulang OTP dalam <span className="font-semibold text-[#364D32]">{otpCountdown}</span> detik
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsForgotPasswordLoading(true);
                        setForgotPasswordErrors({});
                        try {
                          const response = await fetch('/api/auth/forgot-password/send-otp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phoneNumber: forgotPasswordData.phoneNumber }),
                          });
                          const data = await response.json();
                          if (!response.ok) {
                            setForgotPasswordErrors({ submit: data.error || 'Gagal mengirim OTP' });
                          } else {
                            showSuccess('Berhasil!', 'Kode OTP baru telah dikirim');
                            setOtpCountdown(60); // Reset countdown
                          }
                        } catch (error) {
                          console.error('Resend OTP error:', error);
                          setForgotPasswordErrors({ submit: 'Terjadi kesalahan saat mengirim OTP' });
                        } finally {
                          setIsForgotPasswordLoading(false);
                        }
                      }}
                      disabled={isForgotPasswordLoading}
                      className="text-sm text-[#364D32] hover:text-[#889063] font-semibold underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Kirim Ulang OTP
                    </button>
                  )}
                </div>

                <FormField>
                  <Input
                    label="Password Baru"
                    type="password"
                    name="newPassword"
                    value={forgotPasswordData.newPassword}
                    onChange={(e) => {
                      setForgotPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                      if (forgotPasswordErrors.newPassword) {
                        setForgotPasswordErrors(prev => ({ ...prev, newPassword: '' }));
                      }
                    }}
                    placeholder="Masukkan password baru"
                    error={forgotPasswordErrors.newPassword}
                    required
                  />
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold">Password harus mengandung:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li className={forgotPasswordData.newPassword.length >= 8 ? 'text-green-600' : ''}>
                        Minimal 8 karakter
                      </li>
                      <li className={/(?=.*[a-z])/.test(forgotPasswordData.newPassword) ? 'text-green-600' : ''}>
                        Huruf kecil (a-z)
                      </li>
                      <li className={/(?=.*[A-Z])/.test(forgotPasswordData.newPassword) ? 'text-green-600' : ''}>
                        Huruf besar (A-Z)
                      </li>
                      <li className={/(?=.*\d)/.test(forgotPasswordData.newPassword) ? 'text-green-600' : ''}>
                        Angka (0-9)
                      </li>
                      <li className={/(?=.*[@$!%*?&.])/.test(forgotPasswordData.newPassword) ? 'text-green-600' : ''}>
                        Karakter khusus (@$!%*?&.)
                      </li>
                    </ul>
                  </div>
                </FormField>

                <FormField>
                  <Input
                    label="Konfirmasi Password Baru"
                    type="password"
                    name="confirmPassword"
                    value={forgotPasswordData.confirmPassword}
                    onChange={(e) => {
                      setForgotPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      if (forgotPasswordErrors.confirmPassword) {
                        setForgotPasswordErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    placeholder="Konfirmasi password baru"
                    error={forgotPasswordErrors.confirmPassword}
                    required
                  />
                </FormField>

                {forgotPasswordErrors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{forgotPasswordErrors.submit}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordStep('phone');
                      setForgotPasswordData(prev => ({ ...prev, otp: '', newPassword: '', confirmPassword: '' }));
                      setForgotPasswordErrors({});
                      setOtpCountdown(0); // Reset countdown
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-full font-semibold hover:bg-gray-300 transition-all duration-300"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotPasswordLoading}
                    className="flex-1 bg-gradient-to-r from-[#364D32] to-[#889063] text-white px-6 py-3 rounded-full font-semibold hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isForgotPasswordLoading ? 'Mereset...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Alert Component */}
      <AlertComponent />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4 sm:px-6 font-[family-name:var(--font-poppins)]" style={{backgroundImage: "url(/landing/hero-bg.png)"}}>
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white mx-auto mb-4"></div>
            <p className="text-white">Memuat...</p>
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
