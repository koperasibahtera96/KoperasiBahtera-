'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface DashboardData {
  stats: {
    totalInvestors: number;
    totalTrees: number;
    activeInvestment: string;
    averageTreeAge: string;
    monthlyGrowth: {
      investors: string;
      trees: string;
      investment: string;
      roi: string;
    };
  };
  recentInvestors: Array<{
    id: string;
    name: string;
    email: string;
    investment: string;
    date: string;
    status: string;
  }>;
  treeStats: Array<{
    name: string;
    count: number;
    value: string;
    growth: string;
    color: string;
  }>;
  investorStats: {
    active: number;
    inactive: number;
    total: number;
  };
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to get theme-aware classes
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard');

      if (response.ok) {
        const result = await response.json();
        setDashboardData(result.data);
      } else {
        console.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className={getThemeClasses("text-3xl font-bold text-gray-900 dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>Dashboard</h1>
            <p className={getThemeClasses("text-gray-600 dark:text-gray-300 mt-2", "!text-[#6b7280] dark:!text-gray-300")}>Memuat data...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={getThemeClasses("bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse", "!bg-white/80 !border-[#FFC1CC]/30")}>
                <div className={getThemeClasses("h-4 bg-gray-200 rounded w-1/2 mb-2", "!bg-[#FFC1CC]/30")}></div>
                <div className={getThemeClasses("h-8 bg-gray-200 rounded w-3/4", "!bg-[#FFC1CC]/30")}></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!dashboardData) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className={getThemeClasses("text-3xl font-bold text-gray-900 dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>Dashboard</h1>
            <p className={getThemeClasses("text-gray-600 dark:text-gray-300 mt-2", "!text-[#6b7280] dark:!text-gray-300")}>Gagal memuat data dashboard</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    {
      name: 'Total Investor',
      value: dashboardData.stats.totalInvestors.toLocaleString('id-ID'),
      change: dashboardData.stats.monthlyGrowth.investors,
      changeType: dashboardData.stats.monthlyGrowth.investors.startsWith('+') || dashboardData.stats.monthlyGrowth.investors === '0%' ? 'positive' : 'negative',
      icon: '👥',
      color: 'emerald'
    },
    {
      name: 'Total Pohon',
      value: dashboardData.stats.totalTrees.toLocaleString('id-ID'),
      change: dashboardData.stats.monthlyGrowth.trees,
      changeType: dashboardData.stats.monthlyGrowth.trees.startsWith('+') || dashboardData.stats.monthlyGrowth.trees === '0%' ? 'positive' : 'negative',
      icon: '🌳',
      color: 'green'
    },
    {
      name: 'Investasi Aktif',
      value: dashboardData.stats.activeInvestment,
      change: dashboardData.stats.monthlyGrowth.investment,
      changeType: dashboardData.stats.monthlyGrowth.investment.startsWith('+') || dashboardData.stats.monthlyGrowth.investment === '0%' ? 'positive' : 'negative',
      icon: '💰',
      color: 'yellow'
    },
    {
      name: 'Umur Rata-rata Pohon',
      value: dashboardData.stats.averageTreeAge,
      change: dashboardData.stats.monthlyGrowth.roi,
      changeType: dashboardData.stats.monthlyGrowth.roi.startsWith('+') || dashboardData.stats.monthlyGrowth.roi === '0%' ? 'positive' : 'negative',
      icon: '📈',
      color: 'blue'
    }
  ];

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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
          <h1 className={getThemeClasses("text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>Dashboard</h1>
          <p className={getThemeClasses("text-[#889063] dark:text-gray-300 mt-1 sm:mt-2 text-sm sm:text-base transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>Selamat datang di panel admin Koperasi BAHTERA</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
          variants={containerVariants}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.name}
              className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col h-full", "!bg-white/80 !border-[#FFC1CC]/30")}
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 25px -5px rgba(50, 77, 62, 0.1), 0 10px 10px -5px rgba(50, 77, 62, 0.04)"
              }}
            >
              <div className="flex items-center justify-between flex-1">
                <div className="min-w-0 flex-1">
                  <p className={getThemeClasses("text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-400 truncate transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>{stat.name}</p>
                  <p className={getThemeClasses("text-lg sm:text-xl lg:text-2xl font-bold text-[#324D3E] dark:text-white mt-1 truncate transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>{stat.value}</p>
                </div>
                <motion.div
                  className="text-2xl sm:text-3xl ml-2 flex-shrink-0"
                  animate={{
                    rotate: [0, 10, -10, 0],
                    transition: {
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.5
                    }
                  }}
                >
                  {stat.icon}
                </motion.div>
              </div>
              <div className="mt-3 sm:mt-4 flex items-center">
                <span className={getThemeClasses(`text-xs sm:text-sm font-medium ${stat.changeType === 'positive' ? 'text-[#4C3D19] dark:text-green-400' : 'text-red-600 dark:text-red-400'}`, stat.changeType === 'positive' ? '!text-[#4c1d1d] dark:!text-green-400' : '!text-[#FF6B9D] dark:!text-red-400')}>
                  {stat.change}
                </span>
                <span className={getThemeClasses("text-xs sm:text-sm text-[#889063] dark:text-gray-400 ml-2 truncate transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>dari bulan lalu</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8"
          variants={containerVariants}
        >
          {/* Recent Investors */}
          <motion.div
            className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300", "!bg-white/80 !border-[#FFC1CC]/30")}
            variants={itemVariants}
          >
            <div className={getThemeClasses("p-6 border-b border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300", "!border-[#FFC1CC]/30")}>
              <div className="flex items-center justify-between">
                <h2 className={getThemeClasses("text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>Investor Terbaru</h2>
                <button
                  onClick={() => window.location.href = '/admin/investors'}
                  className={getThemeClasses("text-[#4C3D19] dark:text-green-400 hover:text-[#324D3E] dark:hover:text-green-300 font-medium text-sm transition-colors", "!text-[#6b7280] hover:!text-[#831843] dark:!text-green-400 dark:hover:!text-green-300")}
                >
                  Lihat Semua
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {dashboardData.recentInvestors.length === 0 ? (
                  <div className={getThemeClasses("text-center py-8 text-gray-500 dark:text-gray-400 transition-colors duration-300", "!text-[#6b7280]")}>                    Belum ada investor
                  </div>
                ) : (
                  dashboardData.recentInvestors.map((investor) => (
                    <div key={investor.id} className={getThemeClasses("flex items-center justify-between p-4 bg-gradient-to-r from-[#F8FAF9] to-[#E8F5E8] dark:from-gray-700 dark:to-gray-600 rounded-xl hover:shadow-md transition-all duration-300", "!bg-gradient-to-r !from-[#FFEEF0] !to-[#FFF5F5]")}>                      <div className="flex items-center gap-3">
                        <div className={getThemeClasses("w-10 h-10 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center", "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9]")}>                          <span className={getThemeClasses("text-white font-bold", "!text-[#4c1d1d] dark:!text-white")}>{investor.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className={getThemeClasses("font-medium text-[#324D3E] dark:text-white transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>{investor.name}</p>
                          <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>{investor.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={getThemeClasses("font-medium text-[#324D3E] dark:text-white transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>{investor.investment}</p>
                        <span className={getThemeClasses(`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors duration-300 ${investor.status === 'active'
                          ? 'bg-[#4C3D19]/10 dark:bg-[#4C3D19]/20 text-[#4C3D19] dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                          }`, investor.status === 'active' ? '!bg-[#FFC1CC]/20 !text-[#4c1d1d] dark:!text-green-400' : '!bg-[#FFB3C6]/20 !text-[#4c1d1d] dark:!text-red-300')}>
                          {investor.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Tree Statistics */}
          <motion.div
            className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300", "!bg-white/80 !border-[#FFC1CC]/30")}
            variants={itemVariants}
          >
            <div className={getThemeClasses("p-6 border-b border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300", "!border-[#FFC1CC]/30")}>
              <div className="flex items-center justify-between">
                <h2 className={getThemeClasses("text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>Statistik Pohon</h2>
                <button
                  onClick={() => window.location.href = '/admin/trees'}
                  className={getThemeClasses("text-[#4C3D19] dark:text-green-400 hover:text-[#324D3E] dark:hover:text-green-300 font-medium text-sm transition-colors", "!text-[#6b7280] hover:!text-[#831843] dark:!text-green-400 dark:hover:!text-green-300")}
                >
                  Lihat Semua
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {dashboardData.treeStats.length === 0 ? (
                  <div className={getThemeClasses("text-center py-8 text-gray-500 dark:text-gray-400 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>                    Belum ada data pohon
                  </div>
                ) : (
                  dashboardData.treeStats.map((tree) => (
                    <div key={tree.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${tree.color === 'amber' ? 'bg-amber-500' :
                          tree.color === 'green' ? 'bg-green-500' : 'bg-emerald-500'
                          }`}></div>
                        <div>
                          <p className={getThemeClasses("font-medium text-[#324D3E] dark:text-white transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>{tree.name}</p>
                          <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>{tree.count} pohon</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={getThemeClasses("font-medium text-[#324D3E] dark:text-white transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>{tree.value}</p>
                        <p className={getThemeClasses(`text-sm transition-colors duration-300 ${
                          tree.growth.startsWith('+') || tree.growth === '0%'
                            ? 'text-[#4C3D19] dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`, tree.growth.startsWith('+') || tree.growth === '0%' ? '!text-[#4c1d1d] dark:!text-green-400' : '!text-[#FF6B9D] dark:!text-red-400')}>{tree.growth}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Stats Summary */}
              <div className={getThemeClasses("mt-6 p-4 bg-gradient-to-r from-[#F8FAF9] to-[#E8F5E8] dark:from-gray-700 dark:to-gray-600 rounded-xl transition-colors duration-300", "!bg-gradient-to-r !from-[#FFEEF0] !to-[#FFF5F5]")}>                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>Aktif</p>
                    <p className={getThemeClasses("text-lg font-bold text-[#4C3D19] dark:text-green-400 transition-colors duration-300", "!text-[#4c1d1d] dark:!text-green-400")}>{dashboardData.investorStats.active}</p>
                  </div>
                  <div>
                    <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>Tidak Aktif</p>
                    <p className={getThemeClasses("text-lg font-bold text-red-600 dark:text-red-400 transition-colors duration-300", "!text-[#FF6B9D] dark:!text-red-400")}>{dashboardData.investorStats.inactive}</p>
                  </div>
                  <div>
                    <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>Total</p>
                    <p className={getThemeClasses("text-lg font-bold text-[#324D3E] dark:text-white transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>{dashboardData.investorStats.total}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Management Tools */}
        <motion.div
          className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 transition-colors duration-300 mb-6", "!bg-white/80 !border-[#FFC1CC]/30")}
          variants={itemVariants}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <h2 className={getThemeClasses("text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>Tools Manajemen</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <button
              onClick={() => window.location.href = '/admin/plant-showcase'}
              className={getThemeClasses("flex items-center gap-3 p-4 border-2 border-dashed border-[#4C3D19]/20 rounded-xl hover:border-[#4C3D19] hover:bg-[#4C3D19]/5 transition-all group", "!border-[#FFC1CC]/30 hover:!border-[#FFC1CC] hover:!bg-[#FFC1CC]/10")}
            >
              <div className={getThemeClasses("w-10 h-10 bg-[#4C3D19]/10 group-hover:bg-[#4C3D19]/20 rounded-xl flex items-center justify-center transition-colors", "!bg-[#B5EAD7]/20 group-hover:!bg-[#B5EAD7]/30")}>                <span className={getThemeClasses("text-[#4C3D19]", "!text-[#4c1d1d] dark:!text-white")}>🌿</span>
              </div>
              <div className="text-left">
                <p className={getThemeClasses("font-medium text-[#324D3E] dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>Edit Harga Tanaman</p>
                <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-300", "!text-[#6b7280] dark:!text-gray-300")}>Kelola harga showcase landing page</p>
              </div>
            </button>
            <button
              onClick={() => window.location.href = '/admin/registration-fee'}
              className={getThemeClasses("flex items-center gap-3 p-4 border-2 border-dashed border-[#324D3E]/20 rounded-xl hover:border-[#324D3E] hover:bg-[#324D3E]/5 transition-all group", "!border-[#C7CEEA]/30 hover:!border-[#C7CEEA] hover:!bg-[#C7CEEA]/10")}
            >
              <div className={getThemeClasses("w-10 h-10 bg-[#324D3E]/10 group-hover:bg-[#324D3E]/20 rounded-xl flex items-center justify-center transition-colors", "!bg-[#C7CEEA]/20 group-hover:!bg-[#C7CEEA]/30")}>                <span className={getThemeClasses("text-[#324D3E]", "!text-[#4c1d1d] dark:!text-white")}>💳</span>
              </div>
              <div className="text-left">
                <p className={getThemeClasses("font-medium text-[#324D3E] dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>Biaya Pendaftaran</p>
                <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-300", "!text-[#6b7280] dark:!text-gray-300")}>Kelola biaya pendaftaran user</p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 transition-colors duration-300", "!bg-white/80 !border-[#FFC1CC]/30")}
          variants={itemVariants}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <h2 className={getThemeClasses("text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>Aksi Cepat</h2>
            <button
              onClick={fetchDashboardData}
              className={getThemeClasses("text-[#4C3D19] dark:text-green-400 hover:text-[#324D3E] dark:hover:text-green-300 font-medium text-sm flex items-center gap-2 transition-colors self-start sm:self-auto", "!text-[#6b7280] hover:!text-[#831843] dark:!text-green-400 dark:hover:!text-green-300")}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <button
              onClick={() => window.location.href = '/admin/verification'}
              className={getThemeClasses("flex items-center gap-3 p-4 border-2 border-dashed border-[#324D3E]/20 rounded-xl hover:border-[#324D3E] hover:bg-[#324D3E]/5 transition-all group", "!border-[#FFC1CC]/30 hover:!border-[#FFC1CC] hover:!bg-[#FFC1CC]/10")}
            >
              <div className={getThemeClasses("w-10 h-10 bg-[#324D3E]/10 group-hover:bg-[#324D3E]/20 rounded-xl flex items-center justify-center transition-colors", "!bg-[#FFC1CC]/30 group-hover:!bg-[#FFC1CC]/40")}>                <span className={getThemeClasses("text-[#324D3E]", "!text-[#4c1d1d] dark:!text-white")}>✅</span>
              </div>
              <div className="text-left">
                <p className={getThemeClasses("font-medium text-[#324D3E] dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>Verifikasi User</p>
                <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-300", "!text-[#6b7280] dark:!text-gray-300")}>Verifikasi KTP dan foto user</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/investors'}
              className={getThemeClasses("flex items-center gap-3 p-4 border-2 border-dashed border-[#324D3E]/20 rounded-xl hover:border-[#324D3E] hover:bg-[#324D3E]/5 transition-all group", "!border-[#B5EAD7]/30 hover:!border-[#B5EAD7] hover:!bg-[#B5EAD7]/10")}
            >
              <div className={getThemeClasses("w-10 h-10 bg-[#324D3E]/10 group-hover:bg-[#324D3E]/20 rounded-xl flex items-center justify-center transition-colors", "!bg-[#B5EAD7]/30 group-hover:!bg-[#B5EAD7]/40")}>                <span className={getThemeClasses("text-[#324D3E]", "!text-[#4c1d1d] dark:!text-white")}>👥</span>
              </div>
              <div className="text-left">
                <p className={getThemeClasses("font-medium text-[#324D3E] dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>Kelola Investor</p>
                <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-300", "!text-[#6b7280] dark:!text-gray-300")}>Lihat dan kelola investor</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/trees'}
              className={getThemeClasses("flex items-center gap-3 p-4 border-2 border-dashed border-[#4C3D19]/20 rounded-xl hover:border-[#4C3D19] hover:bg-[#4C3D19]/5 transition-all group", "!border-[#C7CEEA]/30 hover:!border-[#C7CEEA] hover:!bg-[#C7CEEA]/10")}
            >
              <div className={getThemeClasses("w-10 h-10 bg-[#4C3D19]/10 group-hover:bg-[#4C3D19]/20 rounded-xl flex items-center justify-center transition-colors", "!bg-[#C7CEEA]/30 group-hover:!bg-[#C7CEEA]/40")}>                <span className={getThemeClasses("text-[#4C3D19]", "!text-[#4c1d1d] dark:!text-white")}>🌳</span>
              </div>
              <div className="text-left">
                <p className={getThemeClasses("font-medium text-[#324D3E] dark:text-white", "!text-[#4c1d1d] dark:!text-white")}>Kelola Pohon</p>
                <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-300", "!text-[#6b7280] dark:!text-gray-300")}>Lihat dan kelola data pohon</p>
              </div>
            </button>


            <button
              onClick={fetchDashboardData}
              className={getThemeClasses("flex items-center gap-3 p-4 border-2 border-dashed border-[#889063]/20 dark:border-[#889063]/40 rounded-xl hover:border-[#889063] hover:bg-[#889063]/5 dark:hover:bg-[#889063]/10 transition-all group", "!border-[#FFDEE9]/30 hover:!border-[#FFDEE9] hover:!bg-[#FFDEE9]/10")}
            >
              <div className={getThemeClasses("w-10 h-10 bg-[#889063]/10 dark:bg-[#889063]/20 group-hover:bg-[#889063]/20 dark:group-hover:bg-[#889063]/30 rounded-xl flex items-center justify-center transition-colors", "!bg-[#FFDEE9]/30 group-hover:!bg-[#FFDEE9]/40")}>                <RefreshCw className={getThemeClasses("w-5 h-5 text-[#889063]", "!text-[#4c1d1d] dark:!text-white")} />
              </div>
              <div className="text-left">
                <p className={getThemeClasses("font-medium text-[#324D3E] dark:text-white transition-colors duration-300", "!text-[#4c1d1d] dark:!text-white")}>Refresh Dashboard</p>
                <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400 transition-colors duration-300", "!text-[#6b7280] dark:!text-gray-300")}>Perbarui data terbaru</p>
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AdminLayout>
  );
}