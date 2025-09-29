"use client";

import StaffLayout from "@/components/staff/StaffLayout";
import { Badge } from "@/components/ui-staff/badge";
import { Button } from "@/components/ui-staff/button";
import { Input } from "@/components/ui-staff/input";
import { useAlert } from "@/components/ui/Alert";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

interface StaffUser {
  _id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  role: string;
  isActive: boolean;
  userCode?: string;
  createdAt?: string;
}

export default function MarketingKelolaStaff() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showSuccess, showError, AlertComponent } = useAlert();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // role guard: only allow marketing_head
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (
      session.user?.role !== "marketing_head" &&
      session.user?.role !== "admin"
    ) {
      // unauthorized
      router.push("/");
    }
  }, [session, status, router]);

  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses)
      return `${baseClasses} ${pinkClasses}`;
    return baseClasses;
  };

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    role: "Marketing",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "10",
        role: "marketing,marketing_head",
        ...(searchTerm && { search: searchTerm }),
      });
      const res = await fetch(`/api/admin/staff?${params}`);
      if (!res.ok) throw new Error("Failed to fetch staff");
      const data = await res.json();
      const users = data.data || [];
      // client-side status filter (isActive)
      const filtered =
        statusFilter === "all"
          ? users
          : users.filter((u: StaffUser) =>
              statusFilter === "active" ? u.isActive : !u.isActive
            );
      setStaffUsers(filtered);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
      showError("Error", "Gagal mengambil data staff marketing");
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string) => {
    if (password.length < 8)
      return { isValid: false, error: "Password minimal 8 karakter" };
    if (!/(?=.*[a-z])/.test(password))
      return { isValid: false, error: "Password harus mengandung huruf kecil" };
    if (!/(?=.*[A-Z])/.test(password))
      return { isValid: false, error: "Password harus mengandung huruf besar" };
    if (!/(?=.*\d)/.test(password))
      return { isValid: false, error: "Password harus mengandung angka" };
    if (!/(?=.*[@$!%*?&])/.test(password))
      return {
        isValid: false,
        error: "Password harus mengandung karakter khusus (@$!%*?&)",
      };
    return { isValid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isEditing = showEditModal && editingStaff;
      if (!isEditing && !formData.password) {
        showError(
          "Password diperlukan",
          "Password wajib diisi untuk staff baru"
        );
        setSubmitting(false);
        return;
      }
      if (formData.password) {
        const v = validatePassword(formData.password);
        if (!v.isValid) {
          showError("Password tidak valid", v.error || "Invalid password");
          setSubmitting(false);
          return;
        }
      }

      const url = "/api/admin/staff";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? JSON.stringify({
            ...formData,
            id: editingStaff?._id,
            role: "marketing",
          })
        : JSON.stringify({ ...formData, role: "marketing" });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save staff");
      }
      showSuccess("Berhasil", isEditing ? "Staff diperbarui" : "Staff dibuat");
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingStaff(null);
      setFormData({
        fullName: "",
        phoneNumber: "",
        email: "",
        role: "Marketing",
        password: "",
      });
      fetchStaff();
    } catch (err: any) {
      console.error(err);
      showError("Error", err.message || "Gagal menyimpan staff");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    setFormData({
      fullName: staff.fullName,
      phoneNumber: staff.phoneNumber,
      email: staff.email,
      role: "Marketing",
      password: "",
    });
    setShowEditModal(true);
  };

  // Deletion is intentionally disabled on the marketing management page.
  // Marketing Head should not delete marketing staff from this UI.

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++)
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData((prev) => ({ ...prev, password }));
  };

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className={getThemeClasses(
                "text-2xl font-bold text-[#324D3E] dark:text-white",
                "!text-[#4c1d1d]"
              )}
            >
              Kelola Staff Marketing
            </h1>
            <p
              className={getThemeClasses(
                "text-sm text-[#889063] dark:text-gray-400",
                "!text-[#6b7280]"
              )}
            >
              Tambahkan, edit, hapus staff marketing
            </p>
          </div>
          <div>
            <Button
              onClick={() => setShowAddModal(true)}
              className={getThemeClasses(
                "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white",
                "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
              )}
            >
              Tambah Staff Marketing
            </Button>
          </div>
        </div>

        <div
          className={getThemeClasses(
            "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 mb-4",
            "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9]"
          )}
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Cari staff..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={getThemeClasses(
                  "w-full border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl text-sm sm:text-base dark:bg-gray-700 dark:text-white placeholder:text-gray-400",
                  "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !text-[#4c1d1d]"
                )}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={getThemeClasses(
                  "px-3 py-2 border border-[#324D3E]/20 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] text-[#324D3E] dark:text-white bg-white dark:bg-gray-700 text-sm sm:text-base",
                  "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !text-[#4c1d1d]"
                )}
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        <div
          className={getThemeClasses(
            "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 overflow-hidden",
            "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9]"
          )}
        >
          {loading ? (
            <div className="text-center py-8">Memuat...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th
                      className={getThemeClasses(
                        "text-left py-2 pl-6 text-gray-700 dark:text-gray-200",
                        ""
                      )}
                    >
                      Nama
                    </th>
                    <th
                      className={getThemeClasses(
                        "text-left py-2 text-gray-700 dark:text-gray-200",
                        ""
                      )}
                    >
                      Email
                    </th>
                    <th
                      className={getThemeClasses(
                        "text-left py-2 text-gray-700 dark:text-gray-200",
                        ""
                      )}
                    >
                      Telepon
                    </th>
                    <th
                      className={getThemeClasses(
                        "text-left py-2 text-gray-700 dark:text-gray-200",
                        ""
                      )}
                    >
                      Status
                    </th>
                    <th
                      className={getThemeClasses(
                        "text-left py-2 text-gray-700 dark:text-gray-200",
                        ""
                      )}
                    >
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {staffUsers.map((s) => (
                    <tr
                      key={s._id}
                      className={getThemeClasses(
                        "border-t border-gray-200 dark:border-gray-700",
                        ""
                      )}
                    >
                      <td
                        className={getThemeClasses(
                          "py-3 pl-6 text-gray-900 dark:text-white",
                          ""
                        )}
                      >
                        {s.fullName}
                      </td>
                      <td
                        className={getThemeClasses(
                          "py-3 text-gray-900 dark:text-gray-200",
                          ""
                        )}
                      >
                        {s.email}
                      </td>
                      <td
                        className={getThemeClasses(
                          "py-3 text-gray-900 dark:text-gray-200",
                          ""
                        )}
                      >
                        {s.phoneNumber}
                      </td>
                      <td className={getThemeClasses("py-3", "")}>
                        <Badge
                          variant={s.isActive ? "default" : "secondary"}
                          className={
                            s.isActive
                              ? getThemeClasses(
                                  "text-xs dark:text-white",
                                  "!bg-[#FFDDE6] !text-[#7b1f2a]"
                                )
                              : getThemeClasses(
                                  "text-xs dark:text-white",
                                  "!text-[#4c1d1d]"
                                )
                          }
                        >
                          {s.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className={getThemeClasses("py-3", "")}>
                        <div className="flex gap-2">
                          {/* If current user is marketing_head, disallow editing admin accounts here */}
                          {!(
                            session?.user?.role === "marketing_head" &&
                            s.role === "admin"
                          ) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(s)}
                              className={getThemeClasses(
                                "border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] text-xs px-2 py-1",
                                "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !text-[#4c1d1d]"
                              )}
                            >
                              Ubah
                            </Button>
                          ) : null}
                          {/* Hapus action hidden on this page by design */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div
            className={getThemeClasses(
              "p-4 border-t border-[#324D3E]/10 dark:border-gray-700",
              "!border-[#FFC1CC]/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div
                className={getThemeClasses(
                  "text-sm text-gray-600 dark:text-gray-300",
                  ""
                )}
              >
                Halaman {currentPage} dari {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={getThemeClasses(
                    "border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10",
                    "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !text-[#4c1d1d]"
                  )}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={getThemeClasses(
                    "border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10",
                    "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !text-[#4c1d1d]"
                  )}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              className={getThemeClasses(
                "bg-white rounded-2xl p-6 w-full max-w-md dark:bg-gray-800",
                "!bg-[#FFF7F9] !text-[#4c1d1d]"
              )}
            >
              <h2
                className={getThemeClasses(
                  "text-lg font-bold mb-4 text-gray-900 dark:text-white",
                  "!text-[#4c1d1d]"
                )}
              >
                {showEditModal ? "Ubah Staff" : "Tambah Staff Marketing"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    className={getThemeClasses(
                      "block text-sm text-gray-700 dark:text-gray-200",
                      "!text-[#4c1d1d]"
                    )}
                  >
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
                    required
                    className={getThemeClasses(
                      "border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white",
                      "!bg-white !text-[#4c1d1d]"
                    )}
                  />
                </div>
                <div>
                  <label
                    className={getThemeClasses(
                      "block text-sm text-gray-700 dark:text-gray-200",
                      "!text-[#4c1d1d]"
                    )}
                  >
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
                    required
                    className={getThemeClasses(
                      "border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white",
                      "!bg-white !text-[#4c1d1d]"
                    )}
                  />
                </div>
                <div>
                  <label
                    className={getThemeClasses(
                      "block text-sm text-gray-700 dark:text-gray-200",
                      "!text-[#4c1d1d]"
                    )}
                  >
                    Telepon
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
                    required
                    className={getThemeClasses(
                      "border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white",
                      "!bg-white !text-[#4c1d1d]"
                    )}
                  />
                </div>
                <div>
                  <label
                    className={getThemeClasses(
                      "block text-sm text-gray-700 dark:text-gray-200",
                      "!text-[#4c1d1d]"
                    )}
                  >
                    Password{" "}
                    {showEditModal ? "(kosongkan jika tidak diubah)" : ""}
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
                      className={getThemeClasses(
                        "border-[#324D3E]/20 dark:border-gray-600 focus:border-[#324D3E] focus:ring-[#324D3E]/20 rounded-xl dark:bg-gray-700 dark:text-white",
                        "!bg-white !text-[#4c1d1d]"
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generatePassword}
                      className={getThemeClasses(
                        "whitespace-nowrap px-3 border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] rounded-xl",
                        "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !text-[#4c1d1d]"
                      )}
                    >
                      Buat Password
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setEditingStaff(null);
                      setFormData({
                        fullName: "",
                        phoneNumber: "",
                        email: "",
                        role: "Marketing",
                        password: "",
                      });
                    }}
                    className={getThemeClasses(
                      "flex-1 border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-gray-300 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:border-[#324D3E] rounded-xl",
                      "!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9] !text-[#4c1d1d]"
                    )}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className={getThemeClasses(
                      "flex-1 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:from-[#4C3D19] hover:to-[#324D3E] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300",
                      "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]"
                    )}
                  >
                    {submitting
                      ? "Menyimpan..."
                      : showEditModal
                      ? "Perbarui"
                      : "Buat"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <AlertComponent />
      </div>
    </StaffLayout>
  );
}
