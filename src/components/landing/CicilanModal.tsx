"use client";

import { formatIDRCurrency } from "@/lib/utils/currency";
import { useSession } from "next-auth/react";
import { useState } from "react";

interface InstallmentOption {
  period: string;
  amount: number;
  perTree: number;
}

interface CicilanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: any;
  onSuccess?: (title: string, message: string) => void;
  onError?: (title: string, message: string) => void;
}

export function CicilanModal({
  isOpen,
  onClose,
  plan,
  onSuccess,
  onError,
}: CicilanModalProps) {
  const { data: session } = useSession();
  const [selectedTerm, setSelectedTerm] = useState<number>(0);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use installmentOptions from plan data - no fallback to prevent wrong data
  const paymentTerms: InstallmentOption[] =
    plan?.investmentPlan?.installmentOptions || [];

  const selectedTermDetails = paymentTerms[selectedTerm];

  // Calculate price based on selected package using installmentOptions
  const currentPrice = selectedPackage ? selectedPackage.installmentPrice : 0;

  // Calculate installment count based on period (5 years total)
  const getInstallmentCount = (period: string) => {
    switch (period) {
      case "Per Bulan":
        return 60; // 60 monthly installments (5 years)
      case "Per 3 Bulan":
        return 20; // 20 quarterly installments (5 years)
      case "Per 6 Bulan":
        return 10; // 10 semi-annual installments (5 years)
      case "Per Tahun":
        return 5; // 5 annual installments (5 years)
      default:
        return 60; // fallback to monthly
    }
  };

  const installmentAmount =
    selectedTermDetails && currentPrice
      ? Math.ceil(
          currentPrice / getInstallmentCount(selectedTermDetails.period)
        )
      : 0;

  // Convert Indonesian payment terms to English for API
  const convertPaymentTerm = (period: string): string => {
    switch (period) {
      case "Per Bulan":
        return "monthly";
      case "Per 3 Bulan":
        return "quarterly";
      case "Per 6 Bulan":
        return "semiannual";
      case "Per Tahun":
        return "annual";
      default:
        return "monthly"; // fallback
    }
  };

  const handleCreateCicilan = async () => {
    if (!session?.user?.email || !plan) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/cicilan/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: (plan.investmentPlan?.name || plan.name || "paket")
            .toLowerCase()
            .replace(/\s+/g, "-"),
          productName: `${plan.investmentPlan?.name || plan.name || "Paket"} (${
            selectedPackage?.name || "Paket"
          })`,
          totalAmount: currentPrice,
          paymentTerm: convertPaymentTerm(selectedTermDetails.period),
        }),
      });

      const data = await response.json();

      console.log(data, "data");

      if (data.success) {
        onSuccess?.(
          "Cicilan Berhasil Dibuat!",
          `Order ID: ${data.orderId}\nPaket: ${
            selectedPackage?.name || "Paket"
          }\nJumlah Angsuran: Rp ${installmentAmount.toLocaleString(
            "id-ID"
          )}\nTerm: ${
            selectedTermDetails?.period
          }\nAnda dapat melakukan pembayaran pertama sekarang.`
        );
        onClose();
      } else {
        onError?.(
          "Gagal Membuat Cicilan",
          data.error || "Terjadi kesalahan saat membuat cicilan"
        );
      }
    } catch (error) {
      console.error("Error creating cicilan:", error);
      onError?.("Error", "Terjadi kesalahan saat membuat cicilan");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !plan || !paymentTerms || paymentTerms.length === 0)
    return null;

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-40"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-[#324D3E]/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
              Cicilan {plan?.investmentPlan?.name || plan?.name || "Paket"}
            </h3>
            <button
              onClick={onClose}
              className="text-[#324D3E]/60 hover:text-[#324D3E] transition-colors p-2 rounded-full hover:bg-[#324D3E]/10"
            >
              <svg
                className="w-6 h-6"
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
            </button>
          </div>

          {/* Package Selection */}
          <div className="mb-6">
            <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
              Pilih Paket Investasi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(plan?.treePackages || [])
                .filter((pkg: any) => pkg.enabled)
                .map((treePackage: any, index: number) => (
                  <label
                    key={index}
                    className={`flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                      selectedPackage?.treeCount === treePackage.treeCount
                        ? "border-[#324D3E] bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 shadow-lg"
                        : "border-[#324D3E]/20 hover:border-[#324D3E]/40 bg-white/80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="package"
                      value={treePackage.treeCount}
                      checked={
                        selectedPackage?.treeCount === treePackage.treeCount
                      }
                      onChange={() => setSelectedPackage(treePackage)}
                      className="sr-only"
                    />
                    <div className="text-3xl mb-2">
                      {treePackage.treeCount === 1 ? "🌱" : "🌳"}
                    </div>
                    <div className="font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
                      {treePackage.name}
                    </div>
                    <div className="text-sm text-[#324D3E]/70 font-medium text-center">
                      {treePackage.description}
                    </div>
                    <div className="font-bold text-[#324D3E] text-lg mt-2">
                      Rp {treePackage.installmentPrice.toLocaleString("id-ID")}
                    </div>
                  </label>
                ))}
            </div>
            {(!plan?.treePackages ||
              plan.treePackages.filter((pkg: any) => pkg.enabled).length ===
                0) && (
              <div className="text-center py-6">
                <p className="text-[#324D3E]/60">
                  Belum ada paket investasi yang tersedia
                </p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-6 rounded-2xl border border-[#324D3E]/20">
              <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
                Detail Paket
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">
                    Paket Terpilih:
                  </span>
                  <span className="font-bold text-[#324D3E] text-lg">
                    {selectedPackage?.name || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">
                    Jumlah Pohon:
                  </span>
                  <span className="font-bold text-[#324D3E] text-lg">
                    {selectedPackage?.treeCount || "-"} Pohon
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">
                    Total Investasi:
                  </span>
                  <span className="font-bold text-[#324D3E] text-lg">
                    Rp {currentPrice.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">
                    Estimasi Return:
                  </span>
                  <span className="font-bold text-emerald-600 text-lg">
                    {plan?.investmentPlan?.returns
                      ? `Rp ${formatIDRCurrency(plan.investmentPlan.returns)}`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
              Pilih Jangka Waktu Cicilan
            </h4>
            <div className="space-y-3">
              {paymentTerms.map((term, termIndex) => {
                const termPrice = selectedPackage?.installmentPrice || 0;
                const termInstallmentCount = getInstallmentCount(term.period);
                const termInstallmentAmount = termPrice
                  ? Math.ceil(termPrice / termInstallmentCount)
                  : 0;
                return (
                  <label
                    key={termIndex}
                    className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                      selectedTerm === termIndex
                        ? "border-[#324D3E] bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 shadow-lg"
                        : "border-[#324D3E]/20 hover:border-[#324D3E]/40 bg-white/80"
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="paymentTerm"
                        value={termIndex}
                        checked={selectedTerm === termIndex}
                        onChange={() => setSelectedTerm(termIndex)}
                        className="w-5 h-5 text-[#324D3E] mr-4 accent-[#324D3E]"
                      />
                      <div>
                        <div className="font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
                          {term.period}
                        </div>
                        <div className="text-sm text-[#324D3E]/70 font-medium">
                          {termInstallmentCount} kali bayar
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#324D3E] text-lg">
                        Rp {termInstallmentAmount.toLocaleString("id-ID")}
                      </div>
                      <div className="text-sm text-[#324D3E]/70 font-medium">
                        per angsuran
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl mb-6 border border-emerald-200">
            <h5 className="font-bold text-[#324D3E] mb-3 font-[family-name:var(--font-poppins)]">
              Cara Kerja Cicilan
            </h5>
            <ul className="text-sm text-[#324D3E]/80 space-y-2 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>
                  Setelah membuat cicilan, Anda akan mendapat jadwal pembayaran
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>Upload bukti pembayaran setiap periode</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>Admin akan memverifikasi pembayaran Anda</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>
                  Investasi dimulai setelah pembayaran pertama disetujui
                </span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-6 py-3 border-2 border-[#324D3E]/30 text-[#324D3E] rounded-full font-bold hover:bg-[#324D3E]/10 transition-all duration-300 font-[family-name:var(--font-poppins)] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleCreateCicilan}
              disabled={isLoading || !selectedPackage}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full font-bold hover:shadow-lg transition-all duration-300 font-[family-name:var(--font-poppins)] disabled:opacity-50"
            >
              {isLoading ? "Memproses..." : "Buat Cicilan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
