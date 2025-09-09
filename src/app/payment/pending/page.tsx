"use client";

import LandingNavbar from "@/components/landing/LandingNavbar";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<Record<string, any> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    if (!orderId) return;

    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      fetchTransactionStatus(orderId);
      interval = setInterval(() => {
        fetchTransactionStatus(orderId);
      }, 10000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    // BFCache-friendly polling
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('freeze', stopPolling);
    document.addEventListener('resume', startPolling);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('freeze', stopPolling);
      document.removeEventListener('resume', startPolling);
    };
  }, [orderId]);

  const fetchTransactionStatus = async (orderId: string) => {
    try {
      const response = await fetch(`/api/payment/status/${orderId}`);
      const result = await response.json();

      if (response.ok) {
        setOrderDetails(result.data);
        setIsLoading(false);

        // Redirect if payment becomes successful
        if (result.data.transaction_status === "settlement") {
          window.location.href = `/payment/success?order_id=${orderId}`;
        } else if (
          ["deny", "cancel", "expire"].includes(result.data.transaction_status)
        ) {
          window.location.href = `/payment/error?order_id=${orderId}`;
        }
      }
    } catch (error) {
      console.error("Error fetching transaction status:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          {/* Pending Icon */}
          <div className="w-24 h-24 mx-auto mb-6 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-yellow-600 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Pembayaran Sedang Diproses
          </h1>
          <p className="text-gray-600 mb-8">
            Pembayaran Anda sedang dalam proses verifikasi. Halaman ini akan
            otomatis terupdate ketika pembayaran selesai.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center space-x-2 mb-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
              <span className="text-yellow-600">
                Mengecek status pembayaran...
              </span>
            </div>
          ) : (
            orderDetails && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Detail Transaksi
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono">{orderDetails.order_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-yellow-600 font-semibold flex items-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                      Pending
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jumlah:</span>
                    <span>
                      Rp {parseInt(orderDetails.gross_amount).toLocaleString()}
                    </span>
                  </div>
                  {orderDetails.payment_type && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Metode Pembayaran:</span>
                      <span className="capitalize">
                        {orderDetails.payment_type}
                      </span>
                    </div>
                  )}
                  {orderDetails.va_numbers &&
                    orderDetails.va_numbers.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded">
                        <h4 className="font-semibold text-blue-800 mb-2">
                          Informasi Virtual Account:
                        </h4>
                        {orderDetails.va_numbers.map(
                          (va: Record<string, string>, index: number) => (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-blue-600">Bank:</span>
                                <span className="font-semibold">
                                  {va.bank.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-600">
                                  No. Virtual Account:
                                </span>
                                <span className="font-mono font-semibold">
                                  {va.va_number}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                        <p className="text-xs text-blue-600 mt-2">
                          Silakan lakukan pembayaran menggunakan nomor Virtual
                          Account di atas
                        </p>
                      </div>
                    )}
                </div>
              </div>
            )
          )}

          <div className="space-y-4">
            <Button
              onClick={() => orderId && fetchTransactionStatus(orderId)}
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? "Mengecek..." : "Refresh Status"}
            </Button>

            <div>
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  Kembali ke Beranda
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">
              Informasi Penting:
            </h4>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li>• Jangan tutup halaman ini sampai pembayaran selesai</li>
              <li>• Proses verifikasi biasanya memakan waktu 1-15 menit</li>
              <li>
                • Untuk Virtual Account, pembayaran bisa memakan waktu hingga 2
                jam
              </li>
              <li>
                • Anda akan menerima notifikasi email setelah pembayaran
                berhasil
              </li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Halaman ini akan otomatis terupdate setiap 10 detik. Jika terjadi
              masalah, silakan hubungi customer service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>}>
      <PaymentPendingContent />
    </Suspense>
  );
}
