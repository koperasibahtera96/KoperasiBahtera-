"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAlert } from "@/components/ui/Alert";
import { motion } from "framer-motion";
import { Percent, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface PlantTenor {
  name: string;
  id: string;
  minConsecutiveTenor: number;
  durationYears: number;
}

export default function CommissionRatePage() {
  const [commissionRate, setCommissionRate] = useState<number>(0.02);
  const [displayRate, setDisplayRate] = useState<string>("2");
  const [plants, setPlants] = useState<PlantTenor[]>([]);
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

  // Fetch commission rate and plant data from API
  const fetchCommissionRate = async () => {
    try {
      setLoading(true);
      
      // Fetch commission settings
      const commissionResponse = await fetch("/api/settings/commission-rate");
      const commissionResult = await commissionResponse.json();

      if (commissionResult.success && commissionResult.data?.commissionRate !== undefined) {
        const rate = commissionResult.data.commissionRate;
        setCommissionRate(rate);
        setDisplayRate((rate * 100).toFixed(2));
      } else {
        showError("Gagal memuat tarif komisi", "");
      }

      // Fetch plant data for per-plant tenor settings
      const plantsResponse = await fetch("/api/admin/plant-showcase?plants=Aren,Alpukat,Gaharu");
      const plantsResult = await plantsResponse.json();
      
      if (plantsResult.success && plantsResult.data) {
        const plantTenors: PlantTenor[] = plantsResult.data.map((plant: any) => ({
          name: plant.name,
          id: plant.id || plant._id,
          minConsecutiveTenor: plant.investmentPlan?.minConsecutiveTenor || 10,
          durationYears: plant.investmentPlan?.durationYears || 5,
        }));
        setPlants(plantTenors);
      }
    } catch (error) {
      console.error("Error fetching commission rate:", error);
      showError("Terjadi kesalahan saat memuat data", "");
    } finally {
      setLoading(false);
    }
  };

  // Save commission rate and plant-specific tenors to API
  const saveCommissionRate = async () => {
    try {
      setSaving(true);
      
      // Save global commission settings
      const commissionResponse = await fetch("/api/settings/commission-rate", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commissionRate }),
      });

      const commissionResult = await commissionResponse.json();

      if (!commissionResult.success) {
        showError(
          "Gagal menyimpan",
          commissionResult.error || "Gagal menyimpan perubahan"
        );
        return;
      }

      // Save plant-specific tenor settings
      const plantsResponse = await fetch("/api/admin/plant-showcase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          partialUpdate: true, // Flag to indicate partial update
          plants: plants.map(plant => ({
            id: plant.id,
            name: plant.name,
            minConsecutiveTenor: plant.minConsecutiveTenor,
          }))
        }),
      });

      const plantsResult = await plantsResponse.json();

      if (plantsResult.success) {
        showSuccess("Berhasil!", "Tarif komisi dan tenor per tanaman berhasil diperbarui");
        fetchCommissionRate(); // Refresh data
      } else {
        showError(
          "Peringatan",
          "Tarif komisi berhasil disimpan, tapi gagal menyimpan tenor per tanaman"
        );
      }
    } catch (error) {
      console.error("Error saving commission rate:", error);
      showError("Error", "Terjadi kesalahan saat menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchCommissionRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, "");

    // Prevent multiple decimal points
    const parts = sanitized.split(".");
    const formatted =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : sanitized;

    setDisplayRate(formatted);

    const parsed = parseFloat(formatted);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      setCommissionRate(parsed / 100);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E]"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AlertComponent />
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <h1
              className={getThemeClasses(
                "text-3xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)] mb-2",
                "!text-[#4c1d1d]"
              )}
            >
              Tarif Komisi Marketing
            </h1>
            <p className="text-[#889063]">
              Atur persentase komisi untuk tim marketing
            </p>
          </div>

          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={getThemeClasses(
              "bg-white rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 sm:p-8",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            {/* Current Rate Display */}
            <div className="mb-8 p-6 bg-gradient-to-br from-[#324D3E]/5 to-[#4C3D19]/5 rounded-xl border border-[#324D3E]/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#889063] mb-1 font-[family-name:var(--font-poppins)]">
                    Tarif Komisi Saat Ini
                  </p>
                  <p className="text-4xl font-bold text-[#324D3E]">
                    {(commissionRate * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-[#889063] mt-2">
                    Marketing akan menerima {(commissionRate * 100).toFixed(2)}%
                    dari setiap nilai kontrak yang berhasil
                  </p>
                </div>
                <div className="w-16 h-16 bg-[#324D3E]/10 rounded-full flex items-center justify-center">
                  <Percent className="w-8 h-8 text-[#324D3E]" />
                </div>
              </div>
            </div>

            {/* Input Section */}
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="commissionRate"
                  className="block text-sm font-medium text-[#324D3E] mb-2 font-[family-name:var(--font-poppins)]"
                >
                  Tarif Komisi Baru (%)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="commissionRate"
                    value={displayRate}
                    onChange={handleRateChange}
                    className="w-full px-4 py-3 pr-12 border border-[#324D3E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/50 text-lg font-semibold text-[#324D3E]"
                    placeholder="2.00"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#889063] font-semibold">
                    %
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#889063]">
                  Masukkan nilai antara 0 hingga 100 (contoh: 2.5 untuk 2.5%)
                </p>
              </div>

              {/* Example Calculation */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Contoh Perhitungan:
                </p>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Nilai Kontrak:</span>
                    <span className="font-semibold">Rp 10.000.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tarif Komisi:</span>
                    <span className="font-semibold">
                      {(commissionRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="border-t border-blue-300 pt-1 mt-1"></div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Komisi Marketing:</span>
                    <span className="font-bold text-lg">
                      Rp{" "}
                      {Math.round(10000000 * commissionRate).toLocaleString(
                        "id-ID"
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Per-Plant Tenor Settings */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-[#324D3E] mb-4 font-[family-name:var(--font-poppins)]">
                  Minimum Tenor Per Tanaman
                </h3>
                <p className="text-sm text-[#889063] mb-4">
                  Atur minimum tenor untuk setiap jenis tanaman. Nilai default akan diambil dari setting global di atas.
                </p>
                <div className="space-y-3">
                  {plants.map((plant, index) => (
                    <div
                      key={plant.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-[#324D3E]/5 to-[#4C3D19]/5 rounded-xl border border-[#324D3E]/10"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-[#324D3E]">{plant.name}</p>
                        <p className="text-xs text-[#889063] mt-1">
                          Durasi: {plant.durationYears} tahun ({plant.durationYears * 12} bulan)
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <input
                            type="number"
                            min={1}
                            max={plant.durationYears * 12}
                            value={plant.minConsecutiveTenor}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              const maxTenor = plant.durationYears * 12;
                              if (!isNaN(value) && value >= 1 && value <= maxTenor) {
                                setPlants((prev) => {
                                  const updated = [...prev];
                                  updated[index].minConsecutiveTenor = value;
                                  return updated;
                                });
                              }
                            }}
                            className="w-20 px-3 py-2 border border-[#324D3E]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#324D3E]/50 text-center text-[#324D3E] font-semibold"
                          />
                        </div>
                        <span className="text-sm text-[#889063] w-16">bulan</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={fetchCommissionRate}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold font-[family-name:var(--font-poppins)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                  />
                  Reset
                </button>
                <button
                  onClick={saveCommissionRate}
                  disabled={saving || loading}
                  className={getThemeClasses(
                    "flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold font-[family-name:var(--font-poppins)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                    "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
                  )}
                >
                  <Save className="w-5 h-5" />
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 p-6 bg-yellow-50 rounded-xl border border-yellow-200"
          >
            <h3 className="font-semibold text-yellow-900 mb-2 font-[family-name:var(--font-poppins)]">
              ⚠️ Penting
            </h3>
            <ul className="space-y-1 text-sm text-yellow-800">
              <li>
                • Perubahan tarif komisi akan berlaku untuk semua komisi yang
                dihitung setelah perubahan disimpan
              </li>
              <li>
                • Komisi yang sudah dihitung sebelumnya tidak akan terpengaruh
              </li>
              <li>
                • Pastikan untuk berkonsultasi dengan tim finance sebelum
                mengubah tarif
              </li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
