"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface PaymentMethodModalProps {
  isOpen: boolean;
  contract: {
    productName: string;
    totalAmount: number;
    contractId: string;
  } | null;
  installment: {
    _id?: string;
    installmentNumber?: number;
    amount: number;
  } | null;
  group: {
    productName: string;
    cicilanOrderId?: string;
  } | null;
  onClose: () => void;
  onSelectMidtrans: () => void;
  onSelectBCA: () => void;
}

export default function PaymentMethodModal({
  isOpen,
  contract,
  installment,
  group,
  onClose,
  onSelectMidtrans,
  onSelectBCA,
}: PaymentMethodModalProps) {
  const { t } = useLanguage();
  const [showBCAModal, setShowBCAModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const handleBCAConfirm = async () => {
    setProcessing(true);
    onSelectBCA();
    setShowBCAModal(false);
    setProcessing(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

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
                {t("paymentMethod.title")}
              </h1>
            </div>
            <p className="text-gray-600 text-sm sm:text-base font-[family-name:var(--font-poppins)] max-w-2xl mx-auto">
              {t("paymentMethod.description")}
            </p>
          </div>

        {/* Payment Info */}
          <div className="bg-gradient-to-br from-[#324D3E]/10 to-[#4C3D19]/10 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-[#324D3E]/20">
            <p className="text-sm text-gray-600 mb-1 font-[family-name:var(--font-poppins)]">
              {t("paymentMethod.paymentFor")}
            </p>
            <p className="text-lg sm:text-xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
            {contract
              ? contract.productName
              : group
                ? `${group.productName} - ${t("paymentMethod.installment")} ${installment?.installmentNumber}`
              : ""}
          </p>
            <p className="text-2xl sm:text-3xl font-bold text-[#324D3E] mt-2 font-[family-name:var(--font-poppins)]">
            {contract
              ? new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(contract.totalAmount)
              : installment
              ? new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(installment.amount)
              : ""}
          </p>
        </div>

          {/* Payment Method Cards */}
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
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
                {t("paymentMethod.onlinePayment")}
              </h2>
              <p className="text-gray-700 text-center mb-2 text-sm font-[family-name:var(--font-poppins)]">
                {t("paymentMethod.onlinePaymentDescription")}
              </p>
              <p className="text-emerald-700 text-center mb-6 text-xs font-semibold font-[family-name:var(--font-poppins)]">
                {t("paymentMethod.automaticallyVerified")}
              </p>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-6 border border-emerald-200">
                <p className="text-xs font-semibold text-gray-700 mb-3 font-[family-name:var(--font-poppins)]">
                  {t("paymentMethod.availableMethods")}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                    <span className="font-[family-name:var(--font-poppins)]">
                      {t("paymentMethod.virtualAccount")}
                    </span>
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                    <span className="font-[family-name:var(--font-poppins)]">
                      {t("paymentMethod.ewallet")}
                    </span>
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                    <span className="font-[family-name:var(--font-poppins)]">
                      {t("paymentMethod.creditDebit")}
                    </span>
              </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                    <span className="font-[family-name:var(--font-poppins)]">
                      {t("paymentMethod.indomaret")}
                    </span>
              </li>
            </ul>
              </div>

          <button
                onClick={onSelectMidtrans}
                disabled={processing}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-poppins)]"
          >
                {processing ? t("paymentMethod.processing") : t("paymentMethod.continueOnline")}
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
                {t("paymentMethod.bcaTransfer")}
              </h2>
              <p className="text-gray-700 text-center mb-2 text-sm font-[family-name:var(--font-poppins)]">
                {t("paymentMethod.bcaTransferDescription")}
              </p>
              <p className="text-blue-700 text-center mb-6 text-xs font-semibold font-[family-name:var(--font-poppins)]">
                {t("paymentMethod.needsVerification")}
              </p>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-6 border border-blue-200">
                <p className="text-xs font-semibold text-gray-700 mb-3 font-[family-name:var(--font-poppins)]">
                  {t("paymentMethod.steps")}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start text-sm text-gray-700">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <span className="font-[family-name:var(--font-poppins)]">
                      {t("paymentMethod.step1")}
                    </span>
                  </li>
                  <li className="flex items-start text-sm text-gray-700">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <span className="font-[family-name:var(--font-poppins)]">
                      {t("paymentMethod.step2")}
                    </span>
              </li>
                  <li className="flex items-start text-sm text-gray-700">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <span className="font-[family-name:var(--font-poppins)]">
                      {t("paymentMethod.step3")}
                    </span>
              </li>
                  <li className="flex items-start text-sm text-gray-700">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                      4
                    </div>
                    <span className="font-[family-name:var(--font-poppins)]">
                      {t("paymentMethod.step4")}
                    </span>
              </li>
            </ul>
              </div>

              <button
                onClick={() => setShowBCAModal(true)}
                disabled={processing}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-poppins)]"
              >
                {processing ? t("paymentMethod.processing") : t("paymentMethod.continueBCA")}
          </button>
            </div>
          </div>
        </div>
      </div>

      {/* BCA Payment Modal */}
      {showBCAModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
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
                  {t("paymentMethod.bcaAccount")}
                </h3>
                <p className="text-sm text-gray-600 font-[family-name:var(--font-poppins)]">
                  {t("paymentMethod.transferToAccount")}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 sm:p-6 mb-6 border-2 border-blue-200">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1 font-[family-name:var(--font-poppins)]">
                    {t("paymentMethod.bankName")}
                  </p>
                  <p className="text-lg font-bold text-gray-900 font-[family-name:var(--font-poppins)]">
                    BCA (Bank Central Asia)
                  </p>
                </div>
                <div className="border-t border-blue-200 pt-4">
                  <p className="text-xs text-gray-600 mb-1 font-[family-name:var(--font-poppins)]">
                    {t("paymentMethod.accountNumber")}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-blue-600 font-mono tracking-wider">
                      501-0497908
                    </p>
                  </div>
                </div>
                <div className="border-t border-blue-200 pt-4">
                  <p className="text-xs text-gray-600 mb-1 font-[family-name:var(--font-poppins)]">
                    {t("paymentMethod.accountHolder")}
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
                    {t("paymentMethod.importantInstructions")}
                  </p>
                  <ol className="text-xs sm:text-sm text-amber-800 font-[family-name:var(--font-poppins)] space-y-1.5">
                    <li className="flex gap-2">
                      <span className="font-bold">1.</span>
                      <span>{t("paymentMethod.instruction1")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">2.</span>
                      <span>{t("paymentMethod.instruction2")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">3.</span>
                      <span>{t("paymentMethod.instruction3")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">4.</span>
                      <span>{t("paymentMethod.instruction4")}</span>
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
              {processing ? t("paymentMethod.processing") : t("paymentMethod.iUnderstandContinue")}
            </button>
      </div>
    </div>
      )}
    </>
  );
}
