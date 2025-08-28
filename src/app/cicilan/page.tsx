'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Installment {
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
  adminNotes?: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface CicilanGroup {
  cicilanPayment: {
    _id: string;
    orderId: string;
    productName: string;
    totalAmount: number;
  };
  installments: Installment[];
}

export default function CicilanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groupedInstallments, setGroupedInstallments] = useState<CicilanGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchInstallments();
    }
  }, [status, router]);

  const fetchInstallments = async () => {
    try {
      const response = await fetch('/api/cicilan/installments');
      if (response.ok) {
        const data = await response.json();
        setGroupedInstallments(data.groupedInstallments);
      } else {
        console.error('Failed to fetch installments');
      }
    } catch (error) {
      console.error('Error fetching installments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadProof = async (installmentId: string, file: File, description: string) => {
    setUploadingProof(installmentId);
    try {
      // First upload the image
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('orderId', `installment-${installmentId}`);

      const uploadResponse = await fetch('/api/cicilan/upload-proof', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadData.success) {
        alert('Gagal mengunggah gambar: ' + uploadData.error);
        return;
      }

      // Then submit the proof
      const submitResponse = await fetch('/api/cicilan/submit-installment-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          installmentId,
          proofImageUrl: uploadData.imageUrl,
          proofDescription: description,
        }),
      });

      const submitData = await submitResponse.json();

      if (submitData.success) {
        alert('Bukti pembayaran berhasil dikirim!');
        await fetchInstallments(); // Refresh data
      } else {
        alert('Gagal mengirim bukti pembayaran: ' + submitData.error);
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert('Terjadi kesalahan saat mengunggah bukti pembayaran');
    } finally {
      setUploadingProof(null);
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
      case 'submitted': return 'Menunggu Review';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'overdue': return 'Terlambat';
      default: return status;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const canSubmitProof = (installment: Installment) => {
    return installment.status === 'pending' || installment.status === 'rejected';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data cicilan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cicilan Investasi</h1>
          <p className="text-gray-600 mt-2">Kelola setiap angsuran pembayaran investasi Anda</p>
        </div>

        {groupedInstallments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">💳</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Belum ada cicilan investasi</h3>
            <p className="text-gray-500 mb-6">Mulai investasi dengan cicilan sekarang!</p>
            <button
              onClick={() => router.push('/#investasi')}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Lihat Paket Investasi
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedInstallments.map((group) => (
              <div key={group.cicilanPayment._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Cicilan Header */}
                <div className="mb-8">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{group.cicilanPayment.productName}</h2>
                      <p className="text-sm text-gray-600">Order ID: {group.cicilanPayment.orderId}</p>
                      <p className="text-lg font-semibold text-emerald-600 mt-1">
                        Total Investasi: Rp {group.cicilanPayment.totalAmount.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Progress Pembayaran</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {group.installments.filter(i => i.status === 'approved').length}/{group.installments.length}
                      </div>
                      <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-emerald-600 h-2 rounded-full" 
                          style={{ width: `${(group.installments.filter(i => i.status === 'approved').length / group.installments.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Installment Cards */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Jadwal Angsuran ({group.installments.length} angsuran)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.installments
                      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                      .map((installment) => {
                        const overdue = isOverdue(installment.dueDate);
                        const effectiveStatus = overdue && installment.status === 'pending' ? 'overdue' : installment.status;

                        return (
                          <div
                            key={installment._id}
                            className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                              effectiveStatus === 'approved' ? 'bg-green-50 border-green-200' :
                              effectiveStatus === 'submitted' ? 'bg-yellow-50 border-yellow-200' :
                              effectiveStatus === 'overdue' ? 'bg-red-50 border-red-200' :
                              effectiveStatus === 'rejected' ? 'bg-red-50 border-red-200' :
                              'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="text-lg font-bold text-gray-900">
                                  Angsuran #{installment.installmentNumber}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Jatuh tempo: {formatDate(installment.dueDate)}
                                </div>
                              </div>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(effectiveStatus)}`}>
                                {getStatusText(effectiveStatus)}
                              </span>
                            </div>

                            <div className="mb-4">
                              <div className="text-2xl font-bold text-emerald-600">
                                Rp {installment.amount.toLocaleString('id-ID')}
                              </div>
                            </div>

                            {/* Status Details */}
                            {installment.paidDate && (
                              <div className="text-sm text-green-600 mb-2">
                                ✅ Dibayar: {formatDate(installment.paidDate)}
                              </div>
                            )}

                            {installment.submissionDate && (
                              <div className="text-sm text-gray-600 mb-2">
                                📤 Dikirim: {formatDate(installment.submissionDate)}
                              </div>
                            )}

                            {installment.adminReviewDate && (
                              <div className="text-sm text-gray-600 mb-2">
                                👨‍💼 Review: {formatDate(installment.adminReviewDate)}
                              </div>
                            )}

                            {installment.adminNotes && (
                              <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 mb-3">
                                <strong>Catatan Admin:</strong> {installment.adminNotes}
                              </div>
                            )}

                            {/* Action Button */}
                            {canSubmitProof(installment) && (
                              <InstallmentProofUpload
                                installment={installment}
                                onUpload={handleUploadProof}
                                isUploading={uploadingProof === installment._id}
                              />
                            )}

                            {/* Proof Image Preview */}
                            {installment.proofImageUrl && (
                              <div className="mt-3">
                                <div className="text-xs text-gray-600 mb-1">Bukti Pembayaran:</div>
                                <img
                                  src={installment.proofImageUrl}
                                  alt="Bukti Pembayaran"
                                  className="w-full h-20 object-cover rounded border cursor-pointer"
                                  onClick={() => window.open(installment.proofImageUrl, '_blank')}
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
    </div>
  );
}

interface InstallmentProofUploadProps {
  installment: Installment;
  onUpload: (installmentId: string, file: File, description: string) => Promise<void>;
  isUploading: boolean;
}

function InstallmentProofUpload({ installment, onUpload, isUploading }: InstallmentProofUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    await onUpload(installment._id, file, description);
    setIsOpen(false);
    setFile(null);
    setDescription('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
        disabled={isUploading}
      >
        {isUploading ? 'Mengunggah...' : 'Upload Bukti Bayar'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Upload Bukti Pembayaran #{installment.installmentNumber}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <div className="text-sm text-gray-600">Angsuran #{installment.installmentNumber}</div>
                <div className="text-lg font-semibold">Rp {installment.amount.toLocaleString('id-ID')}</div>
                <div className="text-sm text-gray-600">Jatuh tempo: {formatDate(installment.dueDate)}</div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Gambar Bukti Pembayaran *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full border border-gray-300 rounded-lg p-2"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keterangan (opsional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 h-20"
                    placeholder="Tambahkan keterangan tentang pembayaran..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!file || isUploading}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isUploading ? 'Mengunggah...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}