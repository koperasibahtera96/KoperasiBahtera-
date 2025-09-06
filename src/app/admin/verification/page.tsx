'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Verifikasi User</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Memuat data...</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
            Verifikasi User
          </h1>
          <p className="text-[#889063] dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base transition-colors duration-300">
            Kelola verifikasi KTP dan foto selfie user yang mendaftar
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
          variants={containerVariants}
        >
          <motion.div
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 transition-colors duration-300"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#889063] dark:text-gray-400 transition-colors duration-300">Menunggu Verifikasi</p>
                <p className="text-2xl font-bold text-[#324D3E] dark:text-white mt-1 transition-colors duration-300">
                  {pendingUsers.filter(u => u.verificationStatus === 'pending').length}
                </p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 transition-colors duration-300"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#889063] dark:text-gray-400 transition-colors duration-300">Disetujui</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1 transition-colors duration-300">
                  {pendingUsers.filter(u => u.verificationStatus === 'approved').length}
                </p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 transition-colors duration-300"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#889063] dark:text-gray-400 transition-colors duration-300">Ditolak</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1 transition-colors duration-300">
                  {pendingUsers.filter(u => u.verificationStatus === 'rejected').length}
                </p>
              </div>
              <div className="text-3xl">❌</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Users List */}
        <motion.div
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300"
          variants={itemVariants}
        >
          <div className="p-6 border-b border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
                Daftar User
              </h2>
              <button
                onClick={fetchPendingUsers}
                className="text-[#4C3D19] dark:text-[#4C3D19] hover:text-[#324D3E] dark:hover:text-[#6b5b47] font-medium text-sm transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm sm:text-base transition-colors duration-300">
                Tidak ada user yang perlu diverifikasi
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <motion.div
                    key={user._id}
                    className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:shadow-md transition-all bg-white dark:bg-gray-700/50"
                    variants={itemVariants}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-sm sm:text-base">{user.fullName.charAt(0)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-[#324D3E] dark:text-white text-sm sm:text-base truncate transition-colors duration-300">{user.fullName}</h3>
                              <p className="text-xs sm:text-sm text-[#889063] dark:text-gray-400 truncate transition-colors duration-300">{user.email}</p>
                            </div>
                          </div>
                          <span className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full self-start transition-colors duration-300 ${
                            user.verificationStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                            user.verificationStatus === 'approved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                            'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                          }`}>
                            {user.verificationStatus === 'pending' ? 'Menunggu' :
                             user.verificationStatus === 'approved' ? 'Disetujui' : 'Ditolak'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                          <div className="space-y-1">
                            <p className="text-[#889063] dark:text-gray-400 truncate transition-colors duration-300">Telepon: {user.phoneNumber}</p>
                            <p className="text-[#889063] dark:text-gray-400 truncate transition-colors duration-300">Alamat: {user.address}</p>
                            <p className="text-[#889063] dark:text-gray-400 truncate transition-colors duration-300">Kota: {user.city}, {user.province}</p>
                          </div>
                          <div>
                            <p className="text-[#889063] dark:text-gray-400 transition-colors duration-300">
                              Tanggal Daftar: {new Date(user.createdAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:ml-4">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-3 sm:px-4 py-2 bg-[#324D3E] text-white rounded-lg hover:bg-[#4C3D19] transition-colors text-xs sm:text-sm whitespace-nowrap"
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
            className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0 transition-colors duration-300"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl transition-colors duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-xl font-bold text-[#324D3E] dark:text-white truncate pr-4 transition-colors duration-300">
                    Detail Verifikasi - {selectedUser.fullName}
                  </h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1 flex-shrink-0 transition-colors duration-300"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Images */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h4 className="font-semibold text-[#324D3E] dark:text-white mb-3 text-sm sm:text-base transition-colors duration-300">Foto KTP</h4>
                    {selectedUser.ktpImageUrl ? (
                      <div className="relative aspect-[3/2] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden transition-colors duration-300">
                        <Image
                          src={selectedUser.ktpImageUrl}
                          alt="KTP"
                          fill
                          className="object-contain sm:object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center transition-colors duration-300">
                        <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">Tidak ada foto KTP</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-[#324D3E] dark:text-white mb-3 text-sm sm:text-base transition-colors duration-300">Foto Selfie</h4>
                    {selectedUser.faceImageUrl ? (
                      <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden transition-colors duration-300">
                        <Image
                          src={selectedUser.faceImageUrl}
                          alt="Selfie"
                          fill
                          className="object-contain sm:object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center transition-colors duration-300">
                        <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">Tidak ada foto selfie</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Details */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg transition-colors duration-300">
                  <h4 className="font-semibold text-[#324D3E] dark:text-white mb-3 text-sm sm:text-base transition-colors duration-300">Informasi User</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Nama: <span className="font-medium">{selectedUser.fullName}</span></p>
                      <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Email: <span className="font-medium">{selectedUser.email}</span></p>
                      <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Telepon: <span className="font-medium">{selectedUser.phoneNumber}</span></p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Alamat: <span className="font-medium">{selectedUser.address}</span></p>
                      <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Kota: <span className="font-medium">{selectedUser.city}</span></p>
                      <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Provinsi: <span className="font-medium">{selectedUser.province}</span></p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[#324D3E] dark:text-white mb-2 transition-colors duration-300">
                    Catatan Verifikasi (Opsional)
                  </label>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#324D3E] focus:border-transparent text-sm transition-colors duration-300"
                    rows={3}
                    placeholder="Tambahkan catatan jika diperlukan..."
                  />
                </div>

                {/* Actions */}
                {selectedUser.verificationStatus === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 transition-colors duration-300">
                    <button
                      onClick={() => handleVerification(selectedUser._id, 'approved')}
                      disabled={processingId === selectedUser._id}
                      className="flex-1 bg-green-600 text-white py-3 px-4 sm:px-6 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base font-medium"
                    >
                      {processingId === selectedUser._id ? 'Memproses...' : '✅ Setujui'}
                    </button>
                    <button
                      onClick={() => handleVerification(selectedUser._id, 'rejected')}
                      disabled={processingId === selectedUser._id}
                      className="flex-1 bg-red-600 text-white py-3 px-4 sm:px-6 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm sm:text-base font-medium"
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