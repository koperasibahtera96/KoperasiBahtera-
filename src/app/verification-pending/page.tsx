'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function VerificationPendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    // If user is already verified, redirect to dashboard
    if (session.user.canPurchase) {
      router.push('/landing');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getStatusInfo = () => {
    switch (session.user.verificationStatus) {
      case 'pending':
        return {
          icon: '⏳',
          title: 'Menunggu Verifikasi',
          message: 'Akun Anda sedang dalam proses verifikasi oleh tim admin kami.',
          description: 'Proses verifikasi biasanya memakan waktu 1-2 hari kerja. Kami akan meninjau dokumen KTP dan foto selfie yang Anda berikan.',
          bgColor: 'from-yellow-50 to-orange-50',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-800'
        };
      case 'rejected':
        return {
          icon: '❌',
          title: 'Verifikasi Ditolak',
          message: 'Maaf, verifikasi akun Anda ditolak oleh tim admin.',
          description: 'Silakan hubungi customer service kami untuk informasi lebih lanjut atau untuk mengajukan verifikasi ulang.',
          bgColor: 'from-red-50 to-pink-50',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          titleColor: 'text-red-800'
        };
      default:
        return {
          icon: '📋',
          title: 'Belum Diverifikasi',
          message: 'Akun Anda belum diverifikasi.',
          description: 'Silakan lengkapi proses registrasi dan verifikasi untuk dapat menggunakan layanan kami.',
          bgColor: 'from-gray-50 to-slate-50',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          titleColor: 'text-gray-800'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${statusInfo.bgColor} flex items-center justify-center p-4`}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className={`w-20 h-20 mx-auto mb-6 ${statusInfo.iconBg} rounded-full flex items-center justify-center`}>
          <span className={`text-4xl ${statusInfo.iconColor}`}>{statusInfo.icon}</span>
        </div>

        <h1 className={`text-2xl font-bold ${statusInfo.titleColor} mb-4`}>
          {statusInfo.title}
        </h1>

        <p className="text-gray-600 mb-4">
          {statusInfo.message}
        </p>

        <p className="text-sm text-gray-500 mb-6">
          {statusInfo.description}
        </p>

        {session.user.verificationStatus === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700 font-medium mb-2">
              Alasan Penolakan:
            </p>
            <p className="text-sm text-red-600">
              Silakan hubungi customer service untuk informasi detail.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/landing"
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors block"
          >
            Kembali ke Beranda
          </Link>
          
          {session.user.verificationStatus === 'rejected' && (
            <a
              href="mailto:support@bahtera.com"
              className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors block"
            >
              Hubungi Customer Service
            </a>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Akun: {session.user.email}
          </p>
          <p className="text-xs text-gray-500">
            Status: {session.user.verificationStatus}
          </p>
        </div>
      </div>
    </div>
  );
}