"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Eye,
  EyeOff,
  Mail,
  MessageCircle,
  Phone,
  Hash,
  Save,
  TestTube,
  Trash2,
  XCircle,
} from "lucide-react";
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
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    email: "",
    password: "",
    service: "gmail",
  });

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
    fetchSettings();
  }, []);

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
      }

      // Fetch WhatsApp settings
      const whatsappResponse = await fetch("/api/admin/settings/whatsapp");
      if (whatsappResponse.ok) {
        const whatsappData = await whatsappResponse.json();
        setWhatsappSettings({
          whatsappNumber: whatsappData.whatsappNumber || "",
          status: whatsappData.status || "disconnected",
        });
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
          password: emailSettings.password,
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
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#324D3E]/10"
        >
          <h1 className="text-2xl font-bold text-[#324D3E] mb-2">
            Pengaturan Sistem
          </h1>
          <p className="text-[#889063]">
            Kelola pengaturan email dan notifikasi sistem
          </p>
        </motion.div>

        {/* Email Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#324D3E]/10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#324D3E]">
                Konfigurasi Email
              </h2>
              <p className="text-[#889063]">
                Pengaturan untuk pengiriman notifikasi cicilan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Service */}
            <div>
              <label className="block text-sm font-medium text-[#324D3E] mb-2">
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E] focus:border-transparent"
              >
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="yahoo">Yahoo Mail</option>
              </select>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-[#324D3E] mb-2">
                Email Address
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E] focus:border-transparent"
              />
            </div>

            {/* Email Password */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-[#324D3E] mb-2">
                App Password / Email Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={emailSettings.password}
                  onChange={(e) =>
                    setEmailSettings((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Masukkan password atau app password"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
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
              className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
                saveResult.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {saveResult.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{saveResult.message}</span>
            </motion.div>
          )}

          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
                testResult.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {testResult.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{testResult.message}</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={
                isLoading || !emailSettings.email || !emailSettings.password
              }
              className="flex items-center gap-2 px-6 py-3 bg-[#324D3E] text-white rounded-xl font-medium hover:bg-[#4C3D19] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {isLoading ? "Menyimpan..." : "Simpan Pengaturan"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTestEmail}
              disabled={
                isLoading || !emailSettings.email || !emailSettings.password
              }
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#324D3E]/10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-xl">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#324D3E]">
                Konfigurasi WhatsApp
              </h2>
              <p className="text-[#889063]">
                Pengaturan untuk pengiriman pesan WhatsApp cicilan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WhatsApp Number */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-[#324D3E] mb-2">
                Nomor WhatsApp
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
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E] focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Masukkan nomor dalam format 628xxxxx. Pastikan WhatsApp
                terpasang di nomor ini.
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-[#324D3E] mb-2">
                Status Koneksi
              </label>
              <div
                className={`px-4 py-3 rounded-xl border ${
                  whatsappSettings.status === "connected"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : whatsappSettings.status === "connecting"
                    ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                    : whatsappSettings.status === "qr"
                    ? "bg-purple-50 border-purple-200 text-purple-800"
                    : "bg-red-50 border-red-200 text-red-800"
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
              className="mt-6 text-center"
            >
              <h3 className="text-lg font-semibold text-[#324D3E] mb-4">
                QR Code WhatsApp
              </h3>
              <div className="inline-block p-6 bg-white rounded-2xl shadow-lg border">
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 mx-auto mb-4"
                />
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrCode;
                    link.download = `whatsapp-qr-${whatsappSettings.whatsappNumber}.png`;
                    link.click();
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  💾 Download QR
                </button>
              </div>
              <div className="mt-6 space-y-2 text-sm text-gray-600">
                <p className="font-semibold">Cara scan QR Code:</p>
                <p>1. Buka WhatsApp → Menu (⋮) → Perangkat Tertaut</p>
                <p>2. Tap "Tautkan Perangkat"</p>
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
              className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
                whatsappResult.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
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
          <div className="flex flex-wrap gap-4 mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleWhatsAppSave}
              disabled={isLoading || !whatsappSettings.whatsappNumber}
              className="flex items-center gap-2 px-6 py-3 bg-[#324D3E] text-white rounded-xl font-medium hover:bg-[#4C3D19] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Hash className="w-5 h-5" />
              Generate QR Code
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRemoveAuth}
              disabled={
                isLoading ||
                !whatsappSettings.whatsappNumber ||
                whatsappSettings.status === "disconnected"
              }
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="bg-blue-50/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-200/50"
        >
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            Informasi Penting
          </h3>
          <ul className="space-y-2 text-blue-700">
            <li>
              <strong>📧 Email:</strong> Otomatis mengirim reminder harian via
              cron job
            </li>
            <li>
              <strong>📱 WhatsApp:</strong> Manual, admin klik tombol kirim per
              investor
            </li>
            <li>
              <strong>📅 Timing:</strong> Notifikasi untuk 7 hari sebelum dan
              hari jatuh tempo
            </li>
            <li>
              <strong>🔧 Setup:</strong> Pastikan email dan WhatsApp sudah
              terkoneksi
            </li>
            <li>
              <strong>✅ Test:</strong> Gunakan tombol test untuk verifikasi
            </li>
          </ul>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
