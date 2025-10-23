"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { useAlert } from "@/components/ui/Alert";
import {
  CheckCircle,
  CreditCard,
  Search,
  X,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";

interface Payment {
  _id: string;
  orderId: string;
  cicilanOrderId?: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  adminStatus: string;
  status: string;
  productName: string;
  proofImageUrl?: string;
  proofDescription?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    fullName: string;
    email: string;
    phoneNumber: string;
    userCode: string;
  };
  adminReviewDate?: string;
  adminNotes?: string;
}

export default function FinancePaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">(
    "approve"
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const { showSuccess, showError, AlertComponent } = useAlert();

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentTypeFilter, statusFilter, searchTerm]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (paymentTypeFilter !== "all") params.append("paymentType", paymentTypeFilter);
      params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(
        `/api/finance/payments/pending?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      } else {
        showError("Error", "Gagal memuat data pembayaran");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      showError("Error", "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async () => {
    if (!selectedPayment) return;

    try {
      setProcessing(true);
      const response = await fetch("/api/finance/payments/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: selectedPayment._id,
          action: approvalAction,
          adminNotes,
        }),
      });

      if (response.ok) {
        showSuccess(
          "Berhasil",
          approvalAction === "approve"
            ? "Pembayaran berhasil disetujui"
            : "Pembayaran ditolak"
        );
        setShowApprovalModal(false);
        setSelectedPayment(null);
        setAdminNotes("");
        fetchPayments();
      } else {
        const error = await response.json();
        showError("Error", error.error || "Gagal memproses pembayaran");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      showError("Error", "Terjadi kesalahan saat memproses pembayaran");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <FinanceSidebar>
      <div className="p-6 sm:p-8">
        <AlertComponent />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#324D3E] mb-2">
            Kelola Pembayaran
          </h1>
          <p className="text-[#889063]">
            Approve atau reject pembayaran manual BCA
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Payment Type Filter */}
            <div>
              <label className="block text-sm font-medium text-[#324D3E] mb-2">
                Tipe Pembayaran
              </label>
              <select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-[#324D3E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/50"
              >
                <option value="all">Semua</option>
                <option value="full-investment">Pembayaran Penuh</option>
                <option value="cicilan-installment">Cicilan</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-[#324D3E] mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-[#324D3E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/50"
              >
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-[#324D3E] mb-2">
                Cari
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#889063] w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nama, email, kode user, atau contract ID..."
                  className="w-full pl-10 pr-4 py-2 border border-[#324D3E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payments List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E]"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-[#324D3E]/10 p-12 text-center">
            <CreditCard className="w-16 h-16 text-[#889063] mx-auto mb-4" />
            <p className="text-[#889063] text-lg">Tidak ada pembayaran</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {payments.map((payment) => (
              <div
                key={payment._id}
                className="bg-white rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 hover:shadow-xl transition-shadow"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Section - Payment Info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-[#324D3E]">
                          {payment.productName}
                        </h3>
                        <p className="text-sm text-[#889063]">
                          {payment.paymentType === "full-investment"
                            ? "Pembayaran Penuh"
                            : `Cicilan ${payment.installmentNumber}/${payment.totalInstallments}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#324D3E]">
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#889063] mb-1">User</p>
                        <p className="text-sm font-medium text-[#324D3E]">
                          {payment.user.fullName}
                        </p>
                        <p className="text-xs text-[#889063]">
                          {payment.user.userCode}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#889063] mb-1">Email</p>
                        <p className="text-sm font-medium text-[#324D3E]">
                          {payment.user.email}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-[#889063] mb-1">Order ID</p>
                      <p className="text-sm font-mono font-medium text-[#324D3E]">
                        {payment.orderId}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#889063] mb-1">
                          Tanggal Upload
                        </p>
                        <p className="text-sm font-medium text-[#324D3E]">
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>
                      {payment.dueDate && (
                        <div>
                          <p className="text-xs text-[#889063] mb-1">
                            Jatuh Tempo
                          </p>
                          <p className="text-sm font-medium text-[#324D3E]">
                            {formatDate(payment.dueDate)}
                          </p>
                        </div>
                      )}
                    </div>

                    {payment.proofDescription && (
                      <div>
                        <p className="text-xs text-[#889063] mb-1">
                          Keterangan
                        </p>
                        <p className="text-sm text-[#324D3E]">
                          {payment.proofDescription}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex flex-col justify-between">
                    {/* Payment Proof */}
                    <div>
                      <p className="text-sm font-medium text-[#324D3E] mb-2">
                        Bukti Pembayaran
                      </p>
                      {payment.proofImageUrl ? (
                        <div
                          className="relative h-48 bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowImageModal(true);
                          }}
                        >
                          <Image
                            src={payment.proofImageUrl}
                            alt="Bukti Pembayaran"
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                          <div className="text-center">
                            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                              Belum ada bukti
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {payment.adminStatus === "pending" && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setApprovalAction("approve");
                            setShowApprovalModal(true);
                          }}
                          disabled={!payment.proofImageUrl}
                          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Setujui
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setApprovalAction("reject");
                            setShowApprovalModal(true);
                          }}
                          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-5 h-5" />
                          Tolak
                        </button>
                      </div>
                    )}

                    {payment.adminStatus === "approved" && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                        <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-green-700">
                          Disetujui
                        </p>
                        {payment.adminReviewDate && (
                          <p className="text-xs text-green-600">
                            {formatDate(payment.adminReviewDate)}
                          </p>
                        )}
                      </div>
                    )}

                    {payment.adminStatus === "rejected" && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                        <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-red-700">
                          Ditolak
                        </p>
                        {payment.adminNotes && (
                          <p className="text-xs text-red-600 mt-1">
                            {payment.adminNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && selectedPayment?.proofImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
            >
              <X className="w-6 h-6" />
            </button>
            <Image
              src={selectedPayment.proofImageUrl}
              alt="Bukti Pembayaran"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowApprovalModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-bold text-[#324D3E] mb-4">
              {approvalAction === "approve"
                ? "Setujui Pembayaran"
                : "Tolak Pembayaran"}
            </h3>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-[#889063] mb-1">Pembayaran</p>
              <p className="text-lg font-bold text-[#324D3E]">
                {formatCurrency(selectedPayment.amount)}
              </p>
              <p className="text-sm text-[#889063] mt-2">
                {selectedPayment.user.fullName} ({selectedPayment.user.userCode}
                )
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#324D3E] mb-2">
                Catatan (Opsional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Tambahkan catatan jika diperlukan..."
                rows={3}
                className="w-full px-4 py-2 border border-[#324D3E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/50"
              />
            </div>

            <button
              onClick={handleApproveReject}
              disabled={processing}
              className={`w-full ${
                approvalAction === "approve"
                  ? "bg-gradient-to-r from-green-500 to-green-600"
                  : "bg-gradient-to-r from-red-500 to-red-600"
              } text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {processing
                ? "Memproses..."
                : approvalAction === "approve"
                ? "Setujui Pembayaran"
                : "Tolak Pembayaran"}
            </button>
          </div>
        </div>
      )}
    </FinanceSidebar>
  );
}
