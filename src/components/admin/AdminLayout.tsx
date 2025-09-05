"use client";

import { AnimatePresence, motion } from "framer-motion";
import { 
  BarChart3, 
  CheckCircle, 
  Users, 
  CreditCard, 
  MessageCircle, 
  Trees, 
  HardHat, 
  TrendingUp,
  Settings 
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/admin", icon: BarChart3, color: "text-blue-600" },
  { name: "Verifikasi User", href: "/admin/verification", icon: CheckCircle, color: "text-green-600" },
  { name: "Manajemen Investor", href: "/admin/investors", icon: Users, color: "text-purple-600" },
  { name: "Kelola Cicilan", href: "/admin/cicilan", icon: CreditCard, color: "text-amber-600" },
  { name: "Kelola Komentar", href: "/admin/reviews", icon: MessageCircle, color: "text-pink-600" },
  { name: "Data Pohon", href: "/admin/trees", icon: Trees, color: "text-emerald-600" },
  { name: "Kelola Staff", href: "/admin/staff", icon: HardHat, color: "text-orange-600" },
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

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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
          className="flex items-center gap-3 p-4 sm:p-6 border-b border-[#324D3E]/10"
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
              className="font-bold text-[#324D3E] text-base sm:text-lg truncate"
              whileHover={{ color: "#4C3D19" }}
            >
              Admin Panel
            </motion.h1>
            <p className="text-xs sm:text-sm text-[#889063] truncate">
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
                        : "text-[#324D3E] hover:bg-[#324D3E]/10 hover:text-[#4C3D19]"
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
          className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 border-t border-[#324D3E]/10"
          variants={itemVariants}
        >
          <motion.div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl hover:bg-[#324D3E]/5 transition-colors mb-1 sm:mb-2">
            <motion.div
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center flex-shrink-0"
              whileHover={{
                rotate: 360,
                transition: { duration: 0.6 },
              }}
            >
              <span className="text-white font-bold text-sm sm:text-base">
                {session?.user?.name?.charAt(0).toUpperCase() || "A"}
              </span>
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#324D3E] text-sm sm:text-base truncate">
                {session?.user?.name || "Admin"}
              </p>
              <p className="text-xs sm:text-sm text-[#889063] truncate">
                Administrator
              </p>
            </div>
          </motion.div>

          {/* Logout button */}
          <motion.button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors flex-shrink-0">
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
            className="p-2 rounded-xl text-[#324D3E] bg-white/80 backdrop-blur-lg shadow-md hover:bg-[#324D3E]/10 transition-colors"
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
