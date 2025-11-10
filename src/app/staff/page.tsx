"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAlert } from "@/components/ui/Alert";
import StaffLayout from "@/components/staff/StaffLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Copy,
  DollarSign,
  Users,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Edit2,
  X,
} from "lucide-react";
import Image from "next/image";

interface ReferralData {
  referralCode: string | null;
  staffName: string;
  staffEmail: string;
  referrals: Array<{
    commissionId: string;
    paymentId: string;
    orderId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    productName: string;
    paymentType: string;
    amount: number;
    commission: number;
    status: string;
    paymentDate: string;
    createdAt: string;
  }>;
  totalCommission: number;
  totalPaidCommission?: number;
  totalUnpaidCommission?: number;
  totalReferrals: number;
  summary: {
    fullPayments: number;
    cicilanPayments: number;
    registrations: number;
  };
  totalPages: number;
  currentPage: number;
  message?: string;
}

export default function StaffPage() {
  const { status, data: session, update } = useSession();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { showSuccess, showError, AlertComponent } = useAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("earnedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build URL with pagination, search, and sort params
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      const response = await fetch(`/api/staff/referrals?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch referral data");
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching referral data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchReferralData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentPage, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserProfile();
    }
  }, [status]);

  const fetchUserProfile = async () => {
    try {
      setFetchingProfile(true);
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const json = await res.json();
      if (json.success) {
        setUserProfile(json.user);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError("Error", "File size must be less than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      showError("Error", "Please select a valid image file");
      return;
    }

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/user/upload-profile-image", {
        method: "POST",
        body: form,
      });
      const uploadData = await res.json();
      if (!res.ok) throw new Error(uploadData.error || "Upload failed");

      setUserProfile((prev: any) => ({
        ...(prev || {}),
        profileImageUrl: uploadData.profileImageUrl,
      }));

      // update next-auth session so other components (StaffLayout) reflect the change
      try {
        if (update && session) {
          await update({
            ...session,
            user: {
              ...session.user,
              profileImageUrl: uploadData.profileImageUrl,
            },
          } as any);
        }
      } catch (err) {
        // non-fatal
        console.warn("Failed to update session after profile upload", err);
      }
      showSuccess("Success", "Profile image updated");
    } catch (err: any) {
      console.error("Upload error:", err);
      showError("Error", err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const copyReferralCode = async () => {
    if (data?.referralCode) {
      try {
        await navigator.clipboard.writeText(data.referralCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (err) {
        console.error("Failed to copy referral code:", err);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      settlement: "bg-green-100 text-green-800 border border-green-200",
      approved: "bg-green-100 text-green-800 border border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      rejected: "bg-red-100 text-red-800 border border-red-200",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusStyles[status as keyof typeof statusStyles] ||
          "bg-gray-100 text-gray-800 border border-gray-200"
        }`}
      >
        {status === "settlement"
          ? "Lunas"
          : status === "approved"
          ? "Disetujui"
          : status === "pending"
          ? "Menunggu"
          : status === "rejected"
          ? "Ditolak"
          : status}
      </span>
    );
  };

  const getPaymentTypeBadge = (type: string) => {
    const typeStyles = {
      "full-investment": "bg-blue-100 text-blue-800 border border-blue-200",
      "cicilan-installment":
        "bg-purple-100 text-purple-800 border border-purple-200",
      registration: "bg-orange-100 text-orange-800 border border-orange-200",
    };

    const typeLabels = {
      "full-investment": "Lunas",
      "cicilan-installment": "Cicilan",
      registration: "Registrasi",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          typeStyles[type as keyof typeof typeStyles] ||
          "bg-gray-100 text-gray-800 border border-gray-200"
        }`}
      >
        {typeLabels[type as keyof typeof typeLabels] || type}
      </span>
    );
  };

  // Server-side pagination - data is already paginated
  const totalPages = data?.totalPages || 0;
  const paginatedReferrals = data?.referrals || [];
  const totalReferrals = data?.totalReferrals || 0;

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder]);

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to desc
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg
          className="w-4 h-4 opacity-30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    return sortOrder === "asc" ? (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4"
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
    );
  };

  if (status === "loading" || loading) {
    return (
      <StaffLayout>
        <motion.div
          className={getThemeClasses(
            "min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center",
            "!bg-gradient-to-br !from-[#FFDEE9] !via-white !to-[#FFDEE9]"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-center">
            <RefreshCw
              className={getThemeClasses(
                "h-8 w-8 animate-spin text-[#324D3E] dark:text-white",
                "!text-[#4c1d1d]"
              )}
            />
            <span
              className={getThemeClasses(
                "ml-2 text-lg text-[#324D3E] dark:text-white font-semibold",
                "!text-[#4c1d1d]"
              )}
            >
              Memuat...
            </span>
          </div>
        </motion.div>
      </StaffLayout>
    );
  }

  if (error) {
    return (
      <StaffLayout>
        <div className="container mx-auto py-8 px-4">
          <Card className="shadow-lg bg-red-50 border border-red-200">
            <div className="p-8 text-center">
              <p className="text-red-600 mb-4 text-lg font-semibold">{error}</p>
              <Button
                onClick={fetchReferralData}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Coba Lagi
              </Button>
            </div>
          </Card>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <motion.div
        className="container mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <h1
            className={getThemeClasses(
              "text-3xl sm:text-4xl md:text-5xl font-black text-[#324D3E] dark:text-white drop-shadow-sm",
              "!text-[#4c1d1d]"
            )}
          >
            Dashboard Marketing
          </h1>
          <p
            className={getThemeClasses(
              "text-base sm:text-lg text-[#889063] dark:text-gray-400 max-w-2xl mx-auto font-medium",
              "!text-[#6b7280]"
            )}
          >
            Lacak rujukan dan penghasilan komisi Anda
          </p>
          <motion.button
            onClick={fetchReferralData}
            className={getThemeClasses(
              "inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white rounded-xl shadow-lg font-semibold backdrop-blur-lg transition-all duration-300",
              "!bg-white/80 hover:!bg-white !border-[#FFC1CC]/50 !text-[#4c1d1d]"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </motion.button>
        </motion.div>

        {/* Referral Code Card */}
        {/* Profile Header (editable photo, name, joined date) */}
        <AlertComponent />
        <motion.div
          className={getThemeClasses(
            "bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="p-4 sm:p-6 flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
                {fetchingProfile ? (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                    Memuat...
                  </div>
                ) : userProfile?.profileImageUrl ? (
                  <Image
                    src={userProfile.profileImageUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    width={20}
                    height={20}
                  />
                ) : (
                  <div className="w-full h-full bg-[#324D3E] flex items-center justify-center text-white text-2xl font-bold">
                    {userProfile?.fullName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute right-0 bottom-0 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50"
                title="Ubah foto profil"
              >
                <Edit2 className="h-4 w-4 text-[#324D3E]" />
              </button>
            </div>
            <div>
              <h3
                className={getThemeClasses(
                  "text-xl font-bold text-[#324D3E] dark:text-white",
                  "!text-[#4c1d1d]"
                )}
              >
                {userProfile?.fullName || "Nama Pengguna"}
              </h3>
              <p
                className={getThemeClasses(
                  "text-sm text-[#889063] dark:text-gray-400",
                  "!text-[#6b7280]"
                )}
              >
                {userProfile?.email || "-"}
              </p>
              <p
                className={getThemeClasses(
                  "text-sm text-[#889063] dark:text-gray-400 mt-1",
                  "!text-[#6b7280]"
                )}
              >
                Bergabung:{" "}
                {userProfile?.createdAt
                  ? formatDate(userProfile.createdAt)
                  : "-"}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className={getThemeClasses(
            "bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          whileHover={{ scale: 1.02, y: -5 }}
        >
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={getThemeClasses(
                  "p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl",
                  "!bg-[#FFC1CC]/40"
                )}
              >
                <ExternalLink
                  className={getThemeClasses(
                    "h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400",
                    "!text-[#4c1d1d]"
                  )}
                />
              </div>
              <h2
                className={getThemeClasses(
                  "text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white",
                  "!text-[#4c1d1d]"
                )}
              >
                Kode Referral Anda
              </h2>
            </div>
            {data?.referralCode ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div
                  className={getThemeClasses(
                    "bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 dark:from-gray-700/50 dark:to-gray-600/50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl border border-[#324D3E]/20 dark:border-gray-600",
                    "!bg-gradient-to-r !from-[#FFC1CC]/20 !to-[#FFDEE9]/20 !border-[#FFC1CC]/30"
                  )}
                >
                  <code
                    className={getThemeClasses(
                      "text-xl sm:text-2xl font-mono font-bold text-[#324D3E] dark:text-white tracking-wider",
                      "!text-[#4c1d1d]"
                    )}
                  >
                    {data.referralCode}
                  </code>
                </div>
                <motion.button
                  onClick={copyReferralCode}
                  className={getThemeClasses(
                    `inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-xl shadow-lg transition-all duration-300 font-semibold ${
                      copiedCode ? "from-green-600 to-green-700" : ""
                    }`,
                    copiedCode
                      ? "!bg-gradient-to-r !from-[#B5EAD7] !to-[#A7F3D0] !text-[#4c1d1d]"
                      : "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {copiedCode ? "Disalin!" : "Salin Kode"}
                  </span>
                </motion.button>
              </div>
            ) : (
              <div
                className={getThemeClasses(
                  "text-[#889063] dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600",
                  "!bg-[#FFB3C6]/10 !border-[#FFB3C6]/30 !text-[#4c1d1d]"
                )}
              >
                {data?.message || "Belum ada kode referral. Hubungi admin."}
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <motion.div
            className={getThemeClasses(
              "bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3
                  className={getThemeClasses(
                    "text-sm font-semibold text-[#889063] dark:text-gray-400",
                    "!text-[#6b7280]"
                  )}
                >
                  Total Komisi
                </h3>
                <div
                  className={getThemeClasses(
                    "p-2 bg-green-100 dark:bg-green-900/30 rounded-xl",
                    "!bg-[#B5EAD7]/40"
                  )}
                >
                  <DollarSign
                    className={getThemeClasses(
                      "h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400",
                      "!text-[#4c1d1d]"
                    )}
                  />
                </div>
              </div>
              <div
                className={getThemeClasses(
                  "text-xl sm:text-2xl font-bold text-[#324D3E] dark:text-white",
                  "!text-[#4c1d1d]"
                )}
              >
                {formatCurrency(data?.totalCommission || 0)}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3
                  className={getThemeClasses(
                    "text-sm font-semibold text-[#889063] dark:text-gray-400",
                    "!text-[#6b7280]"
                  )}
                >
                  Total Rujukan
                </h3>
                <div
                  className={getThemeClasses(
                    "p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl",
                    "!bg-[#FFC1CC]/40"
                  )}
                >
                  <Users
                    className={getThemeClasses(
                      "h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400",
                      "!text-[#4c1d1d]"
                    )}
                  />
                </div>
              </div>
              <div
                className={getThemeClasses(
                  "text-xl sm:text-2xl font-bold text-[#324D3E] dark:text-white",
                  "!text-[#4c1d1d]"
                )}
              >
                {data?.totalReferrals || 0}
              </div>
              <p
                className={getThemeClasses(
                  "text-xs text-[#889063] dark:text-gray-400 font-medium",
                  "!text-[#6b7280]"
                )}
              >
                Rujukan berhasil
              </p>
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3
                  className={getThemeClasses(
                    "text-sm font-semibold text-[#889063] dark:text-gray-400",
                    "!text-[#6b7280]"
                  )}
                >
                  Pembayaran Lunas
                </h3>
                <div
                  className={getThemeClasses(
                    "p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl",
                    "!bg-[#C7CEEA]/40"
                  )}
                >
                  <TrendingUp
                    className={getThemeClasses(
                      "h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400",
                      "!text-[#4c1d1d]"
                    )}
                  />
                </div>
              </div>
              <div
                className={getThemeClasses(
                  "text-xl sm:text-2xl font-bold text-[#324D3E] dark:text-white",
                  "!text-[#4c1d1d]"
                )}
              >
                {data?.summary.fullPayments || 0}
              </div>
              <p
                className={getThemeClasses(
                  "text-xs text-[#889063] dark:text-gray-400 font-medium",
                  "!text-[#6b7280]"
                )}
              >
                Investasi sekali bayar
              </p>
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3
                  className={getThemeClasses(
                    "text-sm font-semibold text-[#889063] dark:text-gray-400",
                    "!text-[#6b7280]"
                  )}
                >
                  Cicilan
                </h3>
                <div
                  className={getThemeClasses(
                    "p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl",
                    "!bg-[#FFDEE9]/40"
                  )}
                >
                  <TrendingUp
                    className={getThemeClasses(
                      "h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400",
                      "!text-[#4c1d1d]"
                    )}
                  />
                </div>
              </div>
              <div
                className={getThemeClasses(
                  "text-xl sm:text-2xl font-bold text-[#324D3E] dark:text-white",
                  "!text-[#4c1d1d]"
                )}
              >
                {data?.summary.cicilanPayments || 0}
              </div>
              <p
                className={getThemeClasses(
                  "text-xs text-[#889063] dark:text-gray-400 font-medium",
                  "!text-[#6b7280]"
                )}
              >
                Pembayaran cicilan
              </p>
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3
                  className={getThemeClasses(
                    "text-sm font-semibold text-[#889063] dark:text-gray-400",
                    "!text-[#6b7280]"
                  )}
                >
                  Total Sudah Dibayar
                </h3>
                <div
                  className={getThemeClasses(
                    "p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl",
                    "!bg-[#B5EAD7]/40"
                  )}
                >
                  <DollarSign
                    className={getThemeClasses(
                      "h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400",
                      "!text-[#4c1d1d]"
                    )}
                  />
                </div>
              </div>
              <div
                className={getThemeClasses(
                  "text-xl sm:text-2xl font-bold text-[#324D3E] dark:text-white",
                  "!text-[#4c1d1d]"
                )}
              >
                {formatCurrency(data?.totalPaidCommission || 0)}
              </div>
              <p
                className={getThemeClasses(
                  "text-xs text-[#889063] dark:text-gray-400 font-medium",
                  "!text-[#6b7280]"
                )}
              >
                Komisi yang telah ditarik
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Referrals Table */}
        <motion.div
          className={getThemeClasses(
            "bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2
                  className={getThemeClasses(
                    "text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white",
                    "!text-[#4c1d1d]"
                  )}
                >
                  Riwayat Rujukan
                </h2>
                {totalPages > 1 && (
                  <div
                    className={getThemeClasses(
                      "text-sm text-[#889063] dark:text-gray-400 font-medium",
                      "!text-[#6b7280]"
                    )}
                  >
                    Halaman {currentPage} dari {totalPages}
                  </div>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan nama, email, atau no. telepon..."
                  className={getThemeClasses(
                    "w-full px-4 py-3 pl-10 bg-white dark:bg-gray-700 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E] dark:focus:ring-gray-500 text-[#324D3E] dark:text-white placeholder-[#889063] dark:placeholder-gray-400",
                    "!bg-white !border-[#FFC1CC]/30 focus:!ring-[#FFC1CC]/50 !text-[#4c1d1d] placeholder-[#6b7280]"
                  )}
                />
                <svg
                  className={getThemeClasses(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#889063] dark:text-gray-400",
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

              {searchQuery && (
                <div
                  className={getThemeClasses(
                    "text-sm text-[#889063] dark:text-gray-400 font-medium",
                    "!text-[#6b7280]"
                  )}
                >
                  Menampilkan {totalReferrals} rujukan yang cocok
                </div>
              )}
            </div>

            {data?.referrals && data.referrals.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr
                        className={getThemeClasses(
                          "border-b border-[#324D3E]/20 dark:border-gray-600",
                          "!border-[#FFC1CC]/30"
                        )}
                      >
                        <th
                          onClick={() => handleSort("customerName")}
                          className={getThemeClasses(
                            "text-left py-3 px-4 font-semibold text-[#324D3E] dark:text-white cursor-pointer hover:bg-[#324D3E]/5 transition-colors",
                            "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/10"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span>Pelanggan</span>
                            {getSortIcon("customerName")}
                          </div>
                        </th>
                        <th
                          className={getThemeClasses(
                            "text-left py-3 px-4 font-semibold text-[#324D3E] dark:text-white hidden sm:table-cell",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          Produk
                        </th>
                        <th
                          className={getThemeClasses(
                            "text-left py-3 px-4 font-semibold text-[#324D3E] dark:text-white hidden md:table-cell",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          Tipe
                        </th>
                        <th
                          onClick={() => handleSort("amount")}
                          className={getThemeClasses(
                            "text-left py-3 px-4 font-semibold text-[#324D3E] dark:text-white cursor-pointer hover:bg-[#324D3E]/5 transition-colors",
                            "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/10"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span>Jumlah</span>
                            {getSortIcon("amount")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("commission")}
                          className={getThemeClasses(
                            "text-left py-3 px-4 font-semibold text-[#324D3E] dark:text-white cursor-pointer hover:bg-[#324D3E]/5 transition-colors",
                            "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/10"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span>Komisi</span>
                            {getSortIcon("commission")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("status")}
                          className={getThemeClasses(
                            "text-left py-3 px-4 font-semibold text-[#324D3E] dark:text-white hidden lg:table-cell cursor-pointer hover:bg-[#324D3E]/5 transition-colors",
                            "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/10"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span>Status</span>
                            {getSortIcon("status")}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReferrals.map((referral) => (
                        <tr
                          key={referral.commissionId}
                          className={getThemeClasses(
                            "border-b border-[#324D3E]/10 dark:border-gray-700 hover:bg-[#324D3E]/5 dark:hover:bg-gray-700/30 transition-colors duration-200",
                            "!border-[#FFC1CC]/20 hover:!bg-[#FFC1CC]/5"
                          )}
                        >
                          <td className="py-3 sm:py-4 px-3 sm:px-4">
                            <div>
                              <div
                                className={getThemeClasses(
                                  "font-medium text-[#324D3E] dark:text-white text-sm sm:text-base",
                                  "!text-[#4c1d1d]"
                                )}
                              >
                                {referral.customerName}
                              </div>
                              <div
                                className={getThemeClasses(
                                  "text-xs sm:text-sm text-[#889063] dark:text-gray-400",
                                  "!text-[#6b7280]"
                                )}
                              >
                                {referral.customerEmail}
                              </div>
                            </div>
                          </td>
                          <td
                            className={getThemeClasses(
                              "py-3 sm:py-4 px-3 sm:px-4 text-[#889063] dark:text-gray-300 hidden sm:table-cell font-medium text-sm",
                              "!text-[#6b7280]"
                            )}
                          >
                            {referral.productName || "N/A"}
                          </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-4 hidden md:table-cell">
                            {getPaymentTypeBadge(referral.paymentType)}
                          </td>
                          <td
                            className={getThemeClasses(
                              "py-3 sm:py-4 px-3 sm:px-4 font-mono text-[#324D3E] dark:text-white font-semibold text-sm sm:text-base",
                              "!text-[#4c1d1d]"
                            )}
                          >
                            {formatCurrency(referral.amount)}
                          </td>
                          <td
                            className={getThemeClasses(
                              "py-3 sm:py-4 px-3 sm:px-4 font-mono font-semibold text-[#4C3D19] dark:text-green-400 text-sm sm:text-base",
                              "!text-[#059669]"
                            )}
                          >
                            {formatCurrency(referral.commission)}
                          </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-4 hidden lg:table-cell">
                            {getStatusBadge(referral.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 gap-4">
                    <div
                      className={getThemeClasses(
                        "text-sm text-[#889063] dark:text-gray-400 font-medium",
                        "!text-[#6b7280]"
                      )}
                    >
                      Menampilkan{" "}
                      {totalReferrals > 0
                        ? (currentPage - 1) * itemsPerPage + 1
                        : 0}{" "}
                      sampai{" "}
                      {Math.min(currentPage * itemsPerPage, totalReferrals)}{" "}
                      dari {totalReferrals} rujukan
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                        className={getThemeClasses(
                          `inline-flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-700 hover:bg-[#324D3E]/5 dark:hover:bg-gray-600 border border-[#324D3E]/30 dark:border-gray-600 text-[#324D3E] dark:text-white font-semibold rounded-xl shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`,
                          "!bg-white hover:!bg-[#FFC1CC]/5 !border-[#FFC1CC]/50 !text-[#4c1d1d]"
                        )}
                        whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
                        whileTap={{ scale: currentPage === 1 ? 1 : 0.95 }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Sebelumnya</span>
                      </motion.button>
                      <motion.button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className={getThemeClasses(
                          `inline-flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-700 hover:bg-[#324D3E]/5 dark:hover:bg-gray-600 border border-[#324D3E]/30 dark:border-gray-600 text-[#324D3E] dark:text-white font-semibold rounded-xl shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`,
                          "!bg-white hover:!bg-[#FFC1CC]/5 !border-[#FFC1CC]/50 !text-[#4c1d1d]"
                        )}
                        whileHover={{
                          scale: currentPage === totalPages ? 1 : 1.05,
                        }}
                        whileTap={{
                          scale: currentPage === totalPages ? 1 : 0.95,
                        }}
                      >
                        <span className="hidden sm:inline">Selanjutnya</span>
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div
                  className={getThemeClasses(
                    "p-4 bg-[#324D3E]/10 dark:bg-gray-700/30 rounded-full w-fit mx-auto mb-4",
                    "!bg-[#FFC1CC]/20"
                  )}
                >
                  <Users
                    className={getThemeClasses(
                      "h-12 w-12 sm:h-16 sm:w-16 text-[#324D3E]/50 dark:text-gray-400",
                      "!text-[#4c1d1d]/50"
                    )}
                  />
                </div>
                <p
                  className={getThemeClasses(
                    "text-[#324D3E] dark:text-white text-lg font-semibold mb-2",
                    "!text-[#4c1d1d]"
                  )}
                >
                  Tidak ada rujukan
                </p>
                <p
                  className={getThemeClasses(
                    "text-[#889063] dark:text-gray-400 font-medium",
                    "!text-[#6b7280]"
                  )}
                >
                  Bagikan kode referral Anda untuk mulai mendapatkan komisi!
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </StaffLayout>
  );
}
