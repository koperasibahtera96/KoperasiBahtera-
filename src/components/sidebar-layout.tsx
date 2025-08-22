"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, LogOut, Menu } from "lucide-react"
import { useState } from "react"

interface SidebarLayoutProps {
  children: React.ReactNode
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: "Dashboard", href: "/finance", icon: BarChart3, description: "Ringkasan investasi" },
    { name: "Manajemen Anggota", href: "/manajemen-anggota", icon: Users, description: "Data investor" },
  ]

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* User Profile */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                A
              </div>
              <div>
                <div className="text-white font-medium">Administrator</div>
                <div className="text-slate-400 text-sm">Admin</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Bottom Stats */}
          <div className="p-4 border-t border-slate-700">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700 rounded-lg p-3 text-center">
                <div className="text-emerald-400 text-sm font-medium">ROI Rata-rata</div>
                <div className="text-white font-bold">12.5%</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-3 text-center">
                <div className="text-blue-400 text-sm font-medium">Total AUM</div>
                <div className="text-white font-bold">2.8M</div>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="p-4">
            <button className="flex items-center space-x-3 px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors w-full">
              <LogOut className="w-5 h-5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile menu button */}
        <div className="lg:hidden bg-slate-800 p-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Top Header */}
        <header className="bg-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🌱</span>
              </div>
              <span className="text-white font-semibold text-lg">InvestTani</span>
            </div>
            <div className="text-slate-300 text-sm">Selamat Datang Kembali!</div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
