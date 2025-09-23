"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle,
  Users,
  MessageCircle,
  Trees,
  HardHat,
  TrendingUp,
  Settings,
  FileText,
  ClipboardCheck
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/admin", icon: BarChart3, color: "text-blue-600" },
  { name: "Verifikasi User", href: "/admin/verification", icon: CheckCircle, color: "text-green-600" },
  { name: "Persetujuan Kontrak", href: "/admin/contract-approvals", icon: ClipboardCheck, color: "text-emerald-600" },
  { name: "Manajemen Investor", href: "/admin/investors", icon: Users, color: "text-purple-600" },
  { name: "Kelola Komentar", href: "/admin/reviews", icon: MessageCircle, color: "text-pink-600" },
  { name: "Data Pohon", href: "/admin/trees", icon: Trees, color: "text-emerald-600" },
  { name: "Kelola Staff", href: "/admin/staff", icon: HardHat, color: "text-orange-600" },
  { name: "Log Aktivitas", href: "/admin/logs", icon: FileText, color: "text-red-600" },
  { name: "Laporan", href: "/admin/laporan", icon: TrendingUp, color: "text-cyan-600" },
  { name: "Pengaturan", href: "/admin/settings", icon: Settings, color: "text-indigo-600" },
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
      stiffness: 200,
      damping: 20,
      duration: 0.8,
    },
  },
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug: log theme/mounted to help verify runtime theme value
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[AdminLayout] theme=', theme, 'mounted=', mounted, 'document.documentElement.classList=', document.documentElement.className);
    }
  }, [theme, mounted]);

  // Helper function to get theme-aware classes
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className={getThemeClasses("min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 font-[family-name:var(--font-poppins)] transition-colors duration-300", "!bg-gradient-to-br !from-[#FFDEE9] !via-white !to-[#FFDEE9]")}>
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
        className={getThemeClasses(`
          fixed inset-y-0 left-0 w-64 sm:w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-2xl transform transition-all duration-300 ease-in-out z-50 border-r border-[#324D3E]/10 dark:border-gray-700 flex flex-col
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
        `, "!bg-white/95 !border-[#FFC1CC]/30")}
        initial="hidden"
        animate="visible"
        variants={sidebarVariants}
      >
        {/* Logo */}
        <motion.div
          className={getThemeClasses("flex items-center gap-3 p-4 sm:p-6 border-b border-[#324D3E]/10 dark:border-gray-700", "!border-[#FFC1CC]/30")}
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
              className={getThemeClasses("font-bold text-[#324D3E] dark:text-white text-base sm:text-lg truncate", "!text-[#4c1d1d]")}
              whileHover={{ color: theme === "pink" ? "#831843" : "#4C3D19" }}
            >
              Admin Panel
            </motion.h1>
            <p className={getThemeClasses("text-xs sm:text-sm text-[#889063] dark:text-gray-400 truncate", "!text-[#6b7280]")}>
              Koperasi BAHTERA
            </p>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.nav className="p-4 space-y-1 flex-1 overflow-y-auto" variants={sidebarVariants}>
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
                  className={getThemeClasses(`
                    flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 font-medium text-sm sm:text-base group
                    ${
                      isActive
                        ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                        : "text-[#324D3E] dark:text-gray-200 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:text-[#4C3D19] dark:hover:text-white"
                    }
                  `, isActive
                    ? "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d] !shadow-lg"
                    : "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/10 hover:!text-[#831843]")}
                  onClick={() => setSidebarOpen(false)} // Close sidebar on mobile when clicking nav item
                >
                  <div className={getThemeClasses(
                    `w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg mr-1 transition-all duration-300 ${
                      isActive
                        ? "bg-white/20"
                        : "bg-transparent group-hover:bg-white/10"
                    }`,
                    // Pink theme: different pastel colors for each icon (always visible, not just on hover)
                    `w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg mr-1 transition-all duration-300 ${
                      index === 0 ? "!bg-[#FFC1CC]/40" :
                      index === 1 ? "!bg-[#B5EAD7]/40" :
                      index === 2 ? "!bg-[#C7CEEA]/40" :
                      index === 3 ? "!bg-[#FFDEE9]/40" :
                      index === 4 ? "!bg-[#FFF5BA]/40" :
                      index === 5 ? "!bg-[#FFE4E1]/40" :
                      index === 6 ? "!bg-[#E6F3FF]/40" :
                      index === 7 ? "!bg-[#F0E6FF]/40" :
                      index === 8 ? "!bg-[#FFE6F0]/40" :
                      index === 9 ? "!bg-[#E6FFE6]/40" :
                      "!bg-[#FFEFE6]/40"
                    } ${
                      isActive
                        ? index === 0 ? "!bg-[#FFC1CC]/60" :
                          index === 1 ? "!bg-[#B5EAD7]/60" :
                          index === 2 ? "!bg-[#C7CEEA]/60" :
                          index === 3 ? "!bg-[#FFDEE9]/60" :
                          index === 4 ? "!bg-[#FFF5BA]/60" :
                          index === 5 ? "!bg-[#FFE4E1]/60" :
                          index === 6 ? "!bg-[#E6F3FF]/60" :
                          index === 7 ? "!bg-[#F0E6FF]/60" :
                          index === 8 ? "!bg-[#FFE6F0]/60" :
                          index === 9 ? "!bg-[#E6FFE6]/60" :
                          "!bg-[#FFEFE6]/60"
                        : ""
                    }`
                  )}>
                    <item.icon
                      className={getThemeClasses(`w-5 h-5 sm:w-5 sm:h-5 flex-shrink-0 transition-colors duration-300 ${
                        isActive
                          ? "text-white"
                          : `${item.color} group-hover:scale-110`
                      }`, isActive
                        ? "!text-[#4c1d1d]"
                        : "!text-[#4c1d1d] group-hover:scale-110")}
                    />
                  </div>
                  <span className="truncate">{item.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>

        {/* User info at bottom */}
        <motion.div
          className={getThemeClasses("p-2 sm:p-4 border-t border-[#324D3E]/10 dark:border-gray-700 mt-auto", "!border-[#FFC1CC]/30")}
          variants={itemVariants}
        >
          <motion.div className={getThemeClasses("flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-700/50 transition-colors mb-1 sm:mb-2", "hover:!bg-[#FFC1CC]/10")}>
            <motion.div
              className={getThemeClasses("w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center flex-shrink-0", "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9]")}
              whileHover={{
                rotate: 360,
                transition: { duration: 0.6 },
              }}
            >
              <span className={getThemeClasses("text-white font-bold text-sm sm:text-base", "!text-[#4c1d1d]")}>
                {session?.user?.name?.charAt(0).toUpperCase() || "A"}
              </span>
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className={getThemeClasses("font-semibold text-[#324D3E] dark:text-white text-sm sm:text-base truncate", "!text-[#4c1d1d]")}>
                {session?.user?.name || "Admin"}
              </p>
              <p className={getThemeClasses("text-xs sm:text-sm text-[#889063] dark:text-gray-400 truncate", "!text-[#6b7280]")}>
                Administrator
              </p>
            </div>
          </motion.div>

          {/* Logout button */}
          <motion.button
            onClick={handleLogout}
            className={getThemeClasses("w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group", "!text-[#4c1d1d] hover:!bg-[#FFB3C6]/20")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={getThemeClasses("w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-800/60 transition-colors flex-shrink-0", "!bg-[#FFB3C6]/30 group-hover:!bg-[#FFB3C6]/50")}>
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
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
            className={getThemeClasses("p-2 rounded-xl text-[#324D3E] dark:text-white bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-md hover:bg-[#324D3E]/10 dark:hover:bg-gray-700/50 transition-colors", "!text-[#4c1d1d] !bg-white/80 hover:!bg-[#FFC1CC]/20")}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </motion.button>
        </div>

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
