'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useSession } from 'next-auth/react';

interface CicilanModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any;
}

export function CicilanModal({ isOpen, onClose, plan }: CicilanModalProps) {
  const { data: session } = useSession();
  const [selectedTerm, setSelectedTerm] = useState<'monthly' | 'quarterly' | 'semiannual' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  const paymentTerms = [
    { value: 'monthly', label: 'Bulanan', months: 1, installments: 24 },
    { value: 'quarterly', label: 'Per 3 Bulan', months: 3, installments: 8 },
    { value: 'semiannual', label: 'Per 6 Bulan', months: 6, installments: 4 },
    { value: 'annual', label: 'Per Tahun', months: 12, installments: 2 },
  ];

  const selectedTermDetails = paymentTerms.find(term => term.value === selectedTerm);
  const installmentAmount = selectedTermDetails && plan ? Math.ceil(plan.price / selectedTermDetails.installments) : 0;

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
          productName: plan.name,
          totalAmount: plan.price,
          paymentTerm: selectedTerm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Cicilan berhasil dibuat!\n\nOrder ID: ${data.orderId}\nJumlah Angsuran: Rp ${installmentAmount.toLocaleString('id-ID')}\nTerm: ${selectedTermDetails?.label}\n\nAnda dapat melakukan pembayaran pertama sekarang.`);
        onClose();
      } else {
        alert('Gagal membuat cicilan: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating cicilan:', error);
      alert('Terjadi kesalahan saat membuat cicilan');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Cicilan {plan?.name || 'Paket'}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Detail Paket</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Investasi:</span>
                  <span className="font-semibold">Rp {plan?.price?.toLocaleString('id-ID') || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimasi Return:</span>
                  <span className="font-semibold text-green-600">{plan?.returns || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold mb-3">Pilih Jangka Waktu Cicilan</h4>
            <div className="space-y-2">
              {paymentTerms.map((term) => {
                const termInstallmentAmount = plan?.price ? Math.ceil(plan.price / term.installments) : 0;
                return (
                  <label
                    key={term.value}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTerm === term.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="paymentTerm"
                        value={term.value}
                        checked={selectedTerm === term.value}
                        onChange={() => setSelectedTerm(term.value as typeof selectedTerm)}
                        className="w-4 h-4 text-emerald-600 mr-3"
                      />
                      <div>
                        <div className="font-medium">{term.label}</div>
                        <div className="text-sm text-gray-500">{term.installments} kali bayar</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">Rp {termInstallmentAmount.toLocaleString('id-ID')}</div>
                      <div className="text-sm text-gray-500">per angsuran</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h5 className="font-semibold text-blue-800 mb-2">Cara Kerja Cicilan</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Setelah membuat cicilan, Anda akan mendapat jadwal pembayaran</li>
              <li>• Upload bukti pembayaran setiap periode</li>
              <li>• Admin akan memverifikasi pembayaran Anda</li>
              <li>• Investasi dimulai setelah pembayaran pertama disetujui</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateCicilan}
              className="flex-1"
              loading={isLoading}
            >
              Buat Cicilan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}