'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAlert } from '@/components/ui/Alert';
import { InvestorGroup, Pagination } from '@/types/cicilan';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminCicilanPage() {
  const [investorGroups, setInvestorGroups] = useState<InvestorGroup[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1
  });
  const {  AlertComponent } = useAlert();
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

        console.log(data.investors, 'data.investors')
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
    console.log(userId, 'userid')
    router.push(`/admin/cicilan/${userId.toString()}`);
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


  return (
    <AdminLayout>
      <AlertComponent />
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">Kelola Cicilan</h1>
          <p className="text-[#889063] mt-2">Kelola pembayaran cicilan investasi dari pengguna</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#324D3E] mb-2 font-[family-name:var(--font-poppins)]">Cari Investor</label>
              <input
                type="text"
                placeholder="Cari berdasarkan nama atau email..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full border border-[#324D3E]/20 rounded-xl p-3 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 text-[#324D3E] placeholder-[#889063] transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#324D3E] mb-2 font-[family-name:var(--font-poppins)]">Status Investasi</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="w-full border border-[#324D3E]/20 rounded-xl p-3 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 text-[#324D3E] transition-all duration-300"
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
                className="w-full px-4 py-3 bg-[#324D3E]/10 text-[#324D3E] rounded-xl hover:bg-[#324D3E]/20 transition-all duration-300 font-medium font-[family-name:var(--font-poppins)]"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#889063] font-[family-name:var(--font-poppins)]">Total Investor</p>
                <p className="text-2xl font-bold text-[#324D3E]">{pagination?.totalCount || 0}</p>
              </div>
              <div className="w-12 h-12 bg-[#324D3E]/10 rounded-xl flex items-center justify-center">
                <span className="text-[#324D3E] text-xl">👥</span>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#889063] font-[family-name:var(--font-poppins)]">Perlu Review</p>
                <p className="text-2xl font-bold text-[#889063]">
                  {investorGroups.reduce((sum, group) => sum + group.pendingReviews, 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#889063]/10 rounded-xl flex items-center justify-center">
                <span className="text-[#889063] text-xl">⏳</span>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#889063] font-[family-name:var(--font-poppins)]">Total Investasi</p>
                <p className="text-2xl font-bold text-[#4C3D19]">
                  {investorGroups.reduce((sum, group) => sum + group.totalInvestments, 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#4C3D19]/10 rounded-xl flex items-center justify-center">
                <span className="text-[#4C3D19] text-xl">💰</span>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#889063] font-[family-name:var(--font-poppins)]">Terlambat</p>
                <p className="text-2xl font-bold text-red-600">
                  {investorGroups.reduce((sum, group) => sum + group.overdueCount, 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Investor List */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#324D3E] mx-auto mb-4"></div>
              <p className="text-[#889063] font-[family-name:var(--font-poppins)]">Memuat data investor...</p>
            </div>
          ) : investorGroups.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-[#889063] text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-[#324D3E] mb-2 font-[family-name:var(--font-poppins)]">Belum ada data investor</h3>
              <p className="text-[#889063]">Data investor akan muncul di sini ketika pengguna membuat cicilan</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#324D3E]/10">
                {investorGroups.map((investor) => (
                  <div key={investor.userId} className="p-6 hover:bg-[#324D3E]/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#324D3E]/10 to-[#4C3D19]/10 rounded-full flex items-center justify-center border border-[#324D3E]/20">
                            <span className="text-[#324D3E] font-semibold text-lg font-[family-name:var(--font-poppins)]">
                              {investor.userInfo.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#324D3E] font-[family-name:var(--font-poppins)]">{investor.userInfo.fullName}</h3>
                            <p className="text-sm text-[#889063]">{investor.userInfo.email}</p>
                            <p className="text-xs text-[#889063]/70">{investor.userInfo.phoneNumber}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-r from-[#324D3E]/5 to-[#324D3E]/10 p-4 rounded-xl border border-[#324D3E]/10">
                            <div className="text-sm text-[#889063] font-[family-name:var(--font-poppins)]">Total Investasi</div>
                            <div className="text-lg font-semibold text-[#324D3E]">{investor.totalInvestments}</div>
                          </div>
                          <div className="bg-gradient-to-r from-[#4C3D19]/5 to-[#4C3D19]/10 p-4 rounded-xl border border-[#4C3D19]/10">
                            <div className="text-sm text-[#889063] font-[family-name:var(--font-poppins)]">Nilai Investasi</div>
                            <div className="text-lg font-semibold text-[#4C3D19]">
                              Rp {investor.totalAmount.toLocaleString('id-ID')}
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-[#889063]/5 to-[#889063]/10 p-4 rounded-xl border border-[#889063]/10">
                            <div className="text-sm text-[#889063] font-[family-name:var(--font-poppins)]">Sudah Dibayar</div>
                            <div className="text-lg font-semibold text-[#889063]">
                              Rp {investor.totalPaid.toLocaleString('id-ID')}
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
                            <div className="text-sm text-yellow-700 font-[family-name:var(--font-poppins)]">Perlu Review</div>
                            <div className="text-lg font-semibold text-yellow-600">{investor.pendingReviews}</div>
                          </div>
                        </div>

                        {/* Investment Summary */}
                        <div className="mt-4">
                          <div className="text-sm text-[#889063] mb-2 font-[family-name:var(--font-poppins)]">Investasi Aktif:</div>
                          <div className="flex flex-wrap gap-2">
                            {investor.investments.slice(0, 3).map((investment) => (
                              <div key={investment.investmentId} className="flex items-center gap-2 bg-[#324D3E]/5 px-3 py-2 rounded-full text-sm border border-[#324D3E]/10">
                                <span className="text-[#324D3E] font-medium">{investment.productName}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getInvestmentStatusColor(investment.status)}`}>
                                  {getInvestmentStatusText(investment.status)}
                                </span>
                              </div>
                            ))}
                            {investor.investments.length > 3 && (
                              <span className="text-sm text-[#889063]">+{investor.investments.length - 3} lainnya</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {investor.pendingReviews > 0 && (
                          <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 px-3 py-2 rounded-full text-sm font-medium border border-yellow-300">
                            {investor.pendingReviews} Review
                          </div>
                        )}
                        {investor.overdueCount > 0 && (
                          <div className="bg-gradient-to-r from-red-100 to-red-200 text-red-800 px-3 py-2 rounded-full text-sm font-medium border border-red-300">
                            {investor.overdueCount} Terlambat
                          </div>
                        )}
                        <button
                          onClick={() => handleViewDetails(investor.userId)}
                          className="px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 text-sm font-semibold font-[family-name:var(--font-poppins)]"
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
                <div className="flex justify-between items-center p-6 border-t border-[#324D3E]/10">
                  <div className="text-sm text-[#889063] font-[family-name:var(--font-poppins)]">
                    Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} dari {pagination.totalCount} investor
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={!pagination.hasPrev}
                      className="px-4 py-2 border border-[#324D3E]/20 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#324D3E]/5 text-[#324D3E] font-medium transition-all duration-300"
                    >
                      Sebelumnya
                    </button>
                    <span className="px-4 py-2 text-sm text-[#324D3E] font-semibold">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={!pagination.hasNext}
                      className="px-4 py-2 border border-[#324D3E]/20 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#324D3E]/5 text-[#324D3E] font-medium transition-all duration-300"
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
