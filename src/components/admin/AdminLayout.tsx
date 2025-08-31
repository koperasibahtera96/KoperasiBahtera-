'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: '📊' },
  { name: 'Verifikasi User', href: '/admin/verification', icon: '✅' },
  { name: 'Manajemen Investor', href: '/admin/investors', icon: '👥' },
  { name: 'Kelola Cicilan', href: '/admin/cicilan', icon: '💳' },
  { name: 'Data Pohon', href: '/admin/trees', icon: '🌳' },
  { name: 'Data Staff', href: '/admin/staff', icon: '👷' },
  { name: 'Laporan', href: '/admin/laporan', icon: '📈' },
  { name: 'Pengaturan', href: '/admin/settings', icon: '⚙️' },
];

const sidebarVariants: any = {
  hidden: { x: -300, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: any = {
  hidden: { x: -20, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15
    }
  }
};

const logoVariants: any = {
  hidden: { scale: 0, rotate: -180 },
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

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAF9] to-[#E8F5E8] font-[family-name:var(--font-poppins)]">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        className={`
          fixed inset-y-0 left-0 w-64 sm:w-72 bg-white/95 backdrop-blur-lg shadow-2xl transform transition-transform duration-300 ease-in-out z-50 border-r border-[#324D3E]/10
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        initial="hidden"
        animate="visible"
        variants={sidebarVariants}
      >
        {/* Logo */}
        <motion.div 
          className="flex items-center gap-3 p-4 sm:p-6 border-b border-[#324D3E]/10"
          variants={itemVariants}
        >
          <motion.div
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
              width={40}
              height={40}
              className="rounded-full"
            />
          </motion.div>
          <div className="min-w-0 flex-1">
            <motion.h1 
              className="font-bold text-[#324D3E] text-base sm:text-lg truncate"
              whileHover={{ color: "#4C3D19" }}
            >
              Admin Panel
            </motion.h1>
            <p className="text-xs sm:text-sm text-[#889063] truncate">Koperasi BAHTERA</p>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.nav 
          className="p-4 space-y-2"
          variants={sidebarVariants}
        >
          {navigation.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.name}
                variants={itemVariants}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 font-medium text-sm sm:text-base
                    ${isActive
                      ? 'bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg'
                      : 'text-[#324D3E] hover:bg-[#324D3E]/10 hover:text-[#4C3D19]'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)} // Close sidebar on mobile when clicking nav item
                >
                  <span className="text-lg sm:text-xl flex-shrink-0">{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>

        {/* User info at bottom */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#324D3E]/10"
          variants={itemVariants}
        >
          <motion.div 
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#324D3E]/5 transition-colors cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div 
              className="w-10 h-10 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center"
              whileHover={{ 
                rotate: 360,
                transition: { duration: 0.6 }
              }}
            >
              <span className="text-white font-bold">A</span>
            </motion.div>
            <div>
              <p className="font-semibold text-[#324D3E]">Admin</p>
              <p className="text-sm text-[#889063]">Administrator</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Main content */}
      <div className="lg:ml-64 xl:ml-72">
        {/* Top bar */}
        <motion.header 
          className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-[#324D3E]/10 sticky top-0 z-30"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-[#324D3E] hover:bg-[#324D3E]/10 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </motion.button>

            {/* Page title on mobile */}
            <div className="lg:hidden flex-1 text-center">
              <h1 className="text-lg font-bold text-[#324D3E] font-[family-name:var(--font-poppins)] truncate">
                Admin Panel
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <motion.button 
                className="p-1.5 sm:p-2 rounded-xl text-[#324D3E] hover:bg-[#324D3E]/10 transition-colors relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM8.5 14a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
                </svg>
                <motion.span 
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    transition: { duration: 2, repeat: Infinity }
                  }}
                />
              </motion.button>

              <motion.button 
                className="p-1.5 sm:p-2 rounded-xl text-[#324D3E] hover:bg-[#324D3E]/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Page content */}
        <motion.main 
          className="p-3 sm:p-4 lg:p-6 min-h-screen"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}