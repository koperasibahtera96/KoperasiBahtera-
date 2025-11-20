"use client";

import { useAlert } from "@/components/ui/Alert";
import { CheckCircle2, X } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

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
    <div className="min-h-screen bg-white py-8 sm:py-12">
      <AlertComponent />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-4 mb-4 sm:mb-6">
            <Image
              src="/images/koperasi-logo.jpg"
              alt="Koperasi Bahtera"
              width={64}
              height={64}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover shadow-lg"
            />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 font-[family-name:var(--font-poppins)]">
              Pilih Metode Pembayaran
            </h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base font-[family-name:var(--font-poppins)] max-w-2xl mx-auto">
            Silakan pilih metode pembayaran yang Anda inginkan untuk
            menyelesaikan investasi Anda
          </p>
        </div>

        {/* Payment Method Cards */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-8">
          {/* Non-BCA Payment (Midtrans) */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg border-2 border-emerald-200 p-6 sm:p-8 hover:shadow-xl hover:border-emerald-300 transition-all duration-300 group">
            <div className="flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-6 mx-auto shadow-md group-hover:scale-110 transition-transform duration-300 border-2 border-emerald-200">
              <Image
                src="/images/midtrans-logo.png"
                alt="Midtrans"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center font-[family-name:var(--font-poppins)]">
              Pembayaran Online
            </h2>
            <p className="text-gray-700 text-center mb-2 text-sm font-[family-name:var(--font-poppins)]">
              Bayar dengan berbagai metode digital
            </p>
            <p className="text-emerald-700 text-center mb-6 text-xs font-semibold font-[family-name:var(--font-poppins)]">
              ✨ Langsung terverifikasi otomatis
            </p>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-6 border border-emerald-200">
              <p className="text-xs font-semibold text-gray-700 mb-3 font-[family-name:var(--font-poppins)]">
                Metode yang tersedia:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                  <span className="font-[family-name:var(--font-poppins)]">
                    Virtual Account (BCA, BNI, Mandiri, BRI, Permata)
                  </span>
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                  <span className="font-[family-name:var(--font-poppins)]">
                    E-Wallet (GoPay, QRIS, ShopeePay)
                  </span>
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                  <span className="font-[family-name:var(--font-poppins)]">
                    Kartu Kredit / Debit
                  </span>
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                  <span className="font-[family-name:var(--font-poppins)]">
                    Indomaret & Alfamart
                  </span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleMidtransPayment}
              disabled={processing}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-poppins)]"
            >
              {processing ? "Memproses..." : "Lanjutkan Pembayaran Online"}
            </button>
          </div>

          {/* BCA Payment (Manual) */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border-2 border-blue-200 p-6 sm:p-8 hover:shadow-xl hover:border-blue-300 transition-all duration-300 group">
            <div className="flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-6 mx-auto shadow-md group-hover:scale-110 transition-transform duration-300 border-2 border-blue-200">
              <Image
                src="/images/bca-logo.png"
                alt="BCA"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center font-[family-name:var(--font-poppins)]">
              Transfer Bank BCA
            </h2>
            <p className="text-gray-700 text-center mb-2 text-sm font-[family-name:var(--font-poppins)]">
              Transfer manual ke rekening BCA
            </p>
            <p className="text-blue-700 text-center mb-6 text-xs font-semibold font-[family-name:var(--font-poppins)]">
              ⏱️ Perlu verifikasi tim finance (1-2 hari kerja)
            </p>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-6 border border-blue-200">
              <p className="text-xs font-semibold text-gray-700 mb-3 font-[family-name:var(--font-poppins)]">
                Langkah-langkah:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start text-sm text-gray-700">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <span className="font-[family-name:var(--font-poppins)]">
                    Transfer ke rekening BCA yang diberikan
                  </span>
                </li>
                <li className="flex items-start text-sm text-gray-700">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <span className="font-[family-name:var(--font-poppins)]">
                    Upload bukti transfer di halaman Pembayaran
                  </span>
                </li>
                <li className="flex items-start text-sm text-gray-700">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <span className="font-[family-name:var(--font-poppins)]">
                    Tim finance akan verifikasi pembayaran Anda
                  </span>
                </li>
                <li className="flex items-start text-sm text-gray-700">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <span className="font-[family-name:var(--font-poppins)]">
                    Pembayaran disetujui
                  </span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleBCAPayment}
              disabled={processing}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-poppins)]"
            >
              {processing ? "Memproses..." : "Lanjutkan Transfer BCA"}
            </button>
          </div>
        </div>
      </div>

      {/* BCA Payment Modal */}
      {showBCAModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setShowBCAModal(false)}
              disabled={processing}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-md border-2 border-blue-200">
                <Image
                  src="/images/bca-logo.png"
                  alt="BCA"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 font-[family-name:var(--font-poppins)]">
                  Rekening BCA
                </h3>
                <p className="text-sm text-gray-600">
                  Transfer ke rekening di bawah ini
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 sm:p-6 mb-6 border-2 border-blue-200">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1 font-[family-name:var(--font-poppins)]">
                    Nama Bank
                  </p>
                  <p className="text-lg font-bold text-gray-900 font-[family-name:var(--font-poppins)]">
                    BCA (Bank Central Asia)
                  </p>
                </div>
                <div className="border-t border-blue-200 pt-4">
                  <p className="text-xs text-gray-600 mb-1 font-[family-name:var(--font-poppins)]">
                    Nomor Rekening
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-blue-600 font-mono tracking-wider">
                      501-0497908
                    </p>
                  </div>
                </div>
                <div className="border-t border-blue-200 pt-4">
                  <p className="text-xs text-gray-600 mb-1 font-[family-name:var(--font-poppins)]">
                    Atas Nama
                  </p>
                  <p className="text-base font-bold text-gray-900 font-[family-name:var(--font-poppins)]">
                    Koperasi Bintang Merah Sejahtera
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900 mb-2 font-[family-name:var(--font-poppins)]">
                    Instruksi Penting
                  </p>
                  <ol className="text-xs sm:text-sm text-amber-800 font-[family-name:var(--font-poppins)] space-y-1.5">
                    <li className="flex gap-2">
                      <span className="font-bold">1.</span>
                      <span>Lakukan transfer ke rekening BCA di atas</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">2.</span>
                      <span>
                        Setelah transfer,{" "}
                        <strong>upload bukti pembayaran</strong> di menu{" "}
                        <strong>Pembayaran</strong>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">3.</span>
                      <span>
                        Tim finance akan memverifikasi dalam{" "}
                        <strong>1-2 hari kerja</strong>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">4.</span>
                      <span>
                        Anda akan menerima notifikasi email setelah pembayaran
                        disetujui
                      </span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <button
              onClick={handleBCAConfirm}
              disabled={processing}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-poppins)]"
            >
              {processing ? "Memproses..." : "Saya Mengerti, Lanjutkan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
