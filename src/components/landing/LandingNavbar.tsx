'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/landing' });
  };

  return (
    <nav className={`w-full bg-white/75 px-4 sm:px-6 lg:px-10 transition-all duration-300 ${
      isScrolled ? 'py-2' : 'py-1'
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Image
              src="/images/koperasi-logo.jpg"
              alt="Logo"
              width={isScrolled ? 40 : 60}
              height={isScrolled ? 40 : 60}
              className="rounded-full transition-all duration-300"
            />
          </div>

          {/* Navigation - Hide when scrolled */}
          <div className={`hidden md:flex items-center space-x-8 transition-all duration-300 ${
            isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}>
            <a href="/landing#beranda" className="text-gray-700 transition-colors font-medium px-3 py-1 rounded-full hover:bg-[#324D3E] hover:text-white">
              Beranda
            </a>
            <a href="/landing#investasi" className="text-gray-700 transition-colors font-medium px-3 py-1 rounded-full hover:bg-[#324D3E] hover:text-white">
              Investasi
            </a>
            <a href="/landing#tentang-kami" className="text-gray-700 transition-colors font-medium px-3 py-1 rounded-full hover:bg-[#324D3E] hover:text-white">
              Tentang Kami
            </a>
            <a href="/landing#produk" className="text-gray-700 transition-colors font-medium px-3 py-1 rounded-full hover:bg-[#324D3E] hover:text-white">
              Produk
            </a>
            <a href="/landing#faq" className="text-gray-700 transition-colors font-medium px-3 py-1 rounded-full hover:bg-[#324D3E] hover:text-white">
              FAQ
            </a>
          </div>

          {/* Auth Buttons / User Menu */}
          <div className="hidden sm:flex items-center space-x-2 lg:space-x-4">
            {status === 'loading' ? (
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
            ) : session?.user ? (
              <div className="flex items-center space-x-3">
                {/* Cicilan Saya Button */}
                <Link
                  href="/cicilan"
                  className="px-3 lg:px-6 py-1 text-gray-700 transition-all duration-300 font-medium rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white text-sm lg:text-base"
                >
                  Cicilan Saya
                </Link>

                {/* User Avatar with Dropdown */}
                <div className="relative user-menu">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#324D3E] rounded-full flex items-center justify-center text-white font-bold text-sm lg:text-base">
                      {session.user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-gray-700 font-medium text-sm lg:text-base hidden lg:inline">
                      Hello, {session.user.name?.split(' ')[0] || 'User'}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors font-medium"
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Logout</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`px-3 lg:px-6 py-1 text-gray-700 transition-all duration-300 font-medium rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white text-sm lg:text-base ${
                    isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="px-3 lg:px-6 py-1 bg-[#324D3E] text-white font-medium rounded-full transition-colors hover:bg-[#4C3D19] text-sm lg:text-base"
                >
                  Daftar Sekarang
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}