"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { useAlert } from "@/components/ui/Alert";
import {
  CicilanInstallmentWithPayment,
  InvestorDetail,
  ReviewInstallmentRequest,
  ReviewInstallmentResponse,
} from "@/types/cicilan";
import { MessageCircle, Users, Clock, DollarSign } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function FinanceInvestorDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const [investorDetail, setInvestorDetail] = useState<InvestorDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    installment: CicilanInstallmentWithPayment | null;
  }>({ isOpen: false, installment: null });
  const [isReviewing, setIsReviewing] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [mounted, setMounted] = useState(false);
  const { showSuccess, showError, AlertComponent } = useAlert();
  const router = useRouter();
  const { userId } = use(params);
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

  const fetchInvestorDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/finance/payments/investors/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setInvestorDetail(data.investor);
      } else {
        console.error("Failed to fetch investor detail");
        showError("Error", "Gagal memuat data investor");
      }
    } catch (error) {
      console.error("Error fetching investor detail:", error);
      showError("Error", "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestorDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleReview = async (
    action: "approve" | "reject",
    adminNotes: string
  ) => {
    if (!reviewModal.installment) return;

    setIsReviewing(true);
    try {
      const requestBody: ReviewInstallmentRequest = {
        paymentId: reviewModal.installment._id!,
        action,
        adminNotes,
      };

      const response = await fetch("/api/finance/payments/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data: ReviewInstallmentResponse = await response.json();

      if (data.success) {
        showSuccess(
          "Review Berhasil!",
          `Angsuran berhasil ${action === "approve" ? "disetujui" : "ditolak"}!`
        );
        setReviewModal({ isOpen: false, installment: null });
        await fetchInvestorDetail();
      } else {
        showError("Gagal Memproses Review", data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error reviewing installment:", error);
      showError("Error", "Terjadi kesalahan saat memproses review");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSendWhatsApp = async (
    installment: CicilanInstallmentWithPayment
  ) => {
    if (!investorDetail) return;

    const loadingKey = installment._id!;
    setWhatsappLoading((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const response = await fetch("/api/admin/whatsapp/send-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: installment._id!,
          userInfo: {
            fullName: investorDetail.userInfo.fullName,
            phoneNumber: investorDetail.userInfo.phoneNumber,
          },
        }),
      });

      if (response.ok) {
        showSuccess(
          "Berhasil!",
          `WhatsApp reminder sent to ${investorDetail.userInfo.fullName}`
        );
      } else {
        const errorData = await response.json();
        showError(
          "Gagal Mengirim WhatsApp",
          errorData.error || "Unknown error"
        );
      }
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      showError("Gagal Mengirim WhatsApp", "Failed to send WhatsApp message");
    } finally {
      setWhatsappLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Belum Bayar";
      case "submitted":
        return "Sudah Upload";
      case "approved":
        return "Disetujui";
      case "rejected":
        return "Ditolak";
      case "overdue":
        return "Terlambat";
      default:
        return status;
    }
  };

  const getGroupStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getGroupStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "completed":
        return "Selesai";
      case "overdue":
        return "Terlambat";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isOverdue = (dueDate: Date | string) => {
    const dateObj = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
    return (
      dateObj < new Date() &&
      dateObj.toDateString() !== new Date().toDateString()
    );
  };

  if (loading) {
    return (
      <FinanceSidebar>
        <div className="p-8 text-center">
          <div
            className={getThemeClasses(
              "animate-spin rounded-full h-8 w-8 border-b-2 border-[#324D3E] dark:border-blue-400 mx-auto mb-4",
              "!border-[#FFC1CC]"
            )}
          ></div>
          <p
            className={getThemeClasses(
              "text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
              "!text-[#7d4b4b]"
            )}
          >
            Memuat data investor...
          </p>
        </div>
      </FinanceSidebar>
    );
  }

  if (!investorDetail) {
    return (
      <FinanceSidebar>
        <div className="p-8 text-center">
          <div
            className={getThemeClasses(
              "text-[#889063] dark:text-gray-300 text-4xl mb-4",
              "!text-[#7d4b4b]"
            )}
          >
            ❌
          </div>
          <h3
            className={getThemeClasses(
              "text-lg font-semibold text-[#324D3E] dark:text-white mb-2 font-[family-name:var(--font-poppins)]",
              "!text-[#4c1d1d]"
            )}
          >
            Data investor tidak ditemukan
          </h3>
          <button
            onClick={() => router.push("/finance/payments")}
            className={getThemeClasses(
              "px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] dark:from-blue-500 dark:to-green-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold font-[family-name:var(--font-poppins)]",
              "!from-[#FFC1CC] !to-[#FFB3C6] !text-[#4c1d1d]"
            )}
          >
            Kembali ke Daftar Investor
          </button>
        </div>
      </FinanceSidebar>
    );
  }

  return (
    <FinanceSidebar>
      <AlertComponent />
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <button
              onClick={() => router.push("/finance/payments")}
              className={getThemeClasses(
                "flex items-center gap-2 text-[#889063] dark:text-gray-300 hover:text-[#324D3E] dark:hover:text-white mb-2 transition-colors duration-300 font-[family-name:var(--font-poppins)] text-sm sm:text-base",
                "!text-[#7d4b4b] hover:!text-[#4c1d1d]"
              )}
            >
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Kembali ke Daftar Investor
            </button>
            <h1
              className={getThemeClasses(
                "text-2xl sm:text-3xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)]",
                "!text-[#4c1d1d]"
              )}
            >
              Detail Investor
            </h1>
            <p
              className={getThemeClasses(
                "text-[#889063] dark:text-gray-300 mt-2 text-sm sm:text-base",
                "!text-[#7d4b4b]"
              )}
            >
              Kelola pembayaran manual BCA dari{" "}
              {investorDetail.userInfo.fullName}
            </p>
          </div>
        </div>

        {/* Investor Info Card */}
        <div
          className={getThemeClasses(
            "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6",
            "!bg-[#FFC1CC]/20 !border-[#FFC1CC]/40"
          )}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div
              className={getThemeClasses(
                "w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#324D3E]/10 to-[#4C3D19]/10 dark:from-blue-500/20 dark:to-green-500/20 rounded-full flex items-center justify-center border-2 border-[#324D3E]/20 dark:border-gray-600 flex-shrink-0",
                "!from-[#FFC1CC]/30 !to-[#FFB3C6]/30 !border-[#FFC1CC]/40"
              )}
            >
              <span
                className={getThemeClasses(
                  "text-[#324D3E] dark:text-white font-semibold text-xl sm:text-2xl font-[family-name:var(--font-poppins)]",
                  "!text-[#4c1d1d]"
                )}
              >
                {investorDetail.userInfo.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2
                className={getThemeClasses(
                  "text-xl sm:text-2xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] truncate",
                  "!text-[#4c1d1d]"
                )}
              >
                {investorDetail.userInfo.fullName}
              </h2>
              <p
                className={getThemeClasses(
                  "text-[#889063] dark:text-gray-300 text-sm sm:text-base truncate",
                  "!text-[#7d4b4b]"
                )}
              >
                {investorDetail.userInfo.email}
              </p>
              {investorDetail.userInfo.userCode && (
                <p
                  className={getThemeClasses(
                    "text-sm text-[#4C3D19] dark:text-yellow-400 font-medium",
                    "!text-[#4C3D19]"
                  )}
                >
                  No Anggota: {investorDetail.userInfo.userCode}
                </p>
              )}
              <p
                className={getThemeClasses(
                  "text-sm text-[#889063]/70 dark:text-gray-400",
                  "!text-[#7d4b4b]/70"
                )}
              >
                {investorDetail.userInfo.phoneNumber}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div
              className={getThemeClasses(
                "bg-gradient-to-r from-[#324D3E]/5 to-[#324D3E]/10 dark:from-blue-500/10 dark:to-blue-600/10 p-3 sm:p-4 rounded-xl border border-[#324D3E]/10 dark:border-blue-500/20",
                "!from-[#FFC1CC]/20 !to-[#FFC1CC]/30 !border-[#FFC1CC]/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={getThemeClasses(
                      "text-xs sm:text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
                      "!text-[#7d4b4b]"
                    )}
                  >
                    Jumlah Paket
                  </div>
                  <div
                    className={getThemeClasses(
                      "text-xl sm:text-2xl font-bold text-[#324D3E] dark:text-white",
                      "!text-[#4c1d1d]"
                    )}
                  >
                    {investorDetail.totalInvestments}
                  </div>
                </div>
                <Users
                  className={getThemeClasses(
                    "text-[#324D3E] dark:text-blue-400 w-6 h-6",
                    "!text-[#4c1d1d]"
                  )}
                />
              </div>
            </div>
            <div
              className={getThemeClasses(
                "bg-gradient-to-r from-[#4C3D19]/5 to-[#4C3D19]/10 dark:from-yellow-500/10 dark:to-yellow-600/10 p-3 sm:p-4 rounded-xl border border-[#4C3D19]/10 dark:border-yellow-500/20",
                "!from-[#FFF5BA]/30 !to-[#FFF5BA]/40 !border-[#FFF5BA]/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={getThemeClasses(
                      "text-xs sm:text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
                      "!text-[#6b6227]"
                    )}
                  >
                    Total Nilai
                  </div>
                  <div
                    className={getThemeClasses(
                      "text-lg sm:text-xl font-bold text-[#4C3D19] dark:text-yellow-400",
                      "!text-[#4C3D19]"
                    )}
                  >
                    Rp {investorDetail.totalAmount.toLocaleString("id-ID")}
                  </div>
                </div>
                <DollarSign
                  className={getThemeClasses(
                    "text-[#4C3D19] dark:text-yellow-400 w-6 h-6",
                    "!text-[#4C3D19]"
                  )}
                />
              </div>
            </div>
            <div
              className={getThemeClasses(
                "bg-gradient-to-r from-[#889063]/5 to-[#889063]/10 dark:from-green-500/10 dark:to-green-600/10 p-3 sm:p-4 rounded-xl border border-[#889063]/10 dark:border-green-500/20",
                "!from-[#B5EAD7]/30 !to-[#B5EAD7]/40 !border-[#B5EAD7]/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div
                    className={getThemeClasses(
                      "text-xs sm:text-sm text-[#889063] dark:text-gray-300 font-[family-name:var(--font-poppins)]",
                      "!text-[#4c6058]"
                    )}
                  >
                    Disetujui
                  </div>
                  <div
                    className={getThemeClasses(
                      "text-lg sm:text-xl font-bold text-[#889063] dark:text-green-400",
                      "!text-[#2d5a4e]"
                    )}
                  >
                    Rp {investorDetail.totalPaid.toLocaleString("id-ID")}
                  </div>
                </div>
                <DollarSign
                  className={getThemeClasses(
                    "text-[#889063] dark:text-green-400 w-6 h-6",
                    "!text-[#2d5a4e]"
                  )}
                />
              </div>
              <div
                className={getThemeClasses(
                  "w-full bg-[#324D3E]/10 dark:bg-gray-700 rounded-full h-2 sm:h-3",
                  "!bg-[#FFC1CC]/30"
                )}
              >
                <div
                  className={getThemeClasses(
                    "bg-gradient-to-r from-[#889063] to-[#4C3D19] dark:from-green-500 dark:to-yellow-500 h-2 sm:h-3 rounded-full transition-all duration-500",
                    "!from-[#B5EAD7] !to-[#FFF5BA]"
                  )}
                  style={{
                    width: `${Math.min(
                      (investorDetail.totalPaid / investorDetail.totalAmount) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div
              className={getThemeClasses(
                "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-500/10 dark:to-yellow-600/10 p-3 sm:p-4 rounded-xl border border-yellow-200 dark:border-yellow-500/20",
                "!from-[#FFF5BA]/30 !to-[#FFF5BA]/40 !border-[#FFF5BA]/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={getThemeClasses(
                      "text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 font-[family-name:var(--font-poppins)]",
                      "!text-[#6b6227]"
                    )}
                  >
                    Pending Review
                  </div>
                  <div
                    className={getThemeClasses(
                      "text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400",
                      "!text-[#6b6227]"
                    )}
                  >
                    {investorDetail.pendingReviews || 0}
                  </div>
                </div>
                <Clock
                  className={getThemeClasses(
                    "text-yellow-600 dark:text-yellow-400 w-6 h-6",
                    "!text-[#6b6227]"
                  )}
                />
              </div>
            </div>
            <div
              className={getThemeClasses(
                "bg-gradient-to-r from-orange-50 to-orange-100 dark:from-red-500/10 dark:to-red-600/10 p-3 sm:p-4 rounded-xl border border-orange-200 dark:border-red-500/20",
                "!from-[#FFB3C6]/30 !to-[#FFB3C6]/40 !border-[#FFB3C6]/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={getThemeClasses(
                      "text-xs sm:text-sm text-orange-700 dark:text-red-400 font-[family-name:var(--font-poppins)]",
                      "!text-[#7d3d4e]"
                    )}
                  >
                    Terlambat
                  </div>
                  <div
                    className={getThemeClasses(
                      "text-xl sm:text-2xl font-bold text-orange-600 dark:text-red-400",
                      "!text-[#a02040]"
                    )}
                  >
                    {investorDetail.latePayments || 0}
                  </div>
                  {investorDetail.overdueCount > 0 && (
                    <div
                      className={getThemeClasses(
                        "text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1 font-medium",
                        "!text-[#a02040]"
                      )}
                    >
                      {investorDetail.overdueCount} Cicilan Terlambat
                    </div>
                  )}
                </div>
                <Clock
                  className={getThemeClasses(
                    "text-orange-600 dark:text-red-400 w-6 h-6",
                    "!text-[#a02040]"
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Investment Groups */}
        <div className="space-y-6">
          {investorDetail.cicilanGroups.length === 0 ? (
            <div
              className={getThemeClasses(
                "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-8 text-center",
                "!bg-white !border-[#FFC1CC]/40"
              )}
            >
              <div
                className={getThemeClasses(
                  "text-[#889063] dark:text-gray-300 text-4xl mb-4",
                  "!text-[#7d4b4b]"
                )}
              >
                💳
              </div>
              <h3
                className={getThemeClasses(
                  "text-lg font-semibold text-[#324D3E] dark:text-white mb-2 font-[family-name:var(--font-poppins)]",
                  "!text-[#4c1d1d]"
                )}
              >
                Belum ada pembayaran manual BCA
              </h3>
              <p
                className={getThemeClasses(
                  "text-[#889063] dark:text-gray-300",
                  "!text-[#7d4b4b]"
                )}
              >
                Pembayaran manual BCA dari investor ini akan muncul di sini
              </p>
            </div>
          ) : (
            investorDetail.cicilanGroups
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map((group) => (
                <div
                  key={`${group.cicilanOrderId}-${group.createdAt}`}
                  className={getThemeClasses(
                    "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6",
                    "!bg-white !border-[#FFC1CC]/40"
                  )}
                >
                  {/* Group Header */}
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
                    <div className="flex-1">
                      <h3
                        className={getThemeClasses(
                          "text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] flex items-center gap-2",
                          "!text-[#4c1d1d]"
                        )}
                      >
                        {group.productName}
                        {group.isFullPayment ? (
                          <span
                            className={getThemeClasses(
                              "text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium",
                              "!bg-[#B5EAD7]/40 !text-[#2d5a4e]"
                            )}
                          >
                            Penuh
                          </span>
                        ) : (
                          <span
                            className={getThemeClasses(
                              "text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full font-medium",
                              "!bg-[#FFF5BA]/40 !text-[#6b6227]"
                            )}
                          >
                            Cicilan
                          </span>
                        )}
                      </h3>
                      <p
                        className={getThemeClasses(
                          "text-xs sm:text-sm text-[#889063] dark:text-gray-300 break-all",
                          "!text-[#7d4b4b]"
                        )}
                      >
                        Order ID: {group.cicilanOrderId}
                      </p>
                      <div
                        className={getThemeClasses(
                          "flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-[#889063] dark:text-gray-300",
                          "!text-[#7d4b4b]"
                        )}
                      >
                        <span>
                          💰 Rp {group.totalAmount.toLocaleString("id-ID")}
                        </span>
                        <span>
                          📅{" "}
                          {group.isFullPayment
                            ? "Pembayaran Lunas"
                            : group.paymentTerm === "annual"
                            ? "Per Tahun"
                            : group.paymentTerm === "semiannual"
                            ? "Per 6 Bulan"
                            : group.paymentTerm === "quarterly"
                            ? "Per 3 Bulan"
                            : "Per Bulan"}
                        </span>
                        <span>
                          🔢 {group.totalInstallments}{" "}
                          {group.isFullPayment ? "pembayaran" : "angsuran"}
                        </span>
                      </div>
                    </div>
                    <div className="lg:text-right">
                      <span
                        className={`inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${getGroupStatusColor(
                          group.status
                        )}`}
                      >
                        {getGroupStatusText(group.status)}
                      </span>
                      <div
                        className={getThemeClasses(
                          "text-xs sm:text-sm text-[#889063] dark:text-gray-300 mt-2 font-[family-name:var(--font-poppins)]",
                          "!text-[#7d4b4b]"
                        )}
                      >
                        Progress:{" "}
                        {group.isFullPayment
                          ? `${
                              (group.installments[0] as any)?.isPaid ? 1 : 0
                            }/1`
                          : `${
                              group.installments.filter(
                                (i) => i.status === "approved"
                              ).length
                            }/${group.totalInstallments}`}
                      </div>
                      <div
                        className={getThemeClasses(
                          "w-full lg:w-32 bg-[#324D3E]/10 dark:bg-gray-700 rounded-full h-2 sm:h-3 mt-1",
                          "!bg-[#FFC1CC]/30"
                        )}
                      >
                        <div
                          className={getThemeClasses(
                            "bg-gradient-to-r from-[#4C3D19] to-[#889063] dark:from-yellow-500 dark:to-green-500 h-2 sm:h-3 rounded-full transition-all duration-500",
                            "!from-[#FFF5BA] !to-[#B5EAD7]"
                          )}
                          style={{
                            width: `${
                              group.isFullPayment
                                ? (group.installments[0] as any)?.isPaid
                                  ? 100
                                  : 0
                                : (group.installments.filter(
                                    (i) => i.status === "approved"
                                  ).length /
                                    group.installments.length) *
                                  100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Installments Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {group.installments
                      .sort((a, b) => a.installmentNumber - b.installmentNumber)
                      .map((installment) => {
                        const overdue = installment.dueDate
                          ? isOverdue(installment.dueDate)
                          : false;
                        const effectiveStatus =
                          overdue && installment.status === "pending"
                            ? "overdue"
                            : installment.status;

                        return (
                          <div
                            key={installment._id}
                            className={`border-2 rounded-xl p-3 sm:p-4 transition-all duration-300 hover:shadow-md flex flex-col ${
                              effectiveStatus === "approved"
                                ? getThemeClasses(
                                    "bg-gradient-to-r from-[#4C3D19]/5 to-[#4C3D19]/10 dark:from-yellow-500/10 dark:to-yellow-600/10 border-[#4C3D19]/20 dark:border-yellow-500/20",
                                    "!from-[#FFF5BA]/30 !to-[#FFF5BA]/40 !border-[#FFF5BA]/50"
                                  )
                                : effectiveStatus === "submitted"
                                ? getThemeClasses(
                                    "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-500/10 dark:to-yellow-600/10 border-yellow-200 dark:border-yellow-500/20",
                                    "!from-[#FFF5BA]/30 !to-[#FFF5BA]/40 !border-[#FFF5BA]/50"
                                  )
                                : effectiveStatus === "overdue"
                                ? getThemeClasses(
                                    "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-600/10 border-red-200 dark:border-red-500/20",
                                    "!from-[#FFB3C6]/30 !to-[#FFB3C6]/40 !border-[#FFB3C6]/50"
                                  )
                                : effectiveStatus === "rejected"
                                ? getThemeClasses(
                                    "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-600/10 border-red-200 dark:border-red-500/20",
                                    "!from-[#FFB3C6]/30 !to-[#FFB3C6]/40 !border-[#FFB3C6]/50"
                                  )
                                : getThemeClasses(
                                    "bg-gradient-to-r from-[#324D3E]/5 to-[#889063]/5 dark:from-blue-500/10 dark:to-green-500/10 border-[#324D3E]/10 dark:border-blue-500/20",
                                    "!from-[#FFC1CC]/20 !to-[#FFC1CC]/30 !border-[#FFC1CC]/40"
                                  )
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={getThemeClasses(
                                      "font-semibold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] text-sm sm:text-base",
                                      "!text-[#4c1d1d]"
                                    )}
                                  >
                                    Angsuran #{installment.installmentNumber}
                                  </div>
                                  <div
                                    className={getThemeClasses(
                                      "text-xs sm:text-sm text-[#889063] dark:text-gray-300",
                                      "!text-[#7d4b4b]"
                                    )}
                                  >
                                    {installment.dueDate
                                      ? formatDate(installment.dueDate)
                                      : "Belum ditentukan"}
                                  </div>
                                </div>
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${getStatusColor(
                                    effectiveStatus
                                  )}`}
                                >
                                  {getStatusText(effectiveStatus)}
                                </span>
                              </div>

                              <div className="mb-3">
                                <div
                                  className={getThemeClasses(
                                    "text-base sm:text-lg font-bold text-[#324D3E] dark:text-white",
                                    "!text-[#4c1d1d]"
                                  )}
                                >
                                  Rp{" "}
                                  {installment.amount.toLocaleString("id-ID")}
                                </div>
                              </div>

                              {/* Proof Image */}
                              {installment.proofImageUrl && (
                                <div className="mb-3">
                                  <Image
                                    src={installment.proofImageUrl}
                                    alt="Bukti Pembayaran"
                                    className={getThemeClasses(
                                      "w-full h-16 sm:h-20 object-cover rounded-lg border border-[#324D3E]/20 dark:border-gray-600 cursor-pointer hover:shadow-md transition-all duration-300",
                                      "!border-[#FFC1CC]/40"
                                    )}
                                    onClick={() =>
                                      window.open(
                                        installment.proofImageUrl,
                                        "_blank"
                                      )
                                    }
                                    width={100}
                                    height={100}
                                  />
                                </div>
                              )}

                              {/* Admin Notes */}
                              {installment.adminNotes && (
                                <div
                                  className={getThemeClasses(
                                    "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-500/10 dark:to-yellow-600/10 p-2 sm:p-3 rounded-lg text-xs text-yellow-800 dark:text-yellow-200 mb-3 border border-yellow-200 dark:border-yellow-500/20",
                                    "!from-[#FFF5BA]/40 !to-[#FFF5BA]/60 !text-[#6b6227] !border-[#FFF5BA]/60"
                                  )}
                                >
                                  <strong
                                    className={getThemeClasses(
                                      "font-[family-name:var(--font-poppins)] text-yellow-800 dark:text-yellow-200",
                                      "!text-[#6b6227]"
                                    )}
                                  >
                                    Catatan:
                                  </strong>{" "}
                                  {installment.adminNotes}
                                </div>
                              )}
                            </div>

                            <div className="mt-auto space-y-2">
                              {/* Review Button - Only for payments with pending admin status */}
                              {installment.adminStatus === "pending" &&
                                installment.proofImageUrl && (
                                  <button
                                    onClick={() =>
                                      setReviewModal({
                                        isOpen: true,
                                        installment,
                                      })
                                    }
                                    className={getThemeClasses(
                                      "w-full px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] dark:from-blue-500 dark:to-green-500 text-white text-xs sm:text-sm rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold font-[family-name:var(--font-poppins)]",
                                      "!from-[#FFC1CC] !to-[#FFB3C6] !text-[#4c1d1d]"
                                    )}
                                  >
                                    Review
                                  </button>
                                )}

                              {/* WhatsApp Button - show for pending/overdue payments without proof */}
                              {(effectiveStatus === "pending" ||
                                effectiveStatus === "overdue") && (
                                <button
                                  onClick={() =>
                                    handleSendWhatsApp(installment)
                                  }
                                  disabled={whatsappLoading[installment._id!]}
                                  className={getThemeClasses(
                                    "w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-green-600 text-white text-xs sm:text-sm rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold font-[family-name:var(--font-poppins)]",
                                    "!bg-[#B5EAD7] !text-[#2d5a4e] hover:!bg-[#B5EAD7]/80"
                                  )}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  {whatsappLoading[installment._id!]
                                    ? "Mengirim..."
                                    : "Kirim Pengingat"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Review Modal */}
        <ReviewModal
          isOpen={reviewModal.isOpen}
          installment={reviewModal.installment}
          onClose={() => setReviewModal({ isOpen: false, installment: null })}
          onReview={handleReview}
          isReviewing={isReviewing}
          getThemeClasses={getThemeClasses}
        />
      </div>
    </FinanceSidebar>
  );
}

interface ReviewModalProps {
  isOpen: boolean;
  installment: CicilanInstallmentWithPayment | null;
  onClose: () => void;
  onReview: (action: "approve" | "reject", notes: string) => Promise<void>;
  isReviewing: boolean;
  getThemeClasses: (baseClasses: string, pinkClasses?: string) => string;
}

function ReviewModal({
  isOpen,
  installment,
  onClose,
  onReview,
  isReviewing,
  getThemeClasses,
}: ReviewModalProps) {
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const handleSubmit = async (submitAction: "approve" | "reject") => {
    await onReview(submitAction, notes);
    setNotes("");
    setAction(null);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen || !installment) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[9999]">
      <div
        className={getThemeClasses(
          "bg-[#FFFCE3] dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-[#324D3E]/20 dark:border-gray-600",
          "!bg-[#FFE5F0] !border-[#FFC1CC]"
        )}
      >
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3
              className={getThemeClasses(
                "text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white font-poppins pr-2",
                "!text-[#4c1d1d]"
              )}
            >
              Review Bukti Pembayaran #{installment.installmentNumber}
            </h3>
            <button
              onClick={onClose}
              className={getThemeClasses(
                "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors flex-shrink-0",
                "!text-[#7d4b4b] hover:!text-[#4c1d1d]"
              )}
              disabled={isReviewing}
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Installment Info */}
          <div
            className={getThemeClasses(
              "bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 dark:from-gray-700 dark:to-gray-600 p-3 sm:p-4 rounded-2xl mb-4 sm:mb-6",
              "!from-[#FFC1CC]/30 !to-[#FFB3C6]/30"
            )}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div>
                <span
                  className={getThemeClasses(
                    "text-gray-600 dark:text-gray-300 font-poppins",
                    "!text-[#7d4b4b]"
                  )}
                >
                  Angsuran ke:
                </span>
                <div
                  className={getThemeClasses(
                    "font-semibold text-[#324D3E] dark:text-white font-poppins",
                    "!text-[#4c1d1d]"
                  )}
                >
                  #{installment.installmentNumber}
                </div>
              </div>
              <div>
                <span
                  className={getThemeClasses(
                    "text-gray-600 dark:text-gray-300 font-poppins",
                    "!text-[#7d4b4b]"
                  )}
                >
                  Jumlah:
                </span>
                <div
                  className={getThemeClasses(
                    "font-semibold text-[#324D3E] dark:text-white font-poppins",
                    "!text-[#4c1d1d]"
                  )}
                >
                  Rp {installment.amount.toLocaleString("id-ID")}
                </div>
              </div>
              <div>
                <span
                  className={getThemeClasses(
                    "text-gray-600 dark:text-gray-300 font-poppins",
                    "!text-[#7d4b4b]"
                  )}
                >
                  Jatuh Tempo:
                </span>
                <div
                  className={getThemeClasses(
                    "font-semibold text-[#324D3E] dark:text-white font-poppins text-sm",
                    "!text-[#4c1d1d]"
                  )}
                >
                  {installment.dueDate
                    ? formatDate(installment.dueDate)
                    : "Belum ditentukan"}
                </div>
              </div>
              <div>
                <span
                  className={getThemeClasses(
                    "text-gray-600 dark:text-gray-300 font-poppins",
                    "!text-[#7d4b4b]"
                  )}
                >
                  Order ID:
                </span>
                <div
                  className={getThemeClasses(
                    "font-medium text-xs text-[#4C3D19] dark:text-yellow-400 font-poppins break-all",
                    "!text-[#4C3D19]"
                  )}
                >
                  {installment.orderId || installment._id}
                </div>
              </div>
            </div>
          </div>

          {/* Proof Image */}
          {installment.proofImageUrl && (
            <div className="mb-4 sm:mb-6">
              <h4
                className={getThemeClasses(
                  "font-semibold text-[#324D3E] dark:text-white mb-2 sm:mb-3 font-poppins",
                  "!text-[#4c1d1d]"
                )}
              >
                Bukti Pembayaran
              </h4>
              <div
                className={getThemeClasses(
                  "border-2 border-[#324D3E]/20 dark:border-gray-600 rounded-2xl p-2 sm:p-4 bg-white/50 dark:bg-gray-700/50",
                  "!border-[#FFC1CC]/40 !bg-[#FFC1CC]/10"
                )}
              >
                <Image
                  src={installment.proofImageUrl}
                  alt="Bukti Pembayaran"
                  className="max-w-full h-auto rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300"
                  onClick={() =>
                    window.open(installment.proofImageUrl, "_blank")
                  }
                  width={100}
                  height={100}
                />
              </div>
            </div>
          )}

          {/* Description */}
          {installment.proofDescription && (
            <div className="mb-4 sm:mb-6">
              <h4
                className={getThemeClasses(
                  "font-semibold text-[#324D3E] dark:text-white mb-2 font-poppins",
                  "!text-[#4c1d1d]"
                )}
              >
                Keterangan dari User
              </h4>
              <div
                className={getThemeClasses(
                  "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-500/10 dark:to-indigo-500/10 p-3 sm:p-4 rounded-2xl border border-blue-200/50 dark:border-blue-500/20",
                  "!from-[#B5EAD7]/30 !to-[#B5EAD7]/40 !border-[#B5EAD7]/50"
                )}
              >
                <p
                  className={getThemeClasses(
                    "text-gray-700 dark:text-gray-300 font-poppins text-sm sm:text-base",
                    "!text-[#2d5a4e]"
                  )}
                >
                  {installment.proofDescription}
                </p>
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div className="mb-4 sm:mb-6">
            <label
              className={getThemeClasses(
                "block text-sm font-medium text-[#324D3E] dark:text-white mb-2 font-poppins",
                "!text-[#4c1d1d]"
              )}
            >
              Alasan Penolakan
            </label>
            <select
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={getThemeClasses(
                "w-full border border-gray-300 dark:border-gray-600 rounded-xl p-2 sm:p-3 font-poppins focus:border-[#324D3E] dark:focus:border-blue-400 focus:ring-1 focus:ring-[#324D3E]/20 dark:focus:ring-blue-400/20 bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-800 dark:text-white",
                "!bg-white !border-[#FFC1CC]/40 !text-[#4c1d1d] focus:!border-[#FFC1CC] focus:!ring-[#FFC1CC]/30"
              )}
              disabled={isReviewing}
            >
              <option value="">Pilih alasan penolakan (opsional)</option>
              <option value="Bukti Tidak Jelas Silahkan Unggah Kembali Bukti Pembayaran Yang Benar/Valid">
                Bukti Tidak Jelas Silahkan Unggah Kembali Bukti Pembayaran Yang Benar/Valid
              </option>
              <option value="Nominal Transfer Tidak Sesuai Dengan Jumlah Yang Ditagihkan">
                Nominal Transfer Tidak Sesuai Dengan Jumlah Yang Ditagihkan
              </option>
              <option value="Bukti Pembayaran Tidak Valid atau tidak dapat di verifikasi">
                Bukti Pembayaran Tidak Valid atau tidak dapat di verifikasi
              </option>
              <option value="Dana Belum Tercatat Pada Sistem Bank Saat Proses Verifikasi">
                Dana Belum Tercatat Pada Sistem Bank Saat Proses Verifikasi
              </option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={onClose}
              disabled={isReviewing}
              className={getThemeClasses(
                "flex-1 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 font-poppins font-medium transition-all duration-300 text-sm sm:text-base",
                "!border-[#FFC1CC]/40 !text-[#7d4b4b] hover:!bg-[#FFC1CC]/20"
              )}
            >
              Batal
            </button>
            <button
              onClick={() => {
                setAction("reject");
                handleSubmit("reject");
              }}
              disabled={isReviewing}
              className={getThemeClasses(
                "flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white rounded-full hover:shadow-lg hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 disabled:opacity-50 font-poppins font-semibold transition-all duration-300 text-sm sm:text-base",
                "!from-[#FF6B9D] !to-[#FF4577] !text-white hover:!from-[#FF4577] hover:!to-[#FF2557] hover:shadow-[0_0_20px_rgba(255,107,157,0.5)]"
              )}
            >
              {isReviewing && action === "reject" ? "Memproses..." : "Tolak"}
            </button>
            <button
              onClick={() => {
                setAction("approve");
                handleSubmit("approve");
              }}
              disabled={isReviewing}
              className={getThemeClasses(
                "flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] dark:from-blue-500 dark:to-green-500 text-white rounded-full hover:shadow-lg disabled:opacity-50 font-poppins font-medium transition-all duration-300 text-sm sm:text-base",
                "!from-[#FFC1CC] !to-[#FFB3C6] !text-[#4c1d1d]"
              )}
            >
              {isReviewing && action === "approve" ? "Memproses..." : "Setujui"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
