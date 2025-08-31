'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface Tree {
  _id: string;
  spesiesPohon: string;
  lokasi: string;
  umur: number;
  tinggi: number;
  tanggalTanam: string;
  kondisi: 'sehat' | 'perlu_perawatan' | 'sakit';
  createdAt: string;
}

interface InvestorReport {
  investor: {
    _id: string;
    name: string;
    email: string;
    totalInvestasi: number;
    jumlahPohon: number;
    status: string;
    createdAt: string;
  };
  trees: Tree[];
  statistics: {
    total: number;
    byCondition: {
      sehat: number;
      perlu_perawatan: number;
      sakit: number;
    };
    bySpecies: Record<string, number>;
    avgAge: number;
    avgHeight: number;
  };
}

interface ReportData {
  reports: InvestorReport[];
  summary: {
    totalInvestors: number;
    totalTrees: number;
    totalInvestment: number;
    activeInvestors: number;
    inactiveInvestors: number;
  };
}

export default function LaporanPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedInvestor, setExpandedInvestor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Format number helper
  const formatNumber = (num: number) => {
    return num.toLocaleString('id-ID');
  };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `Rp ${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `Rp ${(amount / 1000000).toFixed(1)}M`;
    } else {
      return `Rp ${amount.toLocaleString('id-ID')}`;
    }
  };

  // Fetch report data
  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/laporan');
      
      if (response.ok) {
        const result = await response.json();
        setReportData(result.data);
      } else {
        console.error('Failed to fetch report data');
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const getKondisiBadge = (kondisi: string) => {
    switch (kondisi) {
      case 'sehat':
        return 'bg-green-100 text-green-800';
      case 'perlu_perawatan':
        return 'bg-yellow-100 text-yellow-800';
      case 'sakit':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getKondisiText = (kondisi: string) => {
    switch (kondisi) {
      case 'sehat': return 'Sehat';
      case 'perlu_perawatan': return 'Perlu Perawatan';
      case 'sakit': return 'Sakit';
      default: return kondisi;
    }
  };

  const toggleExpanded = (investorId: string) => {
    setExpandedInvestor(expandedInvestor === investorId ? null : investorId);
  };

  const filteredReports = reportData?.reports.filter(report => 
    report.investor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.investor.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Laporan Investasi</h1>
            <p className="text-gray-600 mt-2">Memuat laporan...</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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

  if (!reportData) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Laporan Investasi</h1>
            <p className="text-gray-600 mt-2">Gagal memuat data laporan</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)] truncate">Laporan Investasi</h1>
            <p className="text-[#889063] mt-1 sm:mt-2 text-sm sm:text-base">Ringkasan investasi dan kepemilikan pohon per investor</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="bg-[#324D3E]/10 hover:bg-[#324D3E]/20 text-[#324D3E] px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">{loading ? 'Memuat...' : 'Refresh'}</span>
            </button>
            <button
              className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
            >
              <span>📥</span>
              <span className="sm:hidden">Download</span>
              <span className="hidden sm:inline">Download Semua</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-[#889063]">👥 Total Investor</p>
              <p className="text-2xl font-bold text-[#324D3E]">{reportData.summary.totalInvestors}</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-[#889063]">🌳 Total Pohon</p>
              <p className="text-2xl font-bold text-[#4C3D19]">{reportData.summary.totalTrees}</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-[#889063]">💰 Total Investasi</p>
              <p className="text-xl font-bold text-[#889063]">{formatCurrency(reportData.summary.totalInvestment)}</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-[#889063]">✅ Investor Aktif</p>
              <p className="text-2xl font-bold text-[#4C3D19]">{reportData.summary.activeInvestors}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari investor berdasarkan nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-[#324D3E]/20 rounded-xl focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] placeholder-[#889063]"
              />
            </div>
          </div>
        </div>

        {/* Investor Reports */}
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-8 text-center text-[#889063]">
              {searchTerm ? 'Tidak ada investor yang sesuai dengan pencarian' : 'Belum ada data investor'}
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.investor._id} className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 overflow-hidden">
                {/* Investor Header */}
                <div className="p-4 lg:p-6 border-b border-[#324D3E]/10">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{report.investor.name.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="text-lg lg:text-xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">{report.investor.name}</h3>
                        <p className="text-sm text-[#889063]">{report.investor.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        report.investor.status === 'active' 
                          ? 'bg-[#4C3D19]/10 text-[#4C3D19] border border-[#4C3D19]/20' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {report.investor.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                      <button
                        className="bg-[#324D3E]/10 hover:bg-[#324D3E]/20 text-[#324D3E] px-3 py-1 rounded-xl text-sm font-medium transition-colors"
                      >
                        📥 Download
                      </button>
                    </div>
                  </div>
                </div>

                {/* Investment Summary */}
                <div className="p-4 lg:p-6 bg-gradient-to-r from-[#324D3E]/5 to-[#4C3D19]/5 border-b border-[#324D3E]/10">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#324D3E]">{formatCurrency(report.investor.totalInvestasi)}</p>
                      <p className="text-sm text-[#889063]">Total Investasi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#4C3D19]">{report.statistics.total}</p>
                      <p className="text-sm text-[#889063]">Total Pohon</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#889063]">{report.statistics.byCondition.sehat}</p>
                      <p className="text-sm text-[#889063]">Pohon Sehat</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#324D3E]">{report.statistics.avgAge}</p>
                      <p className="text-sm text-[#889063]">Rata-rata Umur (bulan)</p>
                    </div>
                  </div>
                </div>

                {/* Tree Details Toggle */}
                <div className="p-4 lg:p-6">
                  <button
                    onClick={() => toggleExpanded(report.investor._id)}
                    className="flex items-center justify-between w-full text-left hover:bg-[#324D3E]/5 p-2 rounded-xl transition-colors"
                  >
                    <span className="text-lg font-medium text-[#324D3E] font-[family-name:var(--font-poppins)]">
                      Detail Pohon ({report.statistics.total})
                    </span>
                    <span className={`transform transition-transform duration-200 text-[#324D3E] ${
                      expandedInvestor === report.investor._id ? 'rotate-180' : ''
                    }`}>
                      ▼
                    </span>
                  </button>

                  {/* Expanded Tree Details */}
                  {expandedInvestor === report.investor._id && (
                    <div className="mt-4 space-y-4">
                      {report.trees.length === 0 ? (
                        <p className="text-center py-4 text-gray-500">Investor ini belum memiliki pohon</p>
                      ) : (
                        <>
                          {/* Tree Species Summary */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            {Object.entries(report.statistics.bySpecies).map(([species, count]) => (
                              <div key={species} className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-3 rounded-xl border border-[#324D3E]/20">
                                <p className="font-medium text-[#324D3E]">{species}</p>
                                <p className="text-sm text-[#889063]">{count} pohon</p>
                              </div>
                            ))}
                          </div>

                          {/* Tree List */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-[#324D3E]/5">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium text-[#324D3E]">Spesies</th>
                                  <th className="px-3 py-2 text-left font-medium text-[#324D3E] hidden sm:table-cell">Lokasi</th>
                                  <th className="px-3 py-2 text-left font-medium text-[#324D3E]">Umur</th>
                                  <th className="px-3 py-2 text-left font-medium text-[#324D3E] hidden lg:table-cell">Tinggi</th>
                                  <th className="px-3 py-2 text-left font-medium text-[#324D3E] hidden sm:table-cell">Tanggal Tanam</th>
                                  <th className="px-3 py-2 text-left font-medium text-[#324D3E]">Kondisi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#324D3E]/10">
                                {report.trees.map((tree) => (
                                  <tr key={tree._id} className="hover:bg-[#324D3E]/5 transition-colors">
                                    <td className="px-3 py-2">
                                      <div>
                                        <p className="font-medium text-[#324D3E]">{tree.spesiesPohon}</p>
                                        <p className="text-xs text-[#889063] sm:hidden">{tree.lokasi}</p>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-[#889063] hidden sm:table-cell">{tree.lokasi}</td>
                                    <td className="px-3 py-2">
                                      <span className="text-[#324D3E]">{formatNumber(tree.umur)} bln</span>
                                      <span className="text-xs text-[#889063] block lg:hidden">{tree.tinggi > 0 ? `${formatNumber(tree.tinggi)} cm` : '-'}</span>
                                    </td>
                                    <td className="px-3 py-2 text-[#889063] hidden lg:table-cell">{tree.tinggi > 0 ? `${formatNumber(tree.tinggi)} cm` : '-'}</td>
                                    <td className="px-3 py-2 text-[#889063] hidden sm:table-cell">
                                      {new Date(tree.tanggalTanam).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKondisiBadge(tree.kondisi)}`}>
                                        {getKondisiText(tree.kondisi)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}