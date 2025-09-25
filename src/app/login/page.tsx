"use client";

import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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

  // Force light theme on this page and restore on unmount
  useEffect(() => {
    const previous = theme || resolvedTheme;
    setTheme("light");
    return () => {
      if (previous) setTheme(previous);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                case "admin":
                  redirectPath = "/admin";
                  break;
                case "ketua":
                  redirectPath = "/admin/investors"
                case "staff":
                case "spv_staff":
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
