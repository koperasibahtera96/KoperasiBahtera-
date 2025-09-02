"use client";

import LandingNavbar from "@/components/landing/LandingNavbar";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PaymentErrorPage() {
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<Record<
    string,
    string
  > | null>(null);
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    if (orderId) {
      fetchTransactionStatus(orderId);
    }
  }, [orderId]);

  const fetchTransactionStatus = async (orderId: string) => {
    try {
      const response = await fetch(`/api/payment/status/${orderId}`);
      const result = await response.json();

      if (response.ok) {
        setOrderDetails(result.data);
      }
    } catch (error) {
      console.error("Error fetching transaction status:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          {/* Error Icon */}
          <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Pembayaran Gagal
          </h1>
          <p className="text-gray-600 mb-8">
            Maaf, terjadi kesalahan dalam memproses pembayaran Anda. Silakan
            coba lagi atau hubungi customer service jika masalah berlanjut.
          </p>

          {orderDetails && (
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
                  <span className="text-red-600 font-semibold">
                    {orderDetails.transaction_status === "deny"
                      ? "Ditolak"
                      : orderDetails.transaction_status === "cancel"
                      ? "Dibatalkan"
                      : orderDetails.transaction_status === "expire"
                      ? "Kedaluwarsa"
                      : orderDetails.transaction_status}
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
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Link href="/register">
              <Button className="w-full sm:w-auto">Coba Daftar Lagi</Button>
            </Link>

            <div>
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  Kembali ke Beranda
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">
              Kemungkinan Penyebab:
            </h4>
            <ul className="text-sm text-yellow-700 text-left space-y-1">
              <li>• Saldo kartu tidak mencukupi</li>
              <li>• Kartu kredit/debit telah kedaluwarsa</li>
              <li>• Informasi kartu tidak sesuai</li>
              <li>• Transaksi ditolak oleh bank</li>
              <li>• Koneksi internet tidak stabil</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Tips:</strong> Pastikan informasi kartu benar, saldo
              mencukupi, dan koneksi internet stabil sebelum mencoba lagi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
