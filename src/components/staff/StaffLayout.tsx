"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Users,
  CreditCard,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  DollarSign,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface StaffLayoutProps {
  children: React.ReactNode;
}

const getNavigationForRole = (role: string) => {
  const navigation = [
    // Marketing staff navigation - only /staff page exists
    { name: "Referral Dashboard", href: "/staff", icon: TrendingUp, color: "text-green-600", roles: ['marketing'] },

    // Marketing head and admin navigation - only /marketing page exists
    { name: "Marketing Management", href: "/marketing", icon: Users, color: "text-purple-600", roles: ['marketing_head', 'admin'] },

    // Admin specific navigation - back to admin panel
    { name: "Admin Dashboard", href: "/admin", icon: Settings, color: "text-red-600", roles: ['admin'] },
  ];

  return navigation.filter(item =>
    item.roles.includes(role)
  );
};

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
    },
  },
  exit: {
    x: -300,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
};

const navItemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function StaffLayout({ children }: StaffLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!session?.user) {
    return <div>Please log in to access this page</div>;
  }

  const userRole = session.user.role || 'marketing';
  const navigation = getNavigationForRole(userRole);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'marketing': return 'Marketing Staff';
      case 'marketing_head': return 'Marketing Head';
      case 'admin': return 'Administrator';
      default: return 'Staff';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex">
      {/* Mobile menu overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        <motion.div
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-gray-200 lg:relative lg:z-auto ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } transition-transform duration-300 ease-in-out lg:transition-none`}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <Image
                    src="/images/koperasi-logo.jpg"
                    alt="Koperasi Logo"
                    fill
                    className="object-cover rounded-xl shadow-lg"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Staff Portal</h1>
                  <p className="text-xs text-gray-600">Koperasi Bahtera</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User info */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <UserCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {session.user.email}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    {getRoleDisplayName(userRole)}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
              {navigation.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div key={item.name} variants={navItemVariants}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                          : "text-gray-700 hover:bg-white hover:shadow-md hover:text-blue-600"
                      }`}
                    >
                      <item.icon
                        className={`w-5 h-5 ${
                          isActive ? "text-white" : item.color
                        } group-hover:scale-110 transition-transform`}
                      />
                      <span className="font-medium text-sm">{item.name}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 group"
              >
                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-sm">Logout</span>
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image
                src="/images/koperasi-logo.jpg"
                alt="Logo"
                fill
                className="object-cover rounded-lg"
              />
            </div>
            <span className="font-semibold text-gray-900">Staff Portal</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}