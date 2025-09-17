"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 font-[family-name:var(--font-poppins)]">
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-2 text-lg">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 font-[family-name:var(--font-poppins)]">
        <div className="container mx-auto py-8 px-4">
          <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
            <div className="p-8 text-center">
              <p className="text-red-600 mb-4 text-lg">{error}</p>
              <Button onClick={fetchReferralData} className="bg-green-600 hover:bg-green-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 font-[family-name:var(--font-poppins)]">
      <div className="container mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-[#2D3B30] drop-shadow-sm">
            Marketing Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Track your referrals and commission earnings
          </p>
          <Button 
            onClick={fetchReferralData} 
            variant="outline"
            className="shadow-lg bg-white/80 backdrop-blur-sm hover:bg-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Referral Code Card */}
        <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ExternalLink className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-[#2D3B30]">Your Referral Code</h2>
            </div>
            {data?.referralCode ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-gradient-to-r from-green-100 to-blue-100 px-6 py-4 rounded-xl shadow-inner">
                  <code className="text-2xl font-mono font-bold text-[#2D3B30] tracking-wider">
                    {data.referralCode}
                  </code>
                </div>
                <Button 
                  onClick={copyReferralCode} 
                  className={`shadow-lg transition-all duration-300 ${copiedCode ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copiedCode ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
            ) : (
              <div className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                {data?.message || "No referral code assigned. Contact admin."}
              </div>
            )}
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium opacity-90">Total Commission</h3>
                <DollarSign className="h-5 w-5 opacity-80" />
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(data?.totalCommission || 0)}
              </div>
              <p className="text-xs opacity-80">
                2% of total referred investments
              </p>
            </div>
          </Card>

          <Card className="shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium opacity-90">Total Referrals</h3>
                <Users className="h-5 w-5 opacity-80" />
              </div>
              <div className="text-2xl font-bold">{data?.totalReferrals || 0}</div>
              <p className="text-xs opacity-80">
                Successful referrals
              </p>
            </div>
          </Card>

          <Card className="shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium opacity-90">Full Payments</h3>
                <TrendingUp className="h-5 w-5 opacity-80" />
              </div>
              <div className="text-2xl font-bold">{data?.summary.fullPayments || 0}</div>
              <p className="text-xs opacity-80">
                One-time investments
              </p>
            </div>
          </Card>

          <Card className="shadow-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium opacity-90">Installments</h3>
                <TrendingUp className="h-5 w-5 opacity-80" />
              </div>
              <div className="text-2xl font-bold">{data?.summary.cicilanPayments || 0}</div>
              <p className="text-xs opacity-80">
                Installment payments
              </p>
            </div>
          </Card>
        </div>

        {/* Referrals Table */}
        <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#2D3B30]">Referral History</h2>
              {totalPages > 1 && (
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>
            
            {data?.referrals && data.referrals.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-[#2D3B30]">Customer</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#2D3B30] hidden sm:table-cell">Product</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#2D3B30] hidden md:table-cell">Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#2D3B30]">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#2D3B30]">Commission</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#2D3B30] hidden lg:table-cell">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#2D3B30] hidden xl:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReferrals.map((referral) => (
                        <tr key={referral.paymentId} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-[#2D3B30]">{referral.customerName}</div>
                              <div className="text-sm text-gray-500">{referral.customerEmail}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600 hidden sm:table-cell">{referral.productName || 'N/A'}</td>
                          <td className="py-4 px-4 hidden md:table-cell">{getPaymentTypeBadge(referral.paymentType)}</td>
                          <td className="py-4 px-4 font-mono text-[#2D3B30]">{formatCurrency(referral.amount)}</td>
                          <td className="py-4 px-4 font-mono font-semibold text-green-600">
                            {formatCurrency(referral.commission)}
                          </td>
                          <td className="py-4 px-4 hidden lg:table-cell">{getStatusBadge(referral.status)}</td>
                          <td className="py-4 px-4 text-gray-600 hidden xl:table-cell">{formatDate(referral.paymentDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-gray-600">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, data.referrals.length)} of {data.referrals.length} referrals
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="shadow-md bg-white/80"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="shadow-md bg-white/80"
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
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No referrals found</p>
                <p className="text-gray-400">Share your referral code to start earning commissions!</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}