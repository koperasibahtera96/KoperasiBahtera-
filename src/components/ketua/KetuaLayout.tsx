"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Users,
  Trees,
  TrendingUp,
  Menu,
  X
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface KetuaLayoutProps {
  children: React.ReactNode;
}

// Only the 3 pages that Ketua can access (read-only)
const navigation = [
  { name: "Manajemen Investor", href: "/admin/investors", icon: Users, color: "text-purple-600" },
  { name: "Data Pohon", href: "/admin/trees", icon: Trees, color: "text-emerald-600" },
  { name: "Laporan", href: "/admin/laporan", icon: TrendingUp, color: "text-cyan-600" },
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
      delayChildren: 0.2,
    },
  },
};

const itemVariants: any = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15,
    },
  },
};

const logoVariants: any = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 10,
    },
  },
};

export function KetuaLayout({ children }: KetuaLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAF9] to-[#E8F5E8] dark:from-gray-900 dark:to-gray-800 font-[family-name:var(--font-poppins)] transition-colors duration-300">
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
          fixed inset-y-0 left-0 w-64 sm:w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-2xl transform transition-all duration-300 ease-in-out z-50 border-r border-[#324D3E]/10 dark:border-gray-700
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
        `}
        initial="hidden"
        animate="visible"
        variants={sidebarVariants}
      >
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 p-4 sm:p-6 border-b border-[#324D3E]/10 dark:border-gray-700"
          variants={itemVariants}
        >
          <motion.div
            variants={logoVariants}
            whileHover={{
              scale: 1.1,
              rotate: 5,
              transition: { duration: 0.3 },
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
              className="font-bold text-[#324D3E] dark:text-white text-base sm:text-lg truncate"
              whileHover={{ color: "#4C3D19" }}
            >
              Ketua Panel
            </motion.h1>
            <p className="text-xs sm:text-sm text-[#889063] dark:text-gray-400 truncate">
              Koperasi BAHTERA
            </p>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.nav className="p-4 space-y-2" variants={sidebarVariants}>
          {navigation.map((item) => {
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
                    flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 font-medium text-sm sm:text-base group
                    ${
                      isActive
                        ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                        : "text-[#324D3E] dark:text-gray-200 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:text-[#4C3D19] dark:hover:text-white"
                    }
                  `}
                  onClick={() => setSidebarOpen(false)} // Close sidebar on mobile when clicking nav item
                >
                  <item.icon 
                    className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 transition-colors duration-300 ${
                      isActive
                        ? "text-white"
                        : `${item.color} group-hover:scale-110`
                    }`} 
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>

        {/* User info at bottom */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 border-t border-[#324D3E]/10 dark:border-gray-700"
          variants={itemVariants}
        >
          <motion.div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-700/50 transition-colors mb-1 sm:mb-2">
            <motion.div
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center flex-shrink-0"
              whileHover={{
                rotate: 360,
                transition: { duration: 0.6 },
              }}
            >
              <span className="text-white font-bold text-sm sm:text-base">
                {session?.user?.name?.charAt(0).toUpperCase() || "K"}
              </span>
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#324D3E] dark:text-white text-sm sm:text-base truncate">
                {session?.user?.name || "Ketua"}
              </p>
              <p className="text-xs sm:text-sm text-[#889063] dark:text-gray-400 truncate">
                Ketua
              </p>
            </div>
          </motion.div>

          {/* Logout button */}
          <motion.button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300 text-sm sm:text-base group"
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <span className="font-medium text-sm sm:text-base">Keluar</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Main content */}
      <div className="lg:ml-64 xl:ml-72">
        {/* Mobile menu button - only visible on mobile */}
        <div className="lg:hidden fixed top-4 right-4 z-40">
          <motion.button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-[#324D3E]/20 dark:border-gray-600 rounded-xl p-2 shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {sidebarOpen ? (
              <X className="w-6 h-6 text-[#324D3E] dark:text-white" />
            ) : (
              <Menu className="w-6 h-6 text-[#324D3E] dark:text-white" />
            )}
          </motion.button>
        </div>

        {/* Page content */}
        <main className="min-h-screen p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}