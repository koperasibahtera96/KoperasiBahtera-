'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface PlantInstance {
  id: string;
  plantType: 'gaharu' | 'alpukat' | 'jengkol' | 'aren';
  instanceName: string;
  baseAnnualROI: number;
  location: string;
  status: string;
  qrCode?: string;
  fotoGambar?: string;
  owner: string;
  contractNumber?: string;
  totalOperationalCosts: number;
  totalIncome: number;
  recentCosts: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    addedBy: string;
  }>;
  recentIncome: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    addedBy: string;
  }>;
  lastUpdate?: string;
  history: Array<{
    action: string;
    date: string;
    description: string;
    addedBy: string;
  }>;
}

interface Investment {
  investmentId: string;
  productName: string;
  paymentType: 'full' | 'cicilan';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  totalAmount: number;
  amountPaid: number;
  progress: number;
  investmentDate: string;
  completionDate?: string;
  nextPaymentInfo?: {
    installmentNumber: number;
    amount: number;
    dueDate: string;
  };
  plantInstance: PlantInstance | null;
}

interface UserInvestmentData {
  userInfo: {
    name: string;
    email: string;
    phoneNumber: string;
  };
  totalInvestments: number;
  totalAmount: number;
  totalPaid: number;
  jumlahPohon: number;
  investments: Investment[];
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: any = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20
    }
  }
};

const cardVariants: any = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 20
    }
  }
};

