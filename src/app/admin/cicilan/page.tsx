'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAlert } from '@/components/ui/Alert';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InvestorGroup, Pagination, InvestorGroupsResponse } from '@/types/cicilan';

export default function AdminCicilanPage() {
  const [investorGroups, setInvestorGroups] = useState<InvestorGroup[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1
  });
  const { showSuccess, showError, AlertComponent } = useAlert();
  const router = useRouter();

  const fetchInvestorGroups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page.toString());
      params.append('limit', '10');

      const response = await fetch(`/api/admin/cicilan/investors?${params}`);
      if (response.ok) {
        const data = await response.json();
        setInvestorGroups(data.investors);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch investor groups');
      }
    } catch (error) {
      console.error('Error fetching investor groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestorGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleViewDetails = (userId: string) => {
    router.push(`/admin/cicilan/${userId}`);
  };

  const getInvestmentStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvestmentStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'completed': return 'Selesai';
      case 'overdue': return 'Terlambat';
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
      <AlertComponent />
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Cicilan</h1>
          <p className="text-gray-600 mt-2">Kelola pembayaran cicilan investasi dari pengguna</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cari Investor</label>
              <input
                type="text"
                placeholder="Cari berdasarkan nama atau email..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Investasi</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="completed">Selesai</option>
                <option value="overdue">Terlambat</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', search: '', page: 1 })}
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
                <p className="text-sm text-gray-600">Total Investor</p>
                <p className="text-2xl font-bold text-gray-900">{pagination?.totalCount || 0}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600">👥</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Perlu Review</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {investorGroups.reduce((sum, group) => sum + group.pendingReviews, 0)}
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
                <p className="text-sm text-gray-600">Total Investasi</p>
                <p className="text-2xl font-bold text-green-600">
                  {investorGroups.reduce((sum, group) => sum + group.totalInvestments, 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600">💰</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Terlambat</p>
                <p className="text-2xl font-bold text-red-600">
                  {investorGroups.reduce((sum, group) => sum + group.overdueCount, 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Investor List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Memuat data investor...</p>
            </div>
          ) : investorGroups.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Belum ada data investor</h3>
              <p className="text-gray-500">Data investor akan muncul di sini ketika pengguna membuat cicilan</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {investorGroups.map((investor) => (
                  <div key={investor.userId} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center">
                            <span className="text-emerald-600 font-semibold text-lg">
                              {investor.userInfo.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{investor.userInfo.fullName}</h3>
                            <p className="text-sm text-gray-500">{investor.userInfo.email}</p>
                            <p className="text-xs text-gray-400">{investor.userInfo.phoneNumber}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">Total Investasi</div>
                            <div className="text-lg font-semibold text-blue-600">{investor.totalInvestments}</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">Nilai Investasi</div>
                            <div className="text-lg font-semibold text-green-600">
                              Rp {investor.totalAmount.toLocaleString('id-ID')}
                            </div>
                          </div>
                          <div className="bg-emerald-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">Sudah Dibayar</div>
                            <div className="text-lg font-semibold text-emerald-600">
                              Rp {investor.totalPaid.toLocaleString('id-ID')}
                            </div>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600">Perlu Review</div>
                            <div className="text-lg font-semibold text-yellow-600">{investor.pendingReviews}</div>
                          </div>
                        </div>

                        {/* Investment Summary */}
                        <div className="mt-4">
                          <div className="text-sm text-gray-600 mb-2">Investasi Aktif:</div>
                          <div className="flex flex-wrap gap-2">
                            {investor.investments.slice(0, 3).map((investment) => (
                              <div key={investment.cicilanOrderId} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm">
                                <span className="text-gray-700">{investment.productName}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getInvestmentStatusColor(investment.status)}`}>
                                  {getInvestmentStatusText(investment.status)}
                                </span>
                              </div>
                            ))}
                            {investor.investments.length > 3 && (
                              <span className="text-sm text-gray-500">+{investor.investments.length - 3} lainnya</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {investor.pendingReviews > 0 && (
                          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                            {investor.pendingReviews} Review
                          </div>
                        )}
                        {investor.overdueCount > 0 && (
                          <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                            {investor.overdueCount} Terlambat
                          </div>
                        )}
                        <button
                          onClick={() => handleViewDetails(investor.userId)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                        >
                          Lihat Detail
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-between items-center p-6 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} dari {pagination.totalCount} investor
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


      </div>
    </AdminLayout>
  );
}

