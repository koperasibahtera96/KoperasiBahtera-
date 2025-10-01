"use client";

// update
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAlert } from "@/components/ui/Alert";
import { InvestorGroup, Pagination } from "@/types/cicilan";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Users, DollarSign, AlertTriangle, Download } from "lucide-react";

export default function AdminCicilanPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };
  const [investorGroups, setInvestorGroups] = useState<InvestorGroup[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    page: 1,
  });
  const { AlertComponent, showSuccess, showError } = useAlert();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  const fetchInvestorGroups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      params.append("page", filters.page.toString());
      params.append("limit", "10");

      const response = await fetch(`/api/admin/cicilan/investors?${params}`);
      if (response.ok) {
        const data = await response.json();
        setInvestorGroups(data.investors);

        console.log(data.investors, "data.investors");
        setPagination(data.pagination);
      } else {
        console.error("Failed to fetch investor groups");
      }
    } catch (error) {
      console.error("Error fetching investor groups:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestorGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleViewDetails = (userId: string) => {
    console.log(userId, "userid");
    router.push(`/admin/cicilan/${userId.toString()}`);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const response = await fetch("/api/admin/cicilan/export");

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-cicilan-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess("Berhasil!", "Laporan cicilan berhasil diekspor");
    } catch (error) {
      console.error("Export error:", error);
      showError("Gagal mengekspor", "Terjadi kesalahan saat mengekspor data");
    } finally {
      setIsExporting(false);
    }
  };

  const getInvestmentStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300";
      case "completed":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300";
      case "overdue":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300";
    }
  };

  const getInvestmentStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "completed":
        return "Selesai";
      case "overdue":
        return "Terlambat";
      default:
        return status;
    }
  };

  return (
    <AdminLayout>
      <AlertComponent />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1
              className={getThemeClasses(
                "text-3xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              Kelola Cicilan
            </h1>
            <p className="text-[#889063] dark:text-gray-300 mt-2 transition-colors duration-300">
              Kelola pembayaran cicilan investasi dari pengguna
            </p>
          </div>

          {/* Export Button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleExportExcel}
              disabled={isExporting || loading}
              className={getThemeClasses(
                "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold font-[family-name:var(--font-poppins)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
              )}
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Mengekspor..." : "Export XLSX"}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div
          className={getThemeClasses(
            "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 transition-colors duration-300 overflow-visible",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-2 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                Cari Investor
              </label>
              <input
                type="text"
                placeholder="Cari berdasarkan nama atau email..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                    page: 1,
                  }))
                }
                className="w-full border border-[#324D3E]/20 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 text-[#324D3E] dark:text-white placeholder-[#889063] dark:placeholder-gray-400 transition-all duration-300 text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-2 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                Status Investasi
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: e.target.value,
                    page: 1,
                  }))
                }
                className="w-full border border-[#324D3E]/20 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 text-[#324D3E] dark:text-white transition-all duration-300 text-sm sm:text-base"
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="completed">Selesai</option>
                <option value="overdue">Terlambat</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: "", search: "", page: 1 })}
                className="w-full px-4 py-3 bg-[#324D3E]/10 dark:bg-[#324D3E]/20 text-[#324D3E] dark:text-[#324D3E] rounded-xl hover:bg-[#324D3E]/20 dark:hover:bg-[#324D3E]/30 transition-all duration-300 font-medium font-[family-name:var(--font-poppins)] text-sm sm:text-base"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                  Total Investor
                </p>
                <p className="text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
                  {pagination?.totalCount || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#324D3E]/10 rounded-xl flex items-center justify-center">
                <Users className="text-[#324D3E] w-6 h-6" />
              </div>
            </div>
          </div>
          <div
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                  Total Terbayar
                </p>
                <p className="text-2xl font-bold text-[#889063] dark:text-gray-300 transition-colors duration-300">
                  Rp{" "}
                  {investorGroups
                    .reduce((sum, group) => sum + group.totalPaid, 0)
                    .toLocaleString("id-ID")}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#889063]/10 rounded-xl flex items-center justify-center">
                <DollarSign className="text-[#889063] w-6 h-6" />
              </div>
            </div>
          </div>
          <div
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                  Total Investasi
                </p>
                <p className="text-2xl font-bold text-[#4C3D19] dark:text-emerald-300 transition-colors duration-300">
                  Rp{" "}
                  {investorGroups
                    .reduce((sum, group) => sum + (group.totalAmount || 0), 0)
                    .toLocaleString("id-ID")}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#4C3D19]/10 rounded-xl flex items-center justify-center">
                <DollarSign className="text-[#4C3D19] w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                  Terlambat
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-300 transition-colors duration-300">
                  {investorGroups.reduce(
                    (sum, group) => sum + (group.latePayments || 0),
                    0
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="text-red-600 w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Investor List */}
        <div
          className={getThemeClasses(
            "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
        >
          {loading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#324D3E] mx-auto mb-4"></div>
              <p className="text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)] text-sm sm:text-base transition-colors duration-300">
                Memuat data investor...
              </p>
            </div>
          ) : investorGroups.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-[#889063] text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-[#324D3E] dark:text-white mb-2 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                Belum ada data investor
              </h3>
              <p className="text-[#889063] dark:text-gray-300 transition-colors duration-300">
                Data investor akan muncul di sini ketika pengguna membuat
                cicilan
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#324D3E]/10 dark:divide-gray-600 transition-colors duration-300">
                {investorGroups.map((investor) => (
                  <div
                    key={investor.userId}
                    className="p-4 sm:p-6 hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 transition-all duration-300"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#324D3E]/10 to-[#4C3D19]/10 rounded-full flex items-center justify-center border border-[#324D3E]/20 flex-shrink-0">
                            <span className="text-[#324D3E] dark:text-white font-semibold text-base sm:text-lg font-[family-name:var(--font-poppins)] transition-colors duration-300">
                              {investor.userInfo.fullName
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base sm:text-lg font-semibold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] truncate transition-colors duration-300">
                              {investor.userInfo.fullName}
                            </h3>
                            <p className="text-xs sm:text-sm text-[#889063] dark:text-gray-300 truncate transition-colors duration-300">
                              {investor.userInfo.email}
                            </p>
                            <p className="text-xs text-[#889063]/70 dark:text-gray-400 truncate transition-colors duration-300">
                              {investor.userInfo.phoneNumber}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                          <div className="bg-gradient-to-r from-[#324D3E]/5 to-[#324D3E]/10 p-3 sm:p-4 rounded-xl border border-[#324D3E]/10">
                            <div className="text-xs sm:text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                              Total Investasi
                            </div>
                            <div className="text-base sm:text-lg font-semibold text-[#324D3E] dark:text-white transition-colors duration-300">
                              {investor.totalInvestments}
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-[#4C3D19]/5 to-[#4C3D19]/10 p-3 sm:p-4 rounded-xl border border-[#4C3D19]/10">
                            <div className="text-xs sm:text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                              Nilai Investasi
                            </div>
                            <div className="text-base sm:text-lg font-semibold text-[#4C3D19] dark:text-emerald-300 truncate transition-colors duration-300">
                              Rp {investor.totalAmount.toLocaleString("id-ID")}
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-[#889063]/5 to-[#889063]/10 p-3 sm:p-4 rounded-xl border border-[#889063]/10">
                            <div className="text-xs sm:text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                              Sudah Dibayar
                            </div>
                            <div className="text-base sm:text-lg font-semibold text-[#889063] dark:text-blue-300 truncate transition-colors duration-300">
                              Rp {investor.totalPaid.toLocaleString("id-ID")}
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-3 sm:p-4 rounded-xl border border-orange-200 dark:border-orange-700/50 transition-colors duration-300">
                            <div className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                              Terlambat
                            </div>
                            <div className="text-base sm:text-lg font-semibold text-orange-600 dark:text-orange-200 transition-colors duration-300">
                              {investor.latePayments || 0}
                            </div>
                          </div>
                        </div>

                        {/* Investment Summary */}
                        <div className="mt-4">
                          <div className="text-xs sm:text-sm text-[#889063] dark:text-gray-300 mb-2 font-[family-name:var(--font-poppins)] transition-colors duration-300">
                            Investasi Aktif:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {investor.investments
                              .slice(0, 3)
                              .map((investment, index) => (
                                <div
                                  key={`${investor.userId}-investment-${index}`}
                                  className="flex items-center gap-1 sm:gap-2 bg-[#324D3E]/5 px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm border border-[#324D3E]/10"
                                >
                                  <span className="text-[#324D3E] dark:text-white font-medium truncate max-w-20 sm:max-w-none transition-colors duration-300">
                                    {investment.productName}
                                  </span>
                                  <span
                                    className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${getInvestmentStatusColor(
                                      investment.status
                                    )}`}
                                  >
                                    {getInvestmentStatusText(investment.status)}
                                  </span>
                                </div>
                              ))}
                            {investor.investments.length > 3 && (
                              <span className="text-xs sm:text-sm text-[#889063] dark:text-gray-300 transition-colors duration-300">
                                +{investor.investments.length - 3} lainnya
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 lg:min-w-0 lg:w-auto">
                        <div className="flex flex-wrap gap-2">
                          {(investor.latePayments || 0) > 0 && (
                            <div className="bg-gradient-to-r from-red-100 to-red-200 text-red-800 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border border-red-300 text-center whitespace-nowrap">
                              {investor.latePayments} Terlambat
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleViewDetails(investor.userId)}
                            className={getThemeClasses(
                              "px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 text-xs sm:text-sm font-semibold font-[family-name:var(--font-poppins)] whitespace-nowrap",
                              "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
                            )}
                          >
                            Lihat Detail
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 sm:p-6 border-t border-[#324D3E]/10">
                  <div className="text-xs sm:text-sm text-[#889063] font-[family-name:var(--font-poppins)] text-center sm:text-left">
                    Menampilkan {(pagination.page - 1) * pagination.limit + 1} -{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.totalCount
                    )}{" "}
                    dari {pagination.totalCount} investor
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                      }
                      disabled={!pagination.hasPrev}
                      className="px-3 sm:px-4 py-2 border border-[#324D3E]/20 rounded-xl text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#324D3E]/5 text-[#324D3E] font-medium transition-all duration-300"
                    >
                      <span className="hidden sm:inline">Sebelumnya</span>
                      <span className="sm:hidden">‹</span>
                    </button>
                    <span className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-[#324D3E] font-semibold whitespace-nowrap">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                      disabled={!pagination.hasNext}
                      className="px-3 sm:px-4 py-2 border border-[#324D3E]/20 rounded-xl text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#324D3E]/5 text-[#324D3E] font-medium transition-all duration-300"
                    >
                      <span className="hidden sm:inline">Selanjutnya</span>
                      <span className="sm:hidden">›</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
