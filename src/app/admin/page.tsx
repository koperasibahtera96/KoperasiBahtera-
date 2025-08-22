'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
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
            {[1,2,3,4].map((i) => (
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

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Selamat datang di panel admin Investasi Hijau</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="flex items-center justify-between flex-1">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className="text-3xl">
                  {stat.icon}
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">dari bulan lalu</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Investors */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Investor Terbaru</h2>
                <button
                  onClick={() => window.location.href = '/admin/investors'}
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
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
                    <div key={investor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">{investor.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{investor.name}</p>
                          <p className="text-sm text-gray-500">{investor.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{investor.investment}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          investor.status === 'active'
                            ? 'bg-green-100 text-green-800'
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
          </div>

          {/* Tree Statistics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Statistik Pohon</h2>
                <button
                  onClick={() => window.location.href = '/admin/trees'}
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
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
                        <div className={`w-3 h-3 rounded-full ${
                          tree.color === 'amber' ? 'bg-amber-500' :
                          tree.color === 'green' ? 'bg-green-500' : 'bg-emerald-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{tree.name}</p>
                          <p className="text-sm text-gray-500">{tree.count} pohon</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{tree.value}</p>
                        <p className="text-sm text-green-600">{tree.growth}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Stats Summary */}
              <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Aktif</p>
                    <p className="text-lg font-bold text-emerald-600">{dashboardData.investorStats.active}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tidak Aktif</p>
                    <p className="text-lg font-bold text-red-600">{dashboardData.investorStats.inactive}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-lg font-bold text-gray-900">{dashboardData.investorStats.total}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Aksi Cepat</h2>
            <button
              onClick={fetchDashboardData}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-2"
            >
              🔄 Refresh Data
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/admin/investors'}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg flex items-center justify-center">
                <span className="text-emerald-600">👥</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Kelola Investor</p>
                <p className="text-sm text-gray-500">Lihat dan kelola investor</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/trees'}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
            >
              <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center">
                <span className="text-green-600">🌳</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Kelola Pohon</p>
                <p className="text-sm text-gray-500">Lihat dan kelola data pohon</p>
              </div>
            </button>

            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center">
                <span className="text-blue-600">📊</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Refresh Dashboard</p>
                <p className="text-sm text-gray-500">Perbarui data terbaru</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}