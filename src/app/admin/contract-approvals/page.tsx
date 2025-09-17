"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAlert } from "@/components/ui/Alert";
import Image from "next/image";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface SignatureAttempt {
  attemptNumber: number;
  signatureData: string;
  submittedAt: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  adminNotes?: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  ktpImageUrl?: string;
}

interface ContractForApproval {
  contractId: string;
  contractNumber: string;
  status: string;
  adminApprovalStatus: string;
  productName: string;
  totalAmount: number;
  paymentType: 'full' | 'cicilan';
  user: User;
  currentAttempt: number;
  maxAttempts: number;
  lastSignature: SignatureAttempt | null;
  contractDate: string;
  createdAt: string;
}

interface ApprovalModalData {
  contract: ContractForApproval;
  action: 'approve' | 'reject';
}

export default function ContractApprovalsPage() {
  const [contracts, setContracts] = useState<ContractForApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedContract, setSelectedContract] = useState<ApprovalModalData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const { showSuccess, showError, AlertComponent } = useAlert();

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/contracts/pending?page=${currentPage}&status=${statusFilter}&limit=10`
      );

      if (response.ok) {
        const result = await response.json();
        setContracts(result.data.contracts);
        setTotalPages(result.data.pagination.totalPages);
      } else {
        showError("Error", "Failed to fetch contracts");
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
      showError("Error", "Failed to fetch contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const handleApproval = async (contractId: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/contracts/${contractId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: adminNotes
        })
      });

      if (response.ok) {
        showSuccess("Success", "Contract approved successfully");
        setSelectedContract(null);
        setAdminNotes('');
        fetchContracts();
      } else {
        const error = await response.json();
        showError("Error", error.error || "Failed to approve contract");
      }
    } catch (error) {
      console.error("Error approving contract:", error);
      showError("Error", "Failed to approve contract");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejection = async (contractId: string) => {
    if (!rejectionReason.trim()) {
      showError("Error", "Rejection reason is required");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/contracts/${contractId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim(),
          adminNotes: adminNotes.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        showSuccess(
          "Success",
          result.data.isPermanentRejection
            ? "Contract permanently rejected (max attempts reached)"
            : "Contract rejected - user can retry"
        );
        setSelectedContract(null);
        setRejectionReason('');
        setAdminNotes('');
        fetchContracts();
      } else {
        const error = await response.json();
        showError("Error", error.error || "Failed to reject contract");
      }
    } catch (error) {
      console.error("Error rejecting contract:", error);
      showError("Error", "Failed to reject contract");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'permanently_rejected': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Persetujuan Kontrak</h1>
            <p className="text-gray-600 dark:text-gray-200 mt-2">Memuat data...</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div
        className="space-y-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
                Persetujuan Kontrak
              </h1>
              <p className="text-[#889063] dark:text-gray-200 mt-1 sm:mt-2 text-sm sm:text-base transition-colors duration-300">
                Review dan setujui tanda tangan kontrak user
              </p>
            </div>
            <button
              onClick={fetchContracts}
              disabled={loading}
              className="bg-[#324D3E]/10 dark:bg-[#324D3E]/20 hover:bg-[#324D3E]/20 dark:hover:bg-[#324D3E]/30 text-[#324D3E] dark:text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="mb-6 flex space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#324D3E] focus:border-transparent"
          >
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="permanently_rejected">Permanently Rejected</option>
            <option value="all">All Contracts</option>
          </select>
        </div>

        {/* Contracts Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Information
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signature Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.contractId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contract.contractNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contract.productName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Rp {contract.totalAmount.toLocaleString('id-ID')} ({contract.paymentType})
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(contract.createdAt).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contract.user.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contract.user.email}
                        </div>
                        {contract.user.phoneNumber && (
                          <div className="text-sm text-gray-500">
                            {contract.user.phoneNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          Attempt {contract.currentAttempt} of {contract.maxAttempts}
                        </div>
                        {contract.lastSignature && (
                          <div className="text-xs text-gray-500">
                            Submitted: {new Date(contract.lastSignature.submittedAt).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(contract.adminApprovalStatus)}`}>
                        {contract.adminApprovalStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {contract.adminApprovalStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => setSelectedContract({ contract, action: 'approve' })}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setSelectedContract({ contract, action: 'reject' })}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedContract({ contract, action: 'approve' })}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {contracts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">No contracts found for the selected filter.</div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded ${
                    page === currentPage
                      ? 'bg-[#324D3E] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Approval/Rejection Modal */}
      {selectedContract && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden mt-2 sm:mt-0 transition-colors duration-300"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Contract Review - {selectedContract.contract.contractNumber}
                </h2>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contract and User Info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Contract Information</h3>
                    <div className="space-y-1 text-sm">
                      <div><strong>Product:</strong> {selectedContract.contract.productName}</div>
                      <div><strong>Amount:</strong> Rp {selectedContract.contract.totalAmount.toLocaleString('id-ID')}</div>
                      <div><strong>Payment Type:</strong> {selectedContract.contract.paymentType.toUpperCase()}</div>
                      <div><strong>Attempt:</strong> {selectedContract.contract.currentAttempt} of {selectedContract.contract.maxAttempts}</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">User Information</h3>
                    <div className="space-y-1 text-sm">
                      <div><strong>Name:</strong> {selectedContract.contract.user.fullName}</div>
                      <div><strong>Email:</strong> {selectedContract.contract.user.email}</div>
                      {selectedContract.contract.user.phoneNumber && (
                        <div><strong>Phone:</strong> {selectedContract.contract.user.phoneNumber}</div>
                      )}
                    </div>
                  </div>

                  {/* KTP Image */}
                  {selectedContract.contract.user.ktpImageUrl && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">KTP Image</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Image
                          src={selectedContract.contract.user.ktpImageUrl}
                          alt="KTP Image"
                          width={400}
                          height={250}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Signature Review */}
                <div className="space-y-4">
                  {selectedContract.contract.lastSignature && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">User Signature</h3>
                      <div className="border rounded-lg bg-white p-4">
                        <Image
                          src={selectedContract.contract.lastSignature.signatureData}
                          alt="User Signature"
                          width={400}
                          height={200}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Submitted: {new Date(selectedContract.contract.lastSignature.submittedAt).toLocaleString('id-ID')}
                      </div>
                    </div>
                  )}

                  {/* Previous Rejections */}
                  {selectedContract.contract.lastSignature?.rejectionReason && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-900 mb-2">Previous Rejection</h3>
                      <div className="text-sm text-red-800">
                        <div><strong>Reason:</strong> {selectedContract.contract.lastSignature.rejectionReason}</div>
                        {selectedContract.contract.lastSignature.adminNotes && (
                          <div><strong>Notes:</strong> {selectedContract.contract.lastSignature.adminNotes}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Form */}
                  {selectedContract.contract.adminApprovalStatus === 'pending' && (
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        {selectedContract.action === 'approve' ? 'Approve Contract' : 'Reject Contract'}
                      </h3>

                      {selectedContract.action === 'reject' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rejection Reason *
                            </label>
                            <select
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#324D3E] focus:border-transparent"
                              required
                            >
                              <option value="">Select reason...</option>
                              <option value="Signature does not match KTP">Signature does not match KTP</option>
                              <option value="Signature too unclear">Signature too unclear</option>
                              <option value="Invalid signature format">Invalid signature format</option>
                              <option value="KTP image quality too poor">KTP image quality too poor</option>
                              <option value="Other documentation issues">Other documentation issues</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin Notes (Optional)
                        </label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Additional notes for the user..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#324D3E] focus:border-transparent"
                        />
                      </div>

                      <div className="flex space-x-3 mt-6">
                        <button
                          onClick={() => {
                            if (selectedContract.action === 'approve') {
                              handleApproval(selectedContract.contract.contractId);
                            } else {
                              handleRejection(selectedContract.contract.contractId);
                            }
                          }}
                          disabled={actionLoading || (selectedContract.action === 'reject' && !rejectionReason)}
                          className={`flex-1 py-2 px-4 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                            selectedContract.action === 'approve'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {actionLoading ? 'Processing...' : (
                            selectedContract.action === 'approve' ? 'Approve Contract' : 'Reject Contract'
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedContract(null)}
                          className="flex-1 py-2 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Alert Component */}
      <AlertComponent />
    </AdminLayout>
  );
}