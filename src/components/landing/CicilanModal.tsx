'use client';


import { useSession } from 'next-auth/react';
import { useState } from 'react';

interface CicilanModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any;
  onSuccess?: (title: string, message: string) => void;
  onError?: (title: string, message: string) => void;
}

export function CicilanModal({ isOpen, onClose, plan, onSuccess, onError }: CicilanModalProps) {
  const { data: session } = useSession();
  const [selectedTerm, setSelectedTerm] = useState<'monthly' | 'quarterly' | 'semiannual' | 'annual'>('monthly');
  const [selectedQuantity, setSelectedQuantity] = useState<1 | 10>(10);
  const [isLoading, setIsLoading] = useState(false);

  const paymentTerms = [
    { value: 'monthly', label: 'Bulanan', months: 1, installments: 24 },
    { value: 'quarterly', label: 'Per 3 Bulan', months: 3, installments: 8 },
    { value: 'semiannual', label: 'Per 6 Bulan', months: 6, installments: 4 },
    { value: 'annual', label: 'Per Tahun', months: 12, installments: 2 },
  ];

  const selectedTermDetails = paymentTerms.find(term => term.value === selectedTerm);
  
  // Calculate price based on quantity selection
  const currentPrice = plan ? (selectedQuantity === 1 ? Math.ceil(plan.price / 10) : plan.price) : 0;
  const installmentAmount = selectedTermDetails && currentPrice ? Math.ceil(currentPrice / selectedTermDetails.installments) : 0;

  const handleCreateCicilan = async () => {
    if (!session?.user?.email || !plan) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/cicilan/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: plan.name.toLowerCase().replace(/\s+/g, '-'),
          productName: `${plan.name} (${selectedQuantity} Pohon)`,
          totalAmount: currentPrice,
          paymentTerm: selectedTerm,
        }),
      });

      const data = await response.json();

      console.log(data, 'data');


      if (data.success) {
        onSuccess?.(
          'Cicilan Berhasil Dibuat!',
          `Order ID: ${data.orderId}\nJumlah Angsuran: Rp ${installmentAmount.toLocaleString('id-ID')}\nTerm: ${selectedTermDetails?.label}\nAnda dapat melakukan pembayaran pertama sekarang.`
        );
        onClose();
      } else {
        onError?.('Gagal Membuat Cicilan', data.error || 'Terjadi kesalahan saat membuat cicilan');
      }
    } catch (error) {
      console.error('Error creating cicilan:', error);
      onError?.('Error', 'Terjadi kesalahan saat membuat cicilan');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-40" onClick={onClose}>
      <div
        className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-[#324D3E]/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
              Cicilan {plan?.name || 'Paket'}
            </h3>
            <button
              onClick={onClose}
              className="text-[#324D3E]/60 hover:text-[#324D3E] transition-colors p-2 rounded-full hover:bg-[#324D3E]/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quantity Selection */}
          <div className="mb-6">
            <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">Pilih Jumlah Pohon</h4>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedQuantity === 1
                    ? 'border-[#324D3E] bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 shadow-lg'
                    : 'border-[#324D3E]/20 hover:border-[#324D3E]/40 bg-white/80'
                }`}
              >
                <input
                  type="radio"
                  name="quantity"
                  value={1}
                  checked={selectedQuantity === 1}
                  onChange={() => setSelectedQuantity(1)}
                  className="sr-only"
                />
                <div className="text-3xl mb-2">🌱</div>
                <div className="font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">1 Pohon</div>
                <div className="text-sm text-[#324D3E]/70 font-medium text-center">Investasi Kecil</div>
                <div className="font-bold text-[#324D3E] text-lg mt-2">
                  Rp {plan ? Math.ceil(plan.price / 10).toLocaleString('id-ID') : '0'}
                </div>
              </label>
              
              <label
                className={`flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedQuantity === 10
                    ? 'border-[#324D3E] bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 shadow-lg'
                    : 'border-[#324D3E]/20 hover:border-[#324D3E]/40 bg-white/80'
                }`}
              >
                <input
                  type="radio"
                  name="quantity"
                  value={10}
                  checked={selectedQuantity === 10}
                  onChange={() => setSelectedQuantity(10)}
                  className="sr-only"
                />
                <div className="text-3xl mb-2">🌳</div>
                <div className="font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">10 Pohon</div>
                <div className="text-sm text-[#324D3E]/70 font-medium text-center">Paket Lengkap</div>
                <div className="font-bold text-[#324D3E] text-lg mt-2">
                  Rp {plan?.price?.toLocaleString('id-ID') || '0'}
                </div>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-6 rounded-2xl border border-[#324D3E]/20">
              <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">Detail Paket</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">Jumlah Pohon:</span>
                  <span className="font-bold text-[#324D3E] text-lg">{selectedQuantity} Pohon</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">Total Investasi:</span>
                  <span className="font-bold text-[#324D3E] text-lg">Rp {currentPrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#324D3E]/80 font-medium">Estimasi Return:</span>
                  <span className="font-bold text-emerald-600 text-lg">
                    {selectedQuantity === 1 ? `${plan?.returns || '-'} (per pohon)` : plan?.returns || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">Pilih Jangka Waktu Cicilan</h4>
            <div className="space-y-3">
              {paymentTerms.map((term) => {
                const termInstallmentAmount = currentPrice ? Math.ceil(currentPrice / term.installments) : 0;
                return (
                  <label
                    key={term.value}
                    className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg ${selectedTerm === term.value
                      ? 'border-[#324D3E] bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 shadow-lg'
                      : 'border-[#324D3E]/20 hover:border-[#324D3E]/40 bg-white/80'
                      }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="paymentTerm"
                        value={term.value}
                        checked={selectedTerm === term.value}
                        onChange={() => setSelectedTerm(term.value as typeof selectedTerm)}
                        className="w-5 h-5 text-[#324D3E] mr-4 accent-[#324D3E]"
                      />
                      <div>
                        <div className="font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">{term.label}</div>
                        <div className="text-sm text-[#324D3E]/70 font-medium">{term.installments} kali bayar</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#324D3E] text-lg">Rp {termInstallmentAmount.toLocaleString('id-ID')}</div>
                      <div className="text-sm text-[#324D3E]/70 font-medium">per angsuran</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl mb-6 border border-emerald-200">
            <h5 className="font-bold text-[#324D3E] mb-3 font-[family-name:var(--font-poppins)]">Cara Kerja Cicilan</h5>
            <ul className="text-sm text-[#324D3E]/80 space-y-2 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>Setelah membuat cicilan, Anda akan mendapat jadwal pembayaran</span>
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
                <span>Investasi dimulai setelah pembayaran pertama disetujui</span>
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
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full font-bold hover:shadow-lg transition-all duration-300 font-[family-name:var(--font-poppins)] disabled:opacity-50"
            >
              {isLoading ? 'Memproses...' : 'Buat Cicilan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}