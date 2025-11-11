"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import StaffLayout from "@/components/staff/StaffLayout";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  TrendingUp,
  DollarSign,
  Edit3,
  RefreshCw,
  Eye,
  AlertTriangle,
  X,
  Download,
  Bell,
  Filter,
  Wallet,
  // CheckCircle,
} from "lucide-react";

interface MarketingStaff {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  referralCode: string;
  isActive: boolean;
  createdAt: string;
  commissionSummary: {
    totalCommission: number;
    totalReferrals: number;
    fullInvestments: number;
    cicilanInvestments: number;
    totalPaidCommission?: number;
    totalUnpaidCommission?: number;
  };
}

interface CommissionData {
  staffSummary: {
    staffId: string;
    staffName: string;
    staffEmail: string;
    referralCode: string;
    totalCommission: number;
    totalReferrals: number;
    byType: {
      fullInvestment: number;
      cicilan: number;
    };
  }[];
  overallSummary: {
    totalStaff: number;
    totalCommissions: number;
    totalReferrals: number;
    byType: {
      fullInvestment: number;
      cicilan: number;
    };
  };
}

export default function MarketingHeadPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Check if user is marketing_admin (read-only for referral editing)
  const isMarketingAdmin = session?.user?.role === "marketing_admin";

  const [marketingStaff, setMarketingStaff] = useState<MarketingStaff[]>([]);
  const [commissionData, setCommissionData] = useState<CommissionData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentCommissions, setRecentCommissions] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

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

  // Edit referral code modal
  const [editModal, setEditModal] = useState<{
    show: boolean;
    staff: MarketingStaff | null;
    newCode: string;
    transferCommissions: boolean;
    loading: boolean;
  }>({
    show: false,
    staff: null,
    newCode: "",
    transferCommissions: true,
    loading: false,
  });

  // Commission history modal
  const [commissionHistory, setCommissionHistory] = useState<{
    show: boolean;
    staff: MarketingStaff | null;
    history: any[];
    loading: boolean;
  }>({
    show: false,
    staff: null,
    history: [],
    loading: false,
  });

  useEffect(() => {
    fetchData();
    fetchRecentCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (filterStartDate = "", filterEndDate = "") => {
    try {
      setLoading(true);

      // Fetch marketing staff
      const staffResponse = await fetch("/api/admin/marketing/staff");
      if (!staffResponse.ok) {
        const staffError = await staffResponse.json();
        throw new Error(staffError.error || "Failed to fetch marketing staff");
      }
      const staffData = await staffResponse.json();
      setMarketingStaff(staffData.data);

      // Fetch commission data with date filters
      let commissionUrl = "/api/admin/marketing/commissions";
      const params = new URLSearchParams();
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);
      if (params.toString()) commissionUrl += `?${params.toString()}`;

      const commissionResponse = await fetch(commissionUrl);
      if (!commissionResponse.ok) {
        const commissionError = await commissionResponse.json();
        throw new Error(
          commissionError.error || "Failed to fetch commission data"
        );
      }
      const commissionDataResult = await commissionResponse.json();
      setCommissionData(commissionDataResult.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch data");

      // If unauthorized, redirect to login
      if (error instanceof Error && error.message.includes("Access denied")) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCommissions = async () => {
    try {
      const response = await fetch(
        "/api/admin/marketing/notifications/recent-commissions?limit=10&hours=168"
      );
      if (response.ok) {
        const data = await response.json();
        setRecentCommissions(data.data.commissions);
      }
    } catch (error) {
      console.error("Error fetching recent commissions:", error);
    }
  };

  const handleEditReferralCode = (staff: MarketingStaff) => {
    setEditModal({
      show: true,
      staff,
      newCode: staff.referralCode || "",
      transferCommissions: true,
      loading: false,
    });
  };

  const handleUpdateReferralCode = async () => {
    if (!editModal.staff || !editModal.newCode.trim()) {
      setError("Please enter a valid referral code");
      return;
    }

    setEditModal((prev) => ({ ...prev, loading: true }));

    try {
      const response = await fetch("/api/admin/marketing/staff", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: editModal.staff._id,
          newReferralCode: editModal.newCode.toUpperCase().trim(),
          transferCommissions: editModal.transferCommissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update referral code");
      }

      // Refresh data with current filters
      await fetchData(appliedStartDate, appliedEndDate);

      setEditModal({
        show: false,
        staff: null,
        newCode: "",
        transferCommissions: true,
        loading: false,
      });

      setError("");
    } catch (error) {
      console.error("Error updating referral code:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update referral code"
      );
    } finally {
      setEditModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleGenerateReferralCode = async (staffId: string) => {
    try {
      const response = await fetch("/api/admin/marketing/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ staffId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate referral code");
      }

      // Refresh data with current filters
      await fetchData(appliedStartDate, appliedEndDate);
      setError("");
    } catch (error) {
      console.error("Error generating referral code:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate referral code"
      );
    }
  };

  const handleViewCommissionHistory = async (staff: MarketingStaff) => {
    setCommissionHistory((prev) => ({
      ...prev,
      show: true,
      staff,
      loading: true,
    }));

    try {
      // Build URL with date filters if they are applied
      let commissionUrl = `/api/admin/marketing/commissions?staffId=${staff._id}`;
      if (appliedStartDate) commissionUrl += `&startDate=${appliedStartDate}`;
      if (appliedEndDate) commissionUrl += `&endDate=${appliedEndDate}`;

      const response = await fetch(commissionUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch commission history"
        );
      }

      const data = await response.json();
      setCommissionHistory((prev) => ({
        ...prev,
        history: data.data.commissions,
        loading: false,
      }));
    } catch (error) {
      console.error("Error fetching commission history:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch commission history"
      );
      setCommissionHistory((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError("");

      // Build export URL with date filters
      let exportUrl = "/api/admin/marketing/export";
      const params = new URLSearchParams();
      if (appliedStartDate) params.append("startDate", appliedStartDate);
      if (appliedEndDate) params.append("endDate", appliedEndDate);
      if (params.toString()) exportUrl += `?${params.toString()}`;

      const response = await fetch(exportUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export data");
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateRangeText = appliedStartDate && appliedEndDate
        ? `${appliedStartDate}-to-${appliedEndDate}`
        : new Date().toISOString().split("T")[0];
      link.download = `laporan-marketing-${dateRangeText}.xlsx`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to export data"
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Filter marketing staff based on search query
  const filteredStaff = marketingStaff.filter((staff) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      staff.fullName.toLowerCase().includes(query) ||
      staff.email.toLowerCase().includes(query) ||
      staff.phoneNumber.toLowerCase().includes(query) ||
      (staff.referralCode && staff.referralCode.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <StaffLayout>
        <div
          className={getThemeClasses(
            "min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center",
            "!bg-gradient-to-br !from-[#FFDEE9] !via-white !to-[#FFDEE9]"
          )}
        >
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className={getThemeClasses(
                "animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E] mx-auto mb-4",
                "!border-[#4c1d1d]"
              )}
            ></div>
            <p
              className={getThemeClasses(
                "text-[#889063] dark:text-gray-400",
                "!text-[#6b7280]"
              )}
            >
              Memuat data marketing...
            </p>
          </motion.div>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <motion.div
        className="container max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1
                className={getThemeClasses(
                  "text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-2",
                  "!text-[#4c1d1d]"
                )}
              >
                Manajemen Marketing
              </h1>
              <p
                className={getThemeClasses(
                  "text-[#889063] dark:text-gray-400",
                  "!text-[#6b7280]"
                )}
              >
                Pantau dan kelola performa staff marketing serta komisi mereka
              </p>
            </div>

            {/* Export Button */}
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleExport}
                disabled={isExporting}
                className={getThemeClasses(
                  "inline-flex items-center gap-2 px-4 py-2 bg-[#324D3E] hover:bg-[#2a4235] text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg",
                  "!bg-[#4c1d1d] hover:!bg-[#3d1717]"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm font-medium">Mengekspor...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Export Excel</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Recent Commissions Notification - Modern Compact Design */}
        {recentCommissions.length > 0 && (
          <motion.div
            className="mb-6 relative"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {/* Compact Header Banner */}
            <div
              className={getThemeClasses(
                "bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={getThemeClasses(
                        "relative p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg",
                        "!bg-[#FFF0F3]"
                      )}
                    >
                      <Bell
                        className={getThemeClasses(
                          "w-4 h-4 text-blue-600 dark:text-blue-400",
                          "!text-[#4c1d1d]"
                        )}
                      />
                      {recentCommissions.length > 0 && (
                        <span
                          className={getThemeClasses(
                            "absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center",
                            "!bg-[#4c1d1d]"
                          )}
                        >
                          {recentCommissions.length > 9
                            ? "9+"
                            : recentCommissions.length}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className={getThemeClasses(
                            "text-sm font-semibold text-gray-900 dark:text-white",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          Komisi Minggu Ini
                        </h3>
                        <span
                          className={getThemeClasses(
                            "px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full",
                            "!bg-[#FFC1CC]/40 !text-[#4c1d1d]"
                          )}
                        >
                          {recentCommissions.length} baru
                        </span>
                      </div>
                      <p
                        className={getThemeClasses(
                          "text-xs text-gray-600 dark:text-gray-400 mt-0.5",
                          "!text-[#6b7280]"
                        )}
                      >
                        Total:{" "}
                        {formatCurrency(
                          recentCommissions.reduce(
                            (sum: number, c: any) => sum + c.commissionAmount,
                            0
                          )
                        )}
                      </p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: showNotifications ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg
                      className={getThemeClasses(
                        "w-5 h-5 text-gray-400 dark:text-gray-500",
                        "!text-[#6b7280]"
                      )}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Expandable Details Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  className={getThemeClasses(
                    "mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden",
                    "!bg-white !border-[#FFC1CC]/30"
                  )}
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="max-h-[400px] overflow-y-auto">
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {recentCommissions.map(
                        (commission: any, index: number) => (
                          <motion.div
                            key={commission._id}
                            className={getThemeClasses(
                              "p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                              "hover:!bg-[#FFF7F9]"
                            )}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.2 }}
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon/Avatar */}
                              <div
                                className={getThemeClasses(
                                  "flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center",
                                  "!bg-gradient-to-br !from-[#B5EAD7]/40 !to-[#C7CEEA]/40"
                                )}
                              >
                                <DollarSign
                                  className={getThemeClasses(
                                    "w-4 h-4 text-green-600 dark:text-green-400",
                                    "!text-[#4c1d1d]"
                                  )}
                                />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p
                                    className={getThemeClasses(
                                      "text-sm font-semibold text-gray-900 dark:text-white truncate",
                                      "!text-[#4c1d1d]"
                                    )}
                                  >
                                    {commission.marketingStaffId?.fullName || "Unknown"}
                                    {commission.marketingStaffId?.userCode && (
                                      <span
                                        className={getThemeClasses(
                                          "ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400",
                                          "!text-[#6b7280]"
                                        )}
                                      >
                                        ({commission.marketingStaffId.userCode})
                                      </span>
                                    )}
                                  </p>
                                  <span
                                    className={getThemeClasses(
                                      "px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded",
                                      "!bg-[#FFC1CC]/30 !text-[#4c1d1d]"
                                    )}
                                  >
                                    {commission.referralCodeUsed}
                                  </span>
                                </div>
                                <p
                                  className={getThemeClasses(
                                    "text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap",
                                    "!text-[#6b7280]"
                                  )}
                                >
                                  {new Date(
                                    commission.createdAt
                                  ).toLocaleDateString("id-ID", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>

                                <p
                                  className={getThemeClasses(
                                    "text-xs text-gray-600 dark:text-gray-400 mb-2 truncate",
                                    "!text-[#6b7280]"
                                  )}
                                >
                                  {commission.customerName}
                                </p>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={getThemeClasses(
                                      "text-sm font-bold text-green-600 dark:text-green-400",
                                      "!text-[#4c1d1d]"
                                    )}
                                  >
                                    {formatCurrency(
                                      commission.commissionAmount
                                    )}
                                  </span>
                                  <span className="text-gray-300 dark:text-gray-600">
                                    •
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                                      commission.paymentType ===
                                      "full-investment"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                    }`}
                                  >
                                    {commission.paymentType ===
                                    "full-investment"
                                      ? "Lunas"
                                      : "Cicilan"}
                                  </span>
                                  {commission.productName && (
                                    <>
                                      <span className="text-gray-300 dark:text-gray-600">
                                        •
                                      </span>
                                      <span
                                        className={getThemeClasses(
                                          "text-[10px] text-gray-500 dark:text-gray-400 truncate",
                                          "!text-[#6b7280]"
                                        )}
                                      >
                                        {commission.productName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Date Filter */}
        <motion.div
          className={getThemeClasses(
            "bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter
              className={getThemeClasses(
                "w-5 h-5 text-[#324D3E] dark:text-white",
                "!text-[#4c1d1d]"
              )}
            />
            <h3
              className={getThemeClasses(
                "text-lg font-semibold text-[#324D3E] dark:text-white",
                "!text-[#4c1d1d]"
              )}
            >
              Filter Laporan
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label
                className={getThemeClasses(
                  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",
                  "!text-[#4c1d1d]"
                )}
              >
                Tanggal Awal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={getThemeClasses(
                  "w-full border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#324D3E] dark:focus:ring-gray-500",
                  "!bg-white !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]/50"
                )}
              />
            </div>
            <div>
              <label
                className={getThemeClasses(
                  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",
                  "!text-[#4c1d1d]"
                )}
              >
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={getThemeClasses(
                  "w-full border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#324D3E] dark:focus:ring-gray-500",
                  "!bg-white !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]/50"
                )}
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <motion.button
                onClick={() => {
                  setAppliedStartDate(startDate);
                  setAppliedEndDate(endDate);
                  fetchData(startDate, endDate);
                }}
                className={getThemeClasses(
                  "flex-1 px-4 py-2 bg-[#324D3E] hover:bg-[#2a4235] text-white rounded-lg transition-colors font-medium",
                  "!bg-[#4c1d1d] hover:!bg-[#3d1717]"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Terapkan
              </motion.button>
              <motion.button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setAppliedStartDate("");
                  setAppliedEndDate("");
                  fetchData("", "");
                }}
                className={getThemeClasses(
                  "flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium",
                  "!bg-white !border-[#FFC1CC]/30 !text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Reset Filter
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className={getThemeClasses(
                "mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl",
                "!bg-[#FFB3C6]/20 !border-[#FFB3C6]/50"
              )}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={getThemeClasses(
                    "w-5 h-5 text-red-600 dark:text-red-400",
                    "!text-[#4c1d1d]"
                  )}
                />
                <p
                  className={getThemeClasses(
                    "text-red-800 dark:text-red-200 font-medium",
                    "!text-[#4c1d1d]"
                  )}
                >
                  {error}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overall Summary Cards */}
        {commissionData && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              className={getThemeClasses(
                "bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <p
                  className={getThemeClasses(
                    "text-sm text-[#889063] dark:text-gray-400",
                    "!text-[#6b7280]"
                  )}
                >
                  Total Staff
                </p>
                <p
                  className={getThemeClasses(
                    "text-2xl font-bold text-[#324D3E] dark:text-white",
                    "!text-[#4c1d1d]"
                  )}
                >
                  {commissionData.overallSummary.totalStaff}
                </p>
                <div
                  className={getThemeClasses(
                    "p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl",
                    "!bg-[#FFC1CC]/40"
                  )}
                >
                  <Users
                    className={getThemeClasses(
                      "w-6 h-6 text-blue-600 dark:text-blue-400",
                      "!text-[#4c1d1d]"
                    )}
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              className={getThemeClasses(
                "bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <p
                  className={getThemeClasses(
                    "text-sm text-[#889063] dark:text-gray-400",
                    "!text-[#6b7280]"
                  )}
                >
                  Total Komisi
                </p>
                <p
                  className={getThemeClasses(
                    "text-lg font-bold text-[#324D3E] dark:text-white",
                    "!text-[#4c1d1d]"
                  )}
                >
                  {formatCurrency(
                    commissionData.overallSummary.totalCommissions
                  )}
                </p>
                <div
                  className={getThemeClasses(
                    "p-3 bg-green-100 dark:bg-green-900/30 rounded-xl",
                    "!bg-[#B5EAD7]/40"
                  )}
                >
                  <DollarSign
                    className={getThemeClasses(
                      "w-6 h-6 text-green-600 dark:text-green-400",
                      "!text-[#4c1d1d]"
                    )}
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              className={getThemeClasses(
                "bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <p
                  className={getThemeClasses(
                    "text-sm text-[#889063] dark:text-gray-400",
                    "!text-[#6b7280]"
                  )}
                >
                  Total Referrals
                </p>
                <p
                  className={getThemeClasses(
                    "text-2xl font-bold text-[#324D3E] dark:text-white",
                    "!text-[#4c1d1d]"
                  )}
                >
                  {commissionData.overallSummary.totalReferrals}
                </p>
                <div
                  className={getThemeClasses(
                    "p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl",
                    "!bg-[#C7CEEA]/40"
                  )}
                >
                  <TrendingUp
                    className={getThemeClasses(
                      "w-6 h-6 text-purple-600 dark:text-purple-400",
                      "!text-[#4c1d1d]"
                    )}
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              className={getThemeClasses(
                "bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <p
                  className={getThemeClasses(
                    "text-sm text-[#889063] dark:text-gray-400",
                    "!text-[#6b7280]"
                  )}
                >
                  Total Sudah Dibayar
                </p>
                <p
                  className={getThemeClasses(
                    "text-lg font-bold text-[#324D3E] dark:text-white",
                    "!text-[#4c1d1d]"
                  )}
                >
                  {formatCurrency(
                    marketingStaff.reduce(
                      (sum, staff) =>
                        sum + (staff.commissionSummary.totalPaidCommission || 0),
                      0
                    )
                  )}
                </p>
                <div
                  className={getThemeClasses(
                    "p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl",
                    "!bg-[#B5EAD7]/40"
                  )}
                >
                  <Wallet
                    className={getThemeClasses(
                      "w-6 h-6 text-emerald-600 dark:text-emerald-400",
                      "!text-[#4c1d1d]"
                    )}
                  />
                </div>
              </div>
            </motion.div>
                      <motion.div
            className={getThemeClasses(
              "bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <p
                className={getThemeClasses(
                  "text-sm text-[#889063] dark:text-gray-400",
                  "!text-[#6b7280]"
                )}
              >
                Total Belum Dibayar
              </p>
              <p
                className={getThemeClasses(
                  "text-lg font-bold text-[#324D3E] dark:text-white",
                  "!text-[#4c1d1d]"
                )}
              >
                {formatCurrency(
                  // total belum dibayar = total komisi (summary) - total sudah dibayar (sum per staff)
                  Math.max(
                    0,
                    (commissionData?.overallSummary?.totalCommissions || 0) -
                      marketingStaff.reduce(
                        (sum, staff) =>
                          sum + (staff.commissionSummary.totalPaidCommission || 0),
                        0
                      )
                  )
                )}
              </p>
              <div
                className={getThemeClasses(
                  // gunakan warna berbeda untuk membedakan dari kartu "Sudah Dibayar"
                  "p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl",
                  "!bg-[#FFF4E5]/40"
                )}
              >
                {/* ikon berbeda dari yang sudah dibayar (Wallet) */}
                <AlertTriangle
                  className={getThemeClasses(
                    "w-6 h-6 text-yellow-600 dark:text-yellow-400",
                    "!text-[#8a5a00]"
                  )}
                />
              </div>
            </div>
          </motion.div>
          </motion.div>
        )}

        {/* Marketing Staff Table */}
        <div
          className={getThemeClasses(
            "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden p-0",
            "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9]"
          )}
        >
          <div
            className={getThemeClasses(
              "p-6 border-b border-gray-200 dark:border-gray-700",
              ""
            )}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2
                className={getThemeClasses(
                  "text-xl font-semibold text-gray-900 dark:text-white",
                  ""
                )}
              >
                Staf Marketing
              </h2>

              {/* Search Bar */}
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari staff berdasarkan nama, email, telepon, atau kode..."
                  className={getThemeClasses(
                    "w-full px-4 py-2 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E] dark:focus:ring-gray-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm",
                    "!bg-white !border-[#FFC1CC]/30 focus:!ring-[#FFC1CC]/50 !text-[#4c1d1d] placeholder-[#6b7280]"
                  )}
                />
                <svg
                  className={getThemeClasses(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400",
                    "!text-[#6b7280]"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className={getThemeClasses(
                      "absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors",
                      "hover:!bg-[#FFC1CC]/20"
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {searchQuery && (
              <div
                className={getThemeClasses(
                  "text-sm text-gray-600 dark:text-gray-400 font-medium",
                  "!text-[#6b7280]"
                )}
              >
                Menampilkan {filteredStaff.length} dari {marketingStaff.length}{" "}
                staff marketing
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={getThemeClasses(
                  "bg-gray-50 dark:bg-gray-900/30",
                  ""
                )}
              >
                <tr>
                  <th
                    className={getThemeClasses(
                      "px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200",
                      ""
                    )}
                  >
                    Staf
                  </th>
                  <th
                    className={getThemeClasses(
                      "px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200",
                      ""
                    )}
                  >
                    Kode Referral
                  </th>
                  <th
                    className={getThemeClasses(
                      "px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200",
                      ""
                    )}
                  >
                    Total Komisi
                  </th>
                  <th
                    className={getThemeClasses(
                      "px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200",
                      ""
                    )}
                  >
                    Komisi Terbayar
                  </th>
                  <th
                    className={getThemeClasses(
                      "px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200",
                      ""
                    )}
                  >
                    Komisi Belum Terbayar
                  </th>
                  <th
                    className={getThemeClasses(
                      "px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200",
                      ""
                    )}
                  >
                    Referral
                  </th>

                  <th
                    className={getThemeClasses(
                      "px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200",
                      ""
                    )}
                  >
                    Status
                  </th>
                  <th
                    className={getThemeClasses(
                      "px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200",
                      ""
                    )}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody
                className={getThemeClasses(
                  "divide-y divide-gray-200 dark:divide-gray-700",
                  ""
                )}
              >
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Users
                          className={getThemeClasses(
                            "w-12 h-12 text-gray-400 dark:text-gray-500",
                            "!text-[#6b7280]"
                          )}
                        />
                        <p
                          className={getThemeClasses(
                            "text-gray-600 dark:text-gray-400 font-medium",
                            "!text-[#6b7280]"
                          )}
                        >
                          {searchQuery
                            ? "Tidak ada staff yang cocok dengan pencarian"
                            : "Belum ada staff marketing"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    // Get filtered commission data for this staff from commissionData
                    const staffCommissionData = commissionData?.staffSummary.find(
                      (s) => s.staffId.toString() === staff._id.toString()
                    );
                    
                    return (
                    <tr
                      key={staff._id}
                      className={getThemeClasses(
                        "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                        ""
                      )}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p
                            className={getThemeClasses(
                              "font-medium text-gray-900 dark:text-white",
                              ""
                            )}
                          >
                            {staff.fullName}
                          </p>
                          <p
                            className={getThemeClasses(
                              "text-sm text-gray-600 dark:text-gray-300",
                              ""
                            )}
                          >
                            {staff.email}
                          </p>
                          <p
                            className={getThemeClasses(
                              "text-xs text-gray-500 dark:text-gray-400",
                              ""
                            )}
                          >
                            {staff.phoneNumber}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {staff.referralCode ? (
                            <code
                              className={getThemeClasses(
                                "px-3 py-1 bg-gray-100 rounded-lg text-sm font-mono font-semibold dark:bg-gray-900/30 dark:text-gray-200",
                                "!bg-[#FFF7F9] !text-[#4c1d1d]"
                              )}
                            >
                              {staff.referralCode}
                            </code>
                          ) : (
                            <span
                              className={getThemeClasses(
                                "text-sm text-gray-500 italic dark:text-gray-400",
                                "!text-[#4c1d1d]"
                              )}
                            >
                              Belum ada kode
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p
                          className={getThemeClasses(
                            "font-semibold text-gray-900 dark:text-white",
                            ""
                          )}
                        >
                          {formatCurrency(
                            staffCommissionData?.totalCommission || 0
                          )}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p
                          className={getThemeClasses(
                            "font-semibold text-green-600 dark:text-green-400",
                            "!text-[#2a4235]"
                          )}
                        >
                          {formatCurrency(
                            staff.commissionSummary.totalPaidCommission || 0
                          )}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p
                          className={getThemeClasses(
                            "font-semibold text-orange-600 dark:text-orange-400",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          {formatCurrency(
                            staff.commissionSummary.totalUnpaidCommission || 0
                          )}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p
                          className={getThemeClasses(
                            "font-semibold text-gray-900 dark:text-white",
                            ""
                          )}
                        >
                          {staffCommissionData?.totalReferrals || 0}
                        </p>
                        <div
                          className={getThemeClasses(
                            "flex gap-2 text-xs text-gray-600 mt-1",
                            "dark:text-gray-300"
                          )}
                        >
                          <span>
                            Lunas: {staffCommissionData?.byType.fullInvestment || 0}
                          </span>
                          <span>
                            Cicilan:{" "}
                            {staffCommissionData?.byType.cicilan || 0}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={getThemeClasses(
                            `px-2 py-1 text-xs rounded-full ${
                              staff.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            }`,
                            ""
                          )}
                        >
                          {staff.isActive ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {!isMarketingAdmin && (
                            <>
                              <button
                                onClick={() => handleEditReferralCode(staff)}
                                className={getThemeClasses(
                                  "p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors",
                                  "dark:text-blue-300 dark:hover:bg-blue-900/30"
                                )}
                                title="Ubah kode referral"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() =>
                                  handleGenerateReferralCode(staff._id)
                                }
                                className={getThemeClasses(
                                  "p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors",
                                  "dark:text-green-300 dark:hover:bg-green-900/30"
                                )}
                                title="Buat kode baru"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleViewCommissionHistory(staff)}
                            className={getThemeClasses(
                              "p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors dark:text-white dark:hover:text-white dark:hover:bg-gray-800/30",
                              ""
                            )}
                            title="Lihat riwayat komisi"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Referral Code Modal */}
        {editModal.show && editModal.staff && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Ubah Kode Referral - {editModal.staff.fullName}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kode Saat Ini
                    </label>
                    <code
                      className={getThemeClasses(
                        "block w-full px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono font-semibold dark:bg-gray-900/30 dark:text-gray-200",
                        "!bg-[#FFF7F9] !text-[#4c1d1d]"
                      )}
                    >
                      {editModal.staff.referralCode || "No code assigned"}
                    </code>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kode Referral Baru
                    </label>
                    <input
                      type="text"
                      value={editModal.newCode}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          newCode: e.target.value.toUpperCase(),
                        }))
                      }
                      maxLength={6}
                      placeholder="Masukkan kode 6 karakter"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Harus terdiri dari 6 karakter alfanumerik (A-Z, 0-9)
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="transferCommissions"
                      checked={editModal.transferCommissions}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          transferCommissions: e.target.checked,
                        }))
                      }
                      className="mt-1"
                    />
                    <div>
                      <label
                        htmlFor="transferCommissions"
                        className="text-sm font-medium text-yellow-800 cursor-pointer"
                      >
                        Pindahkan komisi yang ada
                      </label>
                      <p className="text-xs text-yellow-700 mt-1">
                        Jika dicentang, semua pembayaran dan riwayat komisi yang
                        ada akan diperbarui untuk menggunakan kode baru. Jika
                        tidak dicentang, komisi yang ada akan tetap pada kode
                        lama.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() =>
                      setEditModal({
                        show: false,
                        staff: null,
                        newCode: "",
                        transferCommissions: true,
                        loading: false,
                      })
                    }
                    disabled={editModal.loading}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>

                  <button
                    onClick={handleUpdateReferralCode}
                    disabled={
                      editModal.loading ||
                      !editModal.newCode.trim() ||
                      editModal.newCode.length !== 6
                    }
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {editModal.loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    Perbarui Kode
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commission History Modal */}
        {commissionHistory.show && commissionHistory.staff && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Riwayat Komisi - {commissionHistory.staff.fullName}
                  </h3>
                  <button
                    onClick={() =>
                      setCommissionHistory({
                        show: false,
                        staff: null,
                        history: [],
                        loading: false,
                      })
                    }
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Kode Referral:{" "}
                  <code
                    className={getThemeClasses(
                      "bg-gray-100 px-2 py-1 rounded font-semibold dark:bg-gray-900/30 dark:text-gray-200",
                      "!bg-[#FFF7F9] !text-[#4c1d1d]"
                    )}
                  >
                    {commissionHistory.staff.referralCode}
                  </code>
                </p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {commissionHistory.loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Memuat riwayat komisi...</p>
                  </div>
                ) : commissionHistory.history.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      Tidak ditemukan riwayat komisi untuk staff ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commissionHistory.history.map((commission: any) => (
                      <div
                        key={commission._id}
                        className="bg-gray-50 rounded-xl p-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              Pelanggan
                            </p>
                            <p className="font-medium text-gray-900">
                              {commission.customerName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {commission.customerEmail}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              Komisi
                            </p>
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(commission.commissionAmount)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {commission.commissionRate * 100}% dari total
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              Detail Pembayaran
                            </p>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  commission.paymentType === "full-investment"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                                }`}
                              >
                                {commission.paymentType === "full-investment"
                                  ? "Lunas"
                                  : "Cicilan"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {commission.productName || "Produk Investasi"}
                            </p>
                          </div>

                          {commission.paymentType === "full-investment" && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                                Total Investasi
                              </p>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(commission.contractValue)}
                              </p>
                            </div>
                          )}

                          {commission.installmentDetails && (
                            <div className="md:col-span-1">
                              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                                Info Cicilan
                              </p>
                              <p className="text-sm text-gray-900">
                                {formatCurrency(
                                  commission.installmentDetails
                                    .installmentAmount
                                )}
                                ×
                                {
                                  commission.installmentDetails
                                    .totalInstallments
                                }
                                bulan
                              </p>
                              <p className="text-xs text-gray-600">
                                Angsuran #
                                {
                                  commission.installmentDetails
                                    .installmentNumber
                                }
                              </p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              Tanggal Diperoleh
                            </p>
                            <p className="text-sm text-gray-900">
                              {formatDate(commission.earnedAt)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              Referensi
                            </p>
                            <p className="text-xs text-gray-600 font-mono">
                              {commission.cicilanOrderId ||
                                commission.paymentId}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="border-t border-gray-200 pt-4 mt-6">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-blue-600">
                              {commissionHistory.history.length}
                            </p>
                            <p className="text-sm text-gray-600">
                              Total Catatan
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(
                                commissionHistory.history.reduce(
                                  (sum: number, c: any) =>
                                    sum + c.commissionAmount,
                                  0
                                )
                              )}
                            </p>
                            <p className="text-sm text-gray-600">
                              Total Komisi
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-purple-600">
                              {
                                commissionHistory.history.filter(
                                  (c: any) =>
                                    c.paymentType === "full-investment"
                                ).length
                              }
                            </p>
                            <p className="text-sm text-gray-600">
                              Pembayaran Lunas
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-orange-600">
                              {
                                commissionHistory.history.filter(
                                  (c: any) =>
                                    c.paymentType === "cicilan-installment"
                                ).length
                              }
                            </p>
                            <p className="text-sm text-gray-600">Cicilan</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </StaffLayout>
  );
}
