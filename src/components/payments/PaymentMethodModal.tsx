"use client";

import { CreditCard, X } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-bold text-[#324D3E] mb-6">
          Pilih Metode Pembayaran
        </h3>

        {/* Payment Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-[#889063] mb-1">Pembayaran untuk</p>
          <p className="text-lg font-bold text-[#324D3E]">
            {contract
              ? contract.productName
              : group
              ? `${group.productName} - Cicilan ${installment?.installmentNumber}`
              : ""}
          </p>
          <p className="text-2xl font-bold text-[#324D3E] mt-2">
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

        {/* Payment Method Options */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Non-BCA Payment (Midtrans) */}
          <button
            onClick={onSelectMidtrans}
            className="bg-white border-2 border-[#324D3E]/20 rounded-xl p-6 hover:border-[#324D3E] hover:shadow-lg transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-xl mb-4 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-lg font-bold text-[#324D3E] mb-2">
              Pembayaran Non-BCA
            </h4>
            <p className="text-sm text-[#889063] mb-4">
              Bayar dengan Virtual Account, E-Wallet, atau kartu kredit melalui
              Midtrans
            </p>
            <ul className="space-y-2 text-xs text-[#324D3E]">
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-[#324D3E] rounded-full mr-2"></span>
                Proses otomatis & langsung
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-[#324D3E] rounded-full mr-2"></span>
                Berbagai metode pembayaran
              </li>
            </ul>
          </button>

          {/* BCA Payment (Manual) */}
          <button
            onClick={onSelectBCA}
            className="bg-white border-2 border-blue-500/20 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mb-4 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-lg font-bold text-[#324D3E] mb-2">
              Transfer BCA
            </h4>
            <p className="text-sm text-[#889063] mb-4">
              Transfer manual ke rekening BCA dengan upload bukti pembayaran
            </p>
            <ul className="space-y-2 text-xs text-[#324D3E]">
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                Transfer langsung ke BCA
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                Upload bukti pembayaran
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                Verifikasi oleh finance
              </li>
            </ul>
          </button>
        </div>

        {/* BCA Account Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">
            📌 Informasi Rekening BCA:
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-blue-600">Bank:</p>
              <p className="font-bold text-blue-900">BCA</p>
            </div>
            <div>
              <p className="text-blue-600">Nomor Rekening:</p>
              <p className="font-bold text-blue-900">1234567890</p>
            </div>
            <div className="col-span-2">
              <p className="text-blue-600">Atas Nama:</p>
              <p className="font-bold text-blue-900">
                Koperasi Bintang Merah Sejahtera
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
