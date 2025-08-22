'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAlert } from '@/components/ui/Alert';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { useEffect, useState } from 'react';

interface Plant {
  _id: string;
  id: number;
  name: string;
  qrCode: string;
  owner: string;
  fotoGambar?: string | null;
  memberId: string;
  contractNumber: string;
  location: string;
  plantType: string;
  status: string;
  lastUpdate: string;
  height: number;
  age: number;
  history: Array<{
    id: number;
    type: string;
    date: string;
    description: string;
    hasImage: boolean;
    imageUrl?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Investor {
  _id: string;
  name: string;
  email: string;
}

export default function TreesPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [kondisiFilter, setKondisiFilter] = useState('all');

  const { showSuccess, showError, AlertComponent } = useAlert();
  const { showDeleteConfirm, ConfirmComponent } = useConfirmDialog();

  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    location: '',
    age: 0,
    height: 0,
    lastUpdate: '',
    status: 'Tanam Bibit' as string,
    plantType: 'Pohon'
  });

  // Format number helper functions
  const formatNumber = (num: number | null | undefined) => {
    if (num == null || num === undefined) return '0';
    return num.toLocaleString('id-ID');
  };


  // Fetch plants from API
  const fetchPlants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/plants');

      if (response.ok) {
        const data = await response.json();
        setPlants(data.data || []);
      } else {
        const errorData = await response.json();
        showError('Gagal memuat data', errorData.error || 'Terjadi kesalahan saat memuat data tanaman');
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
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
    fetchPlants();
    fetchInvestors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getKondisiFromStatus = (status: string) => {
    if (status === 'Tanam Bibit' || status === 'Tumbuh Sehat') return 'sehat';
    if (status === 'Perlu Perawatan') return 'perlu_perawatan';
    return 'sakit';
  };

  const filteredPlants = plants.filter(plant => {
    const matchesSearch = plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plant.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plant.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const plantKondisi = getKondisiFromStatus(plant.status);
    const matchesKondisi = kondisiFilter === 'all' || plantKondisi === kondisiFilter;
    return matchesSearch && matchesKondisi;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.owner || !formData.location || !formData.lastUpdate) {
      showError('Form tidak lengkap', 'Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    try {
      if (editingPlant) {
        // Update existing plant using plants/[id] route
        const plantData = {
          name: formData.name,
          owner: formData.owner,
          location: formData.location,
          height: formData.height,
          age: formData.age,
          lastUpdate: formData.lastUpdate,
          status: formData.status,
          plantType: formData.plantType
        };

        const response = await fetch(`/api/plants/${editingPlant.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(plantData),
        });

        if (response.ok) {
          fetchPlants();
          setShowModal(false);
          setEditingPlant(null);
          setFormData({
            name: '',
            owner: '',
            location: '',
            age: 0,
            height: 0,
            lastUpdate: '',
            status: 'Tanam Bibit',
            plantType: 'Pohon'
          });
          console.log('🌱 Calling showSuccess from handleSubmit (edit)');
          showSuccess('Berhasil!', 'Tanaman berhasil diupdate');
        } else {
          const errorData = await response.json();
          showError('Gagal mengupdate', errorData.error || 'Terjadi kesalahan saat mengupdate data tanaman');
        }
      } else {
        // Create new plant
        const investor = investors.find(inv => inv.name === formData.owner);
        if (!investor) {
          showError('Investor tidak ditemukan', 'Silakan pilih investor yang valid');
          return;
        }

        const plantData = {
          name: formData.name,
          qrCode: `PL-${Date.now()}`, // Temporary QR code generation
          owner: formData.owner,
          memberId: investor._id,
          contractNumber: `CTR-${new Date().getFullYear()}-${Date.now()}`,
          location: formData.location,
          plantType: formData.plantType,
          status: formData.status,
          lastUpdate: formData.lastUpdate,
          height: formData.height,
          age: formData.age,
          history: [{
            id: 1,
            type: 'Tanam Bibit',
            date: formData.lastUpdate,
            description: `Penanaman ${formData.name} di lokasi ${formData.location}.`,
            hasImage: false,
            imageUrl: null
          }]
        };

        const response = await fetch('/api/plants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(plantData),
        });

        if (response.ok) {
          const data = await response.json();
          fetchPlants();
          setShowModal(false);
          setEditingPlant(null);
          setFormData({
            name: '',
            owner: '',
            location: '',
            age: 0,
            height: 0,
            lastUpdate: '',
            status: 'Tanam Bibit',
            plantType: 'Pohon'
          });
          console.log('🌱 Calling showSuccess from handleSubmit');
          showSuccess('Berhasil!', data.message);
        } else {
          const errorData = await response.json();
          showError('Gagal menyimpan', errorData.error || 'Terjadi kesalahan saat menyimpan data tanaman');
        }
      }
    } catch (error) {
      console.error('Error saving plant:', error);
      showError('Kesalahan Jaringan', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
    }
  };

  const handleEdit = (plant: Plant) => {
    // Handle different date formats safely
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return '';

      try {
        // First try parsing as ISO date
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }

        // If that fails, try parsing DD/M/YYYY or D/M/YYYY format
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          const isoDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
          if (!isNaN(isoDate.getTime())) {
            return isoDate.toISOString().split('T')[0];
          }
        }

        // If all parsing fails, return today's date
        return new Date().toISOString().split('T')[0];
      } catch (error) {
        console.warn('Failed to parse date:', dateString, error);
        return new Date().toISOString().split('T')[0];
      }
    };

    setEditingPlant(plant);
    setFormData({
      name: plant.name,
      owner: plant.owner,
      location: plant.location,
      age: plant.age || 0,
      height: plant.height || 0,
      lastUpdate: formatDateForInput(plant.lastUpdate),
      status: plant.status,
      plantType: plant.plantType
    });
    setShowModal(true);
  };

  const handleDelete = async (plant: Plant) => {
    showDeleteConfirm(`${plant.name} milik ${plant.owner}`, async () => {
      try {
        const response = await fetch(`/api/plants/${plant.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchPlants();
          showSuccess('Berhasil!', `Tanaman "${plant.name}" berhasil dihapus`);
        } else {
          const errorData = await response.json();
          showError('Gagal menghapus', errorData.error || 'Terjadi kesalahan saat menghapus tanaman');
        }
      } catch (error) {
        console.error('Error deleting plant:', error);
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

  const plantStats = {
    total: plants.length,
    sehat: plants.filter(p => p.status === 'Tanam Bibit' || p.status === 'Tumbuh Sehat').length,
    perlu_perawatan: plants.filter(p => p.status === 'Perlu Perawatan').length,
    sakit: plants.filter(p => p.status === 'Bermasalah' || p.status === 'Sakit').length
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Data Tanaman</h1>
            <p className="text-gray-600 mt-2">Kelola data tanaman investasi dan monitoring pertumbuhan</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={fetchPlants}
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
              Tambah Tanaman
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">🌳 Total Tanaman</p>
              <p className="text-2xl font-bold text-gray-900">{plantStats.total}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">💚 Sehat</p>
              <p className="text-2xl font-bold text-green-600">{plantStats.sehat}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">⚠️ Perlu Perawatan</p>
              <p className="text-2xl font-bold text-yellow-600">{plantStats.perlu_perawatan}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">🔴 Sakit</p>
              <p className="text-2xl font-bold text-red-600">{plantStats.sakit}</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari tanaman berdasarkan nama, lokasi, atau pemilik..."
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
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Tanaman</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pemilik</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Lokasi</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Umur & Tinggi</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Update Terakhir</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Memuat data tanaman...
                    </td>
                  </tr>
                ) : filteredPlants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm || kondisiFilter !== 'all' ? 'Tidak ada tanaman yang sesuai dengan filter' : 'Belum ada data tanaman'}
                    </td>
                  </tr>
                ) : (
                  filteredPlants.map((plant) => (
                    <tr key={plant._id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{plant.name}</p>
                          <p className="text-sm text-gray-500 lg:hidden">{plant.location}</p>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{plant.owner}</p>
                          <p className="text-xs text-gray-500">{plant.qrCode}</p>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 hidden lg:table-cell">
                        {plant.location}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">{formatNumber(plant.age)} bulan</p>
                          <p className="text-xs text-gray-500">{formatNumber(plant.height)} cm</p>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 hidden sm:table-cell">
                        {new Date(plant.lastUpdate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKondisiBadge(getKondisiFromStatus(plant.status))}`}>
                          {getKondisiText(getKondisiFromStatus(plant.status))}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(plant)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(plant)}
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
                {editingPlant ? 'Edit Data Tanaman' : 'Tambah Tanaman Baru'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Tanaman *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Contoh: Durian Montong"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pemilik (Investor) *
                  </label>
                  <Select
                    value={formData.owner}
                    onValueChange={(value) => setFormData({...formData, owner: value})}
                    options={[
                      { value: '', label: 'Pilih pemilik...', disabled: true },
                      ...investors.map(investor => ({
                        value: investor.name,
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
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Contoh: Blok A, Zona 1"
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
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: parseInt(e.target.value) || 0})}
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
                    value={formData.height}
                    onChange={(e) => setFormData({...formData, height: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Terakhir *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.lastUpdate}
                    onChange={(e) => setFormData({...formData, lastUpdate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
                    options={[
                      { value: 'Tanam Bibit', label: 'Tanam Bibit' },
                      { value: 'Tumbuh Sehat', label: 'Tumbuh Sehat' },
                      { value: 'Perlu Perawatan', label: 'Perlu Perawatan' },
                      { value: 'Bermasalah', label: 'Bermasalah' },
                      { value: 'Sakit', label: 'Sakit' }
                    ]}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 sm:py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 text-center"
                >
                  {editingPlant ? 'Update Tanaman' : 'Tambah Tanaman'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPlant(null);
                    setFormData({
                      name: '',
                      owner: '',
                      location: '',
                      age: 0,
                      height: 0,
                      lastUpdate: '',
                      status: 'Tanam Bibit',
                      plantType: 'Pohon'
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