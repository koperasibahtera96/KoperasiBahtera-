'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Select } from '@/components/ui/Select';
import { useAlert } from '@/components/ui/Alert';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Tree {
  _id: string;
  spesiesPohon: string;
  pemilik: {
    _id: string;
    name: string;
    email: string;
  };
  lokasi: string;
  umur: number; // in months
  tinggi: number; // in cm
  tanggalTanam: string;
  kondisi: 'sehat' | 'perlu_perawatan' | 'sakit';
  createdAt: string;
  updatedAt: string;
}

interface Investor {
  _id: string;
  name: string;
  email: string;
}

export default function TreesPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTree, setEditingTree] = useState<Tree | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [kondisiFilter, setKondisiFilter] = useState('all');

  const { showSuccess, showError, AlertComponent } = useAlert();
  const { showDeleteConfirm, ConfirmComponent } = useConfirmDialog();

  const [formData, setFormData] = useState({
    spesiesPohon: '',
    pemilik: '',
    lokasi: '',
    umur: 0,
    tinggi: 0,
    tanggalTanam: '',
    kondisi: 'sehat' as 'sehat' | 'perlu_perawatan' | 'sakit'
  });

  // Format number helper functions
  const formatNumber = (num: number) => {
    return num.toLocaleString('id-ID');
  };

  const parseNumber = (str: string) => {
    const cleaned = str.replace(/[^\d]/g, '');
    return cleaned === '' ? 0 : parseInt(cleaned);
  };

  // Fetch trees from API
  const fetchTrees = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/trees');
      
      if (response.ok) {
        const data = await response.json();
        setTrees(data.data || []);
      } else {
        const errorData = await response.json();
        showError('Gagal memuat data', errorData.error || 'Terjadi kesalahan saat memuat data pohon');
      }
    } catch (error) {
      console.error('Error fetching trees:', error);
      showError('Kesalahan Jaringan', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch investors for dropdown
  const fetchInvestors = async () => {
    try {
      const response = await fetch('/api/admin/investors');
      
      if (response.ok) {
        const data = await response.json();
        setInvestors(data.data || []);
      } else {
        console.error('Failed to fetch investors');
      }
    } catch (error) {
      console.error('Error fetching investors:', error);
    }
  };

  useEffect(() => {
    fetchTrees();
    fetchInvestors();
  }, []);

  const filteredTrees = trees.filter(tree => {
    const matchesSearch = tree.spesiesPohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tree.lokasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tree.pemilik.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKondisi = kondisiFilter === 'all' || tree.kondisi === kondisiFilter;
    return matchesSearch && matchesKondisi;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.spesiesPohon || !formData.pemilik || !formData.lokasi || !formData.tanggalTanam) {
      showError('Form tidak lengkap', 'Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    try {
      const url = editingTree ? '/api/admin/trees' : '/api/admin/trees';
      const method = editingTree ? 'PUT' : 'POST';
      const body = editingTree 
        ? { id: editingTree._id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        fetchTrees();
        setShowModal(false);
        setEditingTree(null);
        setFormData({
          spesiesPohon: '',
          pemilik: '',
          lokasi: '',
          umur: 0,
          tinggi: 0,
          tanggalTanam: '',
          kondisi: 'sehat'
        });
        console.log('🌳 Calling showSuccess from handleSubmit');
        showSuccess('Berhasil!', data.message);
      } else {
        const errorData = await response.json();
        showError('Gagal menyimpan', errorData.error || 'Terjadi kesalahan saat menyimpan data pohon');
      }
    } catch (error) {
      console.error('Error saving tree:', error);
      showError('Kesalahan Jaringan', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
    }
  };

  const handleEdit = (tree: Tree) => {
    setEditingTree(tree);
    setFormData({
      spesiesPohon: tree.spesiesPohon,
      pemilik: tree.pemilik._id,
      lokasi: tree.lokasi,
      umur: tree.umur,
      tinggi: tree.tinggi,
      tanggalTanam: new Date(tree.tanggalTanam).toISOString().split('T')[0],
      kondisi: tree.kondisi
    });
    setShowModal(true);
  };

  const handleDelete = async (tree: Tree) => {
    showDeleteConfirm(`${tree.spesiesPohon} milik ${tree.pemilik.name}`, async () => {
      try {
        const response = await fetch(`/api/admin/trees?id=${tree._id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchTrees();
          showSuccess('Berhasil!', `Pohon "${tree.spesiesPohon}" berhasil dihapus`);
        } else {
          const errorData = await response.json();
          showError('Gagal menghapus', errorData.error || 'Terjadi kesalahan saat menghapus pohon');
        }
      } catch (error) {
        console.error('Error deleting tree:', error);
        showError('Kesalahan Jaringan', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
      }
    });
  };

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

  const treeStats = {
    total: trees.length,
    sehat: trees.filter(t => t.kondisi === 'sehat').length,
    perlu_perawatan: trees.filter(t => t.kondisi === 'perlu_perawatan').length,
    sakit: trees.filter(t => t.kondisi === 'sakit').length
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Data Pohon</h1>
            <p className="text-gray-600 mt-2">Kelola data pohon investasi dan monitoring pertumbuhan</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={fetchTrees}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>🔄</span>
              {loading ? 'Memuat...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>🌱</span>
              Tambah Pohon
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">🌳 Total Pohon</p>
              <p className="text-2xl font-bold text-gray-900">{treeStats.total}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">💚 Sehat</p>
              <p className="text-2xl font-bold text-green-600">{treeStats.sehat}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">⚠️ Perlu Perawatan</p>
              <p className="text-2xl font-bold text-yellow-600">{treeStats.perlu_perawatan}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">🔴 Sakit</p>
              <p className="text-2xl font-bold text-red-600">{treeStats.sakit}</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari pohon berdasarkan spesies, lokasi, atau pemilik..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <Select
              value={kondisiFilter}
              onValueChange={setKondisiFilter}
              options={[
                { value: 'all', label: 'Semua Kondisi' },
                { value: 'sehat', label: 'Sehat' },
                { value: 'perlu_perawatan', label: 'Perlu Perawatan' },
                { value: 'sakit', label: 'Sakit' }
              ]}
            />
          </div>
        </div>

        {/* Trees Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spesies</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pemilik</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Lokasi</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Umur & Tinggi</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Tanggal Tanam</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kondisi</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Memuat data pohon...
                    </td>
                  </tr>
                ) : filteredTrees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm || kondisiFilter !== 'all' ? 'Tidak ada pohon yang sesuai dengan filter' : 'Belum ada data pohon'}
                    </td>
                  </tr>
                ) : (
                  filteredTrees.map((tree) => (
                    <tr key={tree._id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{tree.spesiesPohon}</p>
                          <p className="text-sm text-gray-500 lg:hidden">{tree.lokasi}</p>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tree.pemilik.name}</p>
                          <p className="text-xs text-gray-500">{tree.pemilik.email}</p>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 hidden lg:table-cell">
                        {tree.lokasi}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">{formatNumber(tree.umur)} bulan</p>
                          <p className="text-xs text-gray-500">{formatNumber(tree.tinggi)} cm</p>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 hidden sm:table-cell">
                        {new Date(tree.tanggalTanam).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKondisiBadge(tree.kondisi)}`}>
                          {getKondisiText(tree.kondisi)}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(tree)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(tree)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
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
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingTree ? 'Edit Data Pohon' : 'Tambah Pohon Baru'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spesies Pohon *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.spesiesPohon}
                    onChange={(e) => setFormData({...formData, spesiesPohon: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Contoh: Aquilaria malaccensis"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pemilik (Investor) *
                  </label>
                  <Select
                    value={formData.pemilik}
                    onValueChange={(value) => setFormData({...formData, pemilik: value})}
                    options={[
                      { value: '', label: 'Pilih pemilik...', disabled: true },
                      ...investors.map(investor => ({
                        value: investor._id,
                        label: `${investor.name} (${investor.email})`
                      }))
                    ]}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lokasi *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lokasi}
                    onChange={(e) => setFormData({...formData, lokasi: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Contoh: Kebun Gaharu Jakarta Timur"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Umur (bulan) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.umur}
                    onChange={(e) => setFormData({...formData, umur: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tinggi (cm) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.tinggi}
                    onChange={(e) => setFormData({...formData, tinggi: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Tanam *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalTanam}
                    onChange={(e) => setFormData({...formData, tanggalTanam: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kondisi
                  </label>
                  <Select
                    value={formData.kondisi}
                    onValueChange={(value) => setFormData({...formData, kondisi: value as 'sehat' | 'perlu_perawatan' | 'sakit'})}
                    options={[
                      { value: 'sehat', label: 'Sehat' },
                      { value: 'perlu_perawatan', label: 'Perlu Perawatan' },
                      { value: 'sakit', label: 'Sakit' }
                    ]}
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 sm:py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 text-center"
                >
                  {editingTree ? 'Update Pohon' : 'Tambah Pohon'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTree(null);
                    setFormData({
                      spesiesPohon: '',
                      pemilik: '',
                      lokasi: '',
                      umur: 0,
                      tinggi: 0,
                      tanggalTanam: '',
                      kondisi: 'sehat'
                    });
                  }}
                  className="px-6 py-3 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
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