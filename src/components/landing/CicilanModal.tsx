"use client";

import { formatIDRCurrency } from "@/lib/utils/currency";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [contractDetails, setContractDetails] = useState<any>(null);

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

  // Generate contract details on frontend (no database creation yet)
  const generateContractDetails = (packageData: any, paymentTermData: any) => {
    const year = new Date().getFullYear();
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const contractNumber = `CONTRACT-${year}-${randomId}`;
    
    const contractId = `CONTRACT-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}`;

    return {
      contractId,
      contractNumber,
      productName: `${plan.investmentPlan?.name || plan.name || "Paket"} (${
        packageData?.name || "Paket"
      })`,
      productId: (plan.investmentPlan?.name || plan.name || "paket")
        .toLowerCase()
        .replace(/\s+/g, "-"),
      totalAmount: currentPrice,
      paymentType: "cicilan",
      paymentTerm: convertPaymentTerm(paymentTermData.period),
      totalInstallments: getInstallmentCount(paymentTermData.period),
      installmentAmount: installmentAmount,
      status: 'draft'
    };
  };

  const handleCreateCicilan = async () => {
    if (!session?.user?.email || !plan || !selectedPackage || !selectedTermDetails) return;

    setIsLoading(true);
    
    try {
      // Generate contract details on frontend only
      const frontendContractDetails = generateContractDetails(selectedPackage, selectedTermDetails);
      
      // Show order confirmation modal with frontend-generated details
      setContractDetails(frontendContractDetails);
      setShowOrderConfirmation(true);

    } catch (error) {
      console.error("Error generating contract details:", error);
      onError?.("Error", "Terjadi kesalahan saat menyiapkan kontrak");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!contractDetails) return;
    
    setIsLoading(true);

    try {
      // Now create the actual contract in database
      const contractResponse = await fetch("/api/contract/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName: contractDetails.productName,
          productId: contractDetails.productId,
          totalAmount: contractDetails.totalAmount,
          paymentType: contractDetails.paymentType,
          paymentTerm: contractDetails.paymentTerm,
          totalInstallments: contractDetails.totalInstallments,
          installmentAmount: contractDetails.installmentAmount
        }),
      });

      const contractResult = await contractResponse.json();

      if (!contractResponse.ok) {
        console.error("Contract creation error:", contractResult);
        onError?.(
          "Gagal Membuat Kontrak",
          contractResult.error || "Terjadi kesalahan saat membuat kontrak"
        );
        return;
      }

      if (!contractResult.success || !contractResult.data?.contractId) {
        onError?.(
          "Gagal Membuat Kontrak",
          "Gagal membuat kontrak. Silakan coba lagi."
        );
        return;
      }

      // Use the database-generated contractId for redirection
      const actualContractId = contractResult.data.contractId;

      onSuccess?.(
        "Kontrak Berhasil Dibuat!",
        `Kontrak ${contractDetails.contractNumber} telah dibuat. Anda akan diarahkan untuk menandatangani kontrak.`
      );
      onClose();
      // Redirect to contract signing page with actual contract ID
      window.location.href = `/contract/${actualContractId}`;

    } catch (error) {
      console.error("Error creating contract:", error);
      onError?.("Error", "Terjadi kesalahan saat membuat kontrak");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !plan || !paymentTerms || paymentTerms.length === 0)
    return null;

  // Show order confirmation modal
  if (showOrderConfirmation && contractDetails) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setShowOrderConfirmation(false);
            setContractDetails(null);
          }}
        >
          <motion.div
            className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col border-2 border-[#324D3E]/20"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-6 pb-0">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
                  Rincian Pesanan
                </h3>
                <button
                  onClick={() => {
                    setShowOrderConfirmation(false);
                    setContractDetails(null);
                  }}
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
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6">
              <div className="pb-6">

            {/* Order Details */}
            <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-6 rounded-2xl border border-[#324D3E]/20 mb-6">
              <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
                Detail Kontrak
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">
                    No. Kontrak:
                  </span>
                  <span className="font-bold text-[#324D3E] text-lg">
                    {contractDetails.contractNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">
                    Jenis Paket:
                  </span>
                  <span className="font-bold text-[#324D3E] text-lg">
                    {contractDetails.productName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">
                    Harga Paket:
                  </span>
                  <span className="font-bold text-[#324D3E] text-lg">
                    Rp {contractDetails.totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">
                    Tipe Pembayaran:
                  </span>
                  <span className="font-bold text-[#324D3E] text-lg capitalize">
                    {contractDetails.paymentType}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">
                    Angsuran per {selectedTermDetails?.period}:
                  </span>
                  <span className="font-bold text-emerald-600 text-lg">
                    Rp {installmentAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-blue-800 mb-1">
                    Konfirmasi Pesanan
                  </p>
                  <p className="text-blue-700">
                    Dengan menekan &ldquo;Lanjutkan&rdquo;, kontrak akan dibuat dan Anda akan diarahkan ke halaman penandatanganan kontrak.
                  </p>
                </div>
              </div>
            </div>
            </div>

            {/* Fixed Action Buttons */}
            <div className="flex-shrink-0 px-6 pb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowOrderConfirmation(false);
                    setContractDetails(null);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-[#324D3E]/30 text-[#324D3E] rounded-full font-bold hover:bg-[#324D3E]/10 transition-all duration-300 font-[family-name:var(--font-poppins)]"
                >
                  Kembali
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full font-bold hover:shadow-lg transition-all duration-300 font-[family-name:var(--font-poppins)] disabled:opacity-50"
                >
                  {isLoading ? "Membuat Kontrak..." : "Lanjutkan"}
                </button>
              </div>
            </div>
          </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-md w-full h-[80vh] flex flex-col border-2 border-[#324D3E]/20"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-0">
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
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="pb-6">

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
                <span className="text-emerald-600 font-bold">1.</span>
                <span>
                  Buat dan tandatangani kontrak investasi terlebih dahulu
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">2.</span>
                <span>Menunggu persetujuan admin untuk kontrak Anda</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">3.</span>
                <span>Setelah disetujui, Anda dapat mulai cicilan pembayaran</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">4.</span>
                <span>Upload bukti pembayaran setiap periode cicilan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">5.</span>
                <span>
                  Investasi dimulai setelah pembayaran pertama disetujui
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
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
              {isLoading ? "Memproses..." : "Buat Kontrak"}
            </button>
          </div>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
