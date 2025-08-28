'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { useEffect, useState } from 'react';

interface CicilanInstallment {
  _id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'overdue';
  proofImageUrl?: string;
  proofDescription?: string;
  submissionDate?: string;
  adminStatus: 'pending' | 'approved' | 'rejected';
  adminReviewDate?: string;
  adminReviewBy?: {
    _id: string;
    fullName: string;
    email: string;
  };
  adminNotes?: string;
  paidDate?: string;
  cicilanPayment: {
    _id: string;
    orderId: string;
    productName: string;
    userId: {
      _id: string;
      fullName: string;
      email: string;
      phoneNumber: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function AdminCicilanPage() {
  const [installments, setInstallments] = useState<CicilanInstallment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    adminStatus: '',
    page: 1
  });
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    installment: CicilanInstallment | null;
  }>({ isOpen: false, installment: null });
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchInstallments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.adminStatus) params.append('adminStatus', filters.adminStatus);
      params.append('page', filters.page.toString());
      params.append('limit', '10');

      const response = await fetch(`/api/admin/cicilan/installments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setInstallments(data.installments);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch installments');
      }
    } catch (error) {
      console.error('Error fetching installments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallments();
  }, [filters]);

  const handleReview = async (action: 'approve' | 'reject', adminNotes: string) => {
    if (!reviewModal.installment) return;

    setIsReviewing(true);
    try {
      const response = await fetch('/api/admin/cicilan/review-installment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          installmentId: reviewModal.installment._id,
          action,
          adminNotes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Angsuran berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}!`);
        setReviewModal({ isOpen: false, installment: null });
        await fetchInstallments();
      } else {
        alert('Gagal memproses review: ' + data.error);
      }
    } catch (error) {
      console.error('Error reviewing installment:', error);
      alert('Terjadi kesalahan saat memproses review');
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

  const getAdminStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu Review';
      case 'approved': return 'Sudah Disetujui';
      case 'rejected': return 'Sudah Ditolak';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Cicilan</h1>
          <p className="text-gray-600 mt-2">Kelola pembayaran cicilan investasi dari pengguna</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Cicilan</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Review</label>
              <select
                value={filters.adminStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, adminStatus: e.target.value, page: 1 }))}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="">Semua Review</option>
                <option value="pending">Menunggu Review</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', adminStatus: '', page: 1 })}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cicilan</p>
                <p className="text-2xl font-bold text-gray-900">{pagination?.totalCount || 0}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600">💳</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Menunggu Review</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {installments.filter(i => i.adminStatus === 'pending' && i.status === 'submitted').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600">⏳</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sudah Disetujui</p>
                <p className="text-2xl font-bold text-green-600">
                  {installments.filter(i => i.status === 'approved').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600">✅</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ditolak</p>
                <p className="text-2xl font-bold text-red-600">
                  {installments.filter(i => i.status === 'rejected').length}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600">❌</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cicilan List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Memuat data cicilan...</p>
            </div>
          ) : installments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">💳</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Belum ada data cicilan</h3>
              <p className="text-gray-500">Data cicilan akan muncul di sini ketika pengguna membuat cicilan</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Pengguna</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Produk & Angsuran</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Jumlah & Jatuh Tempo</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Bukti Bayar</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {installments.map((installment) => (
                      <tr key={installment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{installment.cicilanPayment.userId.fullName}</div>
                            <div className="text-sm text-gray-500">{installment.cicilanPayment.userId.email}</div>
                            <div className="text-xs text-gray-400">ID: {installment.cicilanPayment.orderId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{installment.cicilanPayment.productName}</div>
                            <div className="text-sm text-gray-500">
                              Angsuran #{installment.installmentNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              Rp {installment.amount.toLocaleString('id-ID')}
                            </div>
                            <div className="text-sm text-gray-500">
                              Jatuh tempo: {formatDate(installment.dueDate)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(installment.status)}`}>
                              {getStatusText(installment.status)}
                            </span>
                            <div className="text-xs text-gray-500">
                              Review: {getAdminStatusText(installment.adminStatus)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {installment.proofImageUrl ? (
                            <div className="space-y-2">
                              <img
                                src={installment.proofImageUrl}
                                alt="Payment Proof"
                                className="w-16 h-16 object-cover rounded border cursor-pointer"
                                onClick={() => window.open(installment.proofImageUrl, '_blank')}
                              />
                              {installment.submissionDate && (
                                <div className="text-xs text-gray-500">
                                  {formatDate(installment.submissionDate)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Belum ada bukti</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {installment.adminStatus === 'pending' && installment.proofImageUrl && (
                            <button
                              onClick={() => setReviewModal({ isOpen: true, installment })}
                              className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
                            >
                              Review
                            </button>
                          )}
                          {installment.adminNotes && (
                            <div className="mt-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                              <strong>Catatan:</strong> {installment.adminNotes}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-between items-center p-6 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} dari {pagination.totalCount} data
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={!pagination.hasPrev}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Sebelumnya
                    </button>
                    <span className="px-3 py-1 text-sm">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={!pagination.hasNext}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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
  installment: CicilanInstallment | null;
  onClose: () => void;
  onReview: (action: 'approve' | 'reject', notes: string) => Promise<void>;
  isReviewing: boolean;
}

function ReviewModal({ isOpen, installment, onClose, onReview, isReviewing }: ReviewModalProps) {
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleSubmit = async () => {
    if (!action) return;
    await onReview(action, notes);
    setNotes('');
    setAction(null);
  };

  if (!isOpen || !installment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Review Bukti Pembayaran</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isReviewing}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Installment Info */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Pengguna:</span>
                <div className="font-medium">{installment.cicilanPayment.userId.fullName}</div>
              </div>
              <div>
                <span className="text-gray-600">Produk:</span>
                <div className="font-medium">{installment.cicilanPayment.productName}</div>
              </div>
              <div>
                <span className="text-gray-600">Angsuran ke:</span>
                <div className="font-medium">#{installment.installmentNumber}</div>
              </div>
              <div>
                <span className="text-gray-600">Jumlah:</span>
                <div className="font-medium">Rp {installment.amount.toLocaleString('id-ID')}</div>
              </div>
              <div>
                <span className="text-gray-600">Jatuh Tempo:</span>
                <div className="font-medium">{new Date(installment.dueDate).toLocaleDateString('id-ID')}</div>
              </div>
              <div>
                <span className="text-gray-600">Order ID:</span>
                <div className="font-medium text-xs">{installment.cicilanPayment.orderId}</div>
              </div>
            </div>
          </div>

          {/* Proof Image */}
          {installment.proofImageUrl && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Bukti Pembayaran</h4>
              <div className="border border-gray-200 rounded-lg p-4">
                <img
                  src={installment.proofImageUrl}
                  alt="Bukti Pembayaran"
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Description */}
          {installment.proofDescription && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Keterangan</h4>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{installment.proofDescription}</p>
            </div>
          )}

          {/* Admin Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Admin
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 h-24"
              placeholder="Tambahkan catatan untuk pengguna..."
              disabled={isReviewing}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isReviewing}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={() => {
                setAction('reject');
                handleSubmit();
              }}
              disabled={isReviewing}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isReviewing && action === 'reject' ? 'Memproses...' : 'Tolak'}
            </button>
            <button
              onClick={() => {
                setAction('approve');
                handleSubmit();
              }}
              disabled={isReviewing}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isReviewing && action === 'approve' ? 'Memproses...' : 'Setujui'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}