'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    // Get email from localStorage (set by the payment process)
    const registrationEmail = localStorage.getItem('registrationEmail');
    console.log('Success page - registrationEmail from localStorage:', registrationEmail);

    if (registrationEmail) {
      setEmail(registrationEmail);
    }

    // Start countdown
    const interval = setInterval(() => {
      setCountdown((prev) => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Separate effect to handle navigation when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      localStorage.removeItem('registrationEmail');
      router.push('/login');
    }
  }, [countdown, router]);

  const handleLoginNow = () => {
    localStorage.removeItem('registrationEmail');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Pembayaran Berhasil!
        </h1>

        <p className="text-gray-600 mb-2">
          Akun Anda telah berhasil dibuat.
        </p>

        {email && (
          <p className="text-sm text-gray-500 mb-4">
            Email: <span className="font-medium">{email}</span>
          </p>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <div className="w-5 h-5 text-yellow-600 mr-2">⏳</div>
            <h3 className="font-semibold text-yellow-800">Menunggu Verifikasi</h3>
          </div>
          <p className="text-sm text-yellow-700">
            Akun Anda akan diverifikasi oleh admin terlebih dahulu sebelum dapat melakukan pembelian produk. 
            Proses verifikasi biasanya memakan waktu 1-2 hari kerja.
          </p>
        </div>

        <p className="text-gray-600 mb-6">
          Anda akan diarahkan ke halaman login dalam {countdown} detik.
        </p>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${((3 - countdown) / 3) * 100}%` }}
          ></div>
        </div>

        <button
          onClick={handleLoginNow}
          className="w-full bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition-colors"
        >
          Login Sekarang
        </button>
      </div>
    </div>
  );
}