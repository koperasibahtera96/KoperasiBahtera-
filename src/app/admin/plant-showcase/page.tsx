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

interface TreePackage {
  treeCount: number;
  name: string;
  description: string;
  price: number;
  installmentPrice: number;
  enabled: boolean;
}

interface Plant {
  name: string;
  nameEn: string;
  years: string;
  location: string;
  description: string;
  // Profit projections per tree
  pricing: {
    profit: {
      daily: number; // per pohon
      weekly: number; // per pohon
      monthly: number; // per pohon
      yearly: number; // per pohon
    };
    sellPrice: number; // per pohon
  };
  estimatedReturn: number; // Total return untuk 10 pohon
  treePackages: TreePackage[];
}

export default function PlantShowcasePage() {
  const [plants, setPlantsData] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError, AlertComponent } = useAlert();

  // Transform old database structure to new simplified structure
  const transformOldToNew = (oldPlant: any): Plant => {
    // Generate default tree packages if none exist
    const defaultTreePackages: TreePackage[] = [
      {
        treeCount: 1,
        name: "1 Pohon",
        description: "Investasi Kecil",
        price: Math.ceil((oldPlant.investmentPlan?.price || 0) / 10),
        installmentPrice:
          oldPlant.investmentPlan?.installmentOptions?.[0]?.perTree || 0,
        enabled: true,
      },
      {
        treeCount: 10,
        name: "10 Pohon",
        description: "Paket Lengkap",
        price: oldPlant.investmentPlan?.price || 0,
        installmentPrice:
          oldPlant.investmentPlan?.installmentOptions?.[0]?.amount || 0,
        enabled: true,
      },
    ];

    return {
      name: oldPlant.name,
      nameEn: oldPlant.nameEn,
      years: oldPlant.years,
      location: oldPlant.location,
      description: oldPlant.description,
      pricing: {
        profit: {
          daily: parseInt(oldPlant.pricing?.profit?.daily || "0"),
          weekly: parseInt(oldPlant.pricing?.profit?.weekly || "0"),
          monthly: parseInt(oldPlant.pricing?.profit?.monthly || "0"),
          yearly: parseInt(oldPlant.pricing?.profit?.yearly || "0"),
        },
        sellPrice: parseInt(oldPlant.pricing?.sellPrice || "0"),
      },
      estimatedReturn: parseInt(
        oldPlant.investmentPlan?.returns?.toString().replace(/\D/g, "") || "0"
      ),
      treePackages:
        oldPlant.treePackages && oldPlant.treePackages.length > 0
          ? oldPlant.treePackages
          : defaultTreePackages,
    };
  };

  // Fetch plant data from API
  const fetchPlantData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/plant-showcase");

      if (response.ok) {
        const result = await response.json();
        // Transform old structure to new simplified structure
        const transformedPlants = result.data.map(transformOldToNew);
        setPlantsData(transformedPlants);
      }
    } catch (error) {
      console.error("Error fetching plant data:", error);
      showError("Kesalahan", "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlantData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTreePackageUpdate = (
    plantIndex: number,
    packageIndex: number,
    field: string,
    value: string | number | boolean
  ) => {
    setPlantsData((prev) => {
      const updated = [...prev];

      if (!updated[plantIndex].treePackages) {
        updated[plantIndex].treePackages = [];
      }

      if (
        field === "price" ||
        field === "installmentPrice" ||
        field === "treeCount"
      ) {
        const cleanValue =
          typeof value === "string" ? parseIDRInput(value) : value;
        (updated[plantIndex].treePackages[packageIndex] as any)[field] =
          field === "treeCount"
            ? parseInt(cleanValue as string) || 1
            : parseInt(cleanValue as string) || 0;
      } else {
        (updated[plantIndex].treePackages[packageIndex] as any)[field] = value;
      }

      return updated;
    });
  };

  const addTreePackage = (plantIndex: number) => {
    setPlantsData((prev) => {
      const updated = [...prev];
      updated[plantIndex] = {
        ...updated[plantIndex],
        treePackages: [
          ...(updated[plantIndex].treePackages || []),
          {
            treeCount: 5,
            name: "5 Pohon",
            description: "Paket Medium",
            price: 0,
            installmentPrice: 0,
            enabled: true,
          },
        ],
      };
      return updated;
    });
  };

  const removeTreePackage = (plantIndex: number, packageIndex: number) => {
    setPlantsData((prev) => {
      const updated = [...prev];
      updated[plantIndex].treePackages.splice(packageIndex, 1);
      return updated;
    });
  };

  const handlePriceUpdate = (
    plantIndex: number,
    field: string,
    value: string | number
  ) => {
    setPlantsData((prev) => {
      const updated = [...prev];

      // Ensure the plant has the required structure
      if (!updated[plantIndex].pricing) {
        updated[plantIndex].pricing = {
          profit: {
            daily: 0,
            weekly: 0,
            monthly: 0,
            yearly: 0,
          },
          sellPrice: 0,
        };
      }

      if (!updated[plantIndex].pricing.profit) {
        updated[plantIndex].pricing.profit = {
          daily: 0,
          weekly: 0,
          monthly: 0,
          yearly: 0,
        };
      }

      if (field.includes(".")) {
        const [parent, child] = field.split(".");

        if (parent === "profit") {
          const cleanValue = parseIDRInput(value as string);
          (updated[plantIndex].pricing.profit as any)[child] =
            parseInt(cleanValue) || 0;
        }
      } else if (field === "estimatedReturn") {
        const cleanValue = parseIDRInput(value as string);
        updated[plantIndex].estimatedReturn = parseInt(cleanValue) || 0;
      } else if (field === "sellPrice") {
        const cleanValue = parseIDRInput(value as string);
        updated[plantIndex].pricing.sellPrice = parseInt(cleanValue) || 0;
      }

      return updated;
    });
  };

  // Transform new simplified structure back to old database structure
  const transformNewToOld = (newPlant: Plant): any => {
    return {
      name: newPlant.name,
      nameEn: newPlant.nameEn,
      years: newPlant.years,
      location: newPlant.location,
      description: newPlant.description,
      pricing: {
        monthly: newPlant.pricing.profit.monthly.toString(),
        yearly: newPlant.pricing.profit.yearly.toString(),
        fiveYears: (newPlant.pricing.profit.yearly * 5).toString(),
        sellPrice: newPlant.pricing.sellPrice.toString(),
        profit: {
          daily: newPlant.pricing.profit.daily.toString(),
          weekly: newPlant.pricing.profit.weekly.toString(),
          monthly: newPlant.pricing.profit.monthly.toString(),
          yearly: newPlant.pricing.profit.yearly.toString(),
        },
      },
      investmentPlan: {
        name: `Paket 10 Pohon ${newPlant.name}`,
        price:
          newPlant.treePackages.find((pkg) => pkg.treeCount === 10)?.price ||
          15000000,
        duration: newPlant.years,
        returns: newPlant.estimatedReturn,
        plantType: `${newPlant.name} Premium`,
        riskLevel: "Bergantung Alam",
        installmentOptions: [
          {
            period: "Per Bulan",
            amount:
              newPlant.treePackages.find((pkg) => pkg.treeCount === 10)
                ?.installmentPrice || 16500000,
            perTree:
              newPlant.treePackages.find((pkg) => pkg.treeCount === 1)
                ?.installmentPrice || 1650000,
          },
          {
            period: "Per 3 Bulan",
            amount:
              newPlant.treePackages.find((pkg) => pkg.treeCount === 10)
                ?.installmentPrice || 16500000,
            perTree:
              newPlant.treePackages.find((pkg) => pkg.treeCount === 1)
                ?.installmentPrice || 1650000,
          },
          {
            period: "Per 6 Bulan",
            amount:
              newPlant.treePackages.find((pkg) => pkg.treeCount === 10)
                ?.installmentPrice || 16500000,
            perTree:
              newPlant.treePackages.find((pkg) => pkg.treeCount === 1)
                ?.installmentPrice || 1650000,
          },
          {
            period: "Per Tahun",
            amount:
              newPlant.treePackages.find((pkg) => pkg.treeCount === 10)
                ?.installmentPrice || 16500000,
            perTree:
              newPlant.treePackages.find((pkg) => pkg.treeCount === 1)
                ?.installmentPrice || 1650000,
          },
        ],
        features: [
          `10 Pohon ${newPlant.name} Premium`,
          `Proyeksi keuntungan hingga Rp ${newPlant.estimatedReturn.toLocaleString(
            "id-ID"
          )}`,
          `Cicilan mulai Rp ${(
            newPlant.treePackages.find((pkg) => pkg.treeCount === 1)
              ?.installmentPrice || 1650000
          ).toLocaleString("id-ID")}/bulan per pohon`,
          "Monitoring profesional & laporan berkala",
          "Sertifikat kepemilikan pohon",
          "Perawatan dan pemeliharaan terjamin",
        ],
      },
      treePackages: newPlant.treePackages,
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Transform new structure back to old format for database compatibility
      const transformedPlants = plants.map(transformNewToOld);

      const response = await fetch("/api/admin/plant-showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plants: transformedPlants }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showSuccess("Berhasil Disimpan", "Data tanaman berhasil diperbarui.");
        await fetchPlantData();
      } else {
        throw new Error(result.error || "Failed to save data");
      }
    } catch (error) {
      console.error("Save error:", error);
      showError("Gagal Menyimpan", "Terjadi kesalahan saat menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Harga Tanaman
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
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
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)]">
              Edit Harga Showcase Tanaman
            </h1>
            <p className="text-[#889063] dark:text-gray-300 mt-2">
              Kelola harga dan informasi tanaman yang ditampilkan di landing
              page
            </p>
          </div>
          <motion.button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:from-[#4C3D19] hover:to-[#324D3E] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </motion.button>
        </div>

        {/* Plants Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {plants.map((plant, index) => (
            <motion.div
              key={plant.name}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{
                scale: 1.02,
                boxShadow: "0 20px 25px -5px rgba(50, 77, 62, 0.1)",
              }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-[#324D3E] to-[#4C3D19] flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#324D3E] dark:text-white capitalize font-[family-name:var(--font-poppins)]">
                    Tanaman {plant.name}
                  </h3>
                  <p className="text-sm text-[#889063] dark:text-gray-400">
                    {plant.nameEn}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 1. Tree Packages Management */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-semibold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)]">
                      1. Paket Pohon
                    </h4>
                    <motion.button
                      onClick={() => addTreePackage(index)}
                      className="bg-[#324D3E] text-white px-3 py-1 rounded-lg text-sm hover:bg-[#4C3D19] transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      + Tambah Paket
                    </motion.button>
                  </div>
                  <div className="space-y-4">
                    {(plant.treePackages || []).map((pkg, pkgIndex) => (
                      <motion.div
                        key={pkgIndex}
                        className="bg-gradient-to-r from-[#324D3E]/5 to-[#4C3D19]/5 p-4 rounded-xl border border-[#324D3E]/10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: pkgIndex * 0.1 }}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium text-[#324D3E] dark:text-white">
                            Paket {pkgIndex + 1}
                          </h5>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={pkg.enabled}
                                onChange={(e) =>
                                  handleTreePackageUpdate(
                                    index,
                                    pkgIndex,
                                    "enabled",
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 text-[#324D3E] accent-[#324D3E]"
                              />
                              <span className="text-sm text-[#324D3E] dark:text-gray-300">
                                Aktif
                              </span>
                            </label>
                            <motion.button
                              onClick={() => removeTreePackage(index, pkgIndex)}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              🗑️
                            </motion.button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                              Jumlah Pohon
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={pkg.treeCount}
                              onChange={(e) =>
                                handleTreePackageUpdate(
                                  index,
                                  pkgIndex,
                                  "treeCount",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-[#324D3E]/20 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                              Nama Paket
                            </label>
                            <input
                              type="text"
                              value={pkg.name}
                              onChange={(e) =>
                                handleTreePackageUpdate(
                                  index,
                                  pkgIndex,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-[#324D3E]/20 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                              Deskripsi
                            </label>
                            <input
                              type="text"
                              value={pkg.description}
                              onChange={(e) =>
                                handleTreePackageUpdate(
                                  index,
                                  pkgIndex,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 text-sm border border-[#324D3E]/20 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                              Harga Normal
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[#889063] text-xs">
                                Rp
                              </span>
                              <input
                                type="text"
                                value={formatIDRCurrency(pkg.price)}
                                onChange={(e) => {
                                  const formattedValue = formatIDRInput(
                                    e.target.value
                                  );
                                  e.target.value = formattedValue;
                                  handleTreePackageUpdate(
                                    index,
                                    pkgIndex,
                                    "price",
                                    formattedValue
                                  );
                                }}
                                className="w-full pl-6 pr-2 py-1 text-sm border border-[#324D3E]/20 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                              Harga Cicilan
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[#889063] text-xs">
                                Rp
                              </span>
                              <input
                                type="text"
                                value={formatIDRCurrency(pkg.installmentPrice)}
                                onChange={(e) => {
                                  const formattedValue = formatIDRInput(
                                    e.target.value
                                  );
                                  e.target.value = formattedValue;
                                  handleTreePackageUpdate(
                                    index,
                                    pkgIndex,
                                    "installmentPrice",
                                    formattedValue
                                  );
                                }}
                                className="w-full pl-6 pr-2 py-1 text-sm border border-[#324D3E]/20 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {(!plant.treePackages ||
                      plant.treePackages.length === 0) && (
                      <div className="text-center py-6 text-[#889063] dark:text-gray-400">
                        <p className="text-sm mb-2">Belum ada paket pohon</p>
                        <motion.button
                          onClick={() => addTreePackage(index)}
                          className="bg-[#324D3E] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4C3D19] transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          + Tambah Paket Pertama
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Proyeksi Keuntungan per Pohon */}
                <div>
                  <h4 className="text-lg font-semibold text-[#324D3E] dark:text-white mb-3 font-[family-name:var(--font-poppins)]">
                    2. Proyeksi Keuntungan (per pohon)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                        Harian
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#889063] text-sm">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={formatIDRCurrency(
                            plant.pricing?.profit?.daily || 0
                          )}
                          onChange={(e) => {
                            const formattedValue = formatIDRInput(
                              e.target.value
                            );
                            e.target.value = formattedValue;
                            handlePriceUpdate(
                              index,
                              "profit.daily",
                              formattedValue
                            );
                          }}
                          className="w-full pl-10 pr-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                        Mingguan
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#889063] text-sm">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={formatIDRCurrency(
                            plant.pricing?.profit?.weekly || 0
                          )}
                          onChange={(e) => {
                            const formattedValue = formatIDRInput(
                              e.target.value
                            );
                            e.target.value = formattedValue;
                            handlePriceUpdate(
                              index,
                              "profit.weekly",
                              formattedValue
                            );
                          }}
                          className="w-full pl-10 pr-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                        Bulanan
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#889063] text-sm">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={formatIDRCurrency(
                            plant.pricing?.profit?.monthly || 0
                          )}
                          onChange={(e) => {
                            const formattedValue = formatIDRInput(
                              e.target.value
                            );
                            e.target.value = formattedValue;
                            handlePriceUpdate(
                              index,
                              "profit.monthly",
                              formattedValue
                            );
                          }}
                          className="w-full pl-10 pr-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                        Tahunan
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#889063] text-sm">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={formatIDRCurrency(
                            plant.pricing?.profit?.yearly || 0
                          )}
                          onChange={(e) => {
                            const formattedValue = formatIDRInput(
                              e.target.value
                            );
                            e.target.value = formattedValue;
                            handlePriceUpdate(
                              index,
                              "profit.yearly",
                              formattedValue
                            );
                          }}
                          className="w-full pl-10 pr-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                      Harga Jual per Pohon
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#889063] text-sm">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={formatIDRCurrency(
                          plant.pricing?.sellPrice || 0
                        )}
                        onChange={(e) => {
                          const formattedValue = formatIDRInput(
                            e.target.value
                          );
                          e.target.value = formattedValue;
                          handlePriceUpdate(
                            index,
                            "sellPrice",
                            formattedValue
                          );
                        }}
                        className="w-full pl-10 pr-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Estimasi Return */}
                <div>
                  <h4 className="text-lg font-semibold text-[#324D3E] dark:text-white mb-3 font-[family-name:var(--font-poppins)]">
                    3. Estimasi Return (10 Pohon)
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-1">
                      Total Estimasi Return setelah 5 Tahun
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#889063] text-sm">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={formatIDRCurrency(plant.estimatedReturn || 0)}
                        onChange={(e) => {
                          const formattedValue = formatIDRInput(e.target.value);
                          e.target.value = formattedValue;
                          handlePriceUpdate(
                            index,
                            "estimatedReturn",
                            formattedValue
                          );
                        }}
                        className="w-full pl-10 pr-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AdminLayout>
  );
}
