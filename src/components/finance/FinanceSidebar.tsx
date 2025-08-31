'use client'

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, LogOut, Menu, Receipt, Calendar, X } from "lucide-react"
import { useState } from "react"
import { signOut, useSession } from "next-auth/react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

interface FinanceSidebarProps {
  children: React.ReactNode
}

const sidebarVariants = {
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

const itemVariants = {
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
                <h1 className="text-xl font-bold text-[#324D3E]">InvestTani</h1>
                <p className="text-xs text-[#889063]">Finance Portal</p>
              </div>
            </motion.div>

            {/* User Profile */}
            <motion.div 
              className="mb-8 p-4 bg-gradient-to-r from-[#324D3E]/5 to-[#4C3D19]/5 rounded-2xl border border-[#324D3E]/10"
              variants={itemVariants}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-2xl flex items-center justify-center text-white font-semibold shadow-lg">
                  {session?.user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <div className="text-[#324D3E] font-semibold">{session?.user?.name || 'Administrator'}</div>
                  <div className="text-[#889063] text-sm">Finance Admin</div>
                </div>
              </div>
            </motion.div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
              {navigation.map((item, index) => {
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

            {/* Logout */}
            <motion.div className="mt-6" variants={itemVariants}>
              <button 
                onClick={handleLogout}
                className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-[#324D3E] hover:bg-red-50 hover:text-red-600 transition-all duration-300 w-full hover:scale-105"
              >
                <div className="p-2 rounded-xl bg-red-100 text-red-600 group-hover:bg-red-200 transition-all duration-300 group-hover:scale-110">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="font-medium">Keluar</span>
              </button>
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
                    <span className="text-lg font-bold text-[#324D3E]">InvestTani</span>
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
              <span className="text-lg font-bold text-[#324D3E]">InvestTani</span>
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