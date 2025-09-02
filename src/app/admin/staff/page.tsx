'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui-staff/badge';
import { Button } from '@/components/ui-staff/button';
import { Input } from '@/components/ui-staff/input';
import { useAlert } from '@/components/ui/Alert';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StaffFormData, StaffStats, StaffUser } from '@/types/admin';
import { useEffect, useState } from 'react';

export default function StaffPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<StaffFormData>({
    fullName: '',
    phoneNumber: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<StaffStats>({
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    newStaff: 0
  });

  const { showSuccess, showError, AlertComponent } = useAlert();
  const { showDeleteConfirm, ConfirmComponent } = useConfirmDialog();

  useEffect(() => {
    fetchStaffUsers();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/staff');
      if (response.ok) {
        const data = await response.json();
        const allStaff = data.data || [];

        setStats({
          totalStaff: allStaff.length,
          activeStaff: allStaff.filter((staff: StaffUser) => staff.isActive).length,
          inactiveStaff: allStaff.filter((staff: StaffUser) => !staff.isActive).length,
          newStaff: allStaff.filter((staff: StaffUser) => {
            const createdAt = new Date(staff.createdAt);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return createdAt > oneWeekAgo;
          }).length
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/admin/staff?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStaffUsers(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching staff users:', error);
      showError('Error', 'Gagal mengambil data staff');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showSuccess('Success', 'Staff berhasil dibuat');
        setShowAddModal(false);
        setFormData({ fullName: '', phoneNumber: '', password: '' });
        fetchStaffUsers();
        fetchStats();
      } else {
        const errorData = await response.json();
        showError('Error', errorData.error || 'Gagal membuat staff');
      }
    } catch (error) {
      console.error('Error creating staff:', error);
      showError('Error', 'Terjadi kesalahan saat membuat staff');
    } finally {
      setSubmitting(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleEdit = (_staff: StaffUser) => {
    showError('Info', 'Fitur edit belum tersedia');
  };

  const handleDelete = async (_staff: StaffUser) => {
    await showDeleteConfirm(_staff.fullName, async () => {
      showError('Info', 'Fitur hapus belum tersedia');
    });
  };

  const filteredStaff = staffUsers.filter(staff => {
    if (statusFilter === 'active') return staff.isActive;
    if (statusFilter === 'inactive') return !staff.isActive;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)] truncate">Data Staff</h1>
            <p className="text-[#889063] text-sm sm:text-base">Kelola data staff lapangan</p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:from-[#4C3D19] hover:to-[#324D3E] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
          >
            <span className="sm:hidden">+ Staff</span>
            <span className="hidden sm:inline">Tambah Staff</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-xs sm:text-sm font-medium text-[#889063] truncate">Total Staff</h3>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[#324D3E]">{stats.totalStaff}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-xs sm:text-sm font-medium text-[#889063] truncate">Staff Aktif</h3>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[#4C3D19]">{stats.activeStaff}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-xs sm:text-sm font-medium text-[#889063] truncate">Staff Nonaktif</h3>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{stats.inactiveStaff}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-xs sm:text-sm font-medium text-[#889063] truncate">Staff Baru</h3>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[#889063]">{stats.newStaff}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Cari staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-[#324D3E]/20 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl text-sm sm:text-base"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-[#324D3E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] text-sm sm:text-base min-w-0 flex-shrink-0"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#324D3E]/10">
            <h3 className="text-lg sm:text-xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">Daftar Staff</h3>
          </div>
          <div className="p-0 sm:p-6">
            {loading ? (
              <div className="text-center py-8 px-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#324D3E] mx-auto"></div>
                <p className="mt-2 text-[#889063] text-sm sm:text-base">Memuat data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-[#324D3E]/10">
                      <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] text-xs sm:text-sm">Nama</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] text-xs sm:text-sm hidden sm:table-cell">No. Telepon</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] text-xs sm:text-sm">Kode User</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] text-xs sm:text-sm">Status</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] text-xs sm:text-sm hidden lg:table-cell">Tanggal Dibuat</th>
                      <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] text-xs sm:text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((staff) => (
                      <tr key={staff._id} className="border-b border-[#324D3E]/5 hover:bg-[#324D3E]/5 transition-colors">
                        <td className="py-3 px-3 sm:px-4">
                          <div className="font-medium text-[#324D3E] text-sm sm:text-base truncate">{staff.fullName}</div>
                          <div className="text-xs text-[#889063] sm:hidden truncate">{staff.phoneNumber}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-[#889063] text-sm sm:text-base hidden sm:table-cell">{staff.phoneNumber}</td>
                        <td className="py-3 px-3 sm:px-4">
                          <Badge variant="outline" className="font-mono text-xs">
                            {staff.userCode}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <Badge
                            variant={staff.isActive ? "default" : "secondary"}
                            className={`text-xs ${staff.isActive ? "bg-[#4C3D19]/10 text-[#4C3D19] border-[#4C3D19]/20" : "bg-gray-100 text-gray-800"}`}
                          >
                            {staff.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-[#889063] text-sm hidden lg:table-cell">
                          {new Date(staff.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(staff)}
                              className="border-[#324D3E]/20 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E] text-xs px-2 py-1"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(staff)}
                              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 text-xs px-2 py-1"
                            >
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Halaman {currentPage} dari {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="border-[#324D3E]/20 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E] disabled:opacity-50"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="border-[#324D3E]/20 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E] disabled:opacity-50"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-[#324D3E]/10">
            <h2 className="text-xl font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">Tambah Staff Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#324D3E] mb-1">
                  Nama Lengkap
                </label>
                <Input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Masukkan nama lengkap"
                  required
                  className="border-[#324D3E]/20 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#324D3E] mb-1">
                  Nomor Telepon
                </label>
                <Input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+62 atau 08xxx"
                  required
                  className="border-[#324D3E]/20 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#324D3E] mb-1">
                  Password
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Masukkan password"
                    required
                    className="flex-1 border-[#324D3E]/20 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                    className="whitespace-nowrap px-3 border-[#324D3E]/20 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E] rounded-xl"
                  >
                    Generate
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border-[#324D3E]/20 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E] rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:from-[#4C3D19] hover:to-[#324D3E] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {submitting ? 'Membuat...' : 'Buat Staff'}
                </Button>
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