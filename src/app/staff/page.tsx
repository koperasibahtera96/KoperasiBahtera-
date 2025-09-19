"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import StaffLayout from "@/components/staff/StaffLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Copy, 
  DollarSign, 
  Users, 
  TrendingUp, 
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface ReferralData {
  referralCode: string | null;
  staffName: string;
  staffEmail: string;
  referrals: Array<{
    paymentId: string;
    orderId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    productName: string;
    paymentType: string;
    amount: number;
    commission: number;
    status: string;
    paymentDate: string;
    createdAt: string;
  }>;
  totalCommission: number;
  totalReferrals: number;
  summary: {
    fullPayments: number;
    cicilanPayments: number;
    registrations: number;
  };
  message?: string;
}

export default function StaffPage() {
  const { status } = useSession();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/staff/referrals');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch referral data');
      }
      
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReferralData();
    }
  }, [status]);

  const copyReferralCode = async () => {
    if (data?.referralCode) {
      try {
        await navigator.clipboard.writeText(data.referralCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (err) {
        console.error('Failed to copy referral code:', err);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      settlement: "bg-green-100 text-green-800 border border-green-200",
      approved: "bg-green-100 text-green-800 border border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      rejected: "bg-red-100 text-red-800 border border-red-200",
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800 border border-gray-200"}`}>
        {status}
      </span>
    );
  };

  const getPaymentTypeBadge = (type: string) => {
    const typeStyles = {
      'full-investment': "bg-blue-100 text-blue-800 border border-blue-200",
      'cicilan-installment': "bg-purple-100 text-purple-800 border border-purple-200",
      'registration': "bg-orange-100 text-orange-800 border border-orange-200",
    };
    
    const typeLabels = {
      'full-investment': "Full Payment",
      'cicilan-installment': "Installment",
      'registration': "Registration",
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeStyles[type as keyof typeof typeStyles] || "bg-gray-100 text-gray-800 border border-gray-200"}`}>
        {typeLabels[type as keyof typeof typeLabels] || type}
      </span>
    );
  };

  // Pagination
  const totalPages = Math.ceil((data?.referrals.length || 0) / itemsPerPage);
  const paginatedReferrals = data?.referrals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || [];

  if (status === 'loading' || loading) {
    return (
      <StaffLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-lg text-gray-700 font-semibold">Loading...</span>
          </div>
        </div>
      </StaffLayout>
    );
  }

  if (error) {
    return (
      <StaffLayout>
        <div className="container mx-auto py-8 px-4">
          <Card className="shadow-lg bg-red-50 border border-red-200">
            <div className="p-8 text-center">
              <p className="text-red-600 mb-4 text-lg font-semibold">{error}</p>
              <Button onClick={fetchReferralData} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="container mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 drop-shadow-sm">
            Marketing Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
            Track your referrals and commission earnings
          </p>
          <Button
            onClick={fetchReferralData}
            variant="outline"
            className="shadow-lg bg-white hover:bg-gray-50 border-blue-200 text-blue-600 font-semibold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Referral Code Card */}
        <Card className="shadow-lg bg-[#FFFCE3] border border-[#324D3E]/20">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ExternalLink className="h-6 w-6 text-[#324D3E]" />
              <h2 className="text-xl font-bold text-[#324D3E]">Your Referral Code</h2>
            </div>
            {data?.referralCode ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 px-6 py-4 rounded-xl border border-[#324D3E]/20">
                  <code className="text-2xl font-mono font-bold text-[#324D3E] tracking-wider">
                    {data.referralCode}
                  </code>
                </div>
                <Button
                  onClick={copyReferralCode}
                  className={`shadow-lg transition-all duration-300 font-semibold ${copiedCode ? 'bg-[#324D3E] hover:bg-[#4C3D19] text-white' : 'bg-[#324D3E] hover:bg-[#4C3D19] text-white'}`}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copiedCode ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
            ) : (
              <div className="text-gray-700 bg-gray-100 p-4 rounded-lg border border-gray-200">
                {data?.message || "No referral code assigned. Contact admin."}
              </div>
            )}
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-lg bg-[#FFFCE3] border border-[#324D3E]/20">
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#324D3E]">Total Commission</h3>
                <DollarSign className="h-5 w-5 text-[#324D3E]" />
              </div>
              <div className="text-2xl font-bold text-[#324D3E]">
                {formatCurrency(data?.totalCommission || 0)}
              </div>
              <p className="text-xs text-gray-600 font-medium">
                2% of total referred investments
              </p>
            </div>
          </Card>

          <Card className="shadow-lg bg-[#FFFCE3] border border-[#324D3E]/20">
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#324D3E]">Total Referrals</h3>
                <Users className="h-5 w-5 text-[#324D3E]" />
              </div>
              <div className="text-2xl font-bold text-[#324D3E]">{data?.totalReferrals || 0}</div>
              <p className="text-xs text-gray-600 font-medium">
                Successful referrals
              </p>
            </div>
          </Card>

          <Card className="shadow-lg bg-[#FFFCE3] border border-[#324D3E]/20">
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#324D3E]">Full Payments</h3>
                <TrendingUp className="h-5 w-5 text-[#324D3E]" />
              </div>
              <div className="text-2xl font-bold text-[#324D3E]">{data?.summary.fullPayments || 0}</div>
              <p className="text-xs text-gray-600 font-medium">
                One-time investments
              </p>
            </div>
          </Card>

          <Card className="shadow-lg bg-[#FFFCE3] border border-[#324D3E]/20">
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#324D3E]">Installments</h3>
                <TrendingUp className="h-5 w-5 text-[#324D3E]" />
              </div>
              <div className="text-2xl font-bold text-[#324D3E]">{data?.summary.cicilanPayments || 0}</div>
              <p className="text-xs text-gray-600 font-medium">
                Installment payments
              </p>
            </div>
          </Card>
        </div>

        {/* Referrals Table */}
        <Card className="shadow-lg bg-[#FFFCE3] border border-[#324D3E]/20">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#324D3E]">Referral History</h2>
              {totalPages > 1 && (
                <div className="text-sm text-gray-700 font-medium">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>

            {data?.referrals && data.referrals.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#324D3E]/20">
                        <th className="text-left py-3 px-4 font-semibold text-[#324D3E]">Customer</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#324D3E] hidden sm:table-cell">Product</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#324D3E] hidden md:table-cell">Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#324D3E]">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#324D3E]">Commission</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#324D3E] hidden lg:table-cell">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#324D3E] hidden xl:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReferrals.map((referral) => (
                        <tr key={referral.paymentId} className="border-b border-[#324D3E]/10 hover:bg-[#324D3E]/5">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-[#324D3E]">{referral.customerName}</div>
                              <div className="text-sm text-gray-600">{referral.customerEmail}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-700 hidden sm:table-cell font-medium">{referral.productName || 'N/A'}</td>
                          <td className="py-4 px-4 hidden md:table-cell">{getPaymentTypeBadge(referral.paymentType)}</td>
                          <td className="py-4 px-4 font-mono text-[#324D3E] font-semibold">{formatCurrency(referral.amount)}</td>
                          <td className="py-4 px-4 font-mono font-semibold text-[#4C3D19]">
                            {formatCurrency(referral.commission)}
                          </td>
                          <td className="py-4 px-4 hidden lg:table-cell">{getStatusBadge(referral.status)}</td>
                          <td className="py-4 px-4 text-gray-700 hidden xl:table-cell font-medium">{formatDate(referral.paymentDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-gray-700 font-medium">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, data.referrals.length)} of {data.referrals.length} referrals
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="shadow-md bg-white hover:bg-[#324D3E]/5 border-[#324D3E]/30 text-[#324D3E] font-semibold"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="shadow-md bg-white hover:bg-[#324D3E]/5 border-[#324D3E]/30 text-[#324D3E] font-semibold"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-[#324D3E]/30 mx-auto mb-4" />
                <p className="text-gray-700 text-lg font-semibold">No referrals found</p>
                <p className="text-gray-600 font-medium">Share your referral code to start earning commissions!</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </StaffLayout>
  );
}