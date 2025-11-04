"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAlert } from "@/components/ui/Alert";
import Image from "next/image";
import { motion } from "framer-motion";
import { RefreshCw, Check, X, Eye, FileSpreadsheet } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface SignatureAttempt {
  attemptNumber: number;
  signatureData: string;
  submittedAt: string;
  reviewStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  adminNotes?: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  ktpImageUrl?: string;
  userCode?: string;
}

interface ContractForApproval {
  contractId: string;
  contractNumber: string;
  status: string;
  adminApprovalStatus: string;
  productName: string;
  totalAmount: number;
  paymentType: "full" | "cicilan";
  user: User;
  currentAttempt: number;
  maxAttempts: number;
  lastSignature: SignatureAttempt | null;
  contractDate: string;
  createdAt: string;
}

interface ApprovalModalData {
  contract: ContractForApproval;
  action: "approve" | "reject";
}

export default function ContractApprovalsPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to get theme-aware classes (only apply pink overrides when mounted & theme === 'pink')
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  const [contracts, setContracts] = useState<ContractForApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContract, setSelectedContract] =
    useState<ApprovalModalData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const { showSuccess, showError, AlertComponent } = useAlert();

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/contracts/pending?page=${currentPage}&status=${statusFilter}&limit=10`
      );

      if (response.ok) {
        const result = await response.json();
        setContracts(result.data.contracts);
        setTotalPages(result.data.pagination.totalPages);
      } else {
        showError("Error", "Failed to fetch contracts");
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
      showError("Error", "Failed to fetch contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const handleApproval = async (contractId: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/admin/contracts/${contractId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notes: adminNotes,
          }),
        }
      );

      if (response.ok) {
        showSuccess("Berhasil", "Kontrak Berhasil Disetujui");
        setSelectedContract(null);
        setAdminNotes("");
        fetchContracts();
      } else {
        const error = await response.json();
        showError("Error", error.error || "Gagal menyetujui kontrak");
      }
    } catch (error) {
      console.error("Error approving contract:", error);
      showError("Error", "Gagal menyetujui kontrak");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejection = async (contractId: string) => {
    if (!rejectionReason.trim()) {
      showError("Error", "Alasan penolakan wajib diisi");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/admin/contracts/${contractId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rejectionReason: rejectionReason.trim(),
            adminNotes: adminNotes.trim(),
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        showSuccess(
          "Berhasil",
          result.data.isPermanentRejection
            ? "Kontrak ditolak permanen (maksimal percobaan tercapai)"
            : "Kontrak ditolak - pengguna dapat mencoba lagi"
        );
        setSelectedContract(null);
        setRejectionReason("");
        setAdminNotes("");
        fetchContracts();
      } else {
        const error = await response.json();
        showError("Error", error.error || "Gagal menolak kontrak");
      }
    } catch (error) {
      console.error("Error rejecting contract:", error);
      showError("Error", "Gagal menolak kontrak");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const response = await fetch("/api/admin/contracts/export");

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Kontrak_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess("Berhasil", "Data berhasil diekspor");
    } catch (error) {
      console.error("Export error:", error);
      showError("Error", "Gagal mengekspor data");
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "permanently_rejected":
        return "bg-red-200 text-red-900";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1
              className={getThemeClasses(
                "text-3xl font-bold text-gray-900 dark:text-white",
                "!text-[#4c1d1d]"
              )}
            >
              Persetujuan Kontrak
            </h1>
            <p
              className={getThemeClasses(
                "text-gray-600 dark:text-gray-200 mt-2",
                "!text-[#6b7280]"
              )}
            >
              Memuat data...
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={getThemeClasses(
                  "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse",
                  "!bg-[#FFC1CC] !border-[#FFC1CC]/30"
                )}
              >
                <div
                  className={getThemeClasses(
                    "h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2",
                    "!bg-[#FFDEE9]"
                  )}
                ></div>
                <div
                  className={getThemeClasses(
                    "h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4",
                    "!bg-[#FFDEE9]"
                  )}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div
        className="space-y-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1
                className={getThemeClasses(
                  "text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300",
                  "!text-[#4c1d1d]"
                )}
              >
                Persetujuan Kontrak
              </h1>
              <p className="text-[#889063] dark:text-gray-200 mt-1 sm:mt-2 text-sm sm:text-base transition-colors duration-300">
                Review dan setujui tanda tangan kontrak user
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className={getThemeClasses(
                  "bg-[#324D3E]/10 dark:bg-[#324D3E]/20 hover:bg-[#324D3E]/20 dark:hover:bg-[#324D3E]/30 text-[#324D3E] dark:text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap",
                  "!text-[#4c1d1d] hover:!bg-[#FFDEE9]/30 !bg-[#FFC1CC]/10"
                )}
              >
                <FileSpreadsheet
                  className={`w-4 h-4 ${exportLoading ? "animate-pulse" : ""}`}
                />
                <span className="hidden sm:inline">
                  {exportLoading ? "Mengekspor..." : "Export XLSX"}
                </span>
              </button>
              <button
                onClick={fetchContracts}
                disabled={loading}
                className={getThemeClasses(
                  "bg-[#324D3E]/10 dark:bg-[#324D3E]/20 hover:bg-[#324D3E]/20 dark:hover:bg-[#324D3E]/30 text-[#324D3E] dark:text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap",
                  "!text-[#4c1d1d] hover:!bg-[#FFDEE9]/30"
                )}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="mb-6 flex space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={getThemeClasses(
              "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#324D3E] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-300",
              "!border-[#FFC1CC]/30 !text-[#4c1d1d] !bg-white"
            )}
          >
            <option value="pending">Menunggu Persetujuan</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="permanently_rejected">Ditolak Permanen</option>
            <option value="all">Semua Kontrak</option>
          </select>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-4">
          {contracts.map((contract) => (
            <motion.div
              key={contract.contractId}
              variants={itemVariants}
              className={getThemeClasses(
                "bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-300",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {contract.contractNumber}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {contract.productName}
                  </div>
                </div>
                <span
                  className={getThemeClasses(
                    `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                      contract.adminApprovalStatus
                    )}`,
                    "!text-[#4c1d1d]"
                  )}
                >
                  {contract.adminApprovalStatus
                    .replace("_", " ")
                    .toUpperCase()}
                </span>
              </div>

              {/* User Info */}
              <div className="mb-3 space-y-1">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">User:</span> {contract.user.fullName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {contract.user.email}
                </div>
                {contract.user.userCode && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    No Anggota: {contract.user.userCode}
                  </div>
                )}
              </div>

              {/* Contract Details */}
              <div className="mb-3 space-y-1">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Rp {contract.totalAmount.toLocaleString("id-ID")} ({contract.paymentType})
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Percobaan {contract.currentAttempt} dari {contract.maxAttempts}
                </div>
                {contract.lastSignature && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Diajukan: {new Date(contract.lastSignature.submittedAt).toLocaleDateString("id-ID")}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {contract.adminApprovalStatus === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSelectedContract({
                          contract,
                          action: "approve",
                        })
                      }
                      className={getThemeClasses(
                        "flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm",
                        "!bg-gradient-to-r !from-[#B5EAD7] !to-[#E6FFF0] !text-[#4c1d1d] !shadow-md"
                      )}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Setujui
                    </button>
                    <button
                      onClick={() =>
                        setSelectedContract({
                          contract,
                          action: "reject",
                        })
                      }
                      className={getThemeClasses(
                        "flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-sm",
                        "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFE4E8] !text-[#4c1d1d] !shadow-md"
                      )}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Tolak
                    </button>
                  </div>
                )}
                <button
                  onClick={() =>
                    setSelectedContract({ contract, action: "approve" })
                  }
                  className={getThemeClasses(
                    "w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm",
                    "!bg-gradient-to-r !from-[#C7CEEA] !to-[#EAF0FF] !text-[#4c1d1d] !shadow-md"
                  )}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Lihat Detail
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div
          className={getThemeClasses(
            "hidden md:block bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Detail Kontrak
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Informasi User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    No Anggota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status Tanda Tangan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {contracts.map((contract) => (
                  <tr
                    key={contract.contractId}
                    className={getThemeClasses(
                      "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200",
                      "hover:!bg-[#FFEEF0]"
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {contract.contractNumber}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {contract.productName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Rp {contract.totalAmount.toLocaleString("id-ID")} (
                          {contract.paymentType})
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(contract.createdAt).toLocaleDateString(
                            "id-ID"
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {contract.user.fullName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {contract.user.email}
                        </div>
                        {contract.user.phoneNumber && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {contract.user.phoneNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {contract.user.userCode || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          Percobaan {contract.currentAttempt} dari{" "}
                          {contract.maxAttempts}
                        </div>
                        {contract.lastSignature && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Diajukan:{" "}
                            {new Date(
                              contract.lastSignature.submittedAt
                            ).toLocaleDateString("id-ID")}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={getThemeClasses(
                          `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                            contract.adminApprovalStatus
                          )}`,
                          "!text-[#4c1d1d]"
                        )}
                      >
                        {contract.adminApprovalStatus
                          .replace("_", " ")
                          .toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {contract.adminApprovalStatus === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                setSelectedContract({
                                  contract,
                                  action: "approve",
                                })
                              }
                              className={getThemeClasses(
                                "inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 transition-all duration-200 shadow-sm hover:shadow-md",
                                "!bg-gradient-to-r !from-[#B5EAD7] !to-[#E6FFF0] !text-[#4c1d1d] !shadow-md"
                              )}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Setujui
                            </button>
                            <button
                              onClick={() =>
                                setSelectedContract({
                                  contract,
                                  action: "reject",
                                })
                              }
                              className={getThemeClasses(
                                "inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 transition-all duration-200 shadow-sm hover:shadow-md",
                                "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFE4E8] !text-[#4c1d1d] !shadow-md"
                              )}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Tolak
                            </button>
                          </>
                        )}
                        <button
                          onClick={() =>
                            setSelectedContract({ contract, action: "approve" })
                          }
                          className={getThemeClasses(
                            "inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all duration-200 shadow-sm hover:shadow-md",
                            "!bg-gradient-to-r !from-[#C7CEEA] !to-[#EAF0FF] !text-[#4c1d1d] !shadow-md"
                          )}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Lihat Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {contracts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                Tidak ada kontrak yang ditemukan untuk filter yang dipilih.
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      page === currentPage
                        ? "bg-[#324D3E] text-white shadow-md"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Approval/Rejection Modal */}
      {selectedContract && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={getThemeClasses(
              "bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col mt-2 sm:mt-0 transition-colors duration-300 border border-gray-200 dark:border-gray-700",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Fixed Header */}
            <div
              className={getThemeClasses(
                "flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700",
                "!border-[#FFC1CC]/30 !bg-white/95"
              )}
            >
              <div className="flex justify-between items-center">
                <h2
                  className={getThemeClasses(
                    "text-2xl font-bold text-gray-900 dark:text-white",
                    "!text-[#4c1d1d]"
                  )}
                >
                  Review Kontrak - {selectedContract.contract.contractNumber}
                </h2>
                <button
                  onClick={() => setSelectedContract(null)}
                  className={getThemeClasses(
                    "text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors",
                    "!text-[#6b7280] hover:!text-[#4c1d1d]"
                  )}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contract and User Info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Informasi Kontrak
                    </h3>
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <strong>Produk:</strong>{" "}
                        {selectedContract.contract.productName}
                      </div>
                      <div>
                        <strong>Jumlah:</strong> Rp{" "}
                        {selectedContract.contract.totalAmount.toLocaleString(
                          "id-ID"
                        )}
                      </div>
                      <div>
                        <strong>Tipe Pembayaran:</strong>{" "}
                        {selectedContract.contract.paymentType.toUpperCase()}
                      </div>
                      <div>
                        <strong>Percobaan:</strong>{" "}
                        {selectedContract.contract.currentAttempt} dari{" "}
                        {selectedContract.contract.maxAttempts}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Informasi User
                    </h3>
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <strong>Nama:</strong>{" "}
                        {selectedContract.contract.user.fullName}
                      </div>
                      <div>
                        <strong>No Anggota:</strong>{" "}
                        {selectedContract.contract.user.userCode || "-"}
                      </div>
                      <div>
                        <strong>Email:</strong>{" "}
                        {selectedContract.contract.user.email}
                      </div>
                      {selectedContract.contract.user.phoneNumber && (
                        <div>
                          <strong>Telepon:</strong>{" "}
                          {selectedContract.contract.user.phoneNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KTP Image */}
                  {selectedContract.contract.user.ktpImageUrl && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Gambar KTP
                      </h3>
                      <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 max-h-96">
                        <div className="p-2">
                          <Image
                            src={selectedContract.contract.user.ktpImageUrl}
                            alt="KTP Image"
                            width={600}
                            height={400}
                            className="w-full h-auto object-contain max-h-80 cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={() =>
                              window.open(
                                selectedContract.contract.user.ktpImageUrl,
                                "_blank"
                              )
                            }
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        Klik gambar untuk melihat ukuran penuh
                      </p>
                    </div>
                  )}
                </div>

                {/* Signature Review */}
                <div className="space-y-4">
                  {selectedContract.contract.lastSignature && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Tanda Tangan User
                      </h3>
                      <div className="border rounded-lg bg-white dark:bg-gray-800 max-h-80 overflow-hidden">
                        <div className="p-4">
                          <Image
                            src={
                              selectedContract.contract.lastSignature
                                .signatureData
                            }
                            alt="User Signature"
                            width={500}
                            height={250}
                            className="w-full h-auto object-contain max-h-60 cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={() =>
                              window.open(
                                selectedContract?.contract?.lastSignature
                                  ?.signatureData,
                                "_blank"
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          Diajukan:{" "}
                          {new Date(
                            selectedContract.contract.lastSignature.submittedAt
                          ).toLocaleString("id-ID")}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Klik tanda tangan untuk melihat ukuran penuh
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Previous Rejections */}
                  {selectedContract.contract.lastSignature?.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        Penolakan Sebelumnya
                      </h3>
                      <div className="text-sm text-red-800 dark:text-red-200 space-y-2">
                        <div>
                          <strong>Alasan:</strong>{" "}
                          {
                            selectedContract.contract.lastSignature
                              .rejectionReason
                          }
                        </div>
                        {selectedContract.contract.lastSignature.adminNotes && (
                          <div>
                            <strong>Catatan:</strong>{" "}
                            {selectedContract.contract.lastSignature.adminNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Form */}
                  {selectedContract.contract.adminApprovalStatus ===
                    "pending" && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                        {selectedContract.action === "approve"
                          ? "Setujui Kontrak"
                          : "Tolak Kontrak"}
                      </h3>

                      {selectedContract.action === "reject" && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Alasan Penolakan *
                            </label>
                            <select
                              value={rejectionReason}
                              onChange={(e) =>
                                setRejectionReason(e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#324D3E] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required
                            >
                              <option value="">Pilih alasan...</option>
                              <option value="Tanda tangan tidak sesuai KTP">
                                Tanda tangan tidak sesuai KTP
                              </option>
                              <option value="Tanda tangan terlalu tidak jelas">
                                Tanda tangan terlalu tidak jelas
                              </option>
                              <option value="Format tanda tangan tidak valid">
                                Format tanda tangan tidak valid
                              </option>
                              <option value="Kualitas gambar KTP terlalu buruk">
                                Kualitas gambar KTP terlalu buruk
                              </option>
                              <option value="Masalah dokumentasi lainnya">
                                Masalah dokumentasi lainnya
                              </option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Catatan Admin (Opsional)
                        </label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Catatan tambahan untuk user..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#324D3E] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>

                      <div className="flex space-x-3 mt-6">
                        <button
                          onClick={() => {
                            if (selectedContract.action === "approve") {
                              handleApproval(
                                selectedContract.contract.contractId
                              );
                            } else {
                              handleRejection(
                                selectedContract.contract.contractId
                              );
                            }
                          }}
                          disabled={
                            actionLoading ||
                            (selectedContract.action === "reject" &&
                              !rejectionReason)
                          }
                          className={getThemeClasses(
                            `flex-1 py-2 px-4 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                              selectedContract.action === "approve"
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }`,
                            selectedContract.action === "approve"
                              ? "!bg-gradient-to-r !from-[#B5EAD7] !to-[#E6FFF0] !text-[#4c1d1d] !shadow-md"
                              : "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFE4E8] !text-[#4c1d1d] !shadow-md"
                          )}
                        >
                          {actionLoading
                            ? "Memproses..."
                            : selectedContract.action === "approve"
                            ? "Setujui Kontrak"
                            : "Tolak Kontrak"}
                        </button>
                        <button
                          onClick={() => setSelectedContract(null)}
                          className={getThemeClasses(
                            "flex-1 py-2 px-4 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                            "!border-[#FFC1CC]/30 !text-[#4c1d1d] hover:!bg-[#FFDEE9]/30"
                          )}
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Alert Component */}
      <AlertComponent />
    </AdminLayout>
  );
}
