'use client';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

function AuthButtons({ mobile = false }: { mobile?: boolean }) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className={mobile ? 'flex flex-col gap-3' : 'flex items-center gap-3'}>
        <div className="animate-pulse bg-gray-300 rounded h-8 w-16"></div>
      </div>
    );
  }

  if (session) {
    return (
      <div className={mobile ? 'flex flex-col gap-3' : 'flex items-center gap-3'}>
        <div className={mobile ? 'text-center' : ''}>
          <p className="text-sm text-gray-600">
            Halo, <span className="font-medium">{session.user.name}</span>
          </p>
          <p className="text-xs text-green-600 capitalize">{session.user.role}</p>
        </div>
        {session.user.role === 'user' && session.user.canPurchase && (
          <>
            <Link href="/investasi">
              <Button variant="outline" size="sm" className={cn(
                mobile ? 'w-full' : '',
                'border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-semibold'
              )}>
                📈 Investasi Saya
              </Button>
            </Link>
            <Link href="/cicilan">
              <Button variant="outline" size="sm" className={cn(
                mobile ? 'w-full' : '',
                'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-semibold'
              )}>
                💳 Cicilan Saya
              </Button>
            </Link>
          </>
        )}
        {session.user.role === 'user' && !session.user.canPurchase && (
          <div className={cn(
            mobile ? 'w-full' : '',
            'px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center'
          )}>
            <p className="text-xs text-yellow-700 font-medium">
              {session.user.verificationStatus === 'pending' ? '⏳ Menunggu Verifikasi' : 
               session.user.verificationStatus === 'rejected' ? '❌ Verifikasi Ditolak' : 
               '⏳ Belum Diverifikasi'}
            </p>
          </div>
        )}
        <Link href={`/${session.user.role}`}>
          <Button variant="outline" size="sm" className={cn(
            mobile ? 'w-full' : '',
            'border-red-200 text-red-700 hover:bg-emerald-50 hover:border-red-300 font-semibold'
          )}>
            Dashboard
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
          className={cn(
            mobile ? 'w-full' : '',
            'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 font-semibold'
          )}
        >
          Keluar
        </Button>
      </div>
    );
  }

  return (
    <div className={mobile ? 'flex flex-col gap-3' : 'flex items-center gap-3'}>
      <Link href="/login">
        <Button variant="outline" size="sm" className={cn(
          mobile ? 'w-full' : '',
          'border-red-200 text-red-700 hover:bg-emerald-50 hover:border-red-300 font-semibold'
        )}>
          Masuk
        </Button>
      </Link>
    </div>
  );
}

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '#beranda', label: 'Beranda' },
    { href: '#tentang', label: 'Tentang Kami' },
    { href: '#investasi', label: 'Paket Investasi' },
    { href: '#manfaat', label: 'Manfaat' },
    { href: '#kontak', label: 'Kontak' },
  ];

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-50">
      <div className="container-centered">
        <div className="flex-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 group-hover:scale-105 transition-transform duration-200">
              <img 
                src="/images/koperasi-logo.jpg" 
                alt="Koperasi Bintang Merah Sejahtera (BAHTERA)" 
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/20 shadow-md"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-green-700 to-yellow-600 bg-clip-text text-transparent">BAHTERA</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-emerald-600 font-medium">Koperasi Bintang Merah Sejahtera</p>
                {/* Trust indicator dots matching logo colors */}
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                  <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="w-1 h-1 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-4 py-2 text-gray-700 hover:text-emerald-600 font-semibold transition-all duration-200 rounded-lg hover:bg-emerald-50 group"
              >
                {item.label}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-yellow-500 group-hover:w-3/4 transition-all duration-300"></div>
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <AuthButtons />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          'lg:hidden border-t border-emerald-100 transition-all duration-300 overflow-hidden bg-white/90 backdrop-blur-sm',
          isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 font-semibold py-3 px-4 rounded-lg transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-emerald-100">
              <AuthButtons mobile />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}