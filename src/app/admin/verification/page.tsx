'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface PendingUser {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  ktpImageUrl?: string;
  faceImageUrl?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  address: string;
  city: string;
  province: string;
}

export default function UserVerificationPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/verification');
      if (response.ok) {
        const result = await response.json();
        setPendingUsers(result.data);
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      setProcessingId(userId);
      const response = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          status,
          notes: verificationNotes,
        }),
      });

      if (response.ok) {
        await fetchPendingUsers();
        setSelectedUser(null);
        setVerificationNotes('');
      }
    } catch (error) {
      console.error('Error updating verification:', error);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Verifikasi User</h1>
            <p className="text-gray-600 mt-2">Memuat data...</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
            Verifikasi User
          </h1>
          <p className="text-[#889063] mt-1 sm:mt-2 text-sm sm:text-base">
            Kelola verifikasi KTP dan foto selfie user yang mendaftar
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
          variants={containerVariants}
        >
          <motion.div
            className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#889063]">Menunggu Verifikasi</p>
                <p className="text-2xl font-bold text-[#324D3E] mt-1">
                  {pendingUsers.filter(u => u.verificationStatus === 'pending').length}
                </p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#889063]">Disetujui</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {pendingUsers.filter(u => u.verificationStatus === 'approved').length}
                </p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#889063]">Ditolak</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {pendingUsers.filter(u => u.verificationStatus === 'rejected').length}
                </p>
              </div>
              <div className="text-3xl">❌</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Users List */}
        <motion.div
          className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10"
          variants={itemVariants}
        >
          <div className="p-6 border-b border-[#324D3E]/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
                Daftar User
              </h2>
              <button
                onClick={fetchPendingUsers}
                className="text-[#4C3D19] hover:text-[#324D3E] font-medium text-sm transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          <div className="p-6">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Tidak ada user yang perlu diverifikasi
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <motion.div
                    key={user._id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                    variants={itemVariants}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">{user.fullName.charAt(0)}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#324D3E]">{user.fullName}</h3>
                            <p className="text-sm text-[#889063]">{user.email}</p>
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            user.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            user.verificationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {user.verificationStatus === 'pending' ? 'Menunggu' :
                             user.verificationStatus === 'approved' ? 'Disetujui' : 'Ditolak'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-[#889063]">Telepon: {user.phoneNumber}</p>
                            <p className="text-[#889063]">Alamat: {user.address}</p>
                            <p className="text-[#889063]">Kota: {user.city}, {user.province}</p>
                          </div>
                          <div>
                            <p className="text-[#889063]">
                              Tanggal Daftar: {new Date(user.createdAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-4 py-2 bg-[#324D3E] text-white rounded-lg hover:bg-[#4C3D19] transition-colors text-sm"
                        >
                          Lihat Detail
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Detail Modal */}
        {selectedUser && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[#324D3E]">Detail Verifikasi - {selectedUser.fullName}</h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-[#324D3E] mb-3">Foto KTP</h4>
                    {selectedUser.ktpImageUrl ? (
                      <div className="relative aspect-[3/2] bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={selectedUser.ktpImageUrl}
                          alt="KTP"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/2] bg-gray-100 rounded-lg flex items-center justify-center">
                        <p className="text-gray-500">Tidak ada foto KTP</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-[#324D3E] mb-3">Foto Selfie</h4>
                    {selectedUser.faceImageUrl ? (
                      <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={selectedUser.faceImageUrl}
                          alt="Selfie"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                        <p className="text-gray-500">Tidak ada foto selfie</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] mb-2">
                    Catatan Verifikasi (Opsional)
                  </label>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#324D3E] focus:border-transparent"
                    rows={3}
                    placeholder="Tambahkan catatan jika diperlukan..."
                  />
                </div>

                {/* Actions */}
                {selectedUser.verificationStatus === 'pending' && (
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => handleVerification(selectedUser._id, 'approved')}
                      disabled={processingId === selectedUser._id}
                      className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {processingId === selectedUser._id ? 'Memproses...' : '✅ Setujui'}
                    </button>
                    <button
                      onClick={() => handleVerification(selectedUser._id, 'rejected')}
                      disabled={processingId === selectedUser._id}
                      className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {processingId === selectedUser._id ? 'Memproses...' : '❌ Tolak'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AdminLayout>
  );
}