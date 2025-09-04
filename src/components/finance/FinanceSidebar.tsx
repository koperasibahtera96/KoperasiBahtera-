'use client'

import { AnimatePresence, motion } from "framer-motion"
import { BarChart3, Calendar, LogOut, Menu, Receipt, Users, X } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type React from "react"
import { useState } from "react"

interface FinanceSidebarProps {
  children: React.ReactNode
}

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
}

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
}

export function FinanceSidebar({ children }: FinanceSidebarProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session } = useSession()

  const navigation = [
    { name: "Dashboard", href: "/finance", icon: BarChart3, description: "Ringkasan investasi", gradient: "from-[#324D3E] to-[#4C3D19]" },
    { name: "Laporan Harian", href: "/laporan-harian", icon: Calendar, description: "Laporan aktivitas harian", gradient: "from-blue-500 to-cyan-600" },
    { name: "Manajemen Anggota", href: "/manajemen-anggota", icon: Users, description: "Data investor", gradient: "from-purple-500 to-pink-600" },
    {
      name: "Laporan Keuangan",
      href: "/laporan-pengeluaran",
      icon: Receipt,
      description: "Analisis pengeluaran operasional",
      gradient: "from-orange-500 to-red-500"
    },
      {
    name: "Invoice",
    href: "/invoice",
    icon: Receipt, // boleh ganti ikon lain kalau mau
    description: "Tagihan & pembayaran",
    gradient: "from-emerald-500 to-green-600",
  },
  ]

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex font-[family-name:var(--font-poppins)]">
      {/* Desktop Sidebar */}
      <motion.div
        className="hidden lg:flex lg:w-80 lg:fixed lg:inset-y-0 lg:z-50"
        initial="hidden"
        animate="visible"
        variants={sidebarVariants}
      >
        <div className="flex grow flex-col bg-white/90 backdrop-blur-xl border-r border-[#324D3E]/10 shadow-xl">
          <div className="flex flex-col h-full p-6">
            {/* Logo */}
            <motion.div
              className="flex h-16 shrink-0 items-center gap-3 mb-8"
              variants={itemVariants}
            >
              <div className="relative w-12 h-12">
                <Image
                  src="/images/koperasi-logo.jpg"
                  alt="Logo"
                  width={48}
                  height={48}
                  className="rounded-2xl shadow-md"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#324D3E]">Koperasi BAHTERA</h1>
                <p className="text-xs text-[#889063]">Finance Portal</p>
              </div>
            </motion.div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <motion.div key={item.name} variants={itemVariants}>
                    <Link
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg scale-105"
                          : "text-[#324D3E] hover:bg-[#324D3E]/5 hover:scale-105"
                      }`}
                    >
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "bg-white/20"
                          : `bg-gradient-to-r ${item.gradient} bg-clip-padding text-white group-hover:scale-110`
                      }`}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{item.name}</div>
                        <div className={`text-xs ${isActive ? "text-white/70" : "text-[#889063]"}`}>
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </nav>

            {/* User info at bottom */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 border-t border-[#324D3E]/10"
              variants={itemVariants}
            >
              <motion.div
                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl hover:bg-[#324D3E]/5 transition-colors mb-1 sm:mb-2"
              >
                <motion.div
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center flex-shrink-0"
                  whileHover={{
                    rotate: 360,
                    transition: { duration: 0.6 }
                  }}
                >
                  <span className="text-white font-bold text-sm sm:text-base">{session?.user?.name?.charAt(0).toUpperCase() || 'A'}</span>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#324D3E] text-sm sm:text-base truncate">{session?.user?.name || 'Admin'}</p>
                  <p className="text-xs sm:text-sm text-[#889063] truncate">Finance Admin</p>
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
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <span className="font-medium text-sm sm:text-base">Keluar</span>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
              <motion.div
                className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white/95 backdrop-blur-xl px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-[#324D3E]/10"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/images/koperasi-logo.jpg"
                      alt="Logo"
                      width={40}
                      height={40}
                      className="rounded-xl"
                    />
                    <span className="text-lg font-bold text-[#324D3E]">Koperasi BAHTERA</span>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl p-2 text-[#889063] hover:bg-[#324D3E]/5"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-6 flow-root">
                  <div className="-my-6 divide-y divide-[#324D3E]/10">
                    <div className="space-y-2 py-6">
                      {navigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                              isActive
                                ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white"
                                : "text-[#324D3E] hover:bg-[#324D3E]/5"
                            }`}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <div className={`p-2 rounded-xl ${
                              isActive
                                ? "bg-white/20"
                                : `bg-gradient-to-r ${item.gradient} text-white`
                            }`}>
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold">{item.name}</div>
                              <div className={`text-xs ${isActive ? "text-white/70" : "text-[#889063]"}`}>
                                {item.description}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                    <div className="py-6">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-red-600 hover:bg-red-50 transition-all duration-300 w-full"
                      >
                        <div className="p-2 rounded-xl bg-red-100">
                          <LogOut className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Keluar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="lg:pl-80 w-full">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-[#324D3E]/10 bg-white/90 backdrop-blur-xl px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <button
            type="button"
            className="rounded-xl p-2 text-[#324D3E] hover:bg-[#324D3E]/5"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-3">
              <Image
                src="/images/koperasi-logo.jpg"
                alt="Logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-lg font-bold text-[#324D3E]">Koperasi BAHTERA</span>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
          {children}
        </main>
      </div>
    </div>
  )
}