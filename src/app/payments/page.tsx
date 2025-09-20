"use client";

import LandingHeader from "@/components/landing/LandingHeader";
import { useAlert } from "@/components/ui/Alert";
import { DualSignatureInput } from "@/components/ui/dual-signature-input";
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
  Edit3,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Type alias for backward compatibility
type Installment = CicilanInstallmentWithPayment;

interface FullPaymentContract {
  contractId: string;
  productName: string;
  productId: string;
  totalAmount: number;
  paymentType: string;
  paymentUrl?: string;
  adminApprovalStatus: "pending" | "approved" | "rejected" | "permanently_rejected";
  adminApprovedDate?: Date | string;
  status: "draft" | "signed" | "approved" | "rejected" | "permanently_rejected" | "paid";
  contractNumber: string;
  contractDate: Date | string;
  paymentAllowed: boolean;
  paymentCompleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Contract retry information
  currentAttempt: number;
  maxAttempts: number;
  signatureAttemptsCount: number;
  hasEverSigned: boolean;
  isMaxRetryReached: boolean;
  isPermanentlyRejected: boolean;
  // Referral code for this investment
  referralCode?: string;
}

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groupedInstallments, setGroupedInstallments] = useState<
    CicilanGroup[]
  >([]);
  const [fullPaymentContracts, setFullPaymentContracts] = useState<FullPaymentContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "active" | "completed" | "overdue" | "full-payment" | "installment"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Function to toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    installment: Installment | null;
  }>({ isOpen: false, installment: null });
  const [retryModal, setRetryModal] = useState<{
    isOpen: boolean;
    contractId: string | null;
    contractType: 'installment' | 'full-payment' | null;
    productName: string | null;
  }>({ isOpen: false, contractId: null, contractType: null, productName: null });
  const { showSuccess, showError, AlertComponent } = useAlert();

  const handleFullPayment = async (contract: FullPaymentContract) => {
    try {
      // Call create-investment API to create Payment record and get Midtrans URL
      const response = await fetch("/api/payment/create-investment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: {
            name: contract.productName,
            price: contract.totalAmount,
          },
          user: {
            email: session?.user?.email,
          },
          contractId: contract.contractId,
          referralCode: contract.referralCode, // Include referral code if set
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.redirect_url) {
        // Open the Midtrans payment URL
        window.open(data.data.redirect_url, '_blank');
      } else {
        showError("Gagal", data.error || "Gagal membuat pembayaran");
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      showError("Kesalahan", "Terjadi kesalahan saat membuat pembayaran");
    }
  };

  const handleSetReferralCode = async (investmentId: string, referralCode: string) => {
    // Validate referral code format
    if (!referralCode || referralCode.length !== 6) {
      showError("Gagal", "Kode referral harus 6 karakter");
      return;
    }

    // Validate format (alphanumeric uppercase)
    const alphanumericPattern = /^[A-Z0-9]{6}$/;
    if (!alphanumericPattern.test(referralCode)) {
      showError("Gagal", "Kode referral harus 6 karakter huruf kapital dan angka");
      return;
    }

    // Save referral code to database
    try {
      const response = await fetch("/api/referral/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ investmentId, referralCode }),
      });

      const data = await response.json();

      if (!data.success) {
        showError("Gagal", data.error || "Kode referral tidak valid");
        return;
      }

      showSuccess("Berhasil!", `Kode referral ${referralCode} disimpan untuk investasi ini`);

      // Refresh data to show updated referral code
      await fetchInstallments();
    } catch (error) {
      console.error("Error saving referral code:", error);
      showError("Kesalahan", "Terjadi kesalahan saat menyimpan kode referral");
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchInstallments();
    }
  }, [status, router]);

  // Handle payment success/error/pending from Midtrans redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('paymentSuccess');
    const paymentError = urlParams.get('paymentError');
    const paymentPending = urlParams.get('paymentPending');

    if (paymentSuccess) {
      showSuccess("Pembayaran Berhasil!", "Cicilan Anda telah berhasil dibayar. Data sedang diperbarui...", { autoClose: false });
      // Refresh data after successful payment
      setTimeout(() => {
        fetchInstallments();
      }, 2000);

      // Clean URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (paymentError) {
      showError("Pembayaran Gagal", "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.");
      // Clean URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (paymentPending) {
      showSuccess("Pembayaran Pending", "Pembayaran Anda sedang diproses. Mohon tunggu konfirmasi.", { autoClose: false });
      // Clean URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fix scroll height calculation issues
  useEffect(() => {
    // Ensure proper scroll behavior and prevent layout issues
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflowX = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const fetchInstallments = async () => {
    try {
      const response = await fetch("/api/cicilan/user");
      if (response.ok) {
        const data = await response.json();
        setGroupedInstallments(data.cicilanGroups);
        setFullPaymentContracts(data.fullPaymentContracts || []);
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
            referralCode: groupedInstallments.find(g => g.cicilanOrderId === (uploadModal as any).installment?.cicilanOrderId)?.referralCode || "",
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

  // New function to handle Midtrans payment for installments
  const handlePayInstallment = async (paymentId: string, installmentNumber: number) => {
    try {
      setUploadingProof(paymentId); // Reuse loading state

      const response = await fetch("/api/payment/create-installment-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentId }),
      });

      const data = await response.json();

      if (data.success) {
        // Open Midtrans payment page in new tab
        window.open(data.data.paymentUrl, "_blank");
        showSuccess(
          "Pembayaran Dibuka!",
          `Halaman pembayaran cicilan ${installmentNumber} telah dibuka di tab baru. Selesaikan pembayaran untuk melanjutkan.`
        );
      } else {
        showError("Gagal Membuat Pembayaran", data.error);
      }
    } catch (error) {
      console.error("Error creating installment payment:", error);
      showError(
        "Kesalahan",
        "Terjadi kesalahan saat membuat pembayaran"
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
      case "completed":
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
      case "completed":
        return "Selesai";
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

  const isOverdue = (dueDate: Date | string) => {
    return (
      new Date(dueDate) < new Date() &&
      new Date(dueDate).toDateString() !== new Date().toDateString()
    );
  };

  const canPayInstallment = (installment: Installment, group?: any) => {
    // Don't allow payment if contract is permanently rejected
    if (group?.isPermanentlyRejected) {
      return false;
    }

    // Don't allow payment if contract hasn't been signed yet
    if (!group?.hasEverSigned) {
      return false;
    }

    // Only allow payment for pending installments that exist
    return (
      installment.status === "pending" &&
      (installment as any).exists !== false
    );
  };

  // Keep old function for backward compatibility with existing proof uploads
  const canSubmitProof = (installment: Installment, group?: any) => {
    // This function is now only for old manual upload system
    // New cicilan should use canPayInstallment instead

    // Don't allow upload if contract is permanently rejected
    if (group?.isPermanentlyRejected) {
      return false;
    }

    // Don't allow upload if contract hasn't been signed yet
    if (!group?.hasEverSigned) {
      return false;
    }

    // Only show for old cicilan orders that still use manual upload
    // New orders will use Midtrans payment
    const isOldOrder = installment.orderId && installment.orderId.startsWith("CIC-CONTRACT-");

    if (!isOldOrder) {
      return false; // New orders use Midtrans payment
    }

    // Don't show upload button if proof is already uploaded and pending review
    if (installment.proofImageUrl && installment.adminStatus === "pending") {
      return false;
    }

    return (
      (installment.status === "pending" || installment.status === "rejected") &&
      (installment as any).exists !== false
    );
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate portfolio statistics
  const getPortfolioStats = () => {
    const totalInvestments = groupedInstallments.length + fullPaymentContracts.length;
    const totalAmount = groupedInstallments.reduce(
      (sum, group) => sum + group.totalAmount,
      0
    ) + fullPaymentContracts.reduce((sum, contract) => sum + contract.totalAmount, 0);
    const totalPaid = groupedInstallments.reduce((sum, group) => {
      return (
        sum +
        group.installments
          .filter((inst) => inst.status === "approved" || inst.status === "completed")
          .reduce((installSum, inst) => installSum + inst.amount, 0)
      );
    }, 0) + fullPaymentContracts.reduce((sum, contract) =>
      sum + (contract.paymentCompleted ? contract.totalAmount : 0), 0);

    const allInstallments = groupedInstallments.flatMap(
      (group) => group.installments
    );
    const overdueCount = allInstallments.filter(
      (inst) =>
        inst.dueDate && isOverdue(inst.dueDate) && inst.status === "pending"
    ).length;
    const upcomingCount = allInstallments.filter(
      (inst) =>
        inst.dueDate && !isOverdue(inst.dueDate) && inst.status === "pending"
    ).length + fullPaymentContracts.filter(contract => !contract.paymentCompleted).length;

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

    if (filter !== "all" && filter !== "full-payment") {
      filtered = filtered.filter((group) => {
        const approvedCount = group.installments.filter(
          (inst) => inst.status === "approved" || inst.status === "completed"
        ).length;
        const totalCount = group.installments.length;
        const hasOverdue = group.installments.some(
          (inst) =>
            inst.dueDate && isOverdue(inst.dueDate) && inst.status === "pending"
        );

        switch (filter) {
          case "completed":
            return approvedCount === totalCount;
          case "overdue":
            return hasOverdue;
          case "active":
            return approvedCount < totalCount && !hasOverdue;
          case "installment":
            return true; // Show all installments when installment filter is selected
          default:
            return true;
        }
      });
    } else if (filter === "full-payment") {
      // Hide installments when full-payment filter is selected
      filtered = [];
    }

    return filtered;
  };

  // Filter full payment contracts
  const getFilteredFullPayments = (): FullPaymentContract[] => {
    let filtered = fullPaymentContracts.filter((contract) => {
      if (searchTerm) {
        return contract.productName
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      }
      return true;
    });

    if (filter !== "all" && filter !== "installment") {
      filtered = filtered.filter((contract) => {
        switch (filter) {
          case "completed":
            return contract.paymentCompleted;
          case "overdue":
            return false; // Full payments don't have overdue concept
          case "active":
            return !contract.paymentCompleted;
          case "full-payment":
            return true; // Show all full payments when full-payment filter is selected
          default:
            return true;
        }
      });
    } else if (filter === "installment") {
      // Hide full payments when installment filter is selected
      filtered = [];
    }

    return filtered;
  };

  // Combine and sort all contracts by creation date
  const getAllSortedContracts = () => {
    const installments = getFilteredInstallments();
    const fullPayments = getFilteredFullPayments();

    // Create a combined array with type indicators
    const combined = [
      ...installments.map(item => ({ ...item, type: 'installment' as const })),
      ...fullPayments.map(item => ({ ...item, type: 'fullPayment' as const }))
    ];

    // Sort by creation date (newest first)
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  if (status === "loading" || isLoading) {
    return (
      <>
        <LandingHeader />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#324D3E] mx-auto"></div>
            <p className="mt-4 text-gray-600 font-poppins">
              Memuat data pembayaran...
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
      <div className="relative py-16" style={{ minHeight: '100vh' }}>
        {/* Blurred background image */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: "url(/landing/hero-bg.png)",
            filter: "blur(8px)",
            transform: "scale(1.1)" // Prevent blur edge artifacts
          }}
        ></div>
        {/* Background overlay */}
        <div className="fixed inset-0 bg-black/30 -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 mt-12 relative z-10">
          {/* Dashboard Overview */}
          {(groupedInstallments.length > 0 || fullPaymentContracts.length > 0) && (
            <div className="mb-8">
              <PortfolioOverview stats={getPortfolioStats()} />
            </div>
          )}

          {/* Search and Filter Controls */}
          {(groupedInstallments.length > 0 || fullPaymentContracts.length > 0) && (
            <div className="mb-6">
              <SearchAndFilter
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filter={filter}
                setFilter={setFilter}
                stats={getPortfolioStats()}
                groupedInstallments={groupedInstallments}
                fullPaymentContracts={fullPaymentContracts}
              />
            </div>
          )}

          {groupedInstallments.length === 0 && fullPaymentContracts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-lg">
              <div className="flex justify-center text-[#324D3E] mb-4">
                <CreditCard size={64} />
              </div>
              <h3 className="text-xl font-semibold text-[#324D3E] mb-2 font-poppins">
                Belum ada pembayaran investasi
              </h3>
              <p className="text-gray-600 mb-6 font-poppins">
                Mulai investasi sekarang!
              </p>
              <button
                onClick={() => router.push("/#produk")}
                className="px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
              >
                Lihat Paket Investasi
              </button>
            </div>
          ) : (
            <div className="space-y-12 pb-16">
              {getAllSortedContracts().map((item) => {
                if (item.type === 'installment') {
                  const group = item;
                  return (
                    <div
                      key={group.cicilanOrderId}
                      className="bg-gradient-to-br from-[#FFFCE3] to-white rounded-3xl shadow-lg border-2 border-[#324D3E]/20 p-8 hover:shadow-xl transition-shadow duration-200"
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
                            <span className="text-sm text-gray-500 ml-2 font-normal">
                              • Dibuat: {new Date(group.createdAt).toLocaleDateString('id-ID')} {new Date(group.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
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
                                (i) => i.status === "approved" || i.status === "completed"
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
                                    (i) => i.status === "approved" || i.status === "completed"
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

                    {/* Contract Approval Status */}
                    {group.contractApprovalStatus === "pending" && (
                      <>
                        {!group.hasEverSigned ? (
                          <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-200 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 rounded-full p-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-blue-800 font-poppins">
                                  Kontrak Belum Ditandatangani
                                </h4>
                                <p className="text-sm text-blue-700 font-poppins">
                                  Anda perlu menandatangani kontrak terlebih dahulu sebelum melakukan pembayaran.
                                  <button
                                    onClick={() => router.push(`/contract/${group.contractId}`)}
                                    className="text-blue-800 underline hover:text-blue-900 font-semibold ml-1"
                                  >
                                    Tandatangani di sini
                                  </button>
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-4 border border-amber-200 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="bg-amber-100 rounded-full p-2">
                                <Clock className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-amber-800 font-poppins">
                                  Kontrak Menunggu Persetujuan Admin
                                </h4>
                                <p className="text-sm text-amber-700 font-poppins">
                                  Anda sudah dapat melakukan pembayaran cicilan, namun kontrak masih menunggu review admin
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {group.contractApprovalStatus === "approved" && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 rounded-full p-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-green-800 font-poppins">
                              Kontrak Telah Disetujui Admin
                            </h4>
                            <p className="text-sm text-green-700 font-poppins">
                              Disetujui pada: {group.contractApprovedDate ? formatDate(group.contractApprovedDate) : "Tidak diketahui"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {group.contractApprovalStatus === "rejected" && (
                      <>
                        {group.isPermanentlyRejected ? (
                          <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border border-red-200 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="bg-red-100 rounded-full p-2">
                                <Clock className="w-5 h-5 text-red-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-red-800 font-poppins">
                                  Kontrak Ditolak Permanen
                                </h4>
                                <p className="text-sm text-red-700 font-poppins">
                                  Maksimal percobaan kontrak telah tercapai ({group.maxAttempts || 3}x).
                                  Silakan hubungi admin untuk bantuan lebih lanjut.
                                </p>
                                <p className="text-xs text-red-600 font-poppins mt-1">
                                  Percobaan: {group.currentAttempt || 0}/{group.maxAttempts || 3}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : group.isMaxRetryReached ? (
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="bg-orange-100 rounded-full p-2">
                                <Clock className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-orange-800 font-poppins">
                                  Kontrak Memerlukan Review
                                </h4>
                                <p className="text-sm text-orange-700 font-poppins">
                                  Percobaan kontrak: {group.currentAttempt || 0}/{group.maxAttempts || 3}.
                                  Silakan hubungi admin untuk bantuan.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border border-red-200 mb-6">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="bg-red-100 rounded-full p-2">
                                  <Clock className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-red-800 font-poppins">
                                    Kontrak Ditolak Admin
                                  </h4>
                                  <p className="text-sm text-red-700 font-poppins">
                                    Anda dapat mengajukan ulang kontrak dengan menandatangani ulang.
                                    Percobaan: {group.currentAttempt || 0}/{group.maxAttempts || 3}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => setRetryModal({
                                  isOpen: true,
                                  contractId: group.contractId || group.cicilanOrderId,
                                  contractType: 'installment',
                                  productName: group.productName
                                })}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium whitespace-nowrap"
                              >
                                <span className="flex items-center gap-2">
                                  <Edit3 size={16} />
                                  Ajukan Ulang
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Referral Code Section - Only show if contract is signed */}
                    {group.hasEverSigned && (
                      <ReferralCodeInput
                        investmentId={group.cicilanOrderId}
                        currentReferralCode={(group as any).referralCode}
                        onSetReferralCode={handleSetReferralCode}
                        hasPayments={group.installments.some(inst => inst.status === "approved" || inst.status === "completed")}
                      />
                    )}

                    {/* Individual Installment Cards */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-[#324D3E] mb-4 font-poppins">
                        Jadwal Angsuran ({group.installments.length} angsuran)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {(() => {
                          // Filter installments first
                          const filteredInstallments = group.installments.filter((installment) => {
                            // Show all paid/submitted/rejected installments
                            if (
                              installment.status === "approved" ||
                              installment.status === "completed" ||
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
                          });

                          // Sort installments: unpaid first (ascending), then paid ones at the end (descending)
                          const sortedInstallments = filteredInstallments.sort((a, b) => {
                            const aIsPaid = a.status === "approved" || a.status === "completed";
                            const bIsPaid = b.status === "approved" || b.status === "completed";

                            // If payment status is different, unpaid comes first
                            if (aIsPaid !== bIsPaid) {
                              return aIsPaid ? 1 : -1;
                            }

                            // If same payment status
                            if (aIsPaid && bIsPaid) {
                              // For paid installments, sort in descending order (newest first)
                              return b.installmentNumber - a.installmentNumber;
                            } else {
                              // For unpaid installments, sort in ascending order (oldest first)
                              return a.installmentNumber - b.installmentNumber;
                            }
                          });

                          // Determine if we should show limited or all installments
                          const isExpanded = expandedGroups.has(group.cicilanOrderId);
                          const maxVisibleCards = 6; // Show max 6 cards initially
                          const shouldShowLimitedView = sortedInstallments.length > maxVisibleCards && !isExpanded;
                          const visibleInstallments = shouldShowLimitedView
                            ? sortedInstallments.slice(0, maxVisibleCards)
                            : sortedInstallments;

                          return (
                            <>
                              {visibleInstallments.map((installment) => {
                            const overdue = installment.dueDate
                              ? isOverdue(installment.dueDate)
                              : false;
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
                                className={`border-2 rounded-2xl p-6 transition-shadow duration-200 hover:shadow-lg ${
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

                                {installment.submissionDate && installment.orderId && installment.orderId.startsWith("CIC-CONTRACT-") && (
                                  <div className="text-sm text-gray-600 mb-2 font-poppins">
                                    📤 Dikirim:{" "}
                                    {formatDate(installment.submissionDate)}
                                  </div>
                                )}


                                {installment.adminNotes && installment.orderId && installment.orderId.startsWith("CIC-CONTRACT-") && (
                                  <div className="bg-yellow-50/80 p-2 rounded-lg text-xs text-yellow-800 mb-3 font-poppins">
                                    <strong>Catatan Admin:</strong>{" "}
                                    {installment.adminNotes}
                                  </div>
                                )}

                                {/* Action Buttons */}
                                {canPayInstallment(installment, group) && (
                                  <button
                                    onClick={() =>
                                      handlePayInstallment(installment._id!, installment.installmentNumber!)
                                    }
                                    className="w-full px-3 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                    disabled={
                                      uploadingProof === installment._id
                                    }
                                  >
                                    <span className="flex items-center justify-center gap-2">
                                      <CreditCard size={16} />
                                      {uploadingProof === installment._id
                                        ? "Membuat Pembayaran..."
                                        : "Bayar Sekarang"}
                                    </span>
                                  </button>
                                )}

                                {/* Old upload button for backward compatibility */}
                                {canSubmitProof(installment, group) && (
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

                              {/* Lihat Semua Button */}
                              {shouldShowLimitedView && (
                                <div className="col-span-full flex justify-center mt-6">
                                  <button
                                    onClick={() => toggleGroupExpansion(group.cicilanOrderId)}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                  >
                                    <span>Lihat Semua ({sortedInstallments.length - maxVisibleCards} lainnya)</span>
                                    <svg
                                      className="w-4 h-4 transform transition-transform duration-200"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </div>
                              )}

                              {/* Show Less Button */}
                              {isExpanded && sortedInstallments.length > maxVisibleCards && (
                                <div className="col-span-full flex justify-center mt-6">
                                  <button
                                    onClick={() => toggleGroupExpansion(group.cicilanOrderId)}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                  >
                                    <span>Lihat Lebih Sedikit</span>
                                    <svg
                                      className="w-4 h-4 transform rotate-180 transition-transform duration-200"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  );
                } else {
                  // Full Payment Contract
                  const contract = item;
                  return (
                    <div
                      key={contract.contractId}
                      className={`bg-gradient-to-br rounded-3xl shadow-lg border-2 p-8 transition-shadow duration-200 ${
                        contract.isPermanentlyRejected
                          ? 'from-gray-50 to-gray-100 border-gray-300/50 opacity-75'
                          : 'from-[#FFFCE3] to-white border-[#324D3E]/20 hover:shadow-xl'
                      }`}
                    >
                      {/* Full Payment Header */}
                    <div className="mb-8">
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 gap-4">
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-[#324D3E] font-poppins">
                            {contract.productName}
                          </h2>
                          <p className="text-sm text-gray-600 font-poppins">
                            Contract ID: {contract.contractId}
                          </p>
                          <p className="text-lg font-semibold text-[#4C3D19] mt-1 font-poppins">
                            Total Investasi: Rp{" "}
                            {contract.totalAmount.toLocaleString("id-ID")}
                            <span className="text-sm text-gray-500 ml-2 font-normal">
                              • Dibuat: {new Date(contract.createdAt).toLocaleDateString('id-ID')} {new Date(contract.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 font-poppins">
                            <span className="flex items-center gap-2">
                              <Calendar size={16} />
                              Pembayaran Penuh
                            </span>
                            <span className="flex items-center gap-2">
                              <DollarSign size={16} />
                              Rp{" "}
                              {contract.totalAmount.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                        <div className="lg:text-right">
                          <div className="text-sm text-gray-600 font-poppins">
                            Status Pembayaran
                          </div>
                          <div className="text-2xl font-bold text-[#324D3E] font-poppins">
                            {contract.paymentCompleted ? "Selesai" : "Belum Bayar"}
                          </div>
                          <div className="w-full lg:w-32 bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] h-2 rounded-full"
                              style={{
                                width: contract.paymentCompleted ? "100%" : "0%",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contract Approval Status */}
                    {contract.adminApprovalStatus === "pending" && (
                      <>
                        {!contract.hasEverSigned ? (
                          <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-200 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 rounded-full p-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-blue-800 font-poppins">
                                  Kontrak Belum Ditandatangani
                                </h4>
                                <p className="text-sm text-blue-700 font-poppins">
                                  Anda perlu menandatangani kontrak terlebih dahulu sebelum melakukan pembayaran.
                                  <button
                                    onClick={() => router.push(`/contract/${contract.contractId}`)}
                                    className="text-blue-800 underline hover:text-blue-900 font-semibold ml-1"
                                  >
                                    Tandatangani di sini
                                  </button>
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-4 border border-amber-200 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="bg-amber-100 rounded-full p-2">
                                <Clock className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-amber-800 font-poppins">
                                  Kontrak Menunggu Persetujuan Admin
                                </h4>
                                <p className="text-sm text-amber-700 font-poppins">
                                  Anda sudah dapat melakukan pembayaran sekarang
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {contract.adminApprovalStatus === "approved" && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 rounded-full p-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-green-800 font-poppins">
                              Kontrak Telah Disetujui Admin
                            </h4>
                            <p className="text-sm text-green-700 font-poppins">
                              Disetujui pada: {contract.adminApprovedDate ? formatDate(contract.adminApprovedDate) : "Tidak diketahui"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {contract.adminApprovalStatus === "rejected" && (
                      <>
                        {contract.isPermanentlyRejected ? (
                          <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border border-red-200 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="bg-red-100 rounded-full p-2">
                                <Clock className="w-5 h-5 text-red-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-red-800 font-poppins">
                                  Kontrak Ditolak Permanen
                                </h4>
                                <p className="text-sm text-red-700 font-poppins">
                                  Maksimal percobaan kontrak telah tercapai ({contract.maxAttempts || 3}x).
                                  Silakan hubungi admin untuk bantuan lebih lanjut.
                                </p>
                                <p className="text-xs text-red-600 font-poppins mt-1">
                                  Percobaan: {contract.currentAttempt || 0}/{contract.maxAttempts || 3}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : contract.isMaxRetryReached ? (
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="bg-orange-100 rounded-full p-2">
                                <Clock className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-orange-800 font-poppins">
                                  Kontrak Memerlukan Review
                                </h4>
                                <p className="text-sm text-orange-700 font-poppins">
                                  Percobaan kontrak: {contract.currentAttempt || 0}/{contract.maxAttempts || 3}.
                                  Silakan hubungi admin untuk bantuan.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border border-red-200 mb-6">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="bg-red-100 rounded-full p-2">
                                  <Clock className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-red-800 font-poppins">
                                    Kontrak Ditolak Admin
                                  </h4>
                                  <p className="text-sm text-red-700 font-poppins">
                                    Anda dapat mengajukan ulang kontrak dengan menandatangani ulang.
                                    Percobaan: {contract.currentAttempt || 0}/{contract.maxAttempts || 3}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => setRetryModal({
                                  isOpen: true,
                                  contractId: contract.contractId,
                                  contractType: 'full-payment',
                                  productName: contract.productName
                                })}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium whitespace-nowrap"
                              >
                                <span className="flex items-center gap-2">
                                  <Edit3 size={16} />
                                  Ajukan Ulang
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Referral Code Section - Only show if contract is signed */}
                    {contract.hasEverSigned && (
                      <ReferralCodeInput
                        investmentId={contract.contractId}
                        currentReferralCode={(contract as any).referralCode}
                        onSetReferralCode={handleSetReferralCode}
                        hasPayments={contract.paymentCompleted}
                      />
                    )}

                    {/* Payment Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-[#324D3E] mb-4 font-poppins">
                        Pembayaran Penuh
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className={`border-2 rounded-2xl p-6 transition-shadow duration-200 hover:shadow-lg ${
                          contract.paymentCompleted
                            ? "bg-gradient-to-br from-emerald-50/90 to-green-50/90 border-emerald-200"
                            : "bg-gradient-to-br from-[#FFFCE3]/90 to-white/90 border-[#324D3E]/20"
                        }`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="text-lg font-bold text-[#324D3E] font-poppins">
                                Pembayaran Total
                              </div>
                              <div className="text-sm text-gray-600 font-poppins">
                                Dibuat: {formatDate(contract.createdAt)}
                              </div>
                            </div>
                            <span className={`px-3 py-2 text-xs font-bold rounded-full ${
                              contract.paymentCompleted
                                ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200"
                                : "bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 text-[#324D3E] border border-[#324D3E]/20"
                            }`}>
                              {contract.paymentCompleted ? "Selesai" : "Belum Bayar"}
                            </span>
                          </div>

                          <div className="mb-4">
                            <div className="text-2xl font-bold text-[#4C3D19] font-poppins">
                              Rp{" "}
                              {contract.totalAmount.toLocaleString("id-ID")}
                            </div>
                          </div>

                          {/* Payment Status Details */}
                          {contract.paymentCompleted && (
                            <div className="text-sm text-green-600 mb-2 font-poppins">
                              <span className="flex items-center gap-1">
                                <CheckCircle size={14} />
                                Pembayaran Selesai
                              </span>
                            </div>
                          )}

                          {/* Action Button */}
                          {!contract.paymentCompleted && !contract.isPermanentlyRejected && contract.hasEverSigned && (
                            <button
                              onClick={() => handleFullPayment(contract)}
                              className="w-full px-3 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                            >
                              <span className="flex items-center justify-center gap-2">
                                <CreditCard size={16} />
                                Bayar Sekarang
                              </span>
                            </button>
                          )}

                          {/* Disabled Payment Button for Permanently Rejected Contracts */}
                          {!contract.paymentCompleted && (contract.isPermanentlyRejected || !contract.hasEverSigned) && (
                            <button
                              disabled
                              className="w-full px-3 py-2 bg-gray-400 text-gray-200 text-sm rounded-full cursor-not-allowed font-poppins font-medium opacity-60"
                            >
                              <span className="flex items-center justify-center gap-2">
                                <CreditCard size={16} />
                                {contract.isPermanentlyRejected ? 'Pembayaran Dinonaktifkan' : 'Kontrak Belum Ditandatangani'}
                              </span>
                            </button>
                          )}

                        </div>
                      </div>
                    </div>
                  </div>
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* Retry Signature Modal */}
        <ContractRetrySignatureModal
          isOpen={retryModal.isOpen}
          contractId={retryModal.contractId}
          contractType={retryModal.contractType}
          productName={retryModal.productName}
          onClose={() => setRetryModal({ isOpen: false, contractId: null, contractType: null, productName: null })}
          onSuccess={() => {
            setRetryModal({ isOpen: false, contractId: null, contractType: null, productName: null });
            fetchInstallments(); // Refresh data
          }}
        />

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

interface ContractRetrySignatureModalProps {
  isOpen: boolean;
  contractId: string | null;
  contractType: 'installment' | 'full-payment' | null;
  productName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ContractRetrySignatureModal({
  isOpen,
  contractId,
  contractType,
  productName,
  onClose,
  onSuccess,
}: ContractRetrySignatureModalProps) {
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [retryData, setRetryData] = useState<{
    currentAttempt: number;
    maxAttempts: number;
    canRetry: boolean;
    lastRejectionReason?: string;
  } | null>(null);
  const { showSuccess, showError } = useAlert();

  useEffect(() => {
    if (isOpen && contractId) {
      fetchRetryData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contractId]);

  const fetchRetryData = async () => {
    try {
      const response = await fetch(`/api/contract/${contractId}/retry-status`);
      if (response.ok) {
        const data = await response.json();
        setRetryData(data);
      }
    } catch (error) {
      console.error('Error fetching retry data:', error);
    }
  };

  const handleSignatureChange = (newSignatureData: string | null) => {
    setSignatureData(newSignatureData);
  };

  const handleRetrySubmit = async () => {
    if (!signatureData || !contractId) {
      showError("Tanda Tangan Diperlukan", "Silakan buat tanda tangan Anda");
      return;
    }

    setSigning(true);
    try {
      const response = await fetch(`/api/contract/${contractId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signatureData: signatureData,
          contractType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess("Berhasil!", "Kontrak berhasil diajukan ulang dan sedang menunggu review admin");
        onSuccess();
      } else {
        showError("Gagal Mengajukan Ulang", data.error || "Terjadi kesalahan saat mengajukan ulang kontrak");
      }
    } catch (error) {
      console.error('Error submitting retry:', error);
      showError("Kesalahan", "Terjadi kesalahan saat mengajukan ulang kontrak");
    } finally {
      setSigning(false);
    }
  };


  if (!isOpen) return null;

  const canRetry = retryData?.canRetry !== false && (retryData?.currentAttempt || 0) < (retryData?.maxAttempts || 3);

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-[#324D3E]/20">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#324D3E] font-poppins">
              Ajukan Ulang Kontrak
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Contract Info */}
          <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-4 rounded-2xl mb-6">
            <h4 className="font-semibold text-[#324D3E] font-poppins mb-2">Informasi Kontrak</h4>
            <p className="text-gray-700 font-poppins"><strong>Produk:</strong> {productName}</p>
            <p className="text-gray-700 font-poppins"><strong>ID Kontrak:</strong> {contractId}</p>
            <p className="text-gray-700 font-poppins"><strong>Jenis:</strong> {contractType === 'installment' ? 'Cicilan' : 'Pembayaran Penuh'}</p>
          </div>

          {/* Retry Status */}
          {retryData && (
            <div className="bg-blue-50 p-4 rounded-2xl mb-6 border border-blue-200">
              <h4 className="font-semibold text-blue-800 font-poppins mb-2">Status Pengajuan Ulang</h4>
              <p className="text-blue-700 font-poppins text-sm">
                <strong>Percobaan:</strong> {retryData.currentAttempt || 0} dari {retryData.maxAttempts || 3}
              </p>
              {retryData.lastRejectionReason && (
                <p className="text-red-700 font-poppins text-sm mt-2">
                  <strong>Alasan penolakan terakhir:</strong> {retryData.lastRejectionReason}
                </p>
              )}
            </div>
          )}

          {!canRetry ? (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-center">
              <p className="text-red-800 font-poppins font-semibold">
                Maksimal percobaan pengajuan ulang telah tercapai (3 kali)
              </p>
              <p className="text-red-700 font-poppins text-sm mt-2">
                Silakan hubungi admin untuk bantuan lebih lanjut
              </p>
            </div>
          ) : (
            <>
              {/* Instructions */}
              <div className="mb-6">
                <h4 className="font-semibold text-[#324D3E] font-poppins mb-3">
                  Instruksi Tanda Tangan Ulang
                </h4>
                <ul className="list-disc list-inside text-gray-700 font-poppins text-sm space-y-1">
                  <li>Buat tanda tangan Anda di area yang disediakan</li>
                  <li>Pastikan tanda tangan jelas dan sesuai dengan identitas Anda</li>
                  <li>Tanda tangan yang sama dengan pengajuan sebelumnya lebih direkomendasikan</li>
                  <li>Kontrak akan direview ulang oleh admin setelah pengajuan</li>
                </ul>
              </div>

              {/* Signature Input */}
              <div className="mb-6">
                <DualSignatureInput
                  onSignatureChange={handleSignatureChange}
                  label="Tanda Tangan Digital"
                  required
                  disabled={signing}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 font-poppins font-medium transition-all duration-300"
                >
                  Batal
                </button>
                <button
                  onClick={handleRetrySubmit}
                  disabled={signing || !signatureData}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full hover:shadow-lg disabled:opacity-50 font-poppins font-medium transition-all duration-300"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Edit3 size={16} />
                    {signing ? "Mengajukan..." : "Ajukan Ulang"}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
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

    await onUpload(installment._id!, file, description);
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

  function formatDate(dateString: Date | string) {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

// Referral Code Input Component
interface ReferralCodeInputProps {
  investmentId: string;
  currentReferralCode: string | undefined;
  onSetReferralCode: (investmentId: string, code: string) => void;
  hasPayments?: boolean; // New prop to check if user has made payments
}

function ReferralCodeInput({ investmentId, currentReferralCode, onSetReferralCode, hasPayments = false }: ReferralCodeInputProps) {
  const [referralCode, setReferralCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCode.trim() || hasPayments) return;

    setIsSubmitting(true);
    try {
      await onSetReferralCode(investmentId, referralCode);
      setReferralCode("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show referral code if one was used
  if (currentReferralCode) {
    return (
      <div className="max-w-md bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 rounded-full p-1.5">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-green-800 font-poppins text-sm">
              Kode Referral Terdaftar
            </h4>
            <p className="text-xs text-green-700 font-poppins">
              <span className="font-mono font-bold">{currentReferralCode}</span> - Digunakan untuk investasi ini
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user has made payments (first installment paid), lock referral input
  if (hasPayments) {
    return (
      <div className="max-w-md bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 rounded-full p-1.5">
            <CheckCircle className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-600 font-poppins text-sm">
              Kode Referral Tidak Tersedia
            </h4>
            <p className="text-xs text-gray-500 font-poppins">
              Referral hanya dapat diatur sebelum pembayaran pertama
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-3 border border-blue-200 mb-4">
      <h4 className="font-medium text-blue-800 font-poppins mb-2 text-sm">
        Masukkan Kode Referral (Opsional)
      </h4>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          className="flex-1 px-2 py-1.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          placeholder="ABC123"
          maxLength={6}
          pattern="[A-Z0-9]{6}"
          disabled={hasPayments}
        />
        <button
          type="submit"
          disabled={!referralCode.trim() || isSubmitting || hasPayments}
          className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs rounded-lg hover:shadow-lg disabled:opacity-50 font-poppins font-medium transition-all duration-300 whitespace-nowrap"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
      <p className="text-xs text-blue-600 mt-1 font-poppins">
        Kode referral untuk investasi ini saja
      </p>
    </div>
  );
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
    <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">
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
  filter: "all" | "active" | "completed" | "overdue" | "full-payment" | "installment";
  setFilter: (filter: "all" | "active" | "completed" | "overdue" | "full-payment" | "installment") => void;
  stats: {
    totalInvestments: number;
    totalAmount: number;
    totalPaid: number;
    overdueCount: number;
    upcomingCount: number;
  };
  groupedInstallments: CicilanGroup[];
  fullPaymentContracts: FullPaymentContract[];
}

function SearchAndFilter({
  searchTerm,
  setSearchTerm,
  filter,
  setFilter,
  stats,
  groupedInstallments,
  fullPaymentContracts,
}: SearchAndFilterProps) {
  const filters = [
    { key: "all", label: "Semua", count: stats.totalInvestments },
    {
      key: "active",
      label: "Aktif",
      count: groupedInstallments.filter(group => {
        const approvedCount = group.installments.filter(inst => inst.status === "approved" || inst.status === "completed").length;
        return approvedCount < group.installments.length;
      }).length + fullPaymentContracts.filter(contract => !contract.paymentCompleted).length,
    },
    {
      key: "overdue",
      label: "Terlambat",
      count: stats.overdueCount > 0 ? 1 : 0,
    },
    {
      key: "completed",
      label: "Selesai",
      count: groupedInstallments.filter(group => {
        const approvedCount = group.installments.filter(inst => inst.status === "approved" || inst.status === "completed").length;
        return approvedCount === group.installments.length;
      }).length + fullPaymentContracts.filter(contract => contract.paymentCompleted).length,
    },
    {
      key: "installment",
      label: "Cicilan",
      count: groupedInstallments.length,
    },
    {
      key: "full-payment",
      label: "Bayar Penuh",
      count: fullPaymentContracts.length,
    },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">
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
