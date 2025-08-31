'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface DashboardData {
  stats: {
    totalInvestors: number;
    totalTrees: number;
    activeInvestment: string;
    averageTreeAge: string;
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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Memuat data...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
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

  if (!dashboardData) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Gagal memuat data dashboard</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    {
      name: 'Total Investor',
      value: dashboardData.stats.totalInvestors.toLocaleString('id-ID'),
      change: '+0%',
      changeType: 'positive',
      icon: '👥',
      color: 'emerald'
    },
    {
      name: 'Total Pohon',
      value: dashboardData.stats.totalTrees.toLocaleString('id-ID'),
      change: '+0%',
      changeType: 'positive',
      icon: '🌳',
      color: 'green'
    },
    {
      name: 'Investasi Aktif',
      value: dashboardData.stats.activeInvestment,
      change: '+0%',
      changeType: 'positive',
      icon: '💰',
      color: 'yellow'
    },
    {
      name: 'Umur Rata-rata Pohon',
      value: dashboardData.stats.averageTreeAge,
      change: '+0%',
      changeType: 'positive',
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">Dashboard</h1>
          <p className="text-[#889063] mt-1 sm:mt-2 text-sm sm:text-base">Selamat datang di panel admin Koperasi BAHTERA</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
          variants={containerVariants}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.name}
              className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col h-full"
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 25px -5px rgba(50, 77, 62, 0.1), 0 10px 10px -5px rgba(50, 77, 62, 0.04)"
              }}
            >
              <div className="flex items-center justify-between flex-1">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-[#889063] truncate">{stat.name}</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#324D3E] mt-1 truncate">{stat.value}</p>
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
                <span className={`text-xs sm:text-sm font-medium ${stat.changeType === 'positive' ? 'text-[#4C3D19]' : 'text-red-600'}`}>
                  {stat.change}
                </span>
                <span className="text-xs sm:text-sm text-[#889063] ml-2 truncate">dari bulan lalu</span>
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
            className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10"
            variants={itemVariants}
          >
            <div className="p-6 border-b border-[#324D3E]/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">Investor Terbaru</h2>
                <button
                  onClick={() => window.location.href = '/admin/investors'}
                  className="text-[#4C3D19] hover:text-[#324D3E] font-medium text-sm transition-colors"
                >
                  Lihat Semua
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {dashboardData.recentInvestors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Belum ada investor
                  </div>
                ) : (
                  dashboardData.recentInvestors.map((investor) => (
                    <div key={investor.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-[#F8FAF9] to-[#E8F5E8] rounded-xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">{investor.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-[#324D3E]">{investor.name}</p>
                          <p className="text-sm text-[#889063]">{investor.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[#324D3E]">{investor.investment}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${investor.status === 'active'
                          ? 'bg-[#4C3D19]/10 text-[#4C3D19]'
                          : 'bg-red-100 text-red-800'
                          }`}>
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
            className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10"
            variants={itemVariants}
          >
            <div className="p-6 border-b border-[#324D3E]/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">Statistik Pohon</h2>
                <button
                  onClick={() => window.location.href = '/admin/trees'}
                  className="text-[#4C3D19] hover:text-[#324D3E] font-medium text-sm transition-colors"
                >
                  Lihat Semua
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {dashboardData.treeStats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Belum ada data pohon
                  </div>
                ) : (
                  dashboardData.treeStats.map((tree) => (
                    <div key={tree.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${tree.color === 'amber' ? 'bg-amber-500' :
                          tree.color === 'green' ? 'bg-green-500' : 'bg-emerald-500'
                          }`}></div>
                        <div>
                          <p className="font-medium text-[#324D3E]">{tree.name}</p>
                          <p className="text-sm text-[#889063]">{tree.count} pohon</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[#324D3E]">{tree.value}</p>
                        <p className="text-sm text-[#4C3D19]">{tree.growth}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Stats Summary */}
              <div className="mt-6 p-4 bg-gradient-to-r from-[#F8FAF9] to-[#E8F5E8] rounded-xl">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-[#889063]">Aktif</p>
                    <p className="text-lg font-bold text-[#4C3D19]">{dashboardData.investorStats.active}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#889063]">Tidak Aktif</p>
                    <p className="text-lg font-bold text-red-600">{dashboardData.investorStats.inactive}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#889063]">Total</p>
                    <p className="text-lg font-bold text-[#324D3E]">{dashboardData.investorStats.total}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6"
          variants={itemVariants}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">Aksi Cepat</h2>
            <button
              onClick={fetchDashboardData}
              className="text-[#4C3D19] hover:text-[#324D3E] font-medium text-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
            >
              🔄 Refresh Data
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <button
              onClick={() => window.location.href = '/admin/verification'}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-[#324D3E]/20 rounded-xl hover:border-[#324D3E] hover:bg-[#324D3E]/5 transition-all group"
            >
              <div className="w-10 h-10 bg-[#324D3E]/10 group-hover:bg-[#324D3E]/20 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-[#324D3E]">✅</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-[#324D3E]">Verifikasi User</p>
                <p className="text-sm text-[#889063]">Verifikasi KTP dan foto user</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/investors'}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-[#324D3E]/20 rounded-xl hover:border-[#324D3E] hover:bg-[#324D3E]/5 transition-all group"
            >
              <div className="w-10 h-10 bg-[#324D3E]/10 group-hover:bg-[#324D3E]/20 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-[#324D3E]">👥</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-[#324D3E]">Kelola Investor</p>
                <p className="text-sm text-[#889063]">Lihat dan kelola investor</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/trees'}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-[#4C3D19]/20 rounded-xl hover:border-[#4C3D19] hover:bg-[#4C3D19]/5 transition-all group"
            >
              <div className="w-10 h-10 bg-[#4C3D19]/10 group-hover:bg-[#4C3D19]/20 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-[#4C3D19]">🌳</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-[#324D3E]">Kelola Pohon</p>
                <p className="text-sm text-[#889063]">Lihat dan kelola data pohon</p>
              </div>
            </button>

            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-[#889063]/20 rounded-xl hover:border-[#889063] hover:bg-[#889063]/5 transition-all group"
            >
              <div className="w-10 h-10 bg-[#889063]/10 group-hover:bg-[#889063]/20 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-[#889063]">📊</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-[#324D3E]">Refresh Dashboard</p>
                <p className="text-sm text-[#889063]">Perbarui data terbaru</p>
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AdminLayout>
  );
}