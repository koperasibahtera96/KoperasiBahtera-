'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAlert } from '@/components/ui/Alert';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import {
  CicilanInstallmentWithPayment,
  CicilanGroup,
  InvestorDetail,
  InvestorDetailResponse,
  ReviewInstallmentRequest,
  ReviewInstallmentResponse
} from '@/types/cicilan';

export default function InvestorDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const [investorDetail, setInvestorDetail] = useState<InvestorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    installment: CicilanInstallmentWithPayment | null;
  }>({ isOpen: false, installment: null });
  const [isReviewing, setIsReviewing] = useState(false);
  const { showSuccess, showError, AlertComponent } = useAlert();
  const router = useRouter();
  const { userId } = use(params);

  const fetchInvestorDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cicilan/investor/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setInvestorDetail(data.investor);
      } else {
        console.error('Failed to fetch investor detail');
        showError('Error', 'Gagal memuat data investor');
      }
    } catch (error) {
      console.error('Error fetching investor detail:', error);
      showError('Error', 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestorDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleReview = async (action: 'approve' | 'reject', adminNotes: string) => {
    if (!reviewModal.installment) return;

    setIsReviewing(true);
    try {
      const requestBody: ReviewInstallmentRequest = {
        paymentId: reviewModal.installment.paymentId || reviewModal.installment._id,
        action,
        adminNotes,
      };

      const response = await fetch('/api/admin/cicilan/review-installment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: ReviewInstallmentResponse = await response.json();

      if (data.success) {
        showSuccess(
          'Review Berhasil!',
          `Angsuran berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}!`
        );
        setReviewModal({ isOpen: false, installment: null });
        await fetchInvestorDetail();
      } else {
        showError('Gagal Memproses Review', data.error || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error reviewing installment:', error);
      showError('Error', 'Terjadi kesalahan saat memproses review');
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Belum Bayar';
      case 'submitted': return 'Sudah Upload';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'overdue': return 'Terlambat';
      default: return status;
    }
  };

  const getGroupStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGroupStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'completed': return 'Selesai';
      case 'overdue': return 'Terlambat';
      default: return status;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate: Date | string) => {
    const dateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return dateObj < new Date() && dateObj.toDateString() !== new Date().toDateString();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data investor...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!investorDetail) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">❌</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Data investor tidak ditemukan</h3>
          <button
            onClick={() => router.push('/admin/cicilan')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Kembali ke Daftar Investor
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AlertComponent />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/cicilan')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali ke Daftar Investor
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Detail Investor</h1>
            <p className="text-gray-600 mt-2">Kelola cicilan investasi dari {investorDetail.userInfo.fullName}</p>
          </div>
        </div>

        {/* Investor Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center">
              <span className="text-emerald-600 font-semibold text-2xl">
                {investorDetail.userInfo.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{investorDetail.userInfo.fullName}</h2>
              <p className="text-gray-600">{investorDetail.userInfo.email}</p>
              <p className="text-sm text-gray-500">{investorDetail.userInfo.phoneNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Investasi</div>
              <div className="text-2xl font-bold text-blue-600">{investorDetail.totalInvestments}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Nilai Investasi</div>
              <div className="text-xl font-bold text-green-600">
                Rp {investorDetail.totalAmount.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Sudah Dibayar</div>
              <div className="text-xl font-bold text-emerald-600">
                Rp {investorDetail.totalPaid.toLocaleString('id-ID')}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((investorDetail.totalPaid / investorDetail.totalAmount) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Perlu Review</div>
              <div className="text-2xl font-bold text-yellow-600">{investorDetail.pendingReviews}</div>
              {investorDetail.overdueCount > 0 && (
                <div className="text-sm text-red-600 mt-1">{investorDetail.overdueCount} Terlambat</div>
              )}
            </div>
          </div>
        </div>

        {/* Investment Groups */}
        <div className="space-y-6">
          {investorDetail.cicilanGroups
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((group) => (
              <div key={group.cicilanOrderId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Group Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{group.productName}</h3>
                    <p className="text-sm text-gray-500">Order ID: {group.cicilanOrderId}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>💰 Rp {group.totalAmount.toLocaleString('id-ID')}</span>
                      <span>📅 {group.paymentTerm === 'monthly' ? 'Bulanan' : group.paymentTerm === 'quarterly' ? 'Triwulan' : 'Tahunan'}</span>
                      <span>🔢 {group.totalInstallments} angsuran</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getGroupStatusColor(group.status)}`}>
                      {getGroupStatusText(group.status)}
                    </span>
                    <div className="text-sm text-gray-600 mt-2">
                      Progress: {group.installments.filter(i => i.status === 'approved').length}/{group.installments.length}
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{ width: `${(group.installments.filter(i => i.status === 'approved').length / group.installments.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Installments Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.installments
                    .sort((a, b) => a.installmentNumber - b.installmentNumber)
                    .map((installment) => {
                      const overdue = isOverdue(installment.dueDate);
                      const effectiveStatus = overdue && installment.status === 'pending' ? 'overdue' : installment.status;

                      return (
                        <div
                          key={installment._id}
                          className={`border-2 rounded-lg p-4 transition-all duration-300 ${effectiveStatus === 'approved' ? 'bg-green-50 border-green-200' :
                            effectiveStatus === 'submitted' ? 'bg-yellow-50 border-yellow-200' :
                              effectiveStatus === 'overdue' ? 'bg-red-50 border-red-200' :
                                effectiveStatus === 'rejected' ? 'bg-red-50 border-red-200' :
                                  'bg-gray-50 border-gray-200'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-semibold text-gray-900">
                                Angsuran #{installment.installmentNumber}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatDate(installment.dueDate)}
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(effectiveStatus)}`}>
                              {getStatusText(effectiveStatus)}
                            </span>
                          </div>

                          <div className="mb-3">
                            <div className="text-lg font-bold text-gray-900">
                              Rp {installment.amount.toLocaleString('id-ID')}
                            </div>
                          </div>

                          {/* Proof Image */}
                          {installment.proofImageUrl && (
                            <div className="mb-3">
                              <img
                                src={installment.proofImageUrl}
                                alt="Bukti Pembayaran"
                                className="w-full h-20 object-cover rounded border cursor-pointer"
                                onClick={() => window.open(installment.proofImageUrl, '_blank')}
                              />
                            </div>
                          )}

                          {/* Admin Notes */}
                          {installment.adminNotes && (
                            <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 mb-3">
                              <strong>Catatan:</strong> {installment.adminNotes}
                            </div>
                          )}

                          {/* Review Button */}
                          {installment.adminStatus === 'pending' && installment.proofImageUrl && (
                            <button
                              onClick={() => setReviewModal({ isOpen: true, installment })}
                              className="w-full px-3 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
        </div>

        {/* Review Modal */}
        <ReviewModal
          isOpen={reviewModal.isOpen}
          installment={reviewModal.installment}
          onClose={() => setReviewModal({ isOpen: false, installment: null })}
          onReview={handleReview}
          isReviewing={isReviewing}
        />
      </div>
    </AdminLayout>
  );
}

interface ReviewModalProps {
  isOpen: boolean;
  installment: CicilanInstallmentWithPayment | null;
  onClose: () => void;
  onReview: (action: 'approve' | 'reject', notes: string) => Promise<void>;
  isReviewing: boolean;
}

function ReviewModal({ isOpen, installment, onClose, onReview, isReviewing }: ReviewModalProps) {
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleSubmit = async (submitAction: 'approve' | 'reject') => {
    await onReview(submitAction, notes);
    setNotes('');
    setAction(null);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen || !installment) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-[#324D3E]/20">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#324D3E] font-poppins">
              Review Bukti Pembayaran #{installment.installmentNumber}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isReviewing}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Installment Info */}
          <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-4 rounded-2xl mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 font-poppins">Angsuran ke:</span>
                <div className="font-semibold text-[#324D3E] font-poppins">#{installment.installmentNumber}</div>
              </div>
              <div>
                <span className="text-gray-600 font-poppins">Jumlah:</span>
                <div className="font-semibold text-[#324D3E] font-poppins">Rp {installment.amount.toLocaleString('id-ID')}</div>
              </div>
              <div>
                <span className="text-gray-600 font-poppins">Jatuh Tempo:</span>
                <div className="font-semibold text-[#324D3E] font-poppins">{formatDate(installment.dueDate)}</div>
              </div>
              <div>
                <span className="text-gray-600 font-poppins">Order ID:</span>
                <div className="font-medium text-xs text-[#4C3D19] font-poppins">{installment.orderId || installment._id}</div>
              </div>
            </div>
          </div>

          {/* Proof Image */}
          {installment.proofImageUrl && (
            <div className="mb-6">
              <h4 className="font-semibold text-[#324D3E] mb-3 font-poppins">Bukti Pembayaran</h4>
              <div className="border-2 border-[#324D3E]/20 rounded-2xl p-4 bg-white/50">
                <img
                  src={installment.proofImageUrl}
                  alt="Bukti Pembayaran"
                  className="max-w-full h-auto rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300"
                  onClick={() => window.open(installment.proofImageUrl, '_blank')}
                />
              </div>
            </div>
          )}

          {/* Description */}
          {installment.proofDescription && (
            <div className="mb-6">
              <h4 className="font-semibold text-[#324D3E] mb-2 font-poppins">Keterangan dari User</h4>
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-4 rounded-2xl border border-blue-200/50">
                <p className="text-gray-700 font-poppins">{installment.proofDescription}</p>
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#324D3E] mb-2 font-poppins">
              Catatan Admin untuk User
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 h-24 font-poppins focus:border-[#324D3E] focus:ring-1 focus:ring-[#324D3E] bg-white/80"
              placeholder="Tambahkan catatan untuk pengguna (opsional)..."
              disabled={isReviewing}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isReviewing}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 disabled:opacity-50 font-poppins font-medium transition-all duration-300"
            >
              Batal
            </button>
            <button
              onClick={() => {
                setAction('reject');
                handleSubmit('reject');
              }}
              disabled={isReviewing}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-full hover:shadow-lg hover:from-red-400 hover:to-red-500 disabled:opacity-50 font-poppins font-medium transition-all duration-300"
            >
              {isReviewing && action === 'reject' ? 'Memproses...' : 'Tolak'}
            </button>
            <button
              onClick={() => {
                setAction('approve');
                handleSubmit('approve');
              }}
              disabled={isReviewing}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full hover:shadow-lg disabled:opacity-50 font-poppins font-medium transition-all duration-300"
            >
              {isReviewing && action === 'approve' ? 'Memproses...' : 'Setujui'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}