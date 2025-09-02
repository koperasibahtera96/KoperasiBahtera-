"use client";

import LandingHeader from "@/components/landing/LandingHeader";
import { useAlert } from "@/components/ui/Alert";
import { CicilanGroup, CicilanInstallmentWithPayment } from "@/types/cicilan";
import {
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Search,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Type alias for backward compatibility
type Installment = CicilanInstallmentWithPayment;

export default function CicilanPage() {
  const { data: _, status } = useSession();
  const router = useRouter();
  const [groupedInstallments, setGroupedInstallments] = useState<
    CicilanGroup[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "active" | "completed" | "overdue"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    installment: Installment | null;
  }>({ isOpen: false, installment: null });
  const { showSuccess, showError, AlertComponent } = useAlert();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchInstallments();
    }
  }, [status, router]);

  const fetchInstallments = async () => {
    try {
      const response = await fetch("/api/cicilan/user");
      if (response.ok) {
        const data = await response.json();
        setGroupedInstallments(data.cicilanGroups);
      } else {
        console.error("Failed to fetch installments");
      }
    } catch (error) {
      console.error("Error fetching installments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadProof = async (
    paymentId: string,
    file: File,
    description: string
  ) => {
    setUploadingProof(paymentId);
    try {
      // First upload the image
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("orderId", `payment-${paymentId}`);

      const uploadResponse = await fetch("/api/cicilan/upload-proof", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadData.success) {
        showError("Gagal Mengunggah Gambar", uploadData.error);
        return;
      }

      // Then submit the proof
      const submitResponse = await fetch(
        "/api/cicilan/submit-installment-proof",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentId,
            proofImageUrl: uploadData.imageUrl,
            proofDescription: description,
          }),
        }
      );

      const submitData = await submitResponse.json();

      if (submitData.success) {
        showSuccess("Berhasil!", "Bukti pembayaran berhasil dikirim!");
        await fetchInstallments(); // Refresh data
      } else {
        showError("Gagal Mengirim Bukti Pembayaran", submitData.error);
      }
    } catch (error) {
      console.error("Error uploading proof:", error);
      showError(
        "Kesalahan",
        "Terjadi kesalahan saat mengunggah bukti pembayaran"
      );
    } finally {
      setUploadingProof(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 text-[#324D3E] border border-[#324D3E]/20";
      case "submitted":
        return "bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border border-amber-200";
      case "approved":
        return "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200";
      case "rejected":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200";
      case "overdue":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200";
      case "not_created":
        return "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border border-blue-200";
      default:
        return "bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 text-[#324D3E] border border-[#324D3E]/20";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Belum Bayar";
      case "submitted":
        return "Menunggu Review";
      case "approved":
        return "Disetujui";
      case "rejected":
        return "Ditolak";
      case "overdue":
        return "Terlambat";
      case "not_created":
        return "Belum Tersedia";
      default:
        return status;
    }
  };

  const isOverdue = (dueDate: Date) => {
    return (
      new Date(dueDate) < new Date() &&
      new Date(dueDate).toDateString() !== new Date().toDateString()
    );
  };

  const canSubmitProof = (installment: Installment) => {
    // Don't show upload button if proof is already uploaded and pending review
    if (installment.proofImageUrl && installment.adminStatus === "pending") {
      return false;
    }

    return (
      (installment.status === "pending" || installment.status === "rejected") &&
      (installment as any).exists !== false
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate portfolio statistics
  const getPortfolioStats = () => {
    const totalInvestments = groupedInstallments.length;
    const totalAmount = groupedInstallments.reduce(
      (sum, group) => sum + group.totalAmount,
      0
    );
    const totalPaid = groupedInstallments.reduce((sum, group) => {
      return (
        sum +
        group.installments
          .filter((inst) => inst.status === "approved")
          .reduce((installSum, inst) => installSum + inst.amount, 0)
      );
    }, 0);

    const allInstallments = groupedInstallments.flatMap(
      (group) => group.installments
    );
    const overdueCount = allInstallments.filter(
      (inst) => isOverdue(inst.dueDate) && inst.status === "pending"
    ).length;
    const upcomingCount = allInstallments.filter(
      (inst) => !isOverdue(inst.dueDate) && inst.status === "pending"
    ).length;

    return {
      totalInvestments,
      totalAmount,
      totalPaid,
      overdueCount,
      upcomingCount,
    };
  };

  // Filter and search functionality
  const getFilteredInstallments = () => {
    let filtered = groupedInstallments.filter((group) => {
      if (searchTerm) {
        return group.productName
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      }
      return true;
    });

    if (filter !== "all") {
      filtered = filtered.filter((group) => {
        const approvedCount = group.installments.filter(
          (inst) => inst.status === "approved"
        ).length;
        const totalCount = group.installments.length;
        const hasOverdue = group.installments.some(
          (inst) => isOverdue(inst.dueDate) && inst.status === "pending"
        );

        switch (filter) {
          case "completed":
            return approvedCount === totalCount;
          case "overdue":
            return hasOverdue;
          case "active":
            return approvedCount < totalCount && !hasOverdue;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  if (status === "loading" || isLoading) {
    return (
      <>
        <LandingHeader />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#324D3E] mx-auto"></div>
            <p className="mt-4 text-gray-600 font-poppins">
              Memuat data cicilan...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AlertComponent />
      <LandingHeader />
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat py-16"
        style={{ backgroundImage: "url(/landing/hero-bg.png)" }}
      >
        <div className="max-w-7xl mx-auto px-4 mt-12">
          {/* Dashboard Overview */}
          {groupedInstallments.length > 0 && (
            <div className="mb-8">
              <PortfolioOverview stats={getPortfolioStats()} />
            </div>
          )}

          {/* Search and Filter Controls */}
          {groupedInstallments.length > 0 && (
            <div className="mb-6">
              <SearchAndFilter
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filter={filter}
                setFilter={setFilter}
                stats={getPortfolioStats()}
              />
            </div>
          )}

          {groupedInstallments.length === 0 ? (
            <div className="text-center py-12 bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl">
              <div className="text-[#324D3E] mb-4">
                <CreditCard size={64} />
              </div>
              <h3 className="text-xl font-semibold text-[#324D3E] mb-2 font-poppins">
                Belum ada cicilan investasi
              </h3>
              <p className="text-gray-600 mb-6 font-poppins">
                Mulai investasi dengan cicilan sekarang!
              </p>
              <button
                onClick={() => router.push("/#investasi")}
                className="px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
              >
                Lihat Paket Investasi
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {getFilteredInstallments()
                .sort(
                  (a, b) =>
                    new Date(b.installments[0]?.createdAt || 0).getTime() -
                    new Date(a.installments[0]?.createdAt || 0).getTime()
                )
                .map((group) => (
                  <div
                    key={group.cicilanOrderId}
                    className="bg-gradient-to-br from-[#FFFCE3]/95 to-white/95 backdrop-blur-sm rounded-3xl shadow-xl border-2 border-[#324D3E]/20 p-8 hover:shadow-2xl transition-all duration-300"
                  >
                    {/* Cicilan Header */}
                    <div className="mb-8">
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 gap-4">
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-[#324D3E] font-poppins">
                            {group.productName}
                          </h2>
                          <p className="text-sm text-gray-600 font-poppins">
                            Order ID: {group.cicilanOrderId}
                          </p>
                          <p className="text-lg font-semibold text-[#4C3D19] mt-1 font-poppins">
                            Total Investasi: Rp{" "}
                            {group.totalAmount.toLocaleString("id-ID")}
                          </p>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 font-poppins">
                            <span className="flex items-center gap-2">
                              <Calendar size={16} />
                              {group.paymentTerm === "monthly"
                                ? "Bulanan"
                                : group.paymentTerm === "quarterly"
                                ? "Triwulan"
                                : "Tahunan"}
                            </span>
                            <span className="flex items-center gap-2">
                              <DollarSign size={16} />
                              Rp{" "}
                              {group.installmentAmount.toLocaleString("id-ID")}
                              /cicilan
                            </span>
                          </div>
                        </div>
                        <div className="lg:text-right">
                          <div className="text-sm text-gray-600 font-poppins">
                            Progress Pembayaran
                          </div>
                          <div className="text-2xl font-bold text-[#324D3E] font-poppins">
                            {
                              group.installments.filter(
                                (i) => i.status === "approved"
                              ).length
                            }
                            /{group.installments.length}
                          </div>
                          <div className="w-full lg:w-32 bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] h-2 rounded-full"
                              style={{
                                width: `${
                                  (group.installments.filter(
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
                    </div>

                    {/* Individual Installment Cards */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-[#324D3E] mb-4 font-poppins">
                        Jadwal Angsuran ({group.installments.length} angsuran)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {group.installments
                          .sort(
                            (a, b) => a.installmentNumber - b.installmentNumber
                          )
                          .filter((installment) => {
                            // Show all paid/submitted/rejected installments
                            if (
                              installment.status === "approved" ||
                              installment.status === "submitted" ||
                              installment.status === "rejected"
                            ) {
                              return true;
                            }

                            // Show current pending installment (first unpaid)
                            if (
                              installment.status === "pending" &&
                              installment.exists !== false
                            ) {
                              const pendingInstallments =
                                group.installments.filter(
                                  (inst) =>
                                    inst.status === "pending" &&
                                    inst.exists !== false
                                );
                              return (
                                installment.installmentNumber ===
                                Math.min(
                                  ...pendingInstallments.map(
                                    (inst) => inst.installmentNumber
                                  )
                                )
                              );
                            }

                            // Show next placeholder installment (only one)
                            if (installment.status === "not_created") {
                              const notCreatedInstallments =
                                group.installments.filter(
                                  (inst) => inst.status === "not_created"
                                );
                              return (
                                installment.installmentNumber ===
                                Math.min(
                                  ...notCreatedInstallments.map(
                                    (inst) => inst.installmentNumber
                                  )
                                )
                              );
                            }

                            return false;
                          })
                          .map((installment) => {
                            const overdue = isOverdue(installment.dueDate);
                            // Determine effective status based on proof upload and admin review
                            let effectiveStatus = installment.status;

                            // If proof is uploaded but not reviewed, show as submitted
                            if (
                              installment.proofImageUrl &&
                              installment.adminStatus === "pending"
                            ) {
                              effectiveStatus = "submitted";
                            }
                            // If overdue and no proof uploaded, show as overdue
                            else if (
                              overdue &&
                              installment.status === "pending" &&
                              !installment.proofImageUrl
                            ) {
                              effectiveStatus = "overdue";
                            }

                            return (
                              <div
                                key={`${group.cicilanOrderId}-${installment.installmentNumber}`}
                                className={`border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl backdrop-blur-sm hover:scale-105 ${
                                  effectiveStatus === "approved"
                                    ? "bg-gradient-to-br from-emerald-50/90 to-green-50/90 border-emerald-200"
                                    : effectiveStatus === "submitted"
                                    ? "bg-gradient-to-br from-yellow-50/90 to-amber-50/90 border-amber-200"
                                    : effectiveStatus === "overdue"
                                    ? "bg-gradient-to-br from-red-50/90 to-rose-50/90 border-red-200"
                                    : effectiveStatus === "rejected"
                                    ? "bg-gradient-to-br from-red-50/90 to-rose-50/90 border-red-200"
                                    : "bg-gradient-to-br from-[#FFFCE3]/90 to-white/90 border-[#324D3E]/20"
                                }`}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <div className="text-lg font-bold text-[#324D3E] font-poppins">
                                      Angsuran #{installment.installmentNumber}
                                    </div>
                                    <div className="text-sm text-gray-600 font-poppins">
                                      Jatuh tempo:{" "}
                                      {installment.dueDate
                                        ? formatDate(installment.dueDate)
                                        : "Akan ditentukan"}
                                    </div>
                                  </div>
                                  <span
                                    className={`px-3 py-2 text-xs font-bold rounded-full ${getStatusColor(
                                      effectiveStatus
                                    )}`}
                                  >
                                    {getStatusText(effectiveStatus)}
                                  </span>
                                </div>

                                <div className="mb-4">
                                  <div className="text-2xl font-bold text-[#4C3D19] font-poppins">
                                    Rp{" "}
                                    {installment.amount.toLocaleString("id-ID")}
                                  </div>
                                </div>

                                {/* Status Details */}
                                {installment.paidDate && (
                                  <div className="text-sm text-green-600 mb-2 font-poppins">
                                    <span className="flex items-center gap-1">
                                      <CheckCircle size={14} />
                                      Dibayar:{" "}
                                      {formatDate(installment.paidDate)}
                                    </span>
                                  </div>
                                )}

                                {installment.submissionDate && (
                                  <div className="text-sm text-gray-600 mb-2 font-poppins">
                                    📤 Dikirim:{" "}
                                    {formatDate(installment.submissionDate)}
                                  </div>
                                )}

                                {installment.adminReviewDate && (
                                  <div className="text-sm text-gray-600 mb-2 font-poppins">
                                    👨‍💼 Review:{" "}
                                    {formatDate(installment.adminReviewDate)}
                                  </div>
                                )}

                                {installment.adminNotes && (
                                  <div className="bg-yellow-50/80 p-2 rounded-lg text-xs text-yellow-800 mb-3 font-poppins">
                                    <strong>Catatan Admin:</strong>{" "}
                                    {installment.adminNotes}
                                  </div>
                                )}

                                {/* Action Button */}
                                {canSubmitProof(installment) && (
                                  <button
                                    onClick={() =>
                                      setUploadModal({
                                        isOpen: true,
                                        installment,
                                      })
                                    }
                                    className="w-full px-3 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                    disabled={
                                      uploadingProof === installment._id
                                    }
                                  >
                                    <span className="flex items-center justify-center gap-2">
                                      <Upload size={16} />
                                      {uploadingProof === installment._id
                                        ? "Mengunggah..."
                                        : "Upload Bukti Bayar"}
                                    </span>
                                  </button>
                                )}

                                {/* Proof Image Preview */}
                                {installment.proofImageUrl && (
                                  <div className="mt-3">
                                    <div className="text-xs text-gray-600 mb-1 font-poppins">
                                      Bukti Pembayaran:
                                    </div>
                                    <Image
                                      src={installment.proofImageUrl}
                                      alt="Bukti Pembayaran"
                                      width={100}
                                      height={100}
                                      className="w-full h-20 object-cover rounded-xl border cursor-pointer hover:shadow-lg transition-all duration-300"
                                      onClick={() =>
                                        window.open(
                                          installment.proofImageUrl,
                                          "_blank"
                                        )
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Upload Modal - Rendered outside investment groups */}
        <InstallmentProofUploadModal
          isOpen={uploadModal.isOpen}
          installment={uploadModal.installment}
          onClose={() => setUploadModal({ isOpen: false, installment: null })}
          onUpload={handleUploadProof}
          isUploading={uploadingProof === uploadModal.installment?._id}
        />
      </div>
    </>
  );
}

interface InstallmentProofUploadModalProps {
  isOpen: boolean;
  installment: Installment | null;
  onClose: () => void;
  onUpload: (
    paymentId: string,
    file: File,
    description: string
  ) => Promise<void>;
  isUploading: boolean;
}

function InstallmentProofUploadModal({
  isOpen,
  installment,
  onClose,
  onUpload,
  isUploading,
}: InstallmentProofUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !installment) return;

    await onUpload(installment._id, file, description);
    onClose();
    setFile(null);
    setDescription("");
  };

  if (!isOpen || !installment) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border-2 border-[#324D3E]/20">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#324D3E] font-poppins">
              Upload Bukti Pembayaran #{installment.installmentNumber}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
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

          <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-3 rounded-2xl mb-4">
            <div className="text-sm text-gray-600 font-poppins">
              Angsuran #{installment.installmentNumber}
            </div>
            <div className="text-lg font-semibold text-[#324D3E] font-poppins">
              Rp {installment.amount.toLocaleString("id-ID")}
            </div>
            <div className="text-sm text-gray-600 font-poppins">
              Jatuh tempo:{" "}
              {installment.dueDate
                ? formatDate(installment.dueDate)
                : "Akan ditentukan"}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#324D3E] mb-2 font-poppins">
                Upload Gambar Bukti Pembayaran *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-xl p-2 font-poppins focus:border-[#324D3E] focus:ring-1 focus:ring-[#324D3E]"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#324D3E] mb-2 font-poppins">
                Keterangan (opsional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-2 h-20 font-poppins focus:border-[#324D3E] focus:ring-1 focus:ring-[#324D3E]"
                placeholder="Tambahkan keterangan tentang pembayaran..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 font-poppins font-medium transition-all duration-300"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!file || isUploading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full hover:shadow-lg disabled:opacity-50 font-poppins font-medium transition-all duration-300"
              >
                <span className="flex items-center justify-center gap-2">
                  <Upload size={16} />
                  {isUploading ? "Mengunggah..." : "Upload"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  function formatDate(dateString: Date) {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

// Portfolio Overview Component
interface PortfolioOverviewProps {
  stats: {
    totalInvestments: number;
    totalAmount: number;
    totalPaid: number;
    overdueCount: number;
    upcomingCount: number;
  };
}

function PortfolioOverview({ stats }: PortfolioOverviewProps) {
  const completionPercentage =
    stats.totalAmount > 0 ? (stats.totalPaid / stats.totalAmount) * 100 : 0;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
      <h2 className="text-2xl font-bold text-[#324D3E] font-poppins mb-6">
        Portfolio Overview
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Investments */}
        <div className="bg-gradient-to-br from-[#324D3E]/10 to-[#4C3D19]/10 rounded-2xl p-4">
          <div className="text-[#324D3E] mb-2">
            <TrendingUp size={32} />
          </div>
          <div className="text-2xl font-bold text-[#324D3E] font-poppins">
            {stats.totalInvestments}
          </div>
          <div className="text-sm text-gray-600 font-poppins">
            Total Investasi
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4">
          <div className="text-[#324D3E] mb-2">
            <DollarSign size={32} />
          </div>
          <div className="text-2xl font-bold text-[#324D3E] font-poppins">
            Rp {stats.totalAmount.toLocaleString("id-ID")}
          </div>
          <div className="text-sm text-gray-600 font-poppins">
            Nilai Investasi
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4">
          <div className="text-[#324D3E] mb-2">
            <CheckCircle size={32} />
          </div>
          <div className="text-2xl font-bold text-green-600 font-poppins">
            Rp {stats.totalPaid.toLocaleString("id-ID")}
          </div>
          <div className="text-sm text-gray-600 font-poppins">
            Sudah Dibayar
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(completionPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4">
          <div className="text-[#324D3E] mb-2">
            <Clock size={32} />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-bold text-red-600 font-poppins">
                {stats.overdueCount}
              </div>
              <div className="text-xs text-gray-600 font-poppins">
                Terlambat
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600 font-poppins">
                {stats.upcomingCount}
              </div>
              <div className="text-xs text-gray-600 font-poppins">
                Mendatang
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Search and Filter Component
interface SearchAndFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filter: "all" | "active" | "completed" | "overdue";
  setFilter: (filter: "all" | "active" | "completed" | "overdue") => void;
  stats: {
    totalInvestments: number;
    totalAmount: number;
    totalPaid: number;
    overdueCount: number;
    upcomingCount: number;
  };
}

function SearchAndFilter({
  searchTerm,
  setSearchTerm,
  filter,
  setFilter,
  stats,
}: SearchAndFilterProps) {
  const filters = [
    { key: "all", label: "Semua", count: stats.totalInvestments },
    {
      key: "active",
      label: "Aktif",
      count:
        stats.totalInvestments -
        Math.floor(
          (stats.totalPaid / stats.totalAmount) * stats.totalInvestments
        ),
    },
    {
      key: "overdue",
      label: "Terlambat",
      count: stats.overdueCount > 0 ? 1 : 0,
    },
    {
      key: "completed",
      label: "Selesai",
      count: Math.floor(
        (stats.totalPaid / stats.totalAmount) * stats.totalInvestments
      ),
    },
  ];

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari investasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#324D3E] focus:border-[#324D3E] font-poppins"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filterOption) => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key as any)}
              className={`px-4 py-2 rounded-full font-medium transition-all duration-300 font-poppins text-sm ${
                filter === filterOption.key
                  ? "bg-[#324D3E] text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filterOption.label} ({filterOption.count})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
