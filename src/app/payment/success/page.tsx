'use client';

import { Button } from '@/components/ui/Button';
import { Navbar } from '@/components/layout/Navbar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderDetails, setOrderDetails] = useState<Record<string, string> | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (orderId) {
      // Get transaction status from Midtrans
      fetchTransactionStatus(orderId);
    }

    // Start countdown and redirect to login
    let countdown = 5;
    setRedirectCountdown(countdown);

    countdownIntervalRef.current = setInterval(() => {
      countdown--;
      setRedirectCountdown(countdown);

      if (countdown <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        router.push('/login');
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [orderId, router]);

  const fetchTransactionStatus = async (orderId: string) => {
    try {
      const response = await fetch(`/api/payment/status/${orderId}`);
      const result = await response.json();
      
      if (response.ok) {
        setOrderDetails(result.data);
      }
    } catch (error) {
      console.error('Error fetching transaction status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">Pembayaran Berhasil!</h1>
          <p className="text-gray-600 mb-4">
            Terima kasih! Pembayaran Anda telah berhasil diproses dan akun Anda telah dibuat.
          </p>
          <p className="text-green-600 font-semibold mb-8">
            Anda akan dialihkan ke halaman login dalam <span className="font-bold text-green-700">{redirectCountdown}</span> detik...
          </p>

          {orderDetails && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Detail Transaksi</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono">{orderDetails.order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600 font-semibold">
                    {orderDetails.transaction_status === 'settlement' ? 'Berhasil' : orderDetails.transaction_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Jumlah:</span>
                  <span>Rp {parseInt(orderDetails.gross_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Metode Pembayaran:</span>
                  <span className="capitalize">{orderDetails.payment_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Waktu:</span>
                  <span>{new Date(orderDetails.transaction_time).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Button 
              onClick={() => {
                if (countdownIntervalRef.current) {
                  clearInterval(countdownIntervalRef.current);
                  countdownIntervalRef.current = null;
                }
                router.push('/login');
              }}
              className="w-full sm:w-auto"
            >
              Login Sekarang
            </Button>
            
            <div>
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  Kembali ke Beranda
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              🎉 Akun Anda telah berhasil dibuat! Anda dapat langsung login menggunakan email dan password yang telah didaftarkan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}