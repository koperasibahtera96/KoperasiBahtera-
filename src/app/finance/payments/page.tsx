"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { useAlert } from "@/components/ui/Alert";
import { InvestorGroup, Pagination } from "@/types/cicilan";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, DollarSign, AlertTriangle } from "lucide-react";
import { useTheme } from "next-themes";

export default function FinancePaymentsPage() {
  const [investorGroups, setInvestorGroups] = useState<InvestorGroup[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    page: 1,
    sortBy: "pending-review", // Default to sorting by pending review
  });
  const [mounted, setMounted] = useState(false);
  const { AlertComponent } = useAlert();
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  const fetchInvestorGroups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      params.append("page", filters.page.toString());
      params.append("limit", "10");

      const response = await fetch(`/api/finance/payments/investors?${params}`);
      if (response.ok) {
        const data = await response.json();
        setInvestorGroups(data.investors);
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
    router.push(`/finance/payments/${userId}`);
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
    <FinanceSidebar>
      <AlertComponent />
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className={getThemeClasses(
              "text-3xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)]",
              "!text-[#4c1d1d]"
            )}>
              Kelola Pembayaran
            </h1>
            <p className={getThemeClasses(
              "text-[#889063] dark:text-gray-300 mt-2",
              "!text-[#7d4b4b]"
            )}>
              Kelola pembayaran manual BCA dari investor
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className={getThemeClasses(
          "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6",
          "!bg-[#FFC1CC]/20 !border-[#FFC1CC]/40"
        )}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className={getThemeClasses(
                "block text-sm font-medium text-[#324D3E] dark:text-white mb-2 font-[family-name:var(--font-poppins)]",
                "!text-[#4c1d1d]"
              )}>
                Cari Investor
              </label>
              <input
                type="text"
                placeholder="Cari berdasarkan nama, email, atau kode user..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                    page: 1,
                  }))
                }
                className={getThemeClasses(
                  "w-full border border-[#324D3E]/20 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 focus:border-[#324D3E] dark:focus:border-blue-400 focus:ring-2 focus:ring-[#324D3E]/20 dark:focus:ring-blue-400/20 text-[#324D3E] dark:text-white placeholder-[#889063] dark:placeholder-gray-400 transition-all duration-300 text-sm sm:text-base",
                  "!bg-white !border-[#FFC1CC]/40 !text-[#4c1d1d] !placeholder-[#7d4b4b]/60 focus:!border-[#FFC1CC] focus:!ring-[#FFC1CC]/30"
                )}
              />
            </div>
            <div>
              <label className={getThemeClasses(
                "block text-sm font-medium text-[#324D3E] dark:text-white mb-2 font-[family-name:var(--font-poppins)]",
                "!text-[#4c1d1d]"
              )}>
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
                className={getThemeClasses(
                  "w-full border border-[#324D3E]/20 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 focus:border-[#324D3E] dark:focus:border-blue-400 focus:ring-2 focus:ring-[#324D3E]/20 dark:focus:ring-blue-400/20 text-[#324D3E] dark:text-white transition-all duration-300 text-sm sm:text-base",
                  "!bg-white !border-[#FFC1CC]/40 !text-[#4c1d1d] focus:!border-[#FFC1CC] focus:!ring-[#FFC1CC]/30"
                )}
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="completed">Selesai</option>
                <option value="overdue">Terlambat</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label
                className={getThemeClasses(
                  "block text-sm font-medium text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)]",
                  "!text-[#4c1d1d]"
                )}
              >
                Urutkan
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value,
                    page: 1,
                  }))
                }
                className={getThemeClasses(
                  "w-full border border-[#324D3E]/20 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 focus:border-[#324D3E] dark:focus:border-blue-400 focus:ring-2 focus:ring-[#324D3E]/20 dark:focus:ring-blue-400/20 text-[#324D3E] dark:text-white transition-all duration-300 text-sm sm:text-base",
                  "!bg-white !border-[#FFC1CC]/40 !text-[#4c1d1d] focus:!border-[#FFC1CC] focus:!ring-[#FFC1CC]/30"
                )}
              >
                <option value="pending-review">Perlu Review (Terbaru)</option>
                <option value="">Default</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: "", search: "", page: 1, sortBy: "pending-review" })}
                className={getThemeClasses(
                  "w-full px-4 py-3 bg-[#324D3E]/10 dark:bg-gray-700 text-[#324D3E] dark:text-white rounded-xl hover:bg-[#324D3E]/20 dark:hover:bg-gray-600 transition-all duration-300 font-medium font-[family-name:var(--font-poppins)] text-sm sm:text-base",
                  "!bg-[#FFC1CC]/30 !text-[#4c1d1d] hover:!bg-[#FFC1CC]/50"
                )}
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={getThemeClasses(
            "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
            "!bg-[#FFC1CC]/30 !border-[#FFC1CC]/50"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className={getThemeClasses(
                  "text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
                  "!text-[#7d4b4b]"
                )}>
                  Total Investor
                </p>
                <p className={getThemeClasses(
                  "text-2xl font-bold text-[#324D3E] dark:text-white",
                  "!text-[#4c1d1d]"
                )}>
                  {pagination?.totalCount || 0}
                </p>
              </div>
              <div className={getThemeClasses(
                "w-12 h-12 bg-[#324D3E]/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center",
                "!bg-[#FFC1CC]/60"
              )}>
                <Users className={getThemeClasses(
                  "text-[#324D3E] dark:text-blue-400 w-6 h-6",
                  "!text-[#4c1d1d]"
                )} />
              </div>
            </div>
          </div>
          <div className={getThemeClasses(
            "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
            "!bg-[#B5EAD7]/30 !border-[#B5EAD7]/50"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className={getThemeClasses(
                  "text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
                  "!text-[#4c6058]"
                )}>
                  Total Terbayar
                </p>
                <p className={getThemeClasses(
                  "text-2xl font-bold text-[#889063] dark:text-green-400",
                  "!text-[#2d5a4e]"
                )}>
                  Rp{" "}
                  {investorGroups
                    .reduce((sum, group) => sum + group.totalPaid, 0)
                    .toLocaleString("id-ID")}
                </p>
              </div>
              <div className={getThemeClasses(
                "w-12 h-12 bg-[#889063]/10 dark:bg-green-500/20 rounded-xl flex items-center justify-center",
                "!bg-[#B5EAD7]/70"
              )}>
                <DollarSign className={getThemeClasses(
                  "text-[#889063] dark:text-green-400 w-6 h-6",
                  "!text-[#2d5a4e]"
                )} />
              </div>
            </div>
          </div>
          <div className={getThemeClasses(
            "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
            "!bg-[#FFF5BA]/30 !border-[#FFF5BA]/50"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className={getThemeClasses(
                  "text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
                  "!text-[#6b6227]"
                )}>
                  Total Investasi
                </p>
                <p className={getThemeClasses(
                  "text-2xl font-bold text-[#4C3D19] dark:text-yellow-400",
                  "!text-[#4C3D19]"
                )}>
                  Rp{" "}
                  {investorGroups
                    .reduce((sum, group) => sum + (group.totalAmount || 0), 0)
                    .toLocaleString("id-ID")}
                </p>
              </div>
              <div className={getThemeClasses(
                "w-12 h-12 bg-[#4C3D19]/10 dark:bg-yellow-500/20 rounded-xl flex items-center justify-center",
                "!bg-[#FFF5BA]/70"
              )}>
                <DollarSign className={getThemeClasses(
                  "text-[#4C3D19] dark:text-yellow-400 w-6 h-6",
                  "!text-[#4C3D19]"
                )} />
              </div>
            </div>
          </div>
          <div className={getThemeClasses(
            "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
            "!bg-[#FFB3C6]/30 !border-[#FFB3C6]/50"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className={getThemeClasses(
                  "text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
                  "!text-[#7d3d4e]"
                )}>
                  Terlambat
                </p>
                <p className={getThemeClasses(
                  "text-2xl font-bold text-red-600 dark:text-red-400",
                  "!text-[#a02040]"
                )}>
                  {investorGroups.reduce(
                    (sum, group) => sum + (group.latePayments || 0),
                    0
                  )}
                </p>
              </div>
              <div className={getThemeClasses(
                "w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center",
                "!bg-[#FFB3C6]/70"
              )}>
                <AlertTriangle className={getThemeClasses(
                  "text-red-600 dark:text-red-400 w-6 h-6",
                  "!text-[#a02040]"
                )} />
              </div>
            </div>
          </div>
        </div>

        {/* Investor List */}
        <div className={getThemeClasses(
          "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700",
          "!bg-white !border-[#FFC1CC]/40"
        )}>
          {loading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className={getThemeClasses(
                "animate-spin rounded-full h-8 w-8 border-b-2 border-[#324D3E] dark:border-blue-400 mx-auto mb-4",
                "!border-[#FFC1CC]"
              )}></div>
              <p className={getThemeClasses(
                "text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)] text-sm sm:text-base",
                "!text-[#7d4b4b]"
              )}>
                Memuat data investor...
              </p>
            </div>
          ) : investorGroups.length === 0 ? (
            <div className="p-8 text-center">
              <div className={getThemeClasses(
                "text-[#889063] dark:text-gray-300 text-4xl mb-4",
                "!text-[#7d4b4b]"
              )}>👥</div>
              <h3 className={getThemeClasses(
                "text-lg font-semibold text-[#324D3E] dark:text-white mb-2 font-[family-name:var(--font-poppins)]",
                "!text-[#4c1d1d]"
              )}>
                Belum ada data investor
              </h3>
              <p className={getThemeClasses(
                "text-[#889063] dark:text-gray-300",
                "!text-[#7d4b4b]"
              )}>
                Data investor akan muncul di sini ketika ada pembayaran manual
                BCA
              </p>
            </div>
          ) : (
            <>
              <div className={getThemeClasses(
                "divide-y divide-[#324D3E]/10 dark:divide-gray-700",
                "!divide-[#FFC1CC]/30"
              )}>
                {investorGroups.map((investor) => (
                  <div
                    key={investor.userId}
                    className={getThemeClasses(
                      "p-4 sm:p-6 hover:bg-[#324D3E]/5 dark:hover:bg-gray-700/50 transition-all duration-300",
                      "hover:!bg-[#FFC1CC]/10"
                    )}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={getThemeClasses(
                            "w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#324D3E]/10 to-[#4C3D19]/10 dark:from-blue-500/20 dark:to-green-500/20 rounded-full flex items-center justify-center border border-[#324D3E]/20 dark:border-gray-600 flex-shrink-0",
                            "!from-[#FFC1CC]/30 !to-[#FFB3C6]/30 !border-[#FFC1CC]/40"
                          )}>
                            <span className={getThemeClasses(
                              "text-[#324D3E] dark:text-white font-semibold text-base sm:text-lg font-[family-name:var(--font-poppins)]",
                              "!text-[#4c1d1d]"
                            )}>
                              {investor.userInfo.fullName
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={getThemeClasses(
                              "text-base sm:text-lg font-semibold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] truncate",
                              "!text-[#4c1d1d]"
                            )}>
                              {investor.userInfo.fullName}
                            </h3>
                            <p className={getThemeClasses(
                              "text-xs sm:text-sm text-[#889063] dark:text-gray-300 truncate",
                              "!text-[#7d4b4b]"
                            )}>
                              {investor.userInfo.email}
                            </p>
                            {investor.userInfo.userCode && (
                              <p className={getThemeClasses(
                                "text-xs text-[#4C3D19] dark:text-yellow-400 truncate font-medium",
                                "!text-[#4C3D19]"
                              )}>
                                No Anggota: {investor.userInfo.userCode}
                              </p>
                            )}
                            <p className={getThemeClasses(
                              "text-xs text-[#889063]/70 dark:text-gray-400 truncate",
                              "!text-[#7d4b4b]/70"
                            )}>
                              {investor.userInfo.phoneNumber}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                          <div className={getThemeClasses(
                            "bg-gradient-to-r from-[#324D3E]/5 to-[#324D3E]/10 dark:from-blue-500/10 dark:to-blue-600/10 p-3 sm:p-4 rounded-xl border border-[#324D3E]/10 dark:border-blue-500/20",
                            "!from-[#FFC1CC]/20 !to-[#FFC1CC]/30 !border-[#FFC1CC]/40"
                          )}>
                            <div className={getThemeClasses(
                              "text-xs sm:text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
                              "!text-[#7d4b4b]"
                            )}>
                              Jumlah Paket
                            </div>
                            <div className={getThemeClasses(
                              "text-base sm:text-lg font-semibold text-[#324D3E] dark:text-white",
                              "!text-[#4c1d1d]"
                            )}>
                              {investor.totalInvestments}
                            </div>
                          </div>
                          <div className={getThemeClasses(
                            "bg-gradient-to-r from-[#4C3D19]/5 to-[#4C3D19]/10 dark:from-yellow-500/10 dark:to-yellow-600/10 p-3 sm:p-4 rounded-xl border border-[#4C3D19]/10 dark:border-yellow-500/20",
                            "!from-[#FFF5BA]/30 !to-[#FFF5BA]/40 !border-[#FFF5BA]/50"
                          )}>
                            <div className={getThemeClasses(
                              "text-xs sm:text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
                              "!text-[#6b6227]"
                            )}>
                              Total Nilai
                            </div>
                            <div className={getThemeClasses(
                              "text-base sm:text-lg font-semibold text-[#4C3D19] dark:text-yellow-400 truncate",
                              "!text-[#4C3D19]"
                            )}>
                              Rp {investor.totalAmount.toLocaleString("id-ID")}
                            </div>
                          </div>
                          <div className={getThemeClasses(
                            "bg-gradient-to-r from-[#889063]/5 to-[#889063]/10 dark:from-green-500/10 dark:to-green-600/10 p-3 sm:p-4 rounded-xl border border-[#889063]/10 dark:border-green-500/20",
                            "!from-[#B5EAD7]/30 !to-[#B5EAD7]/40 !border-[#B5EAD7]/50"
                          )}>
                            <div className={getThemeClasses(
                              "text-xs sm:text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
                              "!text-[#4c6058]"
                            )}>
                              Disetujui
                            </div>
                            <div className={getThemeClasses(
                              "text-base sm:text-lg font-semibold text-[#889063] dark:text-green-400 truncate",
                              "!text-[#2d5a4e]"
                            )}>
                              Rp {investor.totalPaid.toLocaleString("id-ID")}
                            </div>
                          </div>
                          <div className={getThemeClasses(
                            "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-500/10 dark:to-yellow-600/10 p-3 sm:p-4 rounded-xl border border-yellow-200 dark:border-yellow-500/20",
                            "!from-[#FFF5BA]/30 !to-[#FFF5BA]/40 !border-[#FFF5BA]/50"
                          )}>
                            <div className={getThemeClasses(
                              "text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 font-[family-name:var(--font-poppins)]",
                              "!text-[#6b6227]"
                            )}>
                              Pending Review
                            </div>
                            <div className={getThemeClasses(
                              "text-base sm:text-lg font-semibold text-yellow-600 dark:text-yellow-400",
                              "!text-[#6b6227]"
                            )}>
                              {investor.pendingReviews || 0}
                            </div>
                          </div>
                          <div className={getThemeClasses(
                            "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-red-500/10 dark:to-red-600/10 p-3 sm:p-4 rounded-xl border border-orange-200 dark:border-red-500/20",
                            "!from-[#FFB3C6]/30 !to-[#FFB3C6]/40 !border-[#FFB3C6]/50"
                          )}>
                            <div className={getThemeClasses(
                              "text-xs sm:text-sm text-orange-700 dark:text-red-400 font-[family-name:var(--font-poppins)]",
                              "!text-[#7d3d4e]"
                            )}>
                              Terlambat
                            </div>
                            <div className={getThemeClasses(
                              "text-base sm:text-lg font-semibold text-orange-600 dark:text-red-400",
                              "!text-[#a02040]"
                            )}>
                              {investor.latePayments || 0}
                            </div>
                          </div>
                        </div>

                        {/* Investment Summary */}
                        <div className="mt-4">
                          <div className={getThemeClasses(
                            "text-xs sm:text-sm text-[#889063] dark:text-gray-300 mb-2 font-[family-name:var(--font-poppins)]",
                            "!text-[#7d4b4b]"
                          )}>
                            Investasi Aktif:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {investor.investments
                              .slice(0, 3)
                              .map((investment, index) => (
                                <div
                                  key={`${investor.userId}-investment-${index}`}
                                  className={getThemeClasses(
                                    "flex items-center gap-1 sm:gap-2 bg-[#324D3E]/5 dark:bg-gray-700 px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm border border-[#324D3E]/10 dark:border-gray-600",
                                    "!bg-[#FFC1CC]/20 !border-[#FFC1CC]/40"
                                  )}
                                >
                                  <span className={getThemeClasses(
                                    "text-[#324D3E] dark:text-white font-medium truncate max-w-20 sm:max-w-none",
                                    "!text-[#4c1d1d]"
                                  )}>
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
                              <span className={getThemeClasses(
                                "text-xs sm:text-sm text-[#889063] dark:text-gray-300",
                                "!text-[#7d4b4b]"
                              )}>
                                +{investor.investments.length - 3} lainnya
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 lg:min-w-0 lg:w-auto">
                        <div className="flex flex-wrap gap-2">
                          {(investor.latePayments || 0) > 0 && (
                            <div className={getThemeClasses(
                              "bg-gradient-to-r from-red-100 to-red-200 dark:from-red-500/20 dark:to-red-600/20 text-red-800 dark:text-red-400 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border border-red-300 dark:border-red-500/30 text-center whitespace-nowrap",
                              "!from-[#FFB3C6]/40 !to-[#FFB3C6]/60 !text-[#a02040] !border-[#FFB3C6]/60"
                            )}>
                              {investor.latePayments} Terlambat
                            </div>
                          )}
                          {(investor.pendingReviews || 0) > 0 && (
                            <div className={getThemeClasses(
                              "bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-500/20 dark:to-yellow-600/20 text-yellow-800 dark:text-yellow-400 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border border-yellow-300 dark:border-yellow-500/30 text-center whitespace-nowrap",
                              "!from-[#FFF5BA]/40 !to-[#FFF5BA]/60 !text-[#6b6227] !border-[#FFF5BA]/60"
                            )}>
                              {investor.pendingReviews} Perlu Review
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleViewDetails(investor.userId)}
                            className={getThemeClasses(
                              "px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] dark:from-blue-500 dark:to-green-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 text-xs sm:text-sm font-semibold font-[family-name:var(--font-poppins)] whitespace-nowrap",
                              "!from-[#FFC1CC] !to-[#FFB3C6] !text-[#4c1d1d]"
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
                <div className={getThemeClasses(
                  "flex flex-col sm:flex-row justify-between items-center gap-4 p-4 sm:p-6 border-t border-[#324D3E]/10 dark:border-gray-700",
                  "!border-[#FFC1CC]/30"
                )}>
                  <div className={getThemeClasses(
                    "text-xs sm:text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)] text-center sm:text-left",
                    "!text-[#7d4b4b]"
                  )}>
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
                      className={getThemeClasses(
                        "px-3 sm:px-4 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#324D3E]/5 dark:hover:bg-gray-700 text-[#324D3E] dark:text-white font-medium transition-all duration-300",
                        "!border-[#FFC1CC]/40 !text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                      )}
                    >
                      <span className="hidden sm:inline">Sebelumnya</span>
                      <span className="sm:hidden">‹</span>
                    </button>
                    <span className={getThemeClasses(
                      "px-2 sm:px-4 py-2 text-xs sm:text-sm text-[#324D3E] dark:text-white font-semibold whitespace-nowrap",
                      "!text-[#4c1d1d]"
                    )}>
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                      disabled={!pagination.hasNext}
                      className={getThemeClasses(
                        "px-3 sm:px-4 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#324D3E]/5 dark:hover:bg-gray-700 text-[#324D3E] dark:text-white font-medium transition-all duration-300",
                        "!border-[#FFC1CC]/40 !text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                      )}
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
    </FinanceSidebar>
  );
}
