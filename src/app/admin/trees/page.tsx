'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAlert } from '@/components/ui/Alert';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { useEffect, useState } from 'react';

interface PlantInstance {
  _id: string;
  id: string;
  instanceName: string;
  baseAnnualROI: number;
  qrCode?: string;
  owner?: string;
  location?: string;
  status?: string;
  lastUpdate?: string;
  createdAt: string;
  updatedAt: string;
}

interface RelatedInvestor {
  _id: string;
  name: string;
  email: string;
  totalInvestasi: number;
  totalPaid: number;
  phoneNumber?: string;
}

interface RelatedInvestment {
  investmentId: string;
  productName: string;
  totalAmount: number;
  amountPaid: number;
  paymentType: 'full' | 'cicilan';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  investmentDate: Date;
  completionDate?: Date;
}

interface OwnerGroup {
  ownerName: string;
  totalInstances: number;
  instances: PlantInstance[];
  relatedInvestor: RelatedInvestor | null;
  relatedInvestments: RelatedInvestment[];
  totalInvestmentAmount: number;
  totalPaidAmount: number;
}

interface TreeTypeGroup {
  plantType: 'gaharu' | 'jengkol' | 'aren' | 'alpukat';
  totalInstances: number;
  totalInvestors: number;
  totalInvestment: number;
  totalPaid: number;
  ownerGroups: OwnerGroup[];
}

interface TreesData {
  groupedData: TreeTypeGroup[];
  stats: {
    totalInstances: number;
    totalInvestors: number;
    totalInvestment: number;
    totalPaid: number;
    byType: Record<string, {
      instances: number;
      investors: number;
      investment: number;
      paid: number;
    }>;
  };
}

export default function TreesPage() {
  const [treesData, setTreesData] = useState<TreesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

  const { showSuccess, showError, AlertComponent } = useAlert();
  const { showDeleteConfirm, ConfirmComponent } = useConfirmDialog();


  // Format number helper functions
  const formatNumber = (num: number | null | undefined) => {
    if (num == null || num === undefined) return '0';
    return num.toLocaleString('id-ID');
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Fetch trees data from API
  const fetchTreesData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/trees');

      if (response.ok) {
        const data = await response.json();
        setTreesData(data.data);
      } else {
        const errorData = await response.json();
        showError('Gagal memuat data', errorData.error || 'Terjadi kesalahan saat memuat data pohon');
      }
    } catch (error) {
      console.error('Error fetching trees data:', error);
      showError('Kesalahan Jaringan', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreesData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPlantTypeLabel = (plantType: string) => {
    const labels: Record<string, string> = {
      gaharu: 'Gaharu',
      jengkol: 'Jengkol',
      aren: 'Aren',
      alpukat: 'Alpukat'
    };
    return labels[plantType] || plantType;
  };

  const toggleExpanded = (plantType: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(plantType)) {
      newExpanded.delete(plantType);
    } else {
      newExpanded.add(plantType);
    }
    setExpandedTypes(newExpanded);
  };

  const toggleOwnerExpanded = (key: string) => {
    const newExpanded = new Set(expandedOwners);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedOwners(newExpanded);
  };

  const filteredData = treesData?.groupedData.filter(group => 
    selectedType === 'all' || group.plantType === selectedType
  ) || [];


  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)] truncate">Data Pohon Berdasarkan Tipe</h1>
            <p className="text-[#889063] mt-1 sm:mt-2 text-sm sm:text-base">Kelompokkan pohon berdasarkan tipe dengan data investor terkait</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={fetchTreesData}
              disabled={loading}
              className="bg-[#324D3E]/10 hover:bg-[#324D3E]/20 text-[#324D3E] px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">{loading ? 'Memuat...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] truncate">🌳 Total Instansi Pohon</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#324D3E]">{treesData?.stats.totalInstances || 0}</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] truncate">👥 Total Investor</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#4C3D19]">{treesData?.stats.totalInvestors || 0}</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] truncate">💰 Total Investasi</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#889063]">{formatCurrency(treesData?.stats.totalInvestment || 0)}</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] truncate">💵 Total Terbayar</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{formatCurrency(treesData?.stats.totalPaid || 0)}</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={selectedType}
              onValueChange={setSelectedType}
              options={[
                { value: 'all', label: 'Semua Tipe Pohon' },
                { value: 'gaharu', label: 'Gaharu' },
                { value: 'jengkol', label: 'Jengkol' },
                { value: 'aren', label: 'Aren' },
                { value: 'alpukat', label: 'Alpukat' }
              ]}
            />
          </div>
        </div>

        {/* Trees Groups */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-8 text-center">
              <p className="text-gray-500">Memuat data pohon...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-8 text-center">
              <p className="text-gray-500">
                {selectedType !== 'all' ? 'Tidak ada data untuk tipe pohon yang dipilih' : 'Belum ada data pohon'}
              </p>
            </div>
          ) : (
            filteredData.map((group) => (
              <div key={group.plantType} className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 overflow-hidden">
                {/* Group Header */}
                <div 
                  className="bg-[#324D3E]/5 p-4 lg:p-6 cursor-pointer hover:bg-[#324D3E]/10 transition-colors"
                  onClick={() => toggleExpanded(group.plantType)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg sm:text-xl font-bold text-[#324D3E]">
                        🌳 {getPlantTypeLabel(group.plantType)}
                      </h3>
                      <span className="text-sm text-[#889063]">
                        ({group.totalInstances} instansi)
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-[#889063]">Investor: </span>
                          <span className="font-semibold text-[#324D3E]">{group.totalInvestors}</span>
                        </div>
                        <div>
                          <span className="text-[#889063]">Investasi: </span>
                          <span className="font-semibold text-[#324D3E]">{formatCurrency(group.totalInvestment)}</span>
                        </div>
                        <div>
                          <span className="text-[#889063]">Terbayar: </span>
                          <span className="font-semibold text-green-600">{formatCurrency(group.totalPaid)}</span>
                        </div>
                      </div>
                      <div className="text-[#324D3E]">
                        {expandedTypes.has(group.plantType) ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>
                  <div className="sm:hidden mt-2 space-y-1 text-sm">
                    <div>
                      <span className="text-[#889063]">Investor: </span>
                      <span className="font-semibold text-[#324D3E]">{group.totalInvestors}</span>
                    </div>
                    <div>
                      <span className="text-[#889063]">Investasi: </span>
                      <span className="font-semibold text-[#324D3E]">{formatCurrency(group.totalInvestment)}</span>
                    </div>
                    <div>
                      <span className="text-[#889063]">Terbayar: </span>
                      <span className="font-semibold text-green-600">{formatCurrency(group.totalPaid)}</span>
                    </div>
                  </div>
                </div>

                {/* Group Content - Owner Groups */}
                {expandedTypes.has(group.plantType) && (
                  <div className="divide-y divide-[#324D3E]/10">
                    {group.ownerGroups.map((ownerGroup) => {
                      const ownerKey = `${group.plantType}-${ownerGroup.ownerName}`;
                      return (
                        <div key={ownerKey} className="bg-white/30">
                          {/* Owner Header */}
                          <div 
                            className="p-4 lg:p-6 cursor-pointer hover:bg-[#324D3E]/5 transition-colors border-l-4 border-[#4C3D19]"
                            onClick={() => toggleOwnerExpanded(ownerKey)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <h4 className="text-md font-semibold text-[#324D3E]">
                                  👤 {ownerGroup.ownerName}
                                </h4>
                                <span className="text-sm text-[#889063]">
                                  ({ownerGroup.totalInstances} instansi)
                                </span>
                                {!ownerGroup.relatedInvestor && (
                                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                    No Investor Data
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="hidden sm:flex items-center gap-4 text-sm">
                                  {ownerGroup.relatedInvestor && (
                                    <>
                                      <div>
                                        <span className="text-[#889063]">Email: </span>
                                        <span className="font-medium text-[#324D3E]">{ownerGroup.relatedInvestor.email}</span>
                                      </div>
                                      <div>
                                        <span className="text-[#889063]">Investasi: </span>
                                        <span className="font-semibold text-[#324D3E]">{formatCurrency(ownerGroup.totalInvestmentAmount)}</span>
                                      </div>
                                      <div>
                                        <span className="text-[#889063]">Terbayar: </span>
                                        <span className="font-semibold text-green-600">{formatCurrency(ownerGroup.totalPaidAmount)}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className="text-[#324D3E]">
                                  {expandedOwners.has(ownerKey) ? '▼' : '▶'}
                                </div>
                              </div>
                            </div>
                            <div className="sm:hidden mt-2 space-y-1 text-sm">
                              {ownerGroup.relatedInvestor && (
                                <>
                                  <div>
                                    <span className="text-[#889063]">Email: </span>
                                    <span className="font-medium text-[#324D3E]">{ownerGroup.relatedInvestor.email}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#889063]">Investasi: </span>
                                    <span className="font-semibold text-[#324D3E]">{formatCurrency(ownerGroup.totalInvestmentAmount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#889063]">Terbayar: </span>
                                    <span className="font-semibold text-green-600">{formatCurrency(ownerGroup.totalPaidAmount)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Owner Content */}
                          {expandedOwners.has(ownerKey) && (
                            <div className="bg-white/50 divide-y divide-gray-200">
                              {/* Plant Instances */}
                              <div className="p-4 lg:p-6">
                                <h5 className="text-sm font-semibold text-[#324D3E] mb-3">Instansi Pohon ({ownerGroup.instances.length})</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {ownerGroup.instances.map((instance) => (
                                    <div key={instance._id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                      <div className="space-y-1">
                                        <h6 className="font-medium text-[#324D3E] text-sm">{instance.instanceName}</h6>
                                        <div className="text-xs text-[#889063] space-y-1">
                                          <p>ID: {instance.id}</p>
                                          <p>ROI: {instance.baseAnnualROI}%/tahun</p>
                                          {instance.qrCode && <p>QR: {instance.qrCode}</p>}
                                          {instance.location && <p>Lokasi: {instance.location}</p>}
                                          {instance.status && <p>Status: {instance.status}</p>}
                                          <p>Dibuat: {new Date(instance.createdAt).toLocaleDateString('id-ID')}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Investor Details & Investments */}
                              {ownerGroup.relatedInvestor && (
                                <div className="p-4 lg:p-6">
                                  <h5 className="text-sm font-semibold text-[#324D3E] mb-3">Detail Investor</h5>
                                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm mb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <h6 className="font-medium text-[#324D3E]">{ownerGroup.relatedInvestor.name}</h6>
                                        <div className="text-sm text-[#889063] space-y-1">
                                          <p>Email: {ownerGroup.relatedInvestor.email}</p>
                                          {ownerGroup.relatedInvestor.phoneNumber && (
                                            <p>Phone: {ownerGroup.relatedInvestor.phoneNumber}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="text-sm">
                                          <p className="text-[#889063]">Total Investasi: <span className="font-semibold text-[#324D3E]">{formatCurrency(ownerGroup.relatedInvestor.totalInvestasi)}</span></p>
                                          <p className="text-[#889063]">Total Terbayar: <span className="font-semibold text-green-600">{formatCurrency(ownerGroup.relatedInvestor.totalPaid)}</span></p>
                                        </div>
                                        <div className="mt-2">
                                          <div className="bg-gray-200 rounded-full h-2">
                                            <div 
                                              className="bg-green-500 h-2 rounded-full"
                                              style={{ width: `${ownerGroup.relatedInvestor.totalInvestasi > 0 ? (ownerGroup.relatedInvestor.totalPaid / ownerGroup.relatedInvestor.totalInvestasi) * 100 : 0}%` }}
                                            ></div>
                                          </div>
                                          <p className="text-xs mt-1 text-[#889063]">
                                            Progress: {ownerGroup.relatedInvestor.totalInvestasi > 0 ? Math.round((ownerGroup.relatedInvestor.totalPaid / ownerGroup.relatedInvestor.totalInvestasi) * 100) : 0}%
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Related Investments */}
                                  {ownerGroup.relatedInvestments.length > 0 && (
                                    <div>
                                      <h6 className="text-sm font-semibold text-[#324D3E] mb-3">Investasi Terkait ({ownerGroup.relatedInvestments.length})</h6>
                                      <div className="grid grid-cols-1 gap-3">
                                        {ownerGroup.relatedInvestments.map((investment) => (
                                          <div key={investment.investmentId} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                            <div className="flex items-center justify-between">
                                              <div className="space-y-1">
                                                <p className="font-medium text-[#324D3E] text-sm">{investment.productName}</p>
                                                <div className="text-xs text-[#889063] space-y-1">
                                                  <p>ID: {investment.investmentId}</p>
                                                  <p>Tipe: {investment.paymentType === 'cicilan' ? 'Cicilan' : 'Lunas'}</p>
                                                  <p>Tanggal: {new Date(investment.investmentDate).toLocaleDateString('id-ID')}</p>
                                                </div>
                                              </div>
                                              <div className="text-right space-y-1">
                                                <div className="text-sm">
                                                  <p className="font-semibold text-[#324D3E]">{formatCurrency(investment.totalAmount)}</p>
                                                  <p className="text-green-600">{formatCurrency(investment.amountPaid)}</p>
                                                </div>
                                                <div className={`text-xs px-2 py-1 rounded-full ${
                                                  investment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                  investment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                                  investment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                  'bg-red-100 text-red-800'
                                                }`}>
                                                  {investment.status}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>


      {/* Alert Component */}
      <AlertComponent />
    </AdminLayout>
  );
}