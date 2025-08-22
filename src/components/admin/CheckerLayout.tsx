'use client';

import Image from 'next/image';

interface CheckerLayoutProps {
  children: React.ReactNode;
}

export function CheckerLayout({ children }: CheckerLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content - no sidebar */}
      <div>
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg bg-primary">
                <Image
                  src="/images/koperasi-logo.jpg"
                  alt="Logo Koperasi"
                  fill
                  sizes="48px"
                  className="object-cover"
                  priority
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Koperasi Bintang Merah Sejahtera</h1>
                <p className="text-gray-600">Panel Staff Lapangan</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}