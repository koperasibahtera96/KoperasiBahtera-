'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { motion } from 'framer-motion';
import { RefreshCw, Hourglass, CheckCircle, XCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

interface PendingUser {
  _id: string;
  fullName: string;
  nik: string;
  email: string;
  phoneNumber: string;
  ktpImageUrl?: string;
  faceImageUrl?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  // KTP Address
  ktpAddress: string;
  ktpVillage: string;
  ktpCity: string;
  ktpProvince: string;
  ktpPostalCode: string;
  // Domisili Address
  domisiliAddress: string;
  domisiliVillage: string;
  domisiliCity: string;
  domisiliProvince: string;
  domisiliPostalCode: string;
  // Beneficiary Information
  beneficiaryName: string;
  beneficiaryNik: string;
  beneficiaryDateOfBirth: Date | string;
  beneficiaryRelationship: 'orangtua' | 'suami_istri' | 'anak_kandung' | 'saudara_kandung';
}

export default function UserVerificationPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [resubmissions, setResubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [selectedResubmissionId, setSelectedResubmissionId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'resubmissions' | 'pending' | 'approved' | 'rejected'>('all');
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to get theme-aware classes (pink mode overrides)
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/verification');
      if (response.ok) {
        const result = await response.json();
        setPendingUsers(result.data);
        setResubmissions(result.resubmissions || []);
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (userId: string, status: 'approved' | 'rejected', resubmissionId?: string | null) => {
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
          resubmissionId: resubmissionId || undefined,
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

  // Filter users based on active filter
  const filteredUsers = pendingUsers.filter(user => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'resubmissions') {
      return resubmissions.some((r: any) => r.userId.toString() === user._id.toString() && r.status === 'pending');
    }
    return user.verificationStatus === activeFilter;
  });

  // When a selectedUser is opened, auto-select the newest resubmission (if any)
  useEffect(() => {
    if (!selectedUser) {
      setSelectedResubmissionId(null);
      return;
    }
    const userResubs = resubmissions
      .filter((r: any) => r.userId.toString() === selectedUser._id.toString())
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (userResubs.length > 0) {
      setSelectedResubmissionId(userResubs[userResubs.length - 1]._id);
    } else {
      setSelectedResubmissionId(null);
    }
  }, [selectedUser, resubmissions]);

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
            <h1 className={getThemeClasses("text-3xl font-bold text-gray-900 dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>Verifikasi User</h1>
            <p className={getThemeClasses("text-gray-600 dark:text-gray-200 mt-2", "!text-[#6b7280]")}>Memuat data...</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className={getThemeClasses("bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse", "!bg-white/80 !border-[#FFC1CC]/30")}>
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
          <h1 className={getThemeClasses("text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>
            Verifikasi User
          </h1>
          <p className={getThemeClasses("text-[#889063] dark:text-gray-200 mt-1 sm:mt-2 text-sm sm:text-base transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-200")}>
            Kelola verifikasi KTP dan foto selfie user yang mendaftar
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
          variants={containerVariants}
        >
          <motion.div
            className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 transition-colors duration-300 cursor-pointer hover:shadow-xl", "!bg-white/80 !border-[#FFC1CC]/30") + (activeFilter === 'resubmissions' ? ' ring-2 ring-[#324D3E] dark:ring-[#9EE3BF]' : '')}
            variants={itemVariants}
            onClick={() => setActiveFilter(activeFilter === 'resubmissions' ? 'all' : 'resubmissions')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={getThemeClasses("text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-200")}>Permintaan Resubmisi</p>
                <p className={getThemeClasses("text-2xl font-bold text-[#324D3E] dark:text-white mt-1 transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>{resubmissions.filter(r => r.status === 'pending').length}</p>
              </div>
              <div>
                <RefreshCw className={getThemeClasses("w-7 h-7 text-[#324D3E] dark:text-white", "!text-[#4c1d1d]")}/>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 transition-colors duration-300 cursor-pointer hover:shadow-xl", "!bg-white/80 !border-[#FFC1CC]/30") + (activeFilter === 'pending' ? ' ring-2 ring-[#324D3E] dark:ring-[#9EE3BF]' : '')}
            variants={itemVariants}
            onClick={() => setActiveFilter(activeFilter === 'pending' ? 'all' : 'pending')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={getThemeClasses("text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-200")}>Menunggu Verifikasi</p>
                <p className={getThemeClasses("text-2xl font-bold text-[#324D3E] dark:text-white mt-1 transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>
                  {pendingUsers.filter(u => u.verificationStatus === 'pending').length}
                </p>
              </div>
              <div>
                <Hourglass className={getThemeClasses("w-7 h-7 text-[#324D3E] dark:text-white", "!text-[#4c1d1d]")}/>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 transition-colors duration-300 cursor-pointer hover:shadow-xl", "!bg-white/80 !border-[#FFC1CC]/30") + (activeFilter === 'approved' ? ' ring-2 ring-[#324D3E] dark:ring-[#9EE3BF]' : '')}
            variants={itemVariants}
            onClick={() => setActiveFilter(activeFilter === 'approved' ? 'all' : 'approved')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={getThemeClasses("text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-200")}>Disetujui</p>
                <p className={getThemeClasses("text-2xl font-bold text-green-600 dark:text-green-400 mt-1 transition-colors duration-300", "!text-[#4c1d1d] dark:!text-green-400")}>
                  {pendingUsers.filter(u => u.verificationStatus === 'approved').length}
                </p>
              </div>
              <div>
                <CheckCircle className={getThemeClasses("w-7 h-7 text-green-600 dark:text-green-400", "!text-[#4c1d1d]")}/>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 transition-colors duration-300 cursor-pointer hover:shadow-xl", "!bg-white/80 !border-[#FFC1CC]/30") + (activeFilter === 'rejected' ? ' ring-2 ring-[#324D3E] dark:ring-[#9EE3BF]' : '')}
            variants={itemVariants}
            onClick={() => setActiveFilter(activeFilter === 'rejected' ? 'all' : 'rejected')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={getThemeClasses("text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-200")}>Ditolak</p>
                <p className={getThemeClasses("text-2xl font-bold text-red-600 dark:text-red-400 mt-1 transition-colors duration-300", "!text-[#FF6B9D] dark:!text-red-400")}>
                  {pendingUsers.filter(u => u.verificationStatus === 'rejected').length}
                </p>
              </div>
              <div>
                <XCircle className={getThemeClasses("w-7 h-7 text-red-600 dark:text-red-400", "!text-[#FF6B9D]")}/>
              </div>
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
              <div>
                <h2 className="text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
                  Daftar User
                  {activeFilter !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-300">
                      ({activeFilter === 'resubmissions' ? 'Resubmisi' :
                        activeFilter === 'pending' ? 'Menunggu' :
                        activeFilter === 'approved' ? 'Disetujui' : 'Ditolak'})
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Menampilkan {filteredUsers.length} dari {pendingUsers.length} user
                </p>
              </div>
              <div className="flex items-center gap-3">
                {activeFilter !== 'all' && (
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="text-[#4C3D19] dark:text-white hover:text-[#324D3E] dark:hover:text-gray-200 font-medium text-sm transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Reset Filter
                  </button>
                )}
                <button
                  onClick={fetchPendingUsers}
                  className="text-[#4C3D19] dark:text-white hover:text-[#324D3E] dark:hover:text-gray-200 font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-200 text-sm sm:text-base transition-colors duration-300">
                {pendingUsers.length === 0 ? 'Tidak ada user yang perlu diverifikasi' : 'Tidak ada user yang cocok dengan filter'}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
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
                              <p className="text-xs sm:text-sm text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">{user.email}</p>
                            </div>
                          </div>
                          {(() => {
                            const hasResub = resubmissions.some((r: any) => r.userId.toString() === user._id.toString() && r.status === 'pending');
                            const baseClasses = `px-2 sm:px-3 py-1 text-xs font-semibold rounded-full self-start transition-colors duration-300`;
                            const statusClasses =
                              user.verificationStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                              user.verificationStatus === 'approved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                              'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
                            const label = user.verificationStatus === 'pending' ? 'Menunggu' : user.verificationStatus === 'approved' ? 'Disetujui' : 'Ditolak';
                            return (
                              <span className={`${baseClasses} ${statusClasses}`}>
                                {label}{hasResub ? ' (resubmisi)' : ''}
                              </span>
                            );
                          })()}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                          <div className="space-y-1">
                            <p className="text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">NIK: {user.nik}</p>
                            <p className="text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">Telepon: {user.phoneNumber}</p>
                            <p className="text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">Alamat KTP: {user.ktpAddress}</p>
                            <p className="text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">Kota KTP: {user.ktpCity}, {user.ktpProvince}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">Alamat Domisili: {user.domisiliAddress}</p>
                            <p className="text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">Kota Domisili: {user.domisiliCity}, {user.domisiliProvince}</p>
                            <p className="text-[#889063] dark:text-gray-200 transition-colors duration-300">
                              Tanggal Daftar: {new Date(user.createdAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:ml-4">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className={getThemeClasses("px-3 sm:px-4 py-2 bg-[#324D3E] text-white rounded-lg hover:bg-[#4C3D19] transition-colors text-xs sm:text-sm whitespace-nowrap", "!bg-[#FFC1CC] !text-[#4c1d1d] hover:!bg-[#FFDEE9]")}
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
              className={getThemeClasses("bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0 transition-colors duration-300", "!bg-white/95 !border-[#FFC1CC]/30")}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
                <div className={getThemeClasses("p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl transition-colors duration-300", "!bg-white/95 !border-[#FFC1CC]/30")}> 
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-xl font-bold text-[#324D3E] dark:text-white truncate pr-4 transition-colors duration-300">
                    Detail Verifikasi - {selectedUser.fullName}
                  </h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className={getThemeClasses("text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 p-1 flex-shrink-0 transition-colors duration-300", "!text-[#4c1d1d]")}
                  >
                    <X className={getThemeClasses("w-5 h-5", "w-5 h-5")}/>
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
                        <p className="text-gray-500 dark:text-gray-200 text-sm transition-colors duration-300">Tidak ada foto KTP</p>
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
                        <p className="text-gray-500 dark:text-gray-200 text-sm transition-colors duration-300">Tidak ada foto selfie</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resubmission Images (if any) */}
                {(() => {
                  // Sort oldest first so newest appears at the bottom
                  const userResubs = resubmissions
                    .filter((r: any) => r.userId.toString() === selectedUser._id.toString())
                    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                  if (userResubs.length === 0) return null;
                  return (
                    <div className="mt-4">
                      <h4 className="font-semibold text-[#324D3E] dark:text-white mb-3 text-sm sm:text-base transition-colors duration-300">Riwayat Resubmisi</h4>
                      <div className="space-y-3">
                        {userResubs.map((resub: any) => (
                          <div
                            key={resub._id}
                            onClick={() => setSelectedResubmissionId(resub._id)}
                            className={`p-3 border rounded-lg cursor-pointer ${selectedResubmissionId === resub._id ? 'border-[#324D3E] dark:border-[#9EE3BF] bg-[#F7FFF8]' : 'border-gray-100 dark:border-gray-600'}`}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-[#889063] dark:text-gray-200 mb-2">Foto KTP</p>
                                <div className="relative aspect-[3/2] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                  <Image src={resub.ktpImageUrl} alt="KTP Resubmisi" fill className="object-contain sm:object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-[#889063] dark:text-gray-200 mb-2">Foto Selfie</p>
                                <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                  <Image src={resub.faceImageUrl} alt="Selfie Resubmisi" fill className="object-contain sm:object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                                <p>Status: <strong>{resub.status}</strong> • {new Date(resub.createdAt).toLocaleString('id-ID')}</p>
                              {resub.adminNotes && <p className="mt-1 text-sm text-red-600">Catatan: {resub.adminNotes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* User Details */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg transition-colors duration-300">
                  <h4 className="font-semibold text-[#324D3E] dark:text-white mb-3 text-sm sm:text-base transition-colors duration-300">Informasi User</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="space-y-2">
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Nama: <span className="font-medium">{selectedUser.fullName}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">NIK: <span className="font-medium">{selectedUser.nik}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Email: <span className="font-medium">{selectedUser.email}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Telepon: <span className="font-medium">{selectedUser.phoneNumber}</span></p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-semibold text-[#324D3E] dark:text-white text-xs sm:text-sm">Alamat KTP:</h5>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Alamat: <span className="font-medium">{selectedUser.ktpAddress}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Desa/Kelurahan: <span className="font-medium">{selectedUser.ktpVillage}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Kota: <span className="font-medium">{selectedUser.ktpCity}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Provinsi: <span className="font-medium">{selectedUser.ktpProvince}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Kode Pos: <span className="font-medium">{selectedUser.ktpPostalCode}</span></p>
                    </div>
                  </div>

                  {/* Domisili Address */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h5 className="font-semibold text-[#324D3E] dark:text-white mb-2 text-xs sm:text-sm">Alamat Domisili:</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Alamat: <span className="font-medium">{selectedUser.domisiliAddress}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Desa/Kelurahan: <span className="font-medium">{selectedUser.domisiliVillage}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Kota: <span className="font-medium">{selectedUser.domisiliCity}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Provinsi: <span className="font-medium">{selectedUser.domisiliProvince}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Kode Pos: <span className="font-medium">{selectedUser.domisiliPostalCode}</span></p>
                    </div>
                  </div>

                  {/* Beneficiary Information */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h5 className="font-semibold text-[#324D3E] dark:text-white mb-2 text-xs sm:text-sm">Penerima Manfaat:</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Nama: <span className="font-medium">{selectedUser.beneficiaryName}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">NIK: <span className="font-medium">{selectedUser.beneficiaryNik}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Tanggal Lahir: <span className="font-medium">{selectedUser.beneficiaryDateOfBirth ? new Date(selectedUser.beneficiaryDateOfBirth).toLocaleDateString('id-ID') : '-'}</span></p>
                      <p className="text-gray-600 dark:text-gray-200 transition-colors duration-300">Hubungan: <span className="font-medium">
                        {selectedUser.beneficiaryRelationship === 'orangtua' ? 'Orang Tua' :
                         selectedUser.beneficiaryRelationship === 'suami_istri' ? 'Suami/Istri' :
                         selectedUser.beneficiaryRelationship === 'anak_kandung' ? 'Anak Kandung' :
                         selectedUser.beneficiaryRelationship === 'saudara_kandung' ? 'Saudara Kandung' : '-'}
                      </span></p>
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
                      onClick={() => handleVerification(selectedUser._id, 'approved', selectedResubmissionId)}
                      disabled={processingId === selectedUser._id}
                      className={getThemeClasses("flex-1 bg-green-600 text-white py-3 px-4 sm:px-6 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base font-medium", "!bg-[#B5EAD7] !text-[#4c1d1d]")}
                    >
                      {processingId === selectedUser._id ? 'Memproses...' : (
                        <span className="inline-flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Setujui</span>
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleVerification(selectedUser._id, 'rejected')}
                      disabled={processingId === selectedUser._id}
                      className={getThemeClasses("flex-1 bg-red-600 text-white py-3 px-4 sm:px-6 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm sm:text-base font-medium", "!bg-[#FFC1CC] !text-[#4c1d1d]")}
                    >
                      {processingId === selectedUser._id ? 'Memproses...' : (
                        <span className="inline-flex items-center justify-center gap-2">
                          <XCircle className="w-4 h-4" />
                          <span>Tolak</span>
                        </span>
                      )}
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