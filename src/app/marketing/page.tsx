"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import StaffLayout from "@/components/staff/StaffLayout";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  TrendingUp,
  DollarSign,
  Edit3,
  RefreshCw,
  Eye,
  AlertTriangle,
  X,
} from "lucide-react";

interface MarketingStaff {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  referralCode: string;
  isActive: boolean;
  createdAt: string;
  commissionSummary: {
    totalCommission: number;
    totalReferrals: number;
    fullInvestments: number;
    cicilanInvestments: number;
  };
}

interface CommissionData {
  staffSummary: {
    staffId: string;
    staffName: string;
    staffEmail: string;
    referralCode: string;
    totalCommission: number;
    totalReferrals: number;
    byType: {
      fullInvestment: number;
      cicilan: number;
    };
  }[];
  overallSummary: {
    totalStaff: number;
    totalCommissions: number;
    totalReferrals: number;
    byType: {
      fullInvestment: number;
      cicilan: number;
    };
  };
}

export default function MarketingHeadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [marketingStaff, setMarketingStaff] = useState<MarketingStaff[]>([]);
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to get theme-aware classes
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  // Edit referral code modal
  const [editModal, setEditModal] = useState<{
    show: boolean;
    staff: MarketingStaff | null;
    newCode: string;
    transferCommissions: boolean;
    loading: boolean;
  }>({
    show: false,
    staff: null,
    newCode: "",
    transferCommissions: true,
    loading: false,
  });

  // Commission history modal
  const [commissionHistory, setCommissionHistory] = useState<{
    show: boolean;
    staff: MarketingStaff | null;
    history: any[];
    loading: boolean;
  }>({
    show: false,
    staff: null,
    history: [],
    loading: false,
  });

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    // Check if user has marketing_head role (you might want to add this check on the backend too)
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch marketing staff
      const staffResponse = await fetch("/api/admin/marketing/staff");
      if (!staffResponse.ok) {
        const staffError = await staffResponse.json();
        throw new Error(staffError.error || "Failed to fetch marketing staff");
      }
      const staffData = await staffResponse.json();
      setMarketingStaff(staffData.data);

      // Fetch commission data
      const commissionResponse = await fetch("/api/admin/marketing/commissions");
      if (!commissionResponse.ok) {
        const commissionError = await commissionResponse.json();
        throw new Error(commissionError.error || "Failed to fetch commission data");
      }
      const commissionDataResult = await commissionResponse.json();
      setCommissionData(commissionDataResult.data);

    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch data");

      // If unauthorized, redirect to login
      if (error instanceof Error && error.message.includes("Access denied")) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditReferralCode = (staff: MarketingStaff) => {
    setEditModal({
      show: true,
      staff,
      newCode: staff.referralCode || "",
      transferCommissions: true,
      loading: false,
    });
  };

  const handleUpdateReferralCode = async () => {
    if (!editModal.staff || !editModal.newCode.trim()) {
      setError("Please enter a valid referral code");
      return;
    }

    setEditModal(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch("/api/admin/marketing/staff", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: editModal.staff._id,
          newReferralCode: editModal.newCode.toUpperCase().trim(),
          transferCommissions: editModal.transferCommissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update referral code");
      }

      // Refresh data
      await fetchData();

      setEditModal({
        show: false,
        staff: null,
        newCode: "",
        transferCommissions: true,
        loading: false,
      });

      setError("");
    } catch (error) {
      console.error("Error updating referral code:", error);
      setError(error instanceof Error ? error.message : "Failed to update referral code");
    } finally {
      setEditModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleGenerateReferralCode = async (staffId: string) => {
    try {
      const response = await fetch("/api/admin/marketing/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ staffId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate referral code");
      }

      // Refresh data
      await fetchData();
      setError("");
    } catch (error) {
      console.error("Error generating referral code:", error);
      setError(error instanceof Error ? error.message : "Failed to generate referral code");
    }
  };

  const handleViewCommissionHistory = async (staff: MarketingStaff) => {
    setCommissionHistory(prev => ({
      ...prev,
      show: true,
      staff,
      loading: true,
    }));

    try {
      const response = await fetch(`/api/admin/marketing/commissions?staffId=${staff._id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch commission history");
      }

      const data = await response.json();
      setCommissionHistory(prev => ({
        ...prev,
        history: data.data.commissions,
        loading: false,
      }));
    } catch (error) {
      console.error("Error fetching commission history:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch commission history");
      setCommissionHistory(prev => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <StaffLayout>
        <div className={getThemeClasses("min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center", "!bg-gradient-to-br !from-[#FFDEE9] !via-white !to-[#FFDEE9]")}>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className={getThemeClasses("animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E] mx-auto mb-4", "!border-[#4c1d1d]")}></div>
            <p className={getThemeClasses("text-[#889063] dark:text-gray-400", "!text-[#6b7280]")}>Loading marketing data...</p>
          </motion.div>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <motion.div
        className="container max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className={getThemeClasses("text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-2", "!text-[#4c1d1d]")}>
                Marketing Management
              </h1>
              <p className={getThemeClasses("text-[#889063] dark:text-gray-400", "!text-[#6b7280]")}>
                Monitor and manage marketing staff performance and commissions
              </p>
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className={getThemeClasses("mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl", "!bg-[#FFB3C6]/20 !border-[#FFB3C6]/50")}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className={getThemeClasses("w-5 h-5 text-red-600 dark:text-red-400", "!text-[#4c1d1d]")} />
                <p className={getThemeClasses("text-red-800 dark:text-red-200 font-medium", "!text-[#4c1d1d]")}>{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overall Summary Cards */}
        {commissionData && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              className={getThemeClasses("bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6", "!bg-white/95 !border-[#FFC1CC]/30")}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <div className={getThemeClasses("p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl", "!bg-[#FFC1CC]/40")}>
                  <Users className={getThemeClasses("w-6 h-6 text-blue-600 dark:text-blue-400", "!text-[#4c1d1d]")} />
                </div>
                <div>
                  <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400 mb-1", "!text-[#6b7280]")}>Total Staff</p>
                  <p className={getThemeClasses("text-2xl font-bold text-[#324D3E] dark:text-white", "!text-[#4c1d1d]")}>
                    {commissionData.overallSummary.totalStaff}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className={getThemeClasses("bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6", "!bg-white/95 !border-[#FFC1CC]/30")}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <div className={getThemeClasses("p-3 bg-green-100 dark:bg-green-900/30 rounded-xl", "!bg-[#B5EAD7]/40")}>
                  <DollarSign className={getThemeClasses("w-6 h-6 text-green-600 dark:text-green-400", "!text-[#4c1d1d]")} />
                </div>
                <div>
                  <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400 mb-1", "!text-[#6b7280]")}>Total Commissions</p>
                  <p className={getThemeClasses("text-lg font-bold text-[#324D3E] dark:text-white", "!text-[#4c1d1d]")}>
                    {formatCurrency(commissionData.overallSummary.totalCommissions)}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className={getThemeClasses("bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-4 sm:p-6", "!bg-white/95 !border-[#FFC1CC]/30")}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <div className={getThemeClasses("p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl", "!bg-[#C7CEEA]/40")}>
                  <TrendingUp className={getThemeClasses("w-6 h-6 text-purple-600 dark:text-purple-400", "!text-[#4c1d1d]")} />
                </div>
                <div>
                  <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400 mb-1", "!text-[#6b7280]")}>Total Referrals</p>
                  <p className={getThemeClasses("text-2xl font-bold text-[#324D3E] dark:text-white", "!text-[#4c1d1d]")}>
                    {commissionData.overallSummary.totalReferrals}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Marketing Staff Table */}
        <div className={getThemeClasses("bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden p-0", '!bg-gradient-to-r !from-[#FFF0F3] !to-[#FFF7F9]')}>
          <div className={getThemeClasses("p-6 border-b border-gray-200 dark:border-gray-700", '')}>
            <h2 className={getThemeClasses("text-xl font-semibold text-gray-900 dark:text-white", '')}>Marketing Staff</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={getThemeClasses("bg-gray-50 dark:bg-gray-900/30", '')}>
                <tr>
                  <th className={getThemeClasses("px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200", '')}>Staff</th>
                  <th className={getThemeClasses("px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200", '')}>Referral Code</th>
                  <th className={getThemeClasses("px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200", '')}>Total Commission</th>
                  <th className={getThemeClasses("px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200", '')}>Referrals</th>
                  
                  <th className={getThemeClasses("px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200", '')}>Status</th>
                  <th className={getThemeClasses("px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-200", '')}>Actions</th>
                </tr>
              </thead>
              <tbody className={getThemeClasses("divide-y divide-gray-200 dark:divide-gray-700", '')}>
                {marketingStaff.map((staff) => (
                  <tr key={staff._id} className={getThemeClasses("hover:bg-gray-50 transition-colors", "dark:hover:bg-gray-800/40") }>
                    <td className="px-6 py-4">
                      <div>
                        <p className={getThemeClasses("font-medium text-gray-900 dark:text-white", '')}>{staff.fullName}</p>
                        <p className={getThemeClasses("text-sm text-gray-600 dark:text-gray-300", '')}>{staff.email}</p>
                        <p className={getThemeClasses("text-xs text-gray-500 dark:text-gray-400", '')}>{staff.phoneNumber}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {staff.referralCode ? (
                          <code className={getThemeClasses("px-3 py-1 bg-gray-100 rounded-lg text-sm font-mono font-semibold dark:bg-gray-900/30 dark:text-gray-200", "!bg-[#FFF7F9] !text-[#4c1d1d]")}>
                            {staff.referralCode}
                          </code>
                        ) : (
                          <span className={getThemeClasses("text-sm text-gray-500 italic dark:text-gray-400", "!text-[#4c1d1d]")}>No code assigned</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className={getThemeClasses("font-semibold text-gray-900 dark:text-white", '')}>
                        {formatCurrency(staff.commissionSummary.totalCommission)}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className={getThemeClasses("font-semibold text-gray-900 dark:text-white", '')}>
                        {staff.commissionSummary.totalReferrals}
                      </p>
                      <div className={getThemeClasses("flex gap-2 text-xs text-gray-600 mt-1", "dark:text-gray-300") }>
                        <span>Full: {staff.commissionSummary.fullInvestments}</span>
                        <span>Cicilan: {staff.commissionSummary.cicilanInvestments}</span>
                      </div>
                    </td>

                    

                    <td className="px-6 py-4">
                      <span className={getThemeClasses(`px-2 py-1 text-xs rounded-full ${staff.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`, '')}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditReferralCode(staff)}
                          className={getThemeClasses("p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors", "dark:text-blue-300 dark:hover:bg-blue-900/30")}
                          title="Edit referral code"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleGenerateReferralCode(staff._id)}
                          className={getThemeClasses("p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors", "dark:text-green-300 dark:hover:bg-green-900/30")}
                          title="Generate new code"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleViewCommissionHistory(staff)}
                          className={getThemeClasses("p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors dark:text-white dark:hover:text-white dark:hover:bg-gray-800/30", "")}
                          title="View commission history"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Referral Code Modal */}
        {editModal.show && editModal.staff && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Edit Referral Code - {editModal.staff.fullName}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Code
                    </label>
                    <code className={getThemeClasses("block w-full px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono font-semibold dark:bg-gray-900/30 dark:text-gray-200", "!bg-[#FFF7F9] !text-[#4c1d1d]")}>
                      {editModal.staff.referralCode || "No code assigned"}
                    </code>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Referral Code
                    </label>
                    <input
                      type="text"
                      value={editModal.newCode}
                      onChange={(e) => setEditModal(prev => ({
                        ...prev,
                        newCode: e.target.value.toUpperCase()
                      }))}
                      maxLength={6}
                      placeholder="Enter 6-character code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be 6 alphanumeric characters (A-Z, 0-9)
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="transferCommissions"
                      checked={editModal.transferCommissions}
                      onChange={(e) => setEditModal(prev => ({
                        ...prev,
                        transferCommissions: e.target.checked
                      }))}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="transferCommissions" className="text-sm font-medium text-yellow-800 cursor-pointer">
                        Transfer existing commissions
                      </label>
                      <p className="text-xs text-yellow-700 mt-1">
                        If checked, all existing payments and commission history will be updated to use the new referral code.
                        If unchecked, existing commissions will remain with the old code.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setEditModal({
                      show: false,
                      staff: null,
                      newCode: "",
                      transferCommissions: true,
                      loading: false,
                    })}
                    disabled={editModal.loading}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleUpdateReferralCode}
                    disabled={editModal.loading || !editModal.newCode.trim() || editModal.newCode.length !== 6}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {editModal.loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    Update Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commission History Modal */}
        {commissionHistory.show && commissionHistory.staff && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Commission History - {commissionHistory.staff.fullName}
                  </h3>
                  <button
                    onClick={() => setCommissionHistory({
                      show: false,
                      staff: null,
                      history: [],
                      loading: false,
                    })}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Referral Code: <code className={getThemeClasses("bg-gray-100 px-2 py-1 rounded font-semibold dark:bg-gray-900/30 dark:text-gray-200", "!bg-[#FFF7F9] !text-[#4c1d1d]")}>{commissionHistory.staff.referralCode}</code>
                </p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {commissionHistory.loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading commission history...</p>
                  </div>
                ) : commissionHistory.history.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No commission history found for this staff member.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commissionHistory.history.map((commission: any) => (
                      <div key={commission._id} className="bg-gray-50 rounded-xl p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              Customer
                            </p>
                            <p className="font-medium text-gray-900">{commission.customerName}</p>
                            <p className="text-sm text-gray-600">{commission.customerEmail}</p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              Commission
                            </p>
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(commission.commissionAmount)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {commission.commissionRate * 100}% of {formatCurrency(commission.contractValue)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              Payment Details
                            </p>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                commission.paymentType === 'full-investment'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                              }`}>
                                {commission.paymentType === 'full-investment' ? 'Full Payment' : 'Installment'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {commission.productName || 'Investment Product'}
                            </p>
                          </div>

                          {commission.installmentDetails && (
                            <div className="md:col-span-1">
                              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                                Installment Info
                              </p>
                              <p className="text-sm text-gray-900">
                                {formatCurrency(commission.installmentDetails.installmentAmount)} × {commission.installmentDetails.totalInstallments} months
                              </p>
                              <p className="text-xs text-gray-600">
                                Installment #{commission.installmentDetails.installmentNumber}
                              </p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              Earned Date
                            </p>
                            <p className="text-sm text-gray-900">
                              {formatDate(commission.earnedAt)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              Reference
                            </p>
                            <p className="text-xs text-gray-600 font-mono">
                              {commission.cicilanOrderId || commission.paymentId}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="border-t border-gray-200 pt-4 mt-6">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-blue-600">
                              {commissionHistory.history.length}
                            </p>
                            <p className="text-sm text-gray-600">Total Records</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(
                                commissionHistory.history.reduce((sum: number, c: any) => sum + c.commissionAmount, 0)
                              )}
                            </p>
                            <p className="text-sm text-gray-600">Total Commission</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-purple-600">
                              {commissionHistory.history.filter((c: any) => c.paymentType === 'full-investment').length}
                            </p>
                            <p className="text-sm text-gray-600">Full Payments</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-orange-600">
                              {commissionHistory.history.filter((c: any) => c.paymentType === 'cicilan-installment').length}
                            </p>
                            <p className="text-sm text-gray-600">Installments</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </StaffLayout>
  );
}