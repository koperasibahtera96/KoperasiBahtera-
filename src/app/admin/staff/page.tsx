"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui-staff/badge";
import { Button } from "@/components/ui-staff/button";
import { Input } from "@/components/ui-staff/input";
import { useAlert } from "@/components/ui/Alert";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  PlantRequest,
  StaffFormData,
  StaffStats,
  StaffUser,
} from "@/types/admin";
import { useEffect, useState } from "react";
import { useTheme } from 'next-themes';

export default function StaffPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === 'pink' && pinkClasses) return `${baseClasses} ${pinkClasses}`;
    return baseClasses;
  };
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [formData, setFormData] = useState<StaffFormData>({
    fullName: "",
    phoneNumber: "",
    email: "",
    role: "Mandor",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<StaffStats>({
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    newStaff: 0,
  });
  const [activeTab, setActiveTab] = useState<"staff" | "requests">("staff");
  const [requests, setRequests] = useState<PlantRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestFilter, setRequestFilter] = useState("pending");
  const [requestTypeFilter, setRequestTypeFilter] = useState("all");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PlantRequest | null>(
    null
  );
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewingRequest, setReviewingRequest] = useState(false);

  const { showSuccess, showError, AlertComponent } = useAlert();
  const { showDeleteConfirm, ConfirmComponent } = useConfirmDialog();

  useEffect(() => {
    fetchStaffUsers();
    fetchStats();
    fetchRequests(); // Always fetch requests to get the count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter, requestFilter, requestTypeFilter]);

  useEffect(() => {
    if (activeTab === "requests") {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/staff");
      if (response.ok) {
        const data = await response.json();
        const allStaff = data.data || [];

        setStats({
          totalStaff: allStaff.length,
          activeStaff: allStaff.filter((staff: StaffUser) => staff.isActive)
            .length,
          inactiveStaff: allStaff.filter((staff: StaffUser) => !staff.isActive)
            .length,
          newStaff: allStaff.filter((staff: StaffUser) => {
            const createdAt = new Date(staff.createdAt);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return createdAt > oneWeekAgo;
          }).length,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/staff?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStaffUsers(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error("Error fetching staff users:", error);
      showError("Error", "Gagal mengambil data staff");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const isEditing = showEditModal && editingStaff;

      // Validate password if provided
      if (formData.password && formData.password.trim() !== "") {
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          showError("Password tidak valid", passwordValidation.error || "Password tidak memenuhi syarat");
          setSubmitting(false);
          return;
        }
      }

      // For new staff, password is required and must be validated
      if (!isEditing && !formData.password) {
        showError("Password diperlukan", "Password wajib diisi untuk staff baru");
        setSubmitting(false);
        return;
      }

      const url = "/api/admin/staff";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? JSON.stringify({ ...formData, id: editingStaff._id })
        : JSON.stringify(formData);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body,
      });

      if (response.ok) {
        showSuccess(
          "Success",
          isEditing ? "Staff berhasil diperbarui" : "Staff berhasil dibuat"
        );
        setShowAddModal(false);
        setShowEditModal(false);
        setEditingStaff(null);
        setFormData({
          fullName: "",
          phoneNumber: "",
          email: "",
          role: "Mandor",
          password: "",
        });
        fetchStaffUsers();
        fetchStats();
      } else {
        const errorData = await response.json();
        showError(
          "Error",
          errorData.error ||
            (isEditing ? "Gagal memperbarui staff" : "Gagal membuat staff")
        );
      }
    } catch (error) {
      console.error("Error saving staff:", error);
      showError("Error", "Terjadi kesalahan saat menyimpan staff");
    } finally {
      setSubmitting(false);
    }
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password }));
  };

  // Password validation function (same as backend)
  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return { isValid: false, error: 'Password minimal 8 karakter' };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, error: 'Password harus mengandung huruf kecil' };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return { isValid: false, error: 'Password harus mengandung huruf besar' };
    }
    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, error: 'Password harus mengandung angka' };
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { isValid: false, error: 'Password harus mengandung karakter khusus (@$!%*?&)' };
    }
    return { isValid: true };
  };

  const handleEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    setFormData({
      fullName: staff.fullName,
      phoneNumber: staff.phoneNumber,
      email: staff.email,
      role: staff.role === "spv_staff" ? "SPV Staff" :
            staff.role === "admin" ? "Admin" :
            staff.role === "finance" ? "Finance" :
            staff.role === "staff_finance" ? "Staff Finance" :
            staff.role === "ketua" ? "Ketua" :
            staff.role === "marketing" ? "Marketing" :
            staff.role === "marketing_head" ? "Marketing Head" :
            staff.role === "mandor" ? "Mandor" :
            staff.role === "asisten" ? "Asisten" :
            staff.role === "manajer" ? "Manajer" : "Staff",
      password: "",
    });
    setShowEditModal(true);
  };

  const handleDelete = async (_staff: StaffUser) => {
    await showDeleteConfirm(_staff.fullName, async () => {
      try {
        // Optimistic UI: disable while deleting
        setLoading(true);

        const response = await fetch(`/api/admin/staff`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: _staff._id }),
        });

        if (response.ok) {
          showSuccess("Berhasil", "Staff berhasil dihapus");
          // Refresh list and stats
          fetchStaffUsers();
          fetchStats();
        } else {
          const errorData = await response.json().catch(() => null);
          showError("Gagal", errorData?.error || "Gagal menghapus staff");
        }
      } catch (error) {
        console.error("Error deleting staff:", error);
        showError("Error", "Terjadi kesalahan saat menghapus staff");
      } finally {
        setLoading(false);
      }
    });
  };

  const fetchRequests = async () => {
    try {
      setRequestsLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        ...(requestFilter !== "all" && { status: requestFilter }),
        ...(requestTypeFilter !== "all" && { requestType: requestTypeFilter }),
      });

      const response = await fetch(`/api/admin/plant-requests?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      showError("Error", "Gagal mengambil data permintaan");
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleReviewRequest = (request: PlantRequest) => {
    setSelectedRequest(request);
    setReviewNotes("");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (status: "approved" | "rejected") => {
    if (!selectedRequest) return;

    setReviewingRequest(true);

    try {
      const response = await fetch("/api/admin/plant-requests", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          status,
          reviewNotes,
        }),
      });

      if (response.ok) {
        showSuccess(
          "Berhasil!",
          `Permintaan berhasil ${
            status === "approved" ? "disetujui" : "ditolak"
          }`
        );
        setShowReviewModal(false);
        setSelectedRequest(null);
        setReviewNotes("");
        fetchRequests();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to review request");
      }
    } catch (error: unknown) {
      console.error("Error reviewing request:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showError("Gagal review", `Gagal mereview permintaan: ${errorMessage}`);
    } finally {
      setReviewingRequest(false);
    }
  };

  const filteredStaff = staffUsers.filter((staff) => {
    if (statusFilter === "active") return staff.isActive;
    if (statusFilter === "inactive") return !staff.isActive;
    return true;
  });

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "delete":
        return "Hapus Tanaman";
      case "update_history":
        return "Edit Riwayat";
      case "delete_history":
        return "Hapus Riwayat";
      default:
        return type;
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case "delete":
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50";
      case "update_history":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50";
      case "delete_history":
        return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/50";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/50";
      case "approved":
        return "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50";
      case "rejected":
        return "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] truncate">
              {activeTab === "staff" ? "Manajemen Pengguna" : "Permintaan SPV Staff"}
            </h1>
            <p className="text-[#889063] dark:text-gray-300 text-sm sm:text-base">
              {activeTab === "staff"
                ? "Kelola data staff, admin, dan finance"
                : "Review permintaan dari SPV Staff"}
            </p>
          </div>
          {activeTab === "staff" && (
            <Button
              onClick={() => setShowAddModal(true)}
              className={getThemeClasses(
                "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:from-[#4C3D19] hover:to-[#324D3E] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base",
                '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]'
              )}
            >
              <span className="sm:hidden">+ User</span>
              <span className="hidden sm:inline">Tambah Pengguna</span>
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-2 mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setActiveTab("staff")}
              className={getThemeClasses(
                `flex-1 rounded-xl transition-all duration-300 px-3 py-2 text-sm sm:text-base ${
                  activeTab === "staff"
                    ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                    : "bg-transparent text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700"
                }`,
                activeTab === 'staff' ? '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d] !shadow-lg' : ''
              )}
            >
              <span className="truncate">Manajemen Pengguna</span>
            </Button>
            <Button
              onClick={() => setActiveTab("requests")}
              className={getThemeClasses(
                `flex-1 rounded-xl transition-all duration-300 px-3 py-2 text-sm sm:text-base ${
                  activeTab === "requests"
                    ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                    : "bg-transparent text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700"
                }`,
                activeTab === 'requests' ? '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d] !shadow-lg' : ''
              )}
            >
              <span className="truncate">
                <span className="hidden sm:inline">Permintaan</span>
                <span className="sm:hidden">Req</span>
                {" "}({requests.filter((r) => r.status === "pending").length})
              </span>
            </Button>
          </div>
        </div>

        {/* Staff Tab Content */}
        {activeTab === "staff" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
              <div className={getThemeClasses(
                "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
                '!bg-gradient-to-r !from-[#FFEFF3] !to-[#FFF5F7]'
              )}>
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-300 truncate">
                    Total Staff
                  </h3>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[#324D3E] dark:text-white">
                  {stats.totalStaff}
                </div>
              </div>
              <div className={getThemeClasses(
                "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
                '!bg-gradient-to-r !from-[#FFEFF3] !to-[#FFF5F7]'
              )}>
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-300 truncate">
                    Staff Aktif
                  </h3>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[#4C3D19] dark:text-emerald-300">
                  {stats.activeStaff}
                </div>
              </div>
              <div className={getThemeClasses(
                "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
                '!bg-gradient-to-r !from-[#FFEFF3] !to-[#FFF5F7]'
              )}>
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-300 truncate">
                    Staff Nonaktif
                  </h3>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.inactiveStaff}
                </div>
              </div>
              <div className={getThemeClasses(
                "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300",
                '!bg-gradient-to-r !from-[#FFEFF3] !to-[#FFF5F7]'
              )}>
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-300 truncate">
                    Staff Baru
                  </h3>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-[#889063] dark:text-blue-300">
                  {stats.newStaff}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 mb-6",
              '!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9]'
            )}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Cari staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl text-sm sm:text-base dark:bg-gray-700 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={getThemeClasses(
                      "px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 text-sm sm:text-base min-w-0 flex-shrink-0",
                      '!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !text-[#4c1d1d]'
                    )}
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Staff Table */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-[#324D3E]/10 dark:border-gray-700">
                <h3 className="text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)]">
                  Daftar Staff
                </h3>
              </div>
              <div className="p-0 sm:p-6">
                {loading ? (
                  <div className="text-center py-8 px-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#324D3E] dark:border-white mx-auto"></div>
                    <p className="mt-2 text-[#889063] dark:text-gray-300 text-sm sm:text-base">
                      Memuat data...
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="border-b border-[#324D3E]/10 dark:border-gray-700">
                          <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] dark:text-white text-xs sm:text-sm">
                            Nama
                          </th>
                          <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] dark:text-white text-xs sm:text-sm hidden sm:table-cell">
                            No. Telepon
                          </th>
                          <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] dark:text-white text-xs sm:text-sm hidden md:table-cell">
                            Email
                          </th>
                          <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] dark:text-white text-xs sm:text-sm hidden lg:table-cell">
                            Role
                          </th>
                          <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] dark:text-white text-xs sm:text-sm">
                            Kode User
                          </th>
                          <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] dark:text-white text-xs sm:text-sm">
                            Status
                          </th>
                          <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] dark:text-white text-xs sm:text-sm hidden xl:table-cell">
                            Tanggal Dibuat
                          </th>
                          <th className="text-left py-3 px-3 sm:px-4 font-medium text-[#324D3E] dark:text-white text-xs sm:text-sm">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.map((staff) => (
                          <tr
                            key={staff._id}
                            className="border-b border-[#324D3E]/5 dark:border-gray-700 hover:bg-[#324D3E]/5 dark:hover:bg-gray-800 transition-colors"
                          >
                            <td className="py-3 px-3 sm:px-4">
                              <div className="font-medium text-[#324D3E] dark:text-white text-sm sm:text-base truncate">
                                {staff.fullName}
                              </div>
                              <div className="text-xs text-[#889063] dark:text-gray-300 sm:hidden truncate">
                                {staff.phoneNumber}
                              </div>
                              <div className="text-xs text-[#889063] dark:text-gray-300 md:hidden truncate">
                                {staff.email}
                              </div>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-[#889063] dark:text-gray-300 text-sm sm:text-base hidden sm:table-cell">
                              {staff.phoneNumber}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-[#889063] dark:text-gray-300 text-sm sm:text-base hidden md:table-cell truncate">
                              {staff.email}
                            </td>
                            <td className="py-3 px-3 sm:px-4 hidden lg:table-cell">
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  staff.role === "mandor"
                                    ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50"
                                    : staff.role === "asisten"
                                    ? "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700/50"
                                    : staff.role === "manajer"
                                    ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50"
                                    : staff.role === "spv_staff"
                                    ? "bg-[#4C3D19]/10 text-[#4C3D19] border-[#4C3D19]/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50"
                                    : staff.role === "admin"
                                    ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50"
                                    : staff.role === "finance"
                                    ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50"
                                    : "bg-[#324D3E]/10 text-[#324D3E] border-[#324D3E]/20 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                }`}
                              >
                                {staff.role === "mandor" ? "Mandor" :
                                 staff.role === "asisten" ? "Asisten" :
                                 staff.role === "manajer" ? "Manajer" :
                                 staff.role === "spv_staff" ? "SPV Staff" :
                                 staff.role === "admin" ? "Admin" :
                                 staff.role === "finance" ? "Finance" :
                                 staff.role === "staff_finance" ? "Staff Finance" :
                                 staff.role === "ketua" ? "Ketua" :
                                 staff.role === "marketing" ? "Marketing" :
                                 staff.role === "marketing_head" ? "Marketing Head" : "Staff"}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {staff.userCode}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <Badge
                                variant={
                                  staff.isActive ? "default" : "secondary"
                                }
                                className={`text-xs ${
                                  staff.isActive
                                    ? "bg-[#4C3D19]/10 text-[#4C3D19] border-[#4C3D19]/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {staff.isActive ? "Aktif" : "Nonaktif"}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-[#889063] dark:text-gray-300 text-sm hidden xl:table-cell">
                              {new Date(staff.createdAt).toLocaleDateString(
                                "id-ID"
                              )}
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(staff)}
                                  className="border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] text-xs px-2 py-1"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(staff)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 border-red-200 dark:border-red-700/50 hover:bg-red-50 dark:hover:bg-red-900/30 text-xs px-2 py-1"
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
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Halaman {currentPage} dari {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                        className="border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] disabled:opacity-50"
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] disabled:opacity-50"
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Add Staff Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-[#324D3E]/10 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)]">
                Tambah Pengguna Baru
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Nama Lengkap
                  </label>
                  <Input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    placeholder="Masukkan nama lengkap"
                    required
                    className="border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Nomor Telepon
                  </label>
                  <Input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
                    }
                    placeholder="+62 atau 08xxx"
                    required
                    className="border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="email@example.com"
                    required
                    className="border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        role: e.target.value as "Staff" | "SPV Staff" | "Admin" | "Finance" | "Staff Finance" | "Ketua" | "Marketing" | "Mandor" | "Asisten" | "Manajer",
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                    required
                  >
                    <optgroup label="Manajemen Lapangan">
                      <option value="Mandor">Mandor</option>
                      <option value="Asisten">Asisten</option>
                      <option value="Manajer">Manajer</option>
                    </optgroup>
                    <optgroup label="Roles Lainnya">
                      <option value="Admin">Admin</option>
                      <option value="Finance">Finance</option>
                      <option value="Staff Finance">Staff Finance</option>
                      <option value="Ketua">Ketua</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Marketing Head">Marketing Head</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Password
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Masukkan password"
                      required
                      className="flex-1 border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generatePassword}
                      className="whitespace-nowrap px-3 border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] rounded-xl"
                    >
                      Generate
                    </Button>
                  </div>
                  <div className="text-xs text-[#889063] dark:text-gray-300 mt-1">
                    <p>Password harus memenuhi kriteria:</p>
                    <ul className="list-disc list-inside pl-2 mt-1 space-y-0.5">
                      <li>Minimal 8 karakter</li>
                      <li>Mengandung huruf besar dan kecil</li>
                      <li>Mengandung angka</li>
                      <li>Mengandung karakter khusus (@$!%*?&)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:from-[#4C3D19] hover:to-[#324D3E] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {submitting ? "Membuat..." : "Buat Pengguna"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Staff Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-[#324D3E]/10 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)]">
                Edit Pengguna
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Nama Lengkap
                  </label>
                  <Input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    placeholder="Masukkan nama lengkap"
                    required
                    className="border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Nomor Telepon
                  </label>
                  <Input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phoneNumber: e.target.value,
                      }))
                    }
                    placeholder="+62 atau 08xxx"
                    required
                    className="border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="email@example.com"
                    required
                    className="border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        role: e.target.value as "Staff" | "SPV Staff" | "Admin" | "Finance" | "Staff Finance" | "Ketua" | "Marketing" | "Mandor" | "Asisten" | "Manajer",
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700"
                    required
                  >
                    <optgroup label="Manajemen Lapangan">
                      <option value="Mandor">Mandor</option>
                      <option value="Asisten">Asisten</option>
                      <option value="Manajer">Manajer</option>
                    </optgroup>
                    <optgroup label="Roles Lainnya">
                      <option value="Admin">Admin</option>
                      <option value="Finance">Finance</option>
                      <option value="Staff Finance">Staff Finance</option>
                      <option value="Ketua">Ketua</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Marketing Head">Marketing Head</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Password Baru (Kosongkan jika tidak ingin mengubah)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Masukkan password baru"
                      className="flex-1 border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generatePassword}
                      className="whitespace-nowrap px-3 border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] rounded-xl"
                    >
                      Generate
                    </Button>
                  </div>
                  <div className="text-xs text-[#889063] dark:text-gray-300 mt-1">
                    <p>Password harus memenuhi kriteria:</p>
                    <ul className="list-disc list-inside pl-2 mt-1 space-y-0.5">
                      <li>Minimal 8 karakter</li>
                      <li>Mengandung huruf besar dan kecil</li>
                      <li>Mengandung angka</li>
                      <li>Mengandung karakter khusus (@$!%*?&)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingStaff(null);
                      setFormData({
                        fullName: "",
                        phoneNumber: "",
                        email: "",
                        role: "Staff",
                        password: "",
                      });
                    }}
                    className={getThemeClasses(
                      "flex-1 border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] rounded-xl",
                      '!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !text-[#4c1d1d] !border-[#FFC1CC]/30'
                    )}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className={getThemeClasses(
                      "flex-1 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:from-[#4C3D19] hover:to-[#324D3E] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300",
                      '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]'
                    )}
                  >
                    {submitting ? "Memperbarui..." : "Update Pengguna"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Requests Tab Content */}
        {activeTab === "requests" && (
          <>
            {/* Requests Filter */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#324D3E] dark:text-white mb-1 sm:hidden">
                    Status Permintaan
                  </label>
                  <select
                    value={requestFilter}
                    onChange={(e) => setRequestFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 text-sm sm:text-base"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu Review</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#324D3E] dark:text-white mb-1 sm:hidden">
                    Tipe Permintaan
                  </label>
                  <select
                    value={requestTypeFilter}
                    onChange={(e) => setRequestTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 text-sm sm:text-base"
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="delete">Hapus Tanaman</option>
                    <option value="update_history">Edit Riwayat</option>
                    <option value="delete_history">Hapus Riwayat</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Requests Cards */}
            <div className="space-y-4">
              {requestsLoading ? (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E] dark:border-white mx-auto"></div>
                    <p className="mt-4 text-[#889063] dark:text-gray-300 text-sm sm:text-base">
                      Memuat permintaan...
                    </p>
                  </div>
                </div>
              ) : requests.length === 0 ? (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-8">
                  <div className="text-center">
                    <p className="text-[#889063] dark:text-gray-300 text-sm sm:text-base">
                      Tidak ada permintaan ditemukan
                    </p>
                  </div>
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    {/* Card Header */}
                    <div className={`p-4 sm:p-6 border-b ${request.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50' : request.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#324D3E] to-[#4C3D19] flex items-center justify-center text-white font-bold text-lg">
                              {request.requestedBy.fullName.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-[#324D3E] dark:text-white text-sm sm:text-base truncate">
                              {request.requestedBy.fullName}
                            </h3>
                            <p className="text-xs sm:text-sm text-[#889063] dark:text-gray-300 truncate">
                              {request.requestedBy.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`text-xs font-medium ${getRequestTypeColor(request.requestType)}`}>
                            {getRequestTypeLabel(request.requestType)}
                          </Badge>
                          <Badge className={`text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status === "pending" ? "Menunggu" : request.status === "approved" ? "Disetujui" : "Ditolak"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-6 space-y-4">
                      {/* Plant ID & Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#889063] dark:text-gray-400 mb-1">
                            Plant ID
                          </label>
                          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <p className="text-sm font-mono font-bold text-[#324D3E] dark:text-white break-all">
                              {request.plantId}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#889063] dark:text-gray-400 mb-1">
                            Tanggal Permintaan
                          </label>
                          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <p className="text-sm font-medium text-[#324D3E] dark:text-white">
                              {new Date(request.requestDate).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short"
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* History ID (for history operations) */}
                      {request.historyId && (
                        <div>
                          <label className="block text-xs font-medium text-[#889063] dark:text-gray-400 mb-1">
                            History ID
                          </label>
                          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <p className="text-sm font-mono font-bold text-[#324D3E] dark:text-white">
                              {request.historyId}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Delete Reason */}
                      {request.deleteReason && (
                        <div>
                          <label className="block text-xs font-medium text-red-700 dark:text-red-400 mb-2">
                            Alasan {request.requestType === "delete" ? "Penghapusan Tanaman" : "Penghapusan Riwayat"}
                          </label>
                          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg p-4">
                            <p className="text-sm text-red-800 dark:text-red-300 font-medium whitespace-pre-wrap break-words">
                              {request.deleteReason}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Update History Details */}
                      {request.requestType === "update_history" && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                              Deskripsi Lama
                            </label>
                            <div className="bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                              <p className="text-sm text-gray-700 dark:text-gray-300 italic whitespace-pre-wrap break-words">
                                {request.originalDescription}
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                              Deskripsi Baru (Usulan Perubahan)
                            </label>
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
                              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium whitespace-pre-wrap break-words">
                                {request.newDescription}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Review Info (if reviewed) */}
                      {request.status !== "pending" && (
                        <div className={`${request.status === 'approved' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} border ${request.status === 'approved' ? 'border-green-200 dark:border-green-700/50' : 'border-red-200 dark:border-red-700/50'} rounded-lg p-4`}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <label className={`text-xs font-semibold ${request.status === 'approved' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                              {request.status === "approved" ? "✓ Disetujui oleh" : "✕ Ditolak oleh"}
                            </label>
                            <span className={`text-xs font-medium ${request.status === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {request.reviewedAt && new Date(request.reviewedAt).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short"
                              })}
                            </span>
                          </div>
                          <p className={`text-sm font-bold mb-2 ${request.status === 'approved' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                            {request.reviewedBy?.fullName || "System"}
                          </p>
                          {request.reviewNotes && (
                            <div className="mt-2">
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                Catatan:
                              </label>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                {request.reviewNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer - Actions */}
                    {request.status === "pending" && (
                      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-[#324D3E]/10 dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            variant="outline"
                            onClick={() => handleReviewRequest(request)}
                            className="flex-1 border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] rounded-xl font-semibold"
                          >
                            📋 Review Detail
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedRequest(request);
                              setReviewNotes("");
                              handleSubmitReview("approved");
                            }}
                            disabled={reviewingRequest}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:shadow-lg text-white font-semibold rounded-xl transition-all duration-300"
                          >
                            ✓ Setujui
                          </Button>
                          <Button
                            onClick={() => handleReviewRequest(request)}
                            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg text-white font-semibold rounded-xl transition-all duration-300"
                          >
                            ✕ Tolak
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Review Modal */}
        {showReviewModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 dark:bg-gray-800 backdrop-blur-lg rounded-2xl shadow-2xl border border-[#324D3E]/10 dark:border-gray-700 w-[600px] max-w-[90vw] h-[80vh] max-h-[600px] flex flex-col">
              <div className="p-6 border-b border-[#324D3E]/10 dark:border-gray-700 flex-shrink-0">
                <h2 className="text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)]">
                  Review Permintaan
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                      Staff
                    </label>
                    <p className="text-sm text-[#889063] dark:text-gray-300 font-medium">
                      {selectedRequest.requestedBy.fullName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedRequest.requestedBy.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                      Tipe Permintaan
                    </label>
                    <Badge
                      className={`text-sm ${getRequestTypeColor(
                        selectedRequest.requestType
                      )}`}
                    >
                      {getRequestTypeLabel(selectedRequest.requestType)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Plant ID
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <p className="text-sm text-[#324D3E] dark:text-white font-mono font-bold">
                      {selectedRequest.plantId}
                    </p>
                  </div>
                </div>

                {selectedRequest.deleteReason && (
                  <div>
                    <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                      Alasan Penghapusan Tanaman
                    </label>
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg p-4">
                      <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                        {selectedRequest.deleteReason}
                      </p>
                    </div>
                  </div>
                )}

                {selectedRequest.requestType === "update_history" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                        Catatan Lama
                      </label>
                      <div className="bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                          {selectedRequest.originalDescription}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                        Catatan Baru (Usulan)
                      </label>
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
                        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                          {selectedRequest.newDescription}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-1">
                    Catatan Review dari Admin (Opsional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Berikan catatan review..."
                    className="w-full px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white text-sm min-h-[100px] bg-white/80 dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-[#324D3E]/10 dark:border-gray-700 flex-shrink-0">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowReviewModal(false)}
                      className={getThemeClasses(
                        "flex-1 border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] rounded-xl",
                        '!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !text-[#4c1d1d] !border-[#FFC1CC]/30'
                      )}
                    disabled={reviewingRequest}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={() => handleSubmitReview("rejected")}
                    disabled={reviewingRequest}
                      className={getThemeClasses(
                        "flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg text-white font-semibold rounded-xl transition-all duration-300",
                        '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]'
                      )}
                  >
                    {reviewingRequest ? "Processing..." : "Tolak"}
                  </Button>
                  <Button
                    onClick={() => handleSubmitReview("approved")}
                    disabled={reviewingRequest}
                      className={getThemeClasses(
                        "flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:shadow-lg text-white font-semibold rounded-xl transition-all duration-300",
                        '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]'
                      )}
                  >
                    {reviewingRequest ? "Processing..." : "Setujui"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert & Confirm Components */}
        <AlertComponent />
        <ConfirmComponent />
      </div>
    </AdminLayout>
  );
}
