"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { KetuaLayout } from "@/components/ketua/KetuaLayout";
import { useAlert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import { RefreshCw, Download } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface PlantInstance {
  _id: string;
  id: string;
  instanceName: string;
  baseAnnualROI: number;
  qrCode?: string;
  owner?: string;
  location?: string;
  status?: string;
  lastUpdate?: string;
  createdAt: string;
  updatedAt: string;
}

interface RelatedInvestor {
  _id: string;
  name: string;
  email: string;
  totalInvestasi: number;
  totalPaid: number;
  phoneNumber?: string;
}

interface RelatedInvestment {
  investmentId: string;
  productName: string;
  totalAmount: number;
  amountPaid: number;
  paymentType: "full" | "cicilan";
  status: "pending" | "active" | "completed" | "cancelled";
  investmentDate: Date;
  completionDate?: Date;
}

interface OwnerGroup {
  ownerName: string;
  totalInstances: number;
  instances: PlantInstance[];
  relatedInvestor: RelatedInvestor | null;
  relatedInvestments: RelatedInvestment[];
  totalInvestmentAmount: number;
  totalPaidAmount: number;
}

interface TreeTypeGroup {
  plantType: "gaharu" | "jengkol" | "aren" | "alpukat";
  totalInstances: number;
  totalInvestors: number;
  totalInvestment: number;
  totalPaid: number;
  ownerGroups: OwnerGroup[];
}

interface TreesData {
  groupedData: TreeTypeGroup[];
  stats: {
    totalInstances: number;
    totalInvestors: number;
    totalInvestment: number;
    totalPaid: number;
    paketDibeli: number;
    menungguTanam: number;
    sudahDitanam: number;
    tumbuh: number;
    panen: number;
    pohonPerBlok: Record<string, number>;
    byType: Record<
      string,
      {
        instances: number;
        investors: number;
        investment: number;
        paid: number;
      }
    >;
  };
}

export default function TreesPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };
  const [treesData, setTreesData] = useState<TreesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedBlok, setSelectedBlok] = useState<string>("all");
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

  const { showError, AlertComponent } = useAlert();

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const response = await fetch("/api/admin/trees/export");

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `laporan-data-pohon-${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showError(
          "Gagal export",
          "Terjadi kesalahan saat mengunduh file Excel"
        );
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      showError(
        "Kesalahan Jaringan",
        "Gagal mengunduh file Excel. Periksa koneksi internet Anda."
      );
    }
  };

  // Format number helper functions

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Fetch trees data from API
  const fetchTreesData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        filter: selectedFilter,
        blok: selectedBlok,
      });
      const response = await fetch(`/api/admin/trees?${params}`);

      if (response.ok) {
        const data = await response.json();
        setTreesData(data.data);
      } else {
        const errorData = await response.json();
        showError(
          "Gagal memuat data",
          errorData.error || "Terjadi kesalahan saat memuat data pohon"
        );
      }
    } catch (error) {
      console.error("Error fetching trees data:", error);
      showError(
        "Kesalahan Jaringan",
        "Gagal terhubung ke server. Periksa koneksi internet Anda."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, selectedBlok]);

  const getPlantTypeLabel = (plantType: string) => {
    const labels: Record<string, string> = {
      gaharu: "Gaharu",
      jengkol: "Jengkol",
      aren: "Aren",
      alpukat: "Alpukat",
      kelapa: "Kelapa",
    };
    return labels[plantType] || plantType;
  };

  const toggleExpanded = (plantType: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(plantType)) {
      newExpanded.delete(plantType);
    } else {
      newExpanded.add(plantType);
    }
    setExpandedTypes(newExpanded);
  };

  const toggleOwnerExpanded = (key: string) => {
    const newExpanded = new Set(expandedOwners);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedOwners(newExpanded);
  };

  // Since API already filters by selectedFilter and selectedBlok,
  // we only need to apply selectedType filter here
  const filteredData =
    treesData?.groupedData.filter(
      (group) => selectedType === "all" || group.plantType === selectedType
    ) || [];

  // Determine which layout to use based on user role
  const isKetua = session?.user?.role === "ketua";
  const Layout = isKetua ? KetuaLayout : AdminLayout;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] truncate">
              Data Pohon Berdasarkan Tipe
            </h1>
            <p className="text-[#889063] dark:text-gray-300 mt-1 sm:mt-2 text-sm sm:text-base">
              Kelompokkan pohon berdasarkan tipe dengan data investor terkait
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={fetchTreesData}
              disabled={loading}
              className={getThemeClasses(
                "bg-[#324D3E]/10 dark:bg-gray-700/50 hover:bg-[#324D3E]/20 dark:hover:bg-gray-700 text-[#324D3E] dark:text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap",
                "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
              )}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {loading ? "Memuat..." : "Refresh"}
              </span>
            </button>
            <button
              onClick={exportToExcel}
              className={getThemeClasses(
                "bg-green-600/10 dark:bg-green-700/50 hover:bg-green-600/20 dark:hover:bg-green-700 text-green-700 dark:text-green-300 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap",
                "!bg-gradient-to-r !from-[#C1FFC1] !to-[#E9FFE9] !text-[#1d4c1d]"
              )}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
          <div
            className={getThemeClasses(
              `bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer ${
                selectedFilter === "all" ? "ring-2 ring-[#324D3E]" : ""
              }`,
              "!bg-gradient-to-r !from-[#FFEFF3] !to-[#FFF5F7]"
            )}
            onClick={() => setSelectedFilter("all")}
          >
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-300 truncate">
                📦 Jumlah Paket Dibeli
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#324D3E] dark:text-white">
                {(treesData?.stats as any)?.paketDibeli || 0}
              </p>
            </div>
          </div>

          <div
            className={getThemeClasses(
              `bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer ${
                selectedFilter === "menunggu-tanam"
                  ? "ring-2 ring-[#324D3E]"
                  : ""
              }`,
              "!bg-gradient-to-r !from-[#FFEFF3] !to-[#FFF5F7]"
            )}
            onClick={() => setSelectedFilter("menunggu-tanam")}
          >
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-300 truncate">
                ⏳ Jumlah Paket Menunggu Tanam
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#4C3D19] dark:text-emerald-300">
                {treesData?.stats.menungguTanam || 0}
              </p>
            </div>
          </div>

          <div
            className={getThemeClasses(
              `bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer ${
                selectedFilter === "sudah-ditanam"
                  ? "ring-2 ring-[#324D3E]"
                  : ""
              }`,
              "!bg-gradient-to-r !from-[#FFEFF3] !to-[#FFF5F7]"
            )}
            onClick={() => setSelectedFilter("sudah-ditanam")}
          >
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-300 truncate">
                🌱 Jumlah Pohon Sudah Ditanam
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#889063] dark:text-blue-300">
                {treesData?.stats.sudahDitanam || 0}
              </p>
            </div>
          </div>

          <div
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
              "!bg-gradient-to-r !from-[#FFEFF3] !to-[#FFF5F7]"
            )}
          >
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-300 truncate">
                🏘️ Jumlah Pohon per Blok
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">
                {treesData?.stats.pohonPerBlok
                  ? Object.keys(treesData.stats.pohonPerBlok).length
                  : 0}{" "}
                Blok
              </p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={selectedType}
              onValueChange={setSelectedType}
              options={[
                { value: "all", label: "Semua Tipe Pohon" },
                { value: "gaharu", label: "Gaharu" },
                { value: "jengkol", label: "Jengkol" },
                { value: "aren", label: "Aren" },
                { value: "alpukat", label: "Alpukat" },
              ]}
            />
            <Select
              value={selectedBlok}
              onValueChange={setSelectedBlok}
              options={[
                { value: "all", label: "Semua Blok" },
                ...(treesData?.stats.pohonPerBlok
                  ? Object.keys(treesData.stats.pohonPerBlok).map((blok) => ({
                      value: blok,
                      label: `${blok} (${treesData.stats.pohonPerBlok[blok]} pohon)`,
                    }))
                  : []),
              ]}
            />
          </div>
          {(selectedFilter !== "all" || selectedBlok !== "all") && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedFilter !== "all" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#324D3E]/10 text-[#324D3E]">
                  Filter:{" "}
                  {selectedFilter === "menunggu-tanam"
                    ? "Menunggu Tanam"
                    : selectedFilter === "sudah-ditanam"
                    ? "Sudah Ditanam"
                    : selectedFilter === "tumbuh"
                    ? "Tumbuh"
                    : selectedFilter === "panen"
                    ? "Panen"
                    : selectedFilter}
                  <button
                    onClick={() => setSelectedFilter("all")}
                    className="ml-2 text-[#324D3E] hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedBlok !== "all" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#4C3D19]/10 text-[#4C3D19]">
                  Blok: {selectedBlok}
                  <button
                    onClick={() => setSelectedBlok("all")}
                    className="ml-2 text-[#4C3D19] hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Trees Groups */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Memuat data pohon...
              </p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {selectedType !== "all"
                  ? "Tidak ada data untuk tipe pohon yang dipilih"
                  : "Belum ada data pohon"}
              </p>
            </div>
          ) : (
            filteredData.map((group) => (
              <div
                key={group.plantType}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden"
              >
                {/* Group Header */}
                <div
                  className={getThemeClasses(
                    "bg-[#324D3E]/5 dark:bg-gray-700/50 p-4 lg:p-6 cursor-pointer hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 transition-colors",
                    "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9]"
                  )}
                  onClick={() => toggleExpanded(group.plantType)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white">
                        🌳 {getPlantTypeLabel(group.plantType)}
                      </h3>
                      <span className="text-sm text-[#889063] dark:text-gray-400">
                        ({group.totalInstances} instansi)
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-[#889063] dark:text-gray-400">
                            Investor:{" "}
                          </span>
                          <span className="font-semibold text-[#324D3E] dark:text-white">
                            {group.totalInvestors}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#889063] dark:text-gray-400">
                            Investasi:{" "}
                          </span>
                          <span className="font-semibold text-[#324D3E] dark:text-white">
                            {formatCurrency(group.totalInvestment)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#889063] dark:text-gray-400">
                            Terbayar:{" "}
                          </span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(group.totalPaid)}
                          </span>
                        </div>
                      </div>
                      <div className="text-[#324D3E] dark:text-white">
                        {expandedTypes.has(group.plantType) ? "▼" : "▶"}
                      </div>
                    </div>
                  </div>
                  <div className="sm:hidden mt-2 space-y-1 text-sm">
                    <div>
                      <span className="text-[#889063] dark:text-gray-400">
                        Investor:{" "}
                      </span>
                      <span className="font-semibold text-[#324D3E] dark:text-white">
                        {group.totalInvestors}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#889063] dark:text-gray-400">
                        Investasi:{" "}
                      </span>
                      <span className="font-semibold text-[#324D3E] dark:text-white">
                        {formatCurrency(group.totalInvestment)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#889063] dark:text-gray-400">
                        Terbayar:{" "}
                      </span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(group.totalPaid)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Group Content - Owner Groups */}
                {expandedTypes.has(group.plantType) && (
                  <div className="divide-y divide-[#324D3E]/10 dark:divide-gray-700">
                    {group.ownerGroups.map((ownerGroup) => {
                      const ownerKey = `${group.plantType}-${ownerGroup.ownerName}`;
                      return (
                        <div
                          key={ownerKey}
                          className="bg-white/30 dark:bg-gray-800/30"
                        >
                          {/* Owner Header */}
                          <div
                            className={getThemeClasses(
                              "p-4 lg:p-6 cursor-pointer hover:bg-[#324D3E]/5 dark:hover:bg-gray-700/50 transition-colors border-l-4 border-[#4C3D19] dark:border-emerald-500",
                              "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !border-[#FFC1CC]/30"
                            )}
                            onClick={() => toggleOwnerExpanded(ownerKey)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <h4 className="text-md font-semibold text-[#324D3E] dark:text-white">
                                  👤 {ownerGroup.ownerName}
                                </h4>
                                <span className="text-sm text-[#889063] dark:text-gray-400">
                                  ({ownerGroup.totalInstances} instansi)
                                </span>
                                {!ownerGroup.relatedInvestor && (
                                  <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs px-2 py-1 rounded-full">
                                    No Investor Data
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="hidden sm:flex items-center gap-4 text-sm">
                                  {ownerGroup.relatedInvestor && (
                                    <>
                                      <div>
                                        <span className="text-[#889063] dark:text-gray-400">
                                          Email:{" "}
                                        </span>
                                        <span className="font-medium text-[#324D3E] dark:text-white">
                                          {ownerGroup.relatedInvestor.email}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[#889063] dark:text-gray-400">
                                          Investasi:{" "}
                                        </span>
                                        <span className="font-semibold text-[#324D3E] dark:text-white">
                                          {formatCurrency(
                                            ownerGroup.totalInvestmentAmount
                                          )}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[#889063] dark:text-gray-400">
                                          Terbayar:{" "}
                                        </span>
                                        <span className="font-semibold text-green-600 dark:text-green-400">
                                          {formatCurrency(
                                            ownerGroup.totalPaidAmount
                                          )}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className="text-[#324D3E] dark:text-white">
                                  {expandedOwners.has(ownerKey) ? "▼" : "▶"}
                                </div>
                              </div>
                            </div>
                            <div className="sm:hidden mt-2 space-y-1 text-sm">
                              {ownerGroup.relatedInvestor && (
                                <>
                                  <div>
                                    <span className="text-[#889063] dark:text-gray-400">
                                      Email:{" "}
                                    </span>
                                    <span className="font-medium text-[#324D3E] dark:text-white">
                                      {ownerGroup.relatedInvestor.email}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[#889063] dark:text-gray-400">
                                      Investasi:{" "}
                                    </span>
                                    <span className="font-semibold text-[#324D3E] dark:text-white">
                                      {formatCurrency(
                                        ownerGroup.totalInvestmentAmount
                                      )}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[#889063] dark:text-gray-400">
                                      Terbayar:{" "}
                                    </span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                      {formatCurrency(
                                        ownerGroup.totalPaidAmount
                                      )}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Owner Content */}
                          {expandedOwners.has(ownerKey) && (
                            <div className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700">
                              {/* Plant Instances Table */}
                              <div className="p-4 lg:p-6">
                                <h5 className="text-sm font-semibold text-[#324D3E] dark:text-white mb-3">
                                  Instansi Pohon ({ownerGroup.instances.length})
                                </h5>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                          No. Kontrak
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                          Tanggal Pembelian
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                          Tanggal Tanam
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                          Lokasi
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                          Blok/Kavling
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                          Umur
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                          Status Pohon
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                          Kondisi
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                      {ownerGroup.instances.map((instance) => {
                                        // Find related investment for purchase date
                                        const relatedInvestment =
                                          ownerGroup.relatedInvestments.find(
                                            (inv) =>
                                              inv.investmentId.includes(
                                                instance.id.slice(-3)
                                              ) // rough matching
                                          );

                                        return (
                                          <tr
                                            key={instance._id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                          >
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                              {instance.id}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                              {relatedInvestment
                                                ? new Date(
                                                    relatedInvestment.investmentDate
                                                  ).toLocaleDateString("id-ID")
                                                : new Date(
                                                    instance.createdAt
                                                  ).toLocaleDateString("id-ID")}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                              {(instance as any).tanggalTanam ||
                                                "-"}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                              {instance.location || "-"}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                              {(instance as any).kavling ||
                                              (instance as any).blok
                                                ? `${
                                                    (instance as any).kavling ||
                                                    "-"
                                                  }/${
                                                    (instance as any).blok ||
                                                    "-"
                                                  }`
                                                : "-"}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                              {(instance as any).umur || "-"}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                              <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                  (instance as any)
                                                    .statusPohon ===
                                                  "Menunggu Tanam"
                                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                    : (instance as any)
                                                        .statusPohon ===
                                                      "Sudah Ditanam"
                                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                    : (instance as any)
                                                        .statusPohon ===
                                                      "Tumbuh"
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                    : (instance as any)
                                                        .statusPohon === "Panen"
                                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
                                                }`}
                                              >
                                                {(instance as any)
                                                  .statusPohon || "-"}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                              <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                  instance.status?.toLowerCase() ===
                                                  "sakit"
                                                    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                                                    : instance.status?.toLowerCase() ===
                                                      "mati"
                                                    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                                                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                }`}
                                              >
                                                {instance.status?.toLowerCase() ===
                                                "sakit"
                                                  ? "Sakit"
                                                  : instance.status?.toLowerCase() ===
                                                    "mati"
                                                  ? "Mati"
                                                  : "Sehat"}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert Component */}
      <AlertComponent />
    </Layout>
  );
}