export default function InvestasiPage() {
  const [data, setData] = useState<UserInvestmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const {  status } = useSession();
  // const router = useRouter();

  useEffect(() => {
      fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/investors/investments');
      if (response.ok) {
        const result = await response.json();

        console.log(result, 'result')
        setData(result.data || null);
      } else {
        console.error('Failed to fetch investments');
      }
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'completed': return 'Selesai';
      case 'pending': return 'Menunggu';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  const getPlantTypeIcon = (plantType: string) => {
    switch (plantType) {
      case 'gaharu': return '🌿';
      case 'alpukat': return '🥑';
      case 'jengkol': return '🌱';
      case 'aren': return '🌴';
      default: return '🌳';
    }
  };

  const getPlantTypeName = (plantType: string) => {
    switch (plantType) {
      case 'gaharu': return 'Gaharu';
      case 'alpukat': return 'Alpukat';
      case 'jengkol': return 'Jengkol';
      case 'aren': return 'Aren';
      default: return plantType;
    }
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== "number" || isNaN(amount)) {
      // amount is not a valid number
      return 0;
    }

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-[#324D3E] border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-[#324D3E] text-lg font-medium">Memuat investasi Anda...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <motion.div
        className="bg-white/80 backdrop-blur-sm border-b border-green-100 sticky top-0 z-40"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <Link href="/">
                <motion.div
                  className="flex items-center space-x-2 cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Image
                    src="/images/koperasi-logo.jpg"
                    alt="Logo"
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-[#324D3E]">Investasi Saya</h1>
                    <p className="text-sm text-gray-600">Kelola dan pantau investasi Anda</p>
                  </div>
                </motion.div>
              </Link>
            </div>
            <div className="w-full sm:w-auto flex justify-end sm:justify-start items-center space-x-3">
              <Link href="/cicilan">
                <motion.button
                  className="px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base text-[#324D3E] border border-[#324D3E] rounded-full hover:bg-[#324D3E] hover:text-white transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cicilan Saya
                </motion.button>
              </Link>
              <Link href="/">
                <motion.button
                  className="px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base bg-[#324D3E] text-white rounded-full hover:bg-[#4C3D19] transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Kembali
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Stats Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {[
              {
                title: 'Total Investasi',
                value: data?.totalInvestments || 0,
                suffix: ' Investasi',
                icon: '📊',
                bgColor: 'from-blue-500 to-blue-600'
              },
              {
                title: 'Nilai Investasi',
                value: formatCurrency(data?.totalAmount || 0),
                suffix: '',
                icon: '💰',
                bgColor: 'from-green-500 to-green-600'
              },
              {
                title: 'Sudah Dibayar',
                value: formatCurrency(data?.totalPaid || 0),
                suffix: '',
                icon: '✅',
                bgColor: 'from-emerald-500 to-emerald-600'
              },
              {
                title: 'Jumlah Pohon',
                value: data?.jumlahPohon || 0,
                suffix: ' Pohon',
                icon: '🌳',
                bgColor: 'from-teal-500 to-teal-600'
              }
            ].map((stat) => (
              <motion.div
                key={stat.title}
                variants={cardVariants}
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.bgColor} flex items-center justify-center text-white text-xl mb-4`}>
                  {stat.icon}
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {typeof stat.value === 'string' ? stat.value : stat.value + stat.suffix}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Investments Grid */}
          {data && data.investments.length > 0 ? (
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {data.investments.map((investment, index) => (
                <motion.div
                  key={investment.investmentId}
                  variants={cardVariants}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)"
                  }}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden cursor-pointer"
                  onClick={() => setSelectedInvestment(investment)}
                  layout
                >
                  {/* Investment Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-3xl">
                          {investment.plantInstance ?
                            getPlantTypeIcon(investment.plantInstance.plantType) :
                            '🌱'
                          }
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{investment.productName}</h3>
                          <p className="text-sm text-gray-600">
                            {investment.plantInstance ?
                              getPlantTypeName(investment.plantInstance.plantType) :
                              'Tanaman'
                            }
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}>
                        {getStatusText(investment.status)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{investment.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${investment.progress}%` }}
                          transition={{ duration: 1, delay: index * 0.2 }}
                        />
                      </div>
                    </div>

                    {/* Investment Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Investasi</span>
                        <p className="font-semibold text-gray-900">{formatCurrency(investment.totalAmount)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Sudah Dibayar</span>
                        <p className="font-semibold text-green-600">{formatCurrency(investment.amountPaid)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Plant Instance Info */}
                  {investment.plantInstance && (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Informasi Tanaman</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          investment.plantInstance.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {investment.plantInstance.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Lokasi:</span>
                          <span className="text-gray-900">{investment.plantInstance.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ROI Tahunan:</span>
                          <span className="text-green-600 font-medium">
                            {(investment.plantInstance.baseAnnualROI * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pendapatan:</span>
                          <span className="text-green-600 font-medium">
                            {formatCurrency(investment.plantInstance.totalIncome)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Biaya Operasional:</span>
                          <span className="text-red-600 font-medium">
                            {formatCurrency(investment.plantInstance.totalOperationalCosts)}
                          </span>
                        </div>
                      </div>

                      {/* Recent History Preview */}
                      {investment.plantInstance?.history && investment.plantInstance.history.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Riwayat Terbaru</h5>
                          <div className="space-y-2 max-h-24 overflow-hidden">
                            {investment.plantInstance.history.slice(-2).map((historyItem, index) => (
                              <div key={index} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-200">
                                <div className="flex justify-between items-start">
                                  <span className="font-medium text-gray-700">{historyItem.action}</span>
                                  <span className="text-gray-500 ml-2">
                                    {new Date(historyItem.date).toLocaleDateString('id-ID', { 
                                      day: '2-digit', 
                                      month: 'short' 
                                    })}
                                  </span>
                                </div>
                                {historyItem.description && (
                                  <p className="text-gray-600 mt-1 line-clamp-1">{historyItem.description}</p>
                                )}
                                {historyItem.addedBy && (
                                  <p className="text-gray-500 mt-1">oleh: {historyItem.addedBy}</p>
                                )}
                              </div>
                            ))}
                            {investment.plantInstance.history.length > 2 && (
                              <p className="text-xs text-blue-600 font-medium">
                                +{investment.plantInstance.history.length - 2} riwayat lainnya
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {investment.nextPaymentInfo && (
                        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm text-amber-800">
                            <span className="font-medium">Pembayaran Berikutnya:</span><br />
                            Cicilan ke-{investment.nextPaymentInfo.installmentNumber} • {formatCurrency(investment.nextPaymentInfo.amount)}<br />
                            Jatuh tempo: {formatDate(investment.nextPaymentInfo.dueDate)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {!investment.plantInstance && (
                    <div className="p-6">
                      <div className="text-center py-4">
                        <div className="text-gray-400 text-2xl mb-2">🌱</div>
                        <p className="text-sm text-gray-600">
                          Tanaman akan dialokasikan setelah pembayaran dikonfirmasi
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              variants={itemVariants}
              className="text-center py-16"
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                🌱
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Belum Ada Investasi
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Mulai investasi hijau Anda hari ini dan berkontribusi untuk masa depan yang lebih berkelanjutan.
              </p>
              <Link href="/#produk">
                <motion.button
                  className="px-6 py-3 bg-[#324D3E] text-white rounded-full hover:bg-[#4C3D19] transition-colors font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Mulai Investasi
                </motion.button>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Investment Detail Modal */}
      <AnimatePresence>
        {selectedInvestment && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedInvestment(null)}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">
                      {selectedInvestment.plantInstance ?
                        getPlantTypeIcon(selectedInvestment.plantInstance.plantType) :
                        '🌱'
                      }
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedInvestment.productName}</h2>
                      <p className="text-sm text-gray-600">ID: {selectedInvestment.investmentId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedInvestment(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Investment Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Ringkasan Investasi</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Jenis Pembayaran</span>
                      <p className="font-semibold">{selectedInvestment.paymentType === 'full' ? 'Lunas' : 'Cicilan'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Status</span>
                      <p className="font-semibold">{getStatusText(selectedInvestment.status)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Tanggal Investasi</span>
                      <p className="font-semibold">{formatDate(selectedInvestment.investmentDate)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Progress</span>
                      <p className="font-semibold text-green-600">{selectedInvestment.progress}%</p>
                    </div>
                  </div>
                </div>

                {/* Plant Instance Details */}
                {selectedInvestment.plantInstance && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Detail Tanaman</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium mb-2">{selectedInvestment.plantInstance.instanceName}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Tipe:</span>
                            <p>{getPlantTypeName(selectedInvestment.plantInstance.plantType)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <p className="capitalize">{selectedInvestment.plantInstance.status}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Lokasi:</span>
                            <p>{selectedInvestment.plantInstance.location}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">ROI Tahunan:</span>
                            <p className="text-green-600 font-medium">
                              {(selectedInvestment.plantInstance.baseAnnualROI * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <span className="text-sm text-gray-600">Total Pendapatan</span>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(selectedInvestment.plantInstance.totalIncome)}
                          </p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                          <span className="text-sm text-gray-600">Biaya Operasional</span>
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(selectedInvestment.plantInstance.totalOperationalCosts)}
                          </p>
                        </div>
                      </div>

                      {/* Complete History */}
                      {selectedInvestment.plantInstance.history && selectedInvestment.plantInstance.history.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3">Riwayat Lengkap</h4>
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {selectedInvestment.plantInstance.history
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((historyItem, index) => (
                              <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium text-gray-900">{historyItem.action}</span>
                                  <span className="text-sm text-gray-500">
                                    {formatDate(historyItem.date)}
                                  </span>
                                </div>
                                {historyItem.description && (
                                  <p className="text-sm text-gray-700 mb-2">{historyItem.description}</p>
                                )}
                                {historyItem.addedBy && (
                                  <p className="text-xs text-gray-500">
                                    Ditambahkan oleh: {historyItem.addedBy}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Activity */}
                      {((selectedInvestment.plantInstance.recentIncome && selectedInvestment.plantInstance.recentIncome.length > 0) || (selectedInvestment.plantInstance.recentCosts && selectedInvestment.plantInstance.recentCosts.length > 0)) && (
                        <div>
                          <h4 className="font-medium mb-3">Aktivitas Keuangan Terbaru</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {[...(selectedInvestment.plantInstance.recentIncome || []).map(income => ({
                              ...income,
                              type: 'income'
                            })), ...(selectedInvestment.plantInstance.recentCosts || []).map(cost => ({
                              ...cost,
                              type: 'cost'
                            }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((activity, index) => (
                              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{activity.description}</p>
                                  <p className="text-xs text-gray-600">{formatDate(activity.date)}</p>
                                </div>
                                <span className={`text-sm font-medium ${activity.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                  {activity.type === 'income' ? '+' : '-'}{formatCurrency(activity.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}