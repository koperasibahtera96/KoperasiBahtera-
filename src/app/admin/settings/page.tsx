"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Eye,
  EyeOff,
  Hash,
  Mail,
  MessageCircle,
  Monitor,
  Moon,
  Phone,
  Save,
  Settings,
  Sun,
  TestTube,
  Trash2,
  XCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

interface EmailSettings {
  email: string;
  password: string;
  service: string;
}

interface WhatsAppSettings {
  whatsappNumber: string;
  status: "connected" | "disconnected" | "connecting" | "qr";
}

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    email: "",
    password: "",
    service: "gmail",
  });
  const [hasPassword, setHasPassword] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [hasSessionData, setHasSessionData] = useState(false);

  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings>({
    whatsappNumber: "",
    status: "disconnected",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [saveResult, setSaveResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [qrCode, setQrCode] = useState<string>("");
  const [whatsappResult, setWhatsappResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  // Helper function to get theme-aware classes
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  const fetchSettings = async () => {
    try {
      // Fetch email settings
      const emailResponse = await fetch("/api/admin/settings/email");
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        setEmailSettings({
          email: emailData.email || "",
          password: "", // Never show saved password
          service: emailData.service || "gmail",
        });
        setHasPassword(emailData.hasPassword || false);
      }

      // Fetch WhatsApp settings
      const whatsappResponse = await fetch("/api/admin/settings/whatsapp");
      if (whatsappResponse.ok) {
        const whatsappData = await whatsappResponse.json();
        setWhatsappSettings({
          whatsappNumber: whatsappData.whatsappNumber || "",
          status: whatsappData.status || "disconnected",
        });

        // Check if WhatsApp session data exists
        if (whatsappData?.whatsappNumber) {
          const sessionResponse = await fetch(
            `/api/admin/settings/whatsapp/session?number=${whatsappData.whatsappNumber}`
          );
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            setHasSessionData(sessionData.hasSession || false);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveResult(null);

    try {
      const response = await fetch("/api/admin/settings/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailSettings),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveResult({
          type: "success",
          message: "Pengaturan email berhasil disimpan!",
        });
        setHasPassword(true);
        setIsEditingEmail(false);
        setEmailSettings((prev) => ({ ...prev, password: "" })); // Clear password field
      } else {
        setSaveResult({
          type: "error",
          message: data.error || "Gagal menyimpan pengaturan",
        });
      }
    } catch (error) {
      console.error("Error saving email settings:", error);
      setSaveResult({
        type: "error",
        message: "Terjadi kesalahan saat menyimpan pengaturan",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/admin/settings/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailSettings.email,
          service: emailSettings.service,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          type: "success",
          message: "Test email berhasil dikirim!",
        });
      } else {
        setTestResult({
          type: "error",
          message: data.error || "Gagal mengirim test email",
        });
      }
    } catch (error) {
      console.error("Error testing email:", error);
      setTestResult({
        type: "error",
        message: "Terjadi kesalahan saat testing email",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppSave = async () => {
    setIsLoading(true);
    setWhatsappResult(null);

    try {
      const response = await fetch("/api/admin/settings/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          whatsappNumber: whatsappSettings.whatsappNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setWhatsappResult({
          type: "success",
          message: "Pengaturan WhatsApp berhasil disimpan!",
        });
        fetchSettings(); // Refresh settings

        // Check session data for the new number
        const sessionResponse = await fetch(
          `/api/admin/settings/whatsapp/session?number=${whatsappSettings.whatsappNumber}`
        );
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setHasSessionData(sessionData.hasSession || false);
        }
      } else {
        setWhatsappResult({
          type: "error",
          message: data.error || "Gagal menyimpan pengaturan WhatsApp",
        });
      }
    } catch (error) {
      console.error("Error saving WhatsApp settings:", error);
      setWhatsappResult({
        type: "error",
        message: "Terjadi kesalahan saat menyimpan pengaturan WhatsApp",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    setIsLoading(true);
    setWhatsappResult(null);
    setQrCode("");

    try {
      const response = await fetch("/api/admin/settings/whatsapp/generate-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          whatsappNumber: whatsappSettings.whatsappNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setWhatsappResult({
          type: "success",
          message: "QR Code sedang dibuat. Scan dengan WhatsApp Anda.",
        });

        // Poll for QR code
        const pollQR = setInterval(async () => {
          try {
            const qrResponse = await fetch(
              `/api/admin/settings/whatsapp/qr?number=${whatsappSettings.whatsappNumber}`
            );
            const qrData = await qrResponse.json();

            if (qrData.qrCode) {
              setQrCode(qrData.qrCode);
              clearInterval(pollQR);
            }
          } catch (error) {
            console.error("Error polling QR code:", error);
          }
        }, 2000);

        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(pollQR), 120000);
      } else {
        setWhatsappResult({
          type: "error",
          message: data.error || "Gagal membuat QR code",
        });
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      setWhatsappResult({
        type: "error",
        message: "Terjadi kesalahan saat membuat QR code",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAuth = async () => {
    if (
      !confirm(
        "Yakin ingin menghapus autentikasi WhatsApp? Anda perlu generate pairing code lagi."
      )
    )
      return;

    setIsLoading(true);
    setWhatsappResult(null);
    setQrCode("");

    try {
      const response = await fetch("/api/admin/settings/whatsapp/remove-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          whatsappNumber: whatsappSettings.whatsappNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setWhatsappResult({
          type: "success",
          message: "Autentikasi WhatsApp berhasil dihapus!",
        });
        setWhatsappSettings((prev) => ({ ...prev, status: "disconnected" }));
        setHasSessionData(false);
      } else {
        setWhatsappResult({
          type: "error",
          message: data.error || "Gagal menghapus autentikasi",
        });
      }
    } catch (error) {
      console.error("Error removing WhatsApp auth:", error);
      setWhatsappResult({
        type: "error",
        message: "Terjadi kesalahan saat menghapus autentikasi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-[#324D3E]/10 dark:border-gray-600/60 transition-colors duration-300", "!bg-white/80 !border-[#FFC1CC]/30")}
        >
          <h1 className={getThemeClasses("text-xl sm:text-2xl font-bold text-[#324D3E] dark:text-gray-100 mb-2 transition-colors duration-300", "!text-[#4c1d1d]")}>
            Pengaturan Sistem
          </h1>
          <p className={getThemeClasses("text-sm sm:text-base text-[#889063] dark:text-gray-300 transition-colors duration-300", "!text-[#6b7280]")}> 
            Kelola pengaturan email dan notifikasi sistem
          </p>
        </motion.div>

        {/* Theme Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-[#324D3E]/10 dark:border-gray-600/60 transition-colors duration-300", "!bg_white/80 !border-[#FFC1CC]/30")}
        >
          <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
            <div className={getThemeClasses("p-2 sm:p-3 bg-purple-100 rounded-xl flex-shrink-0", "!bg-[#FFC1CC]/20")}>
              <Settings className={getThemeClasses("w-5 h-5 sm:w-6 sm:h-6 text-purple-600", "!text-[#4c1d1d]")} />
            </div>
            <div>
              <h2 className={getThemeClasses("text-lg sm:text-xl font-semibold text-[#324D3E] dark:text-gray-100 transition-colors duration-300", "!text-[#4c1d1d]")}> 
                Tema Tampilan
              </h2>
              <p className={getThemeClasses("text-sm sm:text-base text-[#889063] dark:text-gray-300 transition-colors duration-300", "!text-[#6b7280]")}> 
                Pilih antara mode terang, gelap, atau otomatis
              </p>
            </div>
          </div>

          {/* Theme Options */}
          {mounted && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Light Mode */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTheme('light')}
                className={getThemeClasses(`p-4 rounded-xl border-2 transition-all duration-300 ${
                  theme === 'light'
                    ? 'border-[#324D3E] bg-[#324D3E]/5'
                    : 'border-gray-200 hover:border-[#324D3E]/30'
                }`, theme === 'light' ? '!border-[#FFC1CC] !bg-[#FFC1CC]/5' : '!border-[#FFC1CC]/30 hover:!border-[#FFC1CC]/50')}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={getThemeClasses(`p-3 rounded-full ${
                    theme === 'light' ? 'bg-[#324D3E] text-white' : 'bg-gray-100 text-gray-600'
                  }`, theme === 'light' ? '!bg-[#FFC1CC] !text-[#4c1d1d]' : '!bg-[#FFC1CC]/20 !text-[#4c1d1d]')}>
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className={getThemeClasses("font-medium text-gray-800 dark:text-gray-100 transition-colors duration-300", "!text-[#4c1d1d]")}>
                      Mode Terang
                    </p>
                    <p className={getThemeClasses("text-xs text-gray-600 dark:text-gray-300 mt-1 transition-colors duration-300", "!text-[#6b7280]")}>
                      Latar belakang terang
                    </p>
                  </div>
                </div>
              </motion.button>

              {/* Dark Mode */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTheme('dark')}
                className={getThemeClasses(`p-4 rounded-xl border-2 transition-all duration-300 ${
                  theme === 'dark'
                    ? 'border-[#324D3E] bg-[#324D3E]/5'
                    : 'border-gray-200 hover:border-[#324D3E]/30'
                }`, theme === 'dark' ? '!border-[#FFC1CC] !bg-[#FFC1CC]/5' : '!border-[#FFC1CC]/30 hover:!border-[#FFC1CC]/50')}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={getThemeClasses(`p-3 rounded-full ${
                    theme === 'dark' ? 'bg-[#324D3E] text-white' : 'bg-gray-100 text-gray-600'
                  }`, theme === 'dark' ? '!bg-[#FFC1CC] !text-[#4c1d1d]' : '!bg-[#FFC1CC]/20 !text-[#4c1d1d]')}>
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className={getThemeClasses("font-medium text-gray-800 dark:text-gray-100 transition-colors duration-300", "!text-[#4c1d1d]")}>
                      Mode Gelap
                    </p>
                    <p className={getThemeClasses("text-xs text-gray-600 dark:text-gray-300 mt-1 transition-colors duration-300", "!text-[#6b7280]")}>
                      Latar belakang gelap
                    </p>
                  </div>
                </div>
              </motion.button>

              {/* Pink Mode */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTheme('pink')}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  theme === 'pink'
                    ? 'border-[#FFC1CC] bg-[#FFC1CC]/5'
                    : 'border-gray-200 hover:border-[#FFC1CC]/30'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-3 rounded-full ${
                    theme === 'pink' ? 'bg-[#FFC1CC] text-[#4c1d1d]' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Settings className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className={getThemeClasses("font-medium text-gray-800 dark:text-gray-100 transition-colors duration-300", "!text-[#4c1d1d]")}>
                      Mode Pink
                    </p>
                    <p className={getThemeClasses("text-xs text-gray-600 dark:text-gray-300 mt-1 transition-colors duration-300", "!text-[#6b7280]")}>
                      Tema pink pastel
                    </p>
                  </div>
                </div>
              </motion.button>

              {/* System Mode */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTheme('system')}
                className={getThemeClasses(`p-4 rounded-xl border-2 transition-all duration-300 ${
                  theme === 'system'
                    ? 'border-[#324D3E] bg-[#324D3E]/5'
                    : 'border-gray-200 hover:border-[#324D3E]/30'
                }`, theme === 'system' ? '!border-[#FFC1CC] !bg-[#FFC1CC]/5' : '!border-[#FFC1CC]/30 hover:!border-[#FFC1CC]/50')}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={getThemeClasses(`p-3 rounded-full ${
                    theme === 'system' ? 'bg-[#324D3E] text-white' : 'bg-gray-100 text-gray-600'
                  }`, theme === 'system' ? '!bg-[#FFC1CC] !text-[#4c1d1d]' : '!bg-[#FFC1CC]/20 !text-[#4c1d1d]')}>
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className={getThemeClasses("font-medium text-gray-800 dark:text-gray-100 transition-colors duration-300", "!text-[#4c1d1d]")}>
                      Otomatis
                    </p>
                    <p className={getThemeClasses("text-xs text-gray-600 dark:text-gray-300 mt-1 transition-colors duration-300", "!text-[#6b7280]")}>
                      Sesuai sistem
                    </p>
                  </div>
                </div>
              </motion.button>

            </div>
          )}
        </motion.div>

        {/* Email Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300", "!bg-white/80 !border-[#FFC1CC]/30")}
        >
          <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
            <div className={getThemeClasses("p-2 sm:p-3 bg-blue-100 rounded-xl flex-shrink-0", "!bg-[#B5EAD7]/30")}>
              <Mail className={getThemeClasses("w-5 h-5 sm:w-6 sm:h-6 text-blue-600", "!text-[#4c1d1d]")} />
            </div>
            <div>
              <h2 className={getThemeClasses("text-lg sm:text-xl font-semibold text-[#324D3E] dark:text-white transition-colors duration-300", "!text-[#4c1d1d]")}>
                Konfigurasi Email
              </h2>
              <p className={getThemeClasses("text-sm sm:text-base text-[#889063] dark:text-gray-400 transition-colors duration-300", "!text-[#6b7280]")}>
                Pengaturan untuk pengiriman notifikasi cicilan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Email Service */}
            <div>
              <label className={getThemeClasses("block text-sm font-medium text-[#324D3E] dark:text-gray-200 mb-2 transition-colors duration-300", "!text-[#4c1d1d]")}>
                Email Service Provider
              </label>
              <select
                value={emailSettings.service}
                onChange={(e) =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    service: e.target.value,
                  }))
                }
                className={getThemeClasses("w-full px-4 py-3 border border-gray-200 dark:border-gray-600/60 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#324D3E] focus:border-transparent transition-colors duration-300", "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]/20 focus:!border-[#FFC1CC]")}
              >
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="yahoo">Yahoo Mail</option>
              </select>
            </div>

            {/* Email Address */}
            <div>
              <label className={getThemeClasses("block text-sm font-medium text-[#324D3E] dark:text-gray-100 mb-2 transition-colors duration-300", "!text-[#4c1d1d]")}>                Email Address
              </label>
              <input
                type="email"
                value={emailSettings.email}
                onChange={(e) =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="admin@koperasi.com"
                className={getThemeClasses("w-full px-4 py-3 border border-gray-200 dark:border-gray-600/60 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#324D3E] focus:border-transparent transition-colors duration-300", "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]/20 focus:!border-[#FFC1CC]")}
              />
            </div>

            {/* Email Password */}
            <div className="md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2 sm:gap-0">
                <label className={getThemeClasses("block text-sm font-medium text-[#324D3E]", "!text-[#4c1d1d]")}>                  App Password
                </label>
                <div className="flex gap-2 flex-shrink-0">
                  {hasPassword && !isEditingEmail && (
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(true)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors duration-300"
                    >
                      Edit Password
                    </button>
                  )}
                  {isEditingEmail && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingEmail(false);
                        setEmailSettings((prev) => ({ ...prev, password: "" }));
                      }}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 font-medium transition-colors duration-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {!hasPassword || isEditingEmail ? (
                <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={emailSettings.password}
                      onChange={(e) =>
                        setEmailSettings({
                          ...emailSettings,
                          password: e.target.value,
                        })
                      }
                      className={getThemeClasses("w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600/60 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#324D3E] focus:border-transparent transition-colors duration-300", "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]/20 focus:!border-[#FFC1CC]")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-300"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
              ) : (
                <div className={getThemeClasses("px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-300 transition-colors duration-300", "!bg-[#FFC1CC]/10 !border-[#FFC1CC]/30 !text-[#4c1d1d]")}>
                  Password tersimpan (klik Edit Password untuk mengubah)
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-300 mt-2 transition-colors duration-300">
                Untuk Gmail, gunakan App Password. Untuk provider lain, gunakan
                password akun.
              </p>
            </div>
          </div>

          {/* Result Messages */}
          {saveResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl flex items-center gap-3 transition-colors duration-300 ${
                saveResult.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
              }`}
            >
              {saveResult.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-300" />
              )}
              <span>{saveResult.message}</span>
            </motion.div>
          )}

          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl flex items-center gap-3 transition-colors duration-300 ${
                testResult.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
              }`}
            >
              {testResult.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-300" />
              )}
              <span>{testResult.message}</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={
                isLoading ||
                !emailSettings.email ||
                (!emailSettings.password && !hasPassword)
              }
              className={getThemeClasses("flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-[#324D3E] text-white rounded-xl font-medium hover:bg-[#4C3D19] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base", "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d] hover:!from-[#FFDEE9] hover:!to-[#FFF5BA]")}
            >
              <Save className="w-5 h-5" />
              {isLoading ? "Menyimpan..." : "Simpan Pengaturan"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTestEmail}
              disabled={isLoading || !emailSettings.email || !hasPassword}
              className={getThemeClasses("flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base", "!bg-gradient-to-r !from-[#B5EAD7] !to-[#C7CEEA] !text-[#4c1d1d] hover:!from-[#C7CEEA] hover:!to-[#FFF5BA]")}
            >
              <TestTube className="w-5 h-5" />
              Test Email
            </motion.button>
          </div>
        </motion.div>

        {/* WhatsApp Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300", "!bg-white/80 !border-[#FFC1CC]/30")}
        >
          <div className="flex items-start sm:items-center gap-3 mb-4 sm:mb-6">
            <div className={getThemeClasses("p-2 sm:p-3 bg-green-100 rounded-xl flex-shrink-0", "!bg-[#B5EAD7]/30")}>
              <MessageCircle className={getThemeClasses("w-5 h-5 sm:w-6 sm:h-6 text-green-600", "!text-[#4c1d1d]")} />
            </div>
            <div>
              <h2 className={getThemeClasses("text-lg sm:text-xl font-semibold text-[#324D3E] dark:text-white transition-colors duration-300", "!text-[#4c1d1d]")}>
                Konfigurasi WhatsApp
              </h2>
              <p className={getThemeClasses("text-sm sm:text-base text-[#889063] dark:text-gray-400 transition-colors duration-300", "!text-[#6b7280]")}>
                Pengaturan untuk pengiriman pesan WhatsApp cicilan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* WhatsApp Number */}
            <div className="md:col-span-2">
              <label className={getThemeClasses("block text-sm font-medium text-[#324D3E] dark:text-gray-200 mb-2 transition-colors duration-300", "!text-[#4c1d1d]")}>                Nomor WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={whatsappSettings.whatsappNumber}
                  onChange={(e) =>
                    setWhatsappSettings((prev) => ({
                      ...prev,
                      whatsappNumber: e.target.value,
                    }))
                  }
                  placeholder="628123456789"
                  className={getThemeClasses("w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E] focus:border-transparent transition-colors duration-300", "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]/20 focus:!border-[#FFC1CC]")}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-300">
                Masukkan nomor dalam format 628xxxxx. Pastikan WhatsApp
                terpasang di nomor ini.
              </p>
            </div>

            {/* Status */}
            <div>
              <label className={getThemeClasses("block text-sm font-medium text-[#324D3E] dark:text-gray-200 mb-2 transition-colors duration-300", "!text-[#4c1d1d]")}>                Status Koneksi
              </label>
              <div
                className={`px-4 py-3 rounded-xl border transition-colors duration-300 ${
                  whatsappSettings.status === "connected"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300"
                    : whatsappSettings.status === "connecting"
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300"
                    : whatsappSettings.status === "qr"
                    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-300"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      whatsappSettings.status === "connected"
                        ? "bg-green-500"
                        : whatsappSettings.status === "connecting"
                        ? "bg-yellow-500"
                        : whatsappSettings.status === "qr"
                        ? "bg-purple-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="font-medium capitalize">
                    {whatsappSettings.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code */}
          {qrCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 sm:mt-6 text-center"
            >
              <h3 className="text-base sm:text-lg font-semibold text-[#324D3E] mb-3 sm:mb-4">
                QR Code WhatsApp
              </h3>
              <div className="inline-block p-4 sm:p-6 bg-white rounded-2xl shadow-lg border">
                <Image
                  width={256}
                  height={256}
                  src={qrCode}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-3 sm:mb-4"
                />
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = qrCode;
                    link.download = `whatsapp-qr-${whatsappSettings.whatsappNumber}.png`;
                    link.click();
                  }}
                  className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  💾 Download QR
                </button>
              </div>
              <div className="mt-4 sm:mt-6 space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                <p className="font-semibold">Cara scan QR Code:</p>
                <p>1. Buka WhatsApp → Menu (⋮) → Perangkat Tertaut</p>
                <p>2. Tap &quot;Tautkan Perangkat&quot;</p>
                <p>3. Arahkan kamera ke QR code di atas</p>
                <p>4. Tunggu hingga berhasil terhubung</p>
              </div>
            </motion.div>
          )}

          {/* WhatsApp Result Messages */}
          {whatsappResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl flex items-center gap-3 transition-colors duration-300 ${
                whatsappResult.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
              }`}
            >
              {whatsappResult.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{whatsappResult.message}</span>
            </motion.div>
          )}

          {/* WhatsApp Action Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleWhatsAppSave}
              disabled={isLoading || !whatsappSettings.whatsappNumber}
              className={getThemeClasses("flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-[#324D3E] text-white rounded-xl font-medium hover:bg-[#4C3D19] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-w-0", "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d] hover:!from-[#FFDEE9] hover:!to-[#FFF5BA]")}
            >
              <Save className="w-5 h-5" />
              Simpan Nomor
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerateQR}
              disabled={
                isLoading ||
                !whatsappSettings.whatsappNumber ||
                whatsappSettings.status === "connected"
              }
              className={getThemeClasses("flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-w-0", "!bg-gradient-to-r !from-[#B5EAD7] !to-[#C7CEEA] !text-[#4c1d1d] hover:!from-[#C7CEEA] hover:!to-[#FFF5BA]")}
            >
              <Hash className="w-5 h-5" />
              Generate QR Code
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRemoveAuth}
              disabled={
                isLoading || !whatsappSettings.whatsappNumber || !hasSessionData
              }
              className={getThemeClasses("flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-w-0", "!bg-gradient-to-r !from-[#FF9FAB] !to-[#FFB3C6] !text-[#4c1d1d] hover:!from-[#FFB3C6] hover:!to-[#FFDEE9]")}
            >
              <Trash2 className="w-5 h-5" />
              Hapus Auth
            </motion.button>
          </div>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={getThemeClasses("bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-blue-200/50 dark:border-blue-700/50 transition-colors duration-300", "!bg-[#B5EAD7]/30 !border-[#FFC1CC]/30")}
        >
          <h3 className={getThemeClasses("text-base sm:text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3 transition-colors duration-300", "!text-[#4c1d1d]")}>
            Panduan Setup & Cara Kerja
          </h3>
          <div className={getThemeClasses("space-y-3 sm:space-y-4 text-blue-700 dark:text-blue-300 transition-colors duration-300", "!text-[#4c1d1d]")}>
            <div>
              <h4 className={getThemeClasses("font-semibold text-blue-800 dark:text-blue-200 mb-2 text-sm sm:text-base transition-colors duration-300", "!text-[#4c1d1d]")}>                📧 Setup Email:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm ml-2 sm:ml-4">
                <li>Pilih email service provider (Gmail, Outlook, Yahoo)</li>
                <li>Masukkan email address yang akan digunakan</li>
                <li>Masukkan App Password (untuk Gmail)</li>
                <li>Klik &quot;Simpan Pengaturan&quot; untuk menyimpan</li>
                <li>
                  Gunakan &quot;Test Email&quot; untuk memverifikasi konfigurasi
                </li>
              </ol>
              <p className={getThemeClasses("text-xs mt-2 bg-blue-50 dark:bg-blue-800/30 p-2 rounded leading-relaxed transition-colors duration-300", "!bg-[#FFC1CC]/20 !text-[#4c1d1d]")}>                <strong>📝 Catatan:</strong> Password tersimpan aman dan tidak
                ditampilkan. Klik &quot;Edit Password&quot; jika perlu mengubah.
              </p>
            </div>

            <div>
              <h4 className={getThemeClasses("font-semibold text-blue-800 dark:text-blue-200 mb-2 text-sm sm:text-base transition-colors duration-300", "!text-[#4c1d1d]")}>                📱 Setup WhatsApp:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm ml-2 sm:ml-4">
                <li>
                  <strong>Simpan Nomor:</strong> Masukkan nomor WhatsApp (format
                  628xxx)
                </li>
                <li>
                  <strong>Generate QR:</strong> Klik setelah nomor tersimpan
                  untuk buat QR code
                </li>
                <li>
                  <strong>Scan QR:</strong> Gunakan WhatsApp → Menu → Perangkat
                  Tertaut
                </li>
                <li>
                  <strong>Hapus Auth:</strong> Tersedia hanya jika ada sesi
                  aktif
                </li>
              </ol>
              <p className={getThemeClasses("text-xs mt-2 bg-blue-50 dark:bg-blue-800/30 p-2 rounded leading-relaxed transition-colors duration-300", "!bg-[#FFC1CC]/20 !text-[#4c1d1d]")}>                <strong>⚠️ Penting:</strong> Tombol diaktifkan bertahap sesuai
                status koneksi.
              </p>
            </div>

            <div>
              <h4 className={getThemeClasses("font-semibold text-blue-800 dark:text-blue-200 mb-2 text-sm sm:text-base transition-colors duration-300", "!text-[#4c1d1d]")}>                🔄 Cara Kerja:
              </h4>
              <ul className="space-y-1 text-xs sm:text-sm ml-2 sm:ml-4">
                <li>
                  <strong>Email:</strong> Otomatis via cron job harian
                </li>
                <li>
                  <strong>WhatsApp:</strong> Manual per investor oleh admin
                </li>
                <li>
                  <strong>Timing:</strong> 7 hari sebelum & hari jatuh tempo
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
