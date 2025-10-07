"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAlert } from "@/components/ui/Alert";
import {
  formatIDRCurrency,
  formatIDRInput,
  parseIDRInput,
} from "@/lib/utils/currency";
import { motion } from "framer-motion";
import { DollarSign, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function RegistrationFeePage() {
  const [registrationFee, setRegistrationFee] = useState<number>(1);
  const [formattedFee, setFormattedFee] = useState<string>("Rp 1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError, AlertComponent } = useAlert();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to get theme-aware classes
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  // Fetch registration fee from API
  const fetchRegistrationFee = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings/registration-fee");
      const result = await response.json();

      if (result.success && result.data?.registrationFee !== undefined) {
        const fee = result.data.registrationFee;
        setRegistrationFee(fee);
        setFormattedFee(formatIDRCurrency(fee));
      } else {
        showError("Gagal memuat biaya pendaftaran");
      }
    } catch (error) {
      console.error("Error fetching registration fee:", error);
      showError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  // Save registration fee to API
  const saveRegistrationFee = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/settings/registration-fee", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registrationFee }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess("Biaya pendaftaran berhasil diperbarui");
        fetchRegistrationFee(); // Refresh data
      } else {
        showError(result.error || "Gagal menyimpan perubahan");
      }
    } catch (error) {
      console.error("Error saving registration fee:", error);
      showError("Terjadi kesalahan saat menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchRegistrationFee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIDRInput(e.target.value);
    setFormattedFee(formatted);
    const parsed = parseIDRInput(formatted);
    setRegistrationFee(parseInt(parsed) || 0);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className={getThemeClasses("text-3xl font-bold text-gray-900 dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>
              Biaya Pendaftaran
            </h1>
            <p className={getThemeClasses("text-gray-600 dark:text-gray-300 mt-2", "!text-[#6b7280] dark:!text-gray-300")}>
              Memuat data...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AlertComponent />
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className={getThemeClasses("text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>
            Biaya Pendaftaran
          </h1>
          <p className={getThemeClasses("text-[#889063] dark:text-gray-300 mt-1 sm:mt-2 text-sm sm:text-base transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>
            Kelola biaya pendaftaran untuk user baru
          </p>
        </div>

        {/* Main Card */}
        <motion.div
          className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 sm:p-8 transition-colors duration-300", "!bg-white/80 !border-[#FFC1CC]/30")}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Current Fee Display */}
            <div className={getThemeClasses("bg-gradient-to-r from-[#F8FAF9] to-[#E8F5E8] dark:from-gray-700 dark:to-gray-600 rounded-xl p-6 transition-colors duration-300", "!bg-gradient-to-r !from-[#FFEEF0] !to-[#FFF5F5]")}>
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className={getThemeClasses("w-6 h-6 text-[#324D3E]", "!text-[#4c1d1d]")} />
                <h2 className={getThemeClasses("text-lg font-semibold text-[#324D3E] dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>
                  Biaya Pendaftaran Saat Ini
                </h2>
              </div>
              <p className={getThemeClasses("text-4xl font-bold text-[#324D3E] dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>
                Rp {formatIDRCurrency(registrationFee)}
              </p>
              <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-300 mt-2", "!text-[#6b7280] dark:!text-gray-300")}>
                Biaya yang akan dibayar oleh user baru saat mendaftar
              </p>
            </div>

            {/* Edit Form */}
            <div className="space-y-4">
              <div>
                <label className={getThemeClasses("block text-sm font-medium text-[#324D3E] dark:text-white mb-2", "!text-[#4c1d1d] dark:!text-white")}>
                  Ubah Biaya Pendaftaran
                </label>
                <div className="relative">
                  <span className={getThemeClasses("absolute left-4 top-1/2 -translate-y-1/2 text-[#324D3E] dark:text-white font-medium", "!text-[#4c1d1d] dark:!text-white")}>
                    Rp
                  </span>
                  <input
                    type="text"
                    value={formattedFee}
                    onChange={handleFeeChange}
                    className={getThemeClasses("w-full pl-12 pr-4 py-3 border-2 border-[#324D3E]/20 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#324D3E] dark:focus:border-[#889063] bg-white dark:bg-gray-700 text-[#324D3E] dark:text-white transition-colors", "!border-[#FFC1CC]/30 focus:!border-[#FFC1CC]")}
                    placeholder="0"
                  />
                </div>
                <p className={getThemeClasses("text-xs text-[#889063] dark:text-gray-400 mt-1", "!text-[#6b7280] dark:!text-gray-400")}>
                  Masukkan nilai dalam Rupiah (contoh: 50.000)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveRegistrationFee}
                  disabled={saving}
                  className={getThemeClasses("flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#364D32] to-[#889063] text-white px-6 py-3 rounded-lg font-semibold hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed", "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FF69B4] hover:!from-[#FF69B4] hover:!to-[#FFC1CC] !text-white")}
                >
                  <Save className="w-5 h-5" />
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
                <button
                  onClick={fetchRegistrationFee}
                  disabled={loading || saving}
                  className={getThemeClasses("px-6 py-3 border-2 border-[#324D3E] text-[#324D3E] rounded-lg font-semibold hover:bg-[#324D3E] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed", "!border-[#FFC1CC] !text-[#4c1d1d] hover:!bg-[#FFC1CC] hover:!text-white")}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className={getThemeClasses("bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4", "!bg-[#FFC1CC]/10 !border-[#FFC1CC]/30")}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">ℹ️</div>
                <div className="flex-1">
                  <h3 className={getThemeClasses("font-semibold text-[#324D3E] dark:text-white mb-1", "!text-[#4c1d1d] dark:!text-white")}>
                    Informasi
                  </h3>
                  <ul className={getThemeClasses("text-sm text-[#889063] dark:text-gray-300 space-y-1", "!text-[#6b7280] dark:!text-gray-300")}>
                    <li>• Biaya ini akan diterapkan untuk semua pendaftaran user baru</li>
                    <li>• Perubahan akan langsung berlaku setelah disimpan</li>
                    <li>• User yang sudah terdaftar tidak terpengaruh oleh perubahan ini</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AdminLayout>
  );
}
