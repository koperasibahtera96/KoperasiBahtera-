"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { KetuaLayout } from "@/components/ketua/KetuaLayout";
import { useAlert } from "@/components/ui/Alert";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Select";
import { RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Investor {
  _id: string;
  userId: string;
  name: string;
  email: string;
  totalInvestasi: number;
  jumlahPohon: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id: string;
  fullName: string;
  email: string;
}

export default function InvestorsPage() {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { showSuccess, showError, AlertComponent } = useAlert();
  const { showDeleteConfirm, ConfirmComponent } = useConfirmDialog();

  const [investors, setInvestors] = useState<Investor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileChangeRequests, setProfileChangeRequests] = useState<any[]>([]);
  const [_loadingRequests, setLoadingRequests] = useState(false);
  const [selectedInvestorRequests, setSelectedInvestorRequests] = useState<
    any[]
  >([]);
  const [showInvestorRequestsModal, setShowInvestorRequestsModal] =
    useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    totalInvestasi: 0,
    jumlahPohon: 0,
    status: "active" as "active" | "inactive",
  });
  const [displayTotalInvestasi, setDisplayTotalInvestasi] = useState("");
  const [displayJumlahPohon, setDisplayJumlahPohon] = useState("");

  // Helper functions for number formatting
  const formatNumber = (num: number) => {
    return num.toLocaleString("id-ID");
  };

  const parseNumber = (str: string) => {
    // Remove all non-digit characters except decimal point
    const cleaned = str.replace(/[^\d]/g, "");
    return cleaned === "" ? 0 : parseInt(cleaned);
  };

  // Fetch investors and requests on component mount
  useEffect(() => {
    fetchInvestors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session && session?.user?.role !== 'ketua') {
      fetchProfileChangeRequests();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // Fetch users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/admin/users/list");
        if (response.ok) {
          const result = await response.json();
          setUsers(result.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
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
      const response = await fetch("/api/admin/investors");
      if (response.ok) {
        const result = await response.json();
        setInvestors(result.data);
      } else {
        showError(
          "Gagal memuat data",
          "Tidak dapat mengambil data investor dari server"
        );
      }
    } catch (error) {
      console.error("Error fetching investors:", error);
      showError(
        "Kesalahan Jaringan",
        "Gagal terhubung ke server. Periksa koneksi internet Anda."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile change requests
  const fetchProfileChangeRequests = async () => {
    // Don't fetch if user is Ketua (read-only role)
    if (session?.user?.role === 'ketua') {
      return;
    }
    
    try {
      setLoadingRequests(true);
      const response = await fetch("/api/admin/profile-change-requests");
      if (response.ok) {
        const result = await response.json();
        console.log(result, "result");
        setProfileChangeRequests(result.requests);
      } else {
        showError(
          "Gagal memuat data",
          "Tidak dapat mengambil data permintaan perubahan profil"
        );
      }
    } catch (error) {
      console.error("Error fetching profile change requests:", error);
      showError(
        "Kesalahan Jaringan",
        "Gagal terhubung ke server. Periksa koneksi internet Anda."
      );
    } finally {
      setLoadingRequests(false);
    }
  };

  // Handle user selection from dropdown
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const selectedUser = users.find((user) => user._id === userId);
    if (selectedUser) {
      setFormData({
        ...formData,
        name: selectedUser.fullName,
        email: selectedUser.email,
      });
    }
  };

  const filteredInvestors = investors.filter((investor) => {
    const matchesSearch =
      investor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || investor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate userId is selected for new investors
    if (!editingInvestor && !selectedUserId) {
      showError(
        "User Required",
        "Please select a user to create an investor account"
      );
      return;
    }

    try {
      if (editingInvestor) {
        // Update existing investor
        const response = await fetch("/api/admin/investors", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingInvestor._id, ...formData }),
        });

        if (response.ok) {
          // Refresh the investors list
          fetchInvestors();
          showSuccess("Berhasil!", "Data investor berhasil diperbarui");
        } else {
          const errorData = await response.json();
          showError(
            "Gagal memperbarui",
            errorData.error || "Terjadi kesalahan saat memperbarui investor"
          );
        }
      } else {
        // Add new investor - userId is required
        const requestData = { ...formData, userId: selectedUserId };

        const response = await fetch("/api/admin/investors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        });

        if (response.ok) {
          // Refresh the investors list
          fetchInvestors();
          showSuccess("Berhasil!", "Investor baru berhasil ditambahkan");
        } else {
          const errorData = await response.json();
          showError(
            "Gagal menambahkan",
            errorData.error || "Terjadi kesalahan saat menambahkan investor"
          );
        }
      }

      // Reset form
      setFormData({
        name: "",
        email: "",
        totalInvestasi: 0,
        jumlahPohon: 0,
        status: "active",
      });
      setSelectedUserId("");
      setEditingInvestor(null);
      setShowModal(false);
    } catch (error) {
      console.error("Error saving investor:", error);
      showError(
        "Kesalahan Jaringan",
        "Gagal terhubung ke server. Periksa koneksi internet Anda."
      );
    }
  };

  const handleEdit = (investor: Investor) => {
    setEditingInvestor(investor);
    setFormData({
      name: investor.name,
      email: investor.email,
      totalInvestasi: investor.totalInvestasi,
      jumlahPohon: investor.jumlahPohon,
      status: investor.status,
    });
    setDisplayTotalInvestasi(
      investor.totalInvestasi > 0 ? formatNumber(investor.totalInvestasi) : ""
    );
    setDisplayJumlahPohon(
      investor.jumlahPohon > 0 ? formatNumber(investor.jumlahPohon) : ""
    );
    setSelectedUserId(""); // Don't pre-select user when editing
    setShowModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    showDeleteConfirm(name, async () => {
      try {
        const response = await fetch(`/api/admin/investors?id=${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          // Refresh the investors list
          fetchInvestors();
          showSuccess("Berhasil!", `Investor "${name}" berhasil dihapus`);
        } else {
          const errorData = await response.json();
          showError(
            "Gagal menghapus",
            errorData.error || "Terjadi kesalahan saat menghapus investor"
          );
        }
      } catch (error) {
        console.error("Error deleting investor:", error);
        showError(
          "Kesalahan Jaringan",
          "Gagal terhubung ke server. Periksa koneksi internet Anda."
        );
      }
    });
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const response = await fetch("/api/admin/profile-change-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "approve" }),
      });

      if (response.ok) {
        showSuccess("Berhasil!", "Permohonan perubahan profil telah disetujui");
        fetchProfileChangeRequests();
        setShowInvestorRequestsModal(false);
      } else {
        const errorData = await response.json();
        showError(
          "Gagal menyetujui",
          errorData.error || "Gagal menyetujui permohonan"
        );
      }
    } catch (error) {
      console.error("Error approving request:", error);
      showError("Kesalahan Jaringan", "Gagal terhubung ke server");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const response = await fetch("/api/admin/profile-change-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "reject" }),
      });

      if (response.ok) {
        showSuccess("Berhasil!", "Permohonan perubahan profil telah ditolak");
        fetchProfileChangeRequests();
        setShowInvestorRequestsModal(false);
      } else {
        const errorData = await response.json();
        showError(
          "Gagal menolak",
          errorData.error || "Gagal menolak permohonan"
        );
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      showError("Kesalahan Jaringan", "Gagal terhubung ke server");
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "inactive":
        return "Tidak Aktif";
      default:
        return status;
    }
  };

  // Get pending request count for a specific user (by ID)
  const getPendingRequestCount = (userId: string) => {
    return profileChangeRequests.filter(
      (request) => request.user?._id === userId && request.status === "pending"
    ).length;
  };

  // Get all requests for a specific user (by ID), sorted by requestedAt desc
  const getUserRequests = (userId: string) => {
    return profileChangeRequests
      .filter((request) => request.user?._id === userId)
      .sort(
        (a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
  };

  // Handle viewing investor requests
  const handleViewInvestorRequests = (userId: string) => {
    const investorRequests = getUserRequests(userId);
    setSelectedInvestorRequests(investorRequests);
    setShowInvestorRequestsModal(true);
  };

  // Determine which layout to use based on user role
  const isKetua = session?.user?.role === 'ketua';
  const Layout = isKetua ? KetuaLayout : AdminLayout;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] truncate transition-colors duration-300">
              Manajemen Investor
            </h1>
            <p className="text-[#889063] dark:text-gray-200 mt-1 sm:mt-2 text-sm sm:text-base transition-colors duration-300">
              Kelola data investor dan portfolio mereka
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={fetchInvestors}
              disabled={loading}
              className="bg-[#324D3E]/10 dark:bg-[#324D3E]/20 hover:bg-[#324D3E]/20 dark:hover:bg-[#324D3E]/30 text-[#324D3E] dark:text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {!isKetua && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
              >
                <span>➕</span>
                <span className="sm:hidden">+ Investor</span>
                <span className="hidden sm:inline">Tambah Investor</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">
                👥 Total Investor
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
                {investors.length}
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">
                ✅ Investor Aktif
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#4C3D19] dark:text-emerald-300 transition-colors duration-300">
                {investors.filter((i) => i.status === "active").length}
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">
                ❌ Tidak Aktif
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400 transition-colors duration-300">
                {investors.filter((i) => i.status === "inactive").length}
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[#889063] dark:text-gray-200 truncate transition-colors duration-300">
                💰 Total Investasi
              </p>
              <div className="flex flex-col">
                <p className="text-sm sm:text-base lg:text-lg font-bold text-[#324D3E] dark:text-white leading-tight break-all transition-colors duration-300">
                  Rp.{" "}
                  {investors
                    .reduce((sum, inv) => sum + inv.totalInvestasi, 0)
                    .toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 lg:p-6 transition-colors duration-300 overflow-visible">
          <div className="flex flex-col lg:flex-row gap-4 overflow-visible">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari investor berdasarkan nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white placeholder-[#889063] dark:placeholder-gray-300 transition-colors duration-300"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: "all", label: "Semua Status" },
                { value: "active", label: "Aktif" },
                { value: "inactive", label: "Tidak Aktif" },
              ]}
              className="w-full lg:w-auto lg:min-w-[150px]"
            />
          </div>
        </div>

        {/* Investors Table */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#324D3E]/5 dark:bg-gray-700/50 transition-colors duration-300">
                <tr>
                  <th className="px-3 lg:px-6 py-4 text-left text-xs font-medium text-[#324D3E] dark:text-white uppercase tracking-wider transition-colors duration-300">
                    Investor
                  </th>
                  <th className="hidden md:table-cell px-3 lg:px-6 py-4 text-left text-xs font-medium text-[#324D3E] dark:text-white uppercase tracking-wider transition-colors duration-300">
                    Email
                  </th>
                  <th className="px-3 lg:px-6 py-4 text-left text-xs font-medium text-[#324D3E] dark:text-white uppercase tracking-wider transition-colors duration-300">
                    Investasi
                  </th>
                  <th className="hidden lg:table-cell px-3 lg:px-6 py-4 text-left text-xs font-medium text-[#324D3E] dark:text-white uppercase tracking-wider transition-colors duration-300">
                    Pohon
                  </th>
                  <th className="px-3 lg:px-6 py-4 text-left text-xs font-medium text-[#324D3E] dark:text-white uppercase tracking-wider transition-colors duration-300">
                    Status
                  </th>
                  <th className="px-3 lg:px-6 py-4 text-left text-xs font-medium text-[#324D3E] dark:text-white uppercase tracking-wider transition-colors duration-300">
                    Permohonan
                  </th>
                  <th className="px-3 lg:px-6 py-4 text-left text-xs font-medium text-[#324D3E] dark:text-white uppercase tracking-wider transition-colors duration-300">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 dark:bg-gray-700/30 divide-y divide-[#324D3E]/10 dark:divide-gray-600 transition-colors duration-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        <span className="ml-2 text-gray-600 dark:text-gray-200 transition-colors duration-300">
                          Memuat data investor...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvestors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-500 dark:text-gray-200 transition-colors duration-300"
                    >
                      Belum ada data investor
                    </td>
                  </tr>
                ) : (
                  filteredInvestors.map((investor) => (
                    <tr
                      key={investor._id}
                      className="hover:bg-[#324D3E]/5 dark:hover:bg-gray-600/30 transition-colors duration-300"
                    >
                      <td className="px-3 lg:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm lg:text-base">
                              {investor.name.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#324D3E] dark:text-white text-sm lg:text-base truncate transition-colors duration-300">
                              {investor.name}
                            </p>
                            <p className="text-xs lg:text-sm text-[#889063] dark:text-gray-200 md:hidden transition-colors duration-300">
                              {investor.email}
                            </p>
                            <p className="text-xs text-[#889063] dark:text-gray-200 transition-colors duration-300">
                              ID: {investor._id.slice(-6)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 lg:px-6 py-4">
                        <p className="text-sm text-[#324D3E] dark:text-white truncate transition-colors duration-300">
                          {investor.email}
                        </p>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <p className="font-medium text-[#324D3E] dark:text-white text-sm lg:text-base transition-colors duration-300">
                          Rp {investor.totalInvestasi.toLocaleString("id-ID")}
                        </p>
                        <p className="text-xs text-[#889063] dark:text-gray-200 lg:hidden transition-colors duration-300">
                          {investor.jumlahPohon} pohon
                        </p>
                      </td>
                      <td className="hidden lg:table-cell px-3 lg:px-6 py-4">
                        <p className="font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                          {investor.jumlahPohon}
                        </p>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors duration-300 ${
                            investor.status === "active"
                              ? "bg-[#4C3D19]/10 dark:bg-[#4C3D19]/20 text-[#4C3D19] dark:text-emerald-300 border border-[#4C3D19]/20 dark:border-emerald-600/50"
                              : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                          }`}
                        >
                          {getStatusText(investor.status)}
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        {(() => {
                          const pendingCount = getPendingRequestCount(
                            investor.userId
                          );
                          const totalRequests = getUserRequests(
                            investor.userId
                          ).length;
                          const hasPending = pendingCount > 0;
                          return (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleViewInvestorRequests(investor.userId)
                                }
                                className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors duration-300 ${
                                  hasPending
                                    ? "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800/30"
                                    : "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500"
                                }`}
                              >
                                {totalRequests} permohonan
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        {!isKetua ? (
                          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-1 lg:gap-2">
                            <button
                              onClick={() => handleEdit(investor)}
                              className="text-[#324D3E] dark:text-white hover:text-[#4C3D19] dark:hover:text-gray-200 font-medium text-xs lg:text-sm transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(investor._id, investor.name)
                              }
                              className="text-red-600 hover:text-red-800 font-medium text-xs lg:text-sm transition-colors"
                            >
                              Hapus
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                        )}
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
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300">
            <div className="p-6 border-b border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300">
              <h2 className="text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
                {editingInvestor ? "Edit Investor" : "Tambah Investor Baru"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {!editingInvestor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2 transition-colors duration-300">
                    Pilih User *
                  </label>
                  <Select
                    value={selectedUserId}
                    onValueChange={handleUserSelect}
                    options={[
                      {
                        value: "",
                        label: "Pilih user untuk dijadikan investor...",
                      },
                      ...users.map((user) => ({
                        value: user._id,
                        label: `${user.fullName} (${user.email})`,
                      })),
                    ]}
                    placeholder="Pilih user untuk dijadikan investor..."
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-200 mt-1 transition-colors duration-300">
                    Nama dan email akan otomatis terisi setelah memilih user
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-2 transition-colors duration-300">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white placeholder-[#889063] dark:placeholder-gray-300 transition-colors duration-300"
                    placeholder="Masukkan nama lengkap"
                    readOnly={!editingInvestor && selectedUserId !== ""}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-2 transition-colors duration-300">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white placeholder-[#889063] dark:placeholder-gray-300 transition-colors duration-300"
                    placeholder="investor@email.com"
                    readOnly={!editingInvestor && selectedUserId !== ""}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-2 transition-colors duration-300">
                    Total Investasi (IDR)
                  </label>
                  <input
                    type="text"
                    value={displayTotalInvestasi}
                    onChange={(e) => {
                      const parsed = parseNumber(e.target.value);
                      setFormData({ ...formData, totalInvestasi: parsed });
                      setDisplayTotalInvestasi(
                        parsed > 0 ? formatNumber(parsed) : e.target.value
                      );
                    }}
                    className="w-full px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white placeholder-[#889063] dark:placeholder-gray-300 transition-colors duration-300"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-2 transition-colors duration-300">
                    Jumlah Pohon
                  </label>
                  <input
                    type="text"
                    value={displayJumlahPohon}
                    onChange={(e) => {
                      const parsed = parseNumber(e.target.value);
                      setFormData({ ...formData, jumlahPohon: parsed });
                      setDisplayJumlahPohon(
                        parsed > 0 ? formatNumber(parsed) : e.target.value
                      );
                    }}
                    className="w-full px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white placeholder-[#889063] dark:placeholder-gray-300 transition-colors duration-300"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2 transition-colors duration-300">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as "active" | "inactive",
                    })
                  }
                  options={[
                    { value: "active", label: "Aktif" },
                    { value: "inactive", label: "Tidak Aktif" },
                  ]}
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                >
                  {editingInvestor ? "Update Investor" : "Tambah Investor"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingInvestor(null);
                    setSelectedUserId("");
                    setFormData({
                      name: "",
                      email: "",
                      totalInvestasi: 0,
                      jumlahPohon: 0,
                      status: "active",
                    });
                  }}
                  className="px-6 py-2 border border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-700 transition-colors duration-300"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Investor Profile Change Requests Modal */}
      {showInvestorRequestsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300">
            <div className="p-6 border-b border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300">
              <h2 className="text-xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
                Permohonan Perubahan Profil
              </h2>
              <p className="text-sm text-[#889063] mt-1">
                {selectedInvestorRequests.length > 0 &&
                  `Permohonan untuk ${selectedInvestorRequests[0].user?.fullName} (${selectedInvestorRequests[0].user?.email})`}
              </p>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-semibold text-[#324D3E] dark:text-white mb-3">
                Riwayat Permohonan
              </h3>
              {selectedInvestorRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-gray-500">
                    Tidak ada permohonan perubahan profil
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedInvestorRequests.map((request) => (
                    <div
                      key={request._id}
                      className="bg-white rounded-xl border border-[#324D3E]/10 p-4 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                Jenis Perubahan
                              </p>
                              <p className="text-sm text-[#324D3E] dark:text-white font-semibold capitalize transition-colors duration-300">
                                {request.changeType === "fullName"
                                  ? "Nama Lengkap"
                                  : "Email"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                Status
                              </p>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  request.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : request.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {request.status === "pending"
                                  ? "Menunggu"
                                  : request.status === "approved"
                                  ? "Disetujui"
                                  : "Ditolak"}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                Nilai Saat Ini
                              </p>
                              <p className="text-sm text-gray-900 break-all">
                                {request.currentValue}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                Permintaan Nilai Baru
                              </p>
                              <p className="text-sm text-[#324D3E] dark:text-white font-semibold break-all transition-colors duration-300">
                                {request.requestedValue}
                              </p>
                            </div>
                          </div>

                          {request.reason && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-gray-700">
                                Alasan
                              </p>
                              <p className="text-sm text-gray-900">
                                {request.reason}
                              </p>
                            </div>
                          )}

                          {request.adminNotes && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-gray-700">
                                Catatan Admin
                              </p>
                              <p className="text-sm text-gray-900">
                                {request.adminNotes}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#889063]">
                            <p>
                              Diminta:{" "}
                              {new Date(request.requestedAt).toLocaleString(
                                "id-ID"
                              )}
                            </p>
                            {request.reviewedAt && (
                              <p>
                                Direview:{" "}
                                {new Date(request.reviewedAt).toLocaleString(
                                  "id-ID"
                                )}{" "}
                                oleh {request.reviewedBy}
                              </p>
                            )}
                          </div>
                        </div>

                        {request.status === "pending" && (
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleApproveRequest(request._id)}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors text-sm"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request._id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm"
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#324D3E]/10">
              <button
                onClick={() => setShowInvestorRequestsModal(false)}
                className="px-6 py-2 border border-[#324D3E]/20 text-[#324D3E] rounded-xl hover:bg-[#324D3E]/5 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert & Confirm Components */}
      <AlertComponent />
      <ConfirmComponent />
    </Layout>
  );
}
