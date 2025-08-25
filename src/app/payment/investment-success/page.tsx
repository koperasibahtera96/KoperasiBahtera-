'use client';

import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function InvestmentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactionDetails, setTransactionDetails] = useState({
    orderId: '',
    statusCode: '',
    transactionStatus: '',
  });
    const [loading, setLoading] = useState(true);

  const fetchPaymentStatus = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payment/status/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        const status = data.data.transactionStatus || 'pending';
        setTransactionDetails({
          orderId: orderId,
          statusCode: data.data.statusCode || '200',
          transactionStatus: status,
        });

                // Redirect to landing page with parameters for alert
        router.push(`/?orderId=${orderId}&paymentType=investment`);
      } else {
        // Fallback if API fails - redirect to landing page
        router.push(`/?orderId=${orderId}&paymentType=investment`);
      }
    } catch (error) {
      console.error('Error fetching payment status:', error);
      // Fallback on error - redirect to landing page
      router.push(`/?orderId=${orderId}&paymentType=investment`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const orderId = searchParams.get('orderId'); // Changed from 'order_id' to 'orderId'

    console.log('🔍 Success page received orderId:', orderId);
    console.log('🔍 All search params:', Object.fromEntries(searchParams.entries()));

    if (orderId) {
      // Fetch real payment status from database
      fetchPaymentStatus(orderId);
    } else {
      setTransactionDetails({
        orderId: 'N/A',
        statusCode: 'N/A',
        transactionStatus: 'N/A',
      });
      setLoading(false);
    }


  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat detail pembayaran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Pembayaran Investasi Berhasil!
        </h1>
        <p className="text-gray-600 mb-6">
          Terima kasih telah melakukan investasi. Anda akan segera dialihkan ke dashboard Anda.
        </p>
        <div className="bg-gray-100 p-4 rounded-md text-left text-sm text-gray-700 space-y-2">
          <p>
            <strong>Order ID:</strong> {transactionDetails.orderId}
          </p>
          <p>
            <strong>Status Transaksi:</strong>{' '}
            <span className="font-semibold text-green-600">
              {transactionDetails.transactionStatus}
            </span>
          </p>
        </div>
        <div className="mt-8">
          <Link href="/" passHref>
            <Button variant="primary" size="lg">
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
