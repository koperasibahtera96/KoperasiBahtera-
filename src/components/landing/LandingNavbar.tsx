'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navVariants: any = {
  hidden: { 
    y: -100,
    opacity: 0
  },
  visible: { 
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      duration: 0.8,
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: any = {
  hidden: { 
    y: -20,
    opacity: 0
  },
  visible: { 
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15
    }
  }
};

const logoVariants: any = {
  hidden: { 
    scale: 0,
    rotate: -180
  },
  visible: { 
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      duration: 0.8
    }
  }
};

interface LandingNavbarProps {
  hideNavigation?: boolean;
}

export default function LandingNavbar({ hideNavigation = false }: LandingNavbarProps) {
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
    <motion.nav 
      className={`w-full bg-white/75 px-4 sm:px-6 lg:px-10 transition-all duration-300 ${
        isScrolled ? 'py-2' : 'py-1'
      }`}
      initial="hidden"
      animate="visible"
      variants={navVariants}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="flex items-center justify-between"
          variants={navVariants}
        >
          {/* Logo */}
          <motion.div 
            className="flex items-center"
            variants={logoVariants}
            whileHover={{ 
              scale: 1.1,
              rotate: 5,
              transition: { duration: 0.3 }
            }}
          >
            <Image
              src="/images/koperasi-logo.jpg"
              alt="Logo"
              width={isScrolled ? 40 : 60}
              height={isScrolled ? 40 : 60}
              className="rounded-full transition-all duration-300"
            />
          </motion.div>

          {/* Navigation - Hide when scrolled or when hideNavigation prop is true */}
          {!hideNavigation && (
            <motion.div 
              className={`hidden md:flex items-center space-x-8 transition-all duration-300 ${
                isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              variants={navVariants}
            >
            {['Beranda', 'Investasi', 'Tentang Kami', 'Produk', 'FAQ'].map((item, index) => (
              <motion.a 
                key={item}
                href={`/landing#${item.toLowerCase().replace(' ', '-')}`} 
                className="text-gray-700 transition-colors font-medium px-3 py-1 rounded-full hover:bg-[#324D3E] hover:text-white"
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "#324D3E",
                  color: "#ffffff",
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.95 }}
              >
                {item}
              </motion.a>
            ))}
            </motion.div>
          )}

          {/* Auth Buttons / User Menu */}
          <motion.div 
            className="hidden sm:flex items-center space-x-2 lg:space-x-4"
            variants={navVariants}
          >
            {status === 'loading' ? (
              <motion.div 
                className="w-10 h-10 bg-gray-200 rounded-full"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ) : session?.user ? (
              <motion.div 
                className="flex items-center space-x-3"
                variants={itemVariants}
              >
                {/* Show buttons only if user can purchase and navigation is not hidden */}
                {!hideNavigation && session.user.canPurchase ? (
                  <>
                    {/* Investasi Saya Button */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        href="/investasi"
                        className="px-3 lg:px-6 py-1 text-gray-700 transition-all duration-300 font-medium rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white text-sm lg:text-base"
                      >
                        Investasi Saya
                      </Link>
                    </motion.div>

                    {/* Cicilan Saya Button */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        href="/cicilan"
                        className="px-3 lg:px-6 py-1 text-gray-700 transition-all duration-300 font-medium rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white text-sm lg:text-base"
                      >
                        Cicilan Saya
                      </Link>
                    </motion.div>
                  </>
                ) : !hideNavigation ? (
                  /* Verification Status Badge */
                  <motion.div
                    className="px-3 lg:px-4 py-1 bg-yellow-50 border border-yellow-200 rounded-full text-xs lg:text-sm font-medium text-yellow-700"
                    whileHover={{ scale: 1.05 }}
                  >
                    {session.user.verificationStatus === 'pending' ? '⏳ Menunggu Verifikasi' : 
                     session.user.verificationStatus === 'rejected' ? '❌ Verifikasi Ditolak' : 
                     '⏳ Belum Diverifikasi'}
                  </motion.div>
                ) : null}

                {/* User Avatar with Dropdown */}
                <div className="relative user-menu">
                  <motion.button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div 
                      className="w-8 h-8 lg:w-10 lg:h-10 bg-[#324D3E] rounded-full flex items-center justify-center text-white font-bold text-sm lg:text-base"
                      whileHover={{ 
                        backgroundColor: "#4C3D19",
                        rotate: 360
                      }}
                      transition={{ duration: 0.6 }}
                    >
                      {session.user.name?.charAt(0).toUpperCase() || 'U'}
                    </motion.div>
                    <span className="text-gray-700 font-medium text-sm lg:text-base hidden lg:inline">
                      Hello, {session.user.name?.split(' ')[0] || 'User'}
                    </span>
                    <motion.svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      animate={{ 
                        rotate: showUserMenu ? 180 : 0
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </motion.svg>
                  </motion.button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div 
                        className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50"
                        initial={{ 
                          opacity: 0, 
                          scale: 0.95,
                          y: -10
                        }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          y: 0
                        }}
                        exit={{ 
                          opacity: 0, 
                          scale: 0.95,
                          y: -10
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors font-medium"
                          whileHover={{ 
                            backgroundColor: "rgba(254, 242, 242, 1)",
                            x: 5
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Logout</span>
                          </div>
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : !hideNavigation ? (
              <motion.div
                className="flex items-center space-x-2 lg:space-x-4"
                variants={itemVariants}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/login"
                    className={`px-3 lg:px-6 py-1 text-gray-700 transition-all duration-300 font-medium rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white text-sm lg:text-base ${
                      isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    Masuk
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/register"
                    className="px-3 lg:px-6 py-1 bg-[#324D3E] text-white font-medium rounded-full transition-colors hover:bg-[#4C3D19] text-sm lg:text-base"
                  >
                    Daftar Sekarang
                  </Link>
                </motion.div>
              </motion.div>
            ) : null}
          </motion.div>

          {/* Mobile menu button */}
          <motion.button 
            className="md:hidden p-2 text-gray-700"
            variants={itemVariants}
            whileHover={{ 
              scale: 1.1,
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              borderRadius: "50%"
            }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.3 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </motion.svg>
          </motion.button>
        </motion.div>
      </div>
    </motion.nav>
  );
}