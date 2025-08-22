'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAlert } from '@/components/ui/Alert';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { useEffect, useState } from 'react';

interface Investor {
  _id: string;
  name: string;
  email: string;
  totalInvestasi: number;
  jumlahPohon: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id: string;
  fullName: string;
  email: string;
}

export default function InvestorsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { showSuccess, showError, AlertComponent } = useAlert();
  const { showDeleteConfirm, ConfirmComponent } = useConfirmDialog();

  const [investors, setInvestors] = useState<Investor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    totalInvestasi: 0,
    jumlahPohon: 0,
    status: 'active' as 'active' | 'inactive'
  });
  const [displayTotalInvestasi, setDisplayTotalInvestasi] = useState('');
  const [displayJumlahPohon, setDisplayJumlahPohon] = useState('');

  // Helper functions for number formatting
  const formatNumber = (num: number) => {
    return num.toLocaleString('id-ID');
  };

  const parseNumber = (str: string) => {
    // Remove all non-digit characters except decimal point
    const cleaned = str.replace(/[^\d]/g, '');
    return cleaned === '' ? 0 : parseInt(cleaned);
  };

  // Fetch investors on component mount
  useEffect(() => {
    fetchInvestors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users/list');
        if (response.ok) {
          const result = await response.json();
          setUsers(result.data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (showModal) {
      fetchUsers();
    }
  }, [showModal]);

  // Fetch investors from API
  const fetchInvestors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/investors');
      if (response.ok) {
        const result = await response.json();
        setInvestors(result.data);
      } else {
        showError('Gagal memuat data', 'Tidak dapat mengambil data investor dari server');
      }
    } catch (error) {
      console.error('Error fetching investors:', error);
      showError('Kesalahan Jaringan', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  // Handle user selection from dropdown
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const selectedUser = users.find(user => user._id === userId);
    if (selectedUser) {
      setFormData({
        ...formData,
        name: selectedUser.fullName,
        email: selectedUser.email
      });
    }
  };

  const filteredInvestors = investors.filter(investor => {
    const matchesSearch = investor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         investor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || investor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingInvestor) {
        // Update existing investor
        const response = await fetch('/api/admin/investors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingInvestor._id, ...formData })
        });

        if (response.ok) {
          // Refresh the investors list
          fetchInvestors();
          showSuccess('Berhasil!', 'Data investor berhasil diperbarui');
        } else {
          const errorData = await response.json();
          showError('Gagal memperbarui', errorData.error || 'Terjadi kesalahan saat memperbarui investor');
        }
      } else {
        // Add new investor
        const response = await fetch('/api/admin/investors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          // Refresh the investors list
          fetchInvestors();
          showSuccess('Berhasil!', 'Investor baru berhasil ditambahkan');
        } else {
          const errorData = await response.json();
          showError('Gagal menambahkan', errorData.error || 'Terjadi kesalahan saat menambahkan investor');
        }
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        totalInvestasi: 0,
        jumlahPohon: 0,
        status: 'active'
      });
      setSelectedUserId('');
      setEditingInvestor(null);
      setShowModal(false);
    } catch (error) {
      console.error('Error saving investor:', error);
      showError('Kesalahan Jaringan', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
    }
  };

  const handleEdit = (investor: Investor) => {
    setEditingInvestor(investor);
    setFormData({
      name: investor.name,
      email: investor.email,
      totalInvestasi: investor.totalInvestasi,
      jumlahPohon: investor.jumlahPohon,
      status: investor.status
    });
    setDisplayTotalInvestasi(investor.totalInvestasi > 0 ? formatNumber(investor.totalInvestasi) : '');
    setDisplayJumlahPohon(investor.jumlahPohon > 0 ? formatNumber(investor.jumlahPohon) : '');
    setSelectedUserId(''); // Don't pre-select user when editing
    setShowModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    showDeleteConfirm(name, async () => {
      try {
        const response = await fetch(`/api/admin/investors?id=${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          // Refresh the investors list
          fetchInvestors();
          showSuccess('Berhasil!', `Investor "${name}" berhasil dihapus`);
        } else {
          const errorData = await response.json();
          showError('Gagal menghapus', errorData.error || 'Terjadi kesalahan saat menghapus investor');
        }
      } catch (error) {
        console.error('Error deleting investor:', error);
        showError('Kesalahan Jaringan', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'inactive':
        return 'Tidak Aktif';
      default:
        return status;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Manajemen Investor</h1>
            <p className="text-gray-600 mt-2">Kelola data investor dan portfolio mereka</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={fetchInvestors}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>➕</span>
              <span>Tambah Investor</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">👥 Total Investor</p>
              <p className="text-2xl font-bold text-gray-900">{investors.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">✅ Investor Aktif</p>
              <p className="text-2xl font-bold text-gray-900">{investors.filter(i => i.status === 'active').length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">❌ Tidak Aktif</p>
              <p className="text-2xl font-bold text-gray-900">{investors.filter(i => i.status === 'inactive').length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600">💰 Total Investasi</p>
              <div className="flex flex-col">
                {/* <span className="text-xs text-gray-500">Rp</span> */}
                <p className="text-md sm:text-lg lg:text-xl font-bold text-gray-900 leading-tight break-all">
                 Rp. {investors.reduce((sum, inv) => sum + inv.totalInvestasi, 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari investor berdasarkan nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Semua Status' },
                { value: 'active', label: 'Aktif' },
                { value: 'inactive', label: 'Tidak Aktif' }
              ]}
              className="w-full lg:w-auto lg:min-w-[150px]"
            />
          </div>
        </div>

        {/* Investors Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investor</th>
                  <th className="hidden md:table-cell px-3 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-3 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investasi</th>
                  <th className="hidden lg:table-cell px-3 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pohon</th>
                  <th className="px-3 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        <span className="ml-2 text-gray-600">Memuat data investor...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvestors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Belum ada data investor
                    </td>
                  </tr>
                ) : (
                  filteredInvestors.map((investor) => (
                  <tr key={investor._id} className="hover:bg-gray-50">
                    <td className="px-3 lg:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm lg:text-base">{investor.name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm lg:text-base truncate">{investor.name}</p>
                          <p className="text-xs lg:text-sm text-gray-500 md:hidden">{investor.email}</p>
                          <p className="text-xs text-gray-500">ID: {investor._id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 lg:px-6 py-4">
                      <p className="text-sm text-gray-900 truncate">{investor.email}</p>
                    </td>
                    <td className="px-3 lg:px-6 py-4">
                      <p className="font-medium text-gray-900 text-sm lg:text-base">
                        Rp {investor.totalInvestasi.toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-gray-500 lg:hidden">{investor.jumlahPohon} pohon</p>
                    </td>
                    <td className="hidden lg:table-cell px-3 lg:px-6 py-4">
                      <p className="font-medium text-gray-900">{investor.jumlahPohon}</p>
                    </td>
                    <td className="px-3 lg:px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(investor.status)}`}>
                        {getStatusText(investor.status)}
                      </span>
                    </td>
                    <td className="px-3 lg:px-6 py-4">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-1 lg:gap-2">
                        <button
                          onClick={() => handleEdit(investor)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs lg:text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(investor._id, investor.name)}
                          className="text-red-600 hover:text-red-800 font-medium text-xs lg:text-sm"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingInvestor ? 'Edit Investor' : 'Tambah Investor Baru'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {!editingInvestor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih User *
                  </label>
                  <Select
                    value={selectedUserId}
                    onValueChange={handleUserSelect}
                    options={[
                      { value: '', label: 'Pilih user untuk dijadikan investor...' },
                      ...users.map(user => ({
                        value: user._id,
                        label: `${user.fullName} (${user.email})`
                      }))
                    ]}
                    placeholder="Pilih user untuk dijadikan investor..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Nama dan email akan otomatis terisi setelah memilih user
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Masukkan nama lengkap"
                    readOnly={!editingInvestor && selectedUserId !== ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="investor@email.com"
                    readOnly={!editingInvestor && selectedUserId !== ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Investasi (IDR)
                  </label>
                  <input
                    type="text"
                    value={displayTotalInvestasi}
                    onChange={(e) => {
                      const parsed = parseNumber(e.target.value);
                      setFormData({...formData, totalInvestasi: parsed});
                      setDisplayTotalInvestasi(parsed > 0 ? formatNumber(parsed) : e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jumlah Pohon
                  </label>
                  <input
                    type="text"
                    value={displayJumlahPohon}
                    onChange={(e) => {
                      const parsed = parseNumber(e.target.value);
                      setFormData({...formData, jumlahPohon: parsed});
                      setDisplayJumlahPohon(parsed > 0 ? formatNumber(parsed) : e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value as 'active' | 'inactive'})}
                  options={[
                    { value: 'active', label: 'Aktif' },
                    { value: 'inactive', label: 'Tidak Aktif' }
                  ]}
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
                >
                  {editingInvestor ? 'Update Investor' : 'Tambah Investor'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingInvestor(null);
                    setSelectedUserId('');
                    setFormData({
                      name: '',
                      email: '',
                      totalInvestasi: 0,
                      jumlahPohon: 0,
                      status: 'active'
                    });
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert & Confirm Components */}
      <AlertComponent />
      <ConfirmComponent />
    </AdminLayout>
  );
}