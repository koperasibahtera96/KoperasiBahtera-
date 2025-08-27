"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, LogOut, Menu, Receipt, Calendar } from "lucide-react"
import { useState } from "react"

interface SidebarLayoutProps {
  children: React.ReactNode
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: "Dashboard", href: "/finance", icon: BarChart3, description: "Ringkasan investasi" },
    { name: "Laporan Harian", href: "/laporan-harian", icon: Calendar, description: "Laporan aktivitas harian" },
    { name: "Manajemen Anggota", href: "/manajemen-anggota", icon: Users, description: "Data investor" },
    {
      name: "Laporan Keuangan",
      href: "/laporan-pengeluaran",
      icon: Receipt,
      description: "Analisis pengeluaran operasional",
    },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* User Profile */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                A
              </div>
              <div>
                <div className="text-foreground font-medium">Administrator</div>
                <div className="text-muted-foreground text-sm">Admin</div>
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
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
          <div className="p-4 border-t border-border">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-chart-2 text-sm font-medium">ROI Rata-rata</div>
                <div className="text-foreground font-bold">12.5%</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <div className="text-chart-1 text-sm font-medium">Total AUM</div>
                <div className="text-foreground font-bold">2.8M</div>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="p-4">
            <button className="flex items-center space-x-3 px-4 py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors w-full">
              <LogOut className="w-5 h-5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile menu button */}
        <div className="lg:hidden bg-card border-b border-border p-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foreground">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">🌱</span>
              </div>
              <span className="text-foreground font-semibold text-lg">InvestTani</span>
            </div>
            <div className="text-muted-foreground text-sm">Selamat Datang Kembali!</div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-background">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
