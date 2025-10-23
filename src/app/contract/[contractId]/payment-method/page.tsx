"use client";

import { useAlert } from "@/components/ui/Alert";
import { Building2, CreditCard, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function PaymentMethodPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.contractId as string;
  const [showBCAModal, setShowBCAModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { showError, showSuccess, AlertComponent } = useAlert();

  const handleMidtransPayment = async () => {
    try {
      setProcessing(true);
      // This will create a Midtrans payment (existing flow)
      const response = await fetch("/api/payment/create-investment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: contractId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.redirect_url) {
          window.location.href = result.data.redirect_url;
        }
      } else {
        showError("Error", "Gagal membuat pembayaran. Silakan coba lagi.");
      }
    } catch (error) {
      console.error("Error creating Midtrans payment:", error);
      showError("Error", "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setProcessing(false);
    }
  };

  const handleBCAPayment = () => {
    setShowBCAModal(true);
  };

  const handleBCAConfirm = async () => {
    try {
      setProcessing(true);
      // Create a manual BCA payment record
      const response = await fetch("/api/payment/create-manual-bca", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: contractId,
        }),
      });

      if (response.ok) {
        showSuccess(
          "Berhasil",
          "Silakan upload bukti pembayaran di halaman Pembayaran"
        );
        setTimeout(() => {
          router.push("/payments");
        }, 2000);
      } else {
        showError("Error", "Gagal membuat pembayaran. Silakan coba lagi.");
      }
    } catch (error) {
      console.error("Error creating BCA payment:", error);
      showError("Error", "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setProcessing(false);
      setShowBCAModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/10 via-white to-[#4C3D19]/10 py-12">
      <AlertComponent />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4">
            <Image
              width={96}
              height={96}
              src="/images/koperasi-logo.jpg"
              alt="Koperasi Bintang Merah Sejahtera"
              className="w-24 h-24 rounded-full object-cover shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#324D3E] mb-2">
            Pilih Metode Pembayaran
          </h1>
          <p className="text-[#889063]">
            Pilih metode pembayaran yang Anda inginkan
          </p>
        </div>

        {/* Payment Method Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Non-BCA Payment (Midtrans) */}
          <div className="bg-white rounded-2xl shadow-xl border border-[#324D3E]/10 p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-2xl mb-6 mx-auto">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#324D3E] mb-4 text-center">
              Pembayaran Non-BCA
            </h2>
            <p className="text-[#889063] text-center mb-6">
              Bayar menggunakan Virtual Account, E-Wallet, atau kartu kredit
              melalui Midtrans
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-sm text-[#324D3E]">
                <span className="w-2 h-2 bg-[#324D3E] rounded-full mr-3"></span>
                Berbagai metode pembayaran
              </li>
              <li className="flex items-center text-sm text-[#324D3E]">
                <span className="w-2 h-2 bg-[#324D3E] rounded-full mr-3"></span>
                Proses otomatis & langsung
              </li>
              <li className="flex items-center text-sm text-[#324D3E]">
                <span className="w-2 h-2 bg-[#324D3E] rounded-full mr-3"></span>
                Aman & terpercaya
              </li>
            </ul>
            <button
              onClick={handleMidtransPayment}
              disabled={processing}
              className="w-full bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Memproses..." : "Lanjutkan"}
            </button>
          </div>

          {/* BCA Payment (Manual) */}
          <div className="bg-white rounded-2xl shadow-xl border border-blue-500/20 p-8 hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-6 mx-auto">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#324D3E] mb-4 text-center">
              Transfer BCA
            </h2>
            <p className="text-[#889063] text-center mb-6">
              Transfer manual ke rekening BCA dengan upload bukti pembayaran
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-sm text-[#324D3E]">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Transfer langsung ke BCA
              </li>
              <li className="flex items-center text-sm text-[#324D3E]">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Upload bukti pembayaran
              </li>
              <li className="flex items-center text-sm text-[#324D3E]">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Verifikasi oleh finance
              </li>
            </ul>
            <button
              onClick={handleBCAPayment}
              disabled={processing}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      </div>

      {/* BCA Payment Modal */}
      {showBCAModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowBCAModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-bold text-[#324D3E] mb-6">
              Informasi Transfer BCA
            </h3>

            <div className="bg-blue-50 rounded-xl p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#889063] mb-1">Bank</p>
                  <p className="text-lg font-bold text-[#324D3E]">BCA</p>
                </div>
                <div>
                  <p className="text-sm text-[#889063] mb-1">Nomor Rekening</p>
                  <p className="text-lg font-bold text-[#324D3E]">
                    1234567890
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#889063] mb-1">Atas Nama</p>
                  <p className="text-lg font-bold text-[#324D3E]">
                    Koperasi Bintang Merah Sejahtera
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Penting:</strong> Setelah melakukan transfer, silakan
                upload bukti pembayaran di halaman Pembayaran. Pembayaran akan
                diverifikasi oleh tim finance kami.
              </p>
            </div>

            <button
              onClick={handleBCAConfirm}
              disabled={processing}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Memproses..." : "Saya Mengerti, Lanjutkan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
