"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Settings,
  LogOut,
  Menu,
  Shield,
  UserCheck,
  CheckCheckIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

interface StaffLayoutProps {
  children: React.ReactNode;
}

const getNavigationForRole = (role: string) => {
  const navigation = [
    // Marketing head, marketing admin, and admin navigation - only /marketing page exists
    {
      name: "Staff Referral",
      href: "/marketing",
      icon: CheckCircle2Icon,
      color: "text-purple-600",
      roles: ["marketing_head", "marketing_admin", "admin"],
    },

    {
      name: "Komisimu",
      href: "/staff",
      icon: CheckCheckIcon,
      color: "text-blue-600",
      roles: ["marketing_head", "marketing"],
    },

    // Marketing head: Kelola Staff (manage marketing staff)
    {
      name: "Kelola Staff",
      href: "/marketing/staff",
      icon: UserCheck,
      color: "text-orange-600",
      roles: ["marketing_head", "marketing_admin", "admin"],
    },

    // Settings page for all roles
    {
      name: "Settings",
      href: "/staff/settings",
      icon: Settings,
      color: "text-indigo-600",
      roles: ["marketing", "marketing_head", "marketing_admin", "admin"],
    },

    // Admin specific navigation - back to admin panel (only for admins, below settings)
    {
      name: "Admin Dashboard",
      href: "/admin",
      icon: Shield,
      color: "text-red-600",
      roles: ["admin"],
    },
  ];

  return navigation.filter((item) => item.roles.includes(role));
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

const navItemVariants: any = {
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
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRole = session?.user?.role || "marketing";
  const navigation = getNavigationForRole(userRole);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "marketing":
        return "Marketing Staff";
      case "marketing_head":
        return "Marketing Head";
      case "marketing_admin":
        return "Marketing Admin";
      case "admin":
        return "Administrator";
      default:
        return "Staff";
    }
  };

  // Helper function to get theme-aware classes
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  return (
    <div
      className={getThemeClasses(
        "min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 font-[family-name:var(--font-poppins)] transition-colors duration-300",
        "!bg-gradient-to-br !from-[#FFDEE9] !via-white !to-[#FFDEE9]"
      )}
    >
      {/* Mobile menu overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={getThemeClasses(
          `
          fixed inset-y-0 left-0 w-64 sm:w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-2xl transform transition-all duration-300 ease-in-out z-50 border-r border-[#324D3E]/10 dark:border-gray-700 flex flex-col
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
        `,
          "!bg-white/95 !border-[#FFC1CC]/30"
        )}
        initial="hidden"
        animate="visible"
        variants={sidebarVariants}
      >
        {/* Logo */}
        <motion.div
          className={getThemeClasses(
            "flex items-center gap-3 p-4 sm:p-6 border-b border-[#324D3E]/10 dark:border-gray-700",
            "!border-[#FFC1CC]/30"
          )}
          variants={navItemVariants}
        >
          <motion.div
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
              className={getThemeClasses(
                "font-bold text-[#324D3E] dark:text-white text-base sm:text-lg truncate",
                "!text-[#4c1d1d]"
              )}
              whileHover={{ color: theme === "pink" ? "#831843" : "#4C3D19" }}
            >
              Staff Portal
            </motion.h1>
            <p
              className={getThemeClasses(
                "text-xs sm:text-sm text-[#889063] dark:text-gray-400 truncate",
                "!text-[#6b7280]"
              )}
            >
              Koperasi BAHTERA
            </p>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.nav
          className="p-4 space-y-1 flex-1 overflow-y-auto"
          variants={sidebarVariants}
        >
          {navigation.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.name}
                variants={navItemVariants}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={item.href}
                  className={getThemeClasses(
                    `
                    flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 font-medium text-sm sm:text-base group
                    ${
                      isActive
                        ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                        : "text-[#324D3E] dark:text-gray-200 hover:bg-[#324D3E]/10 dark:hover:bg-gray-700 hover:text-[#4C3D19] dark:hover:text-white"
                    }
                  `,
                    isActive
                      ? "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d] !shadow-lg"
                      : "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/10 hover:!text-[#831843]"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div
                    className={getThemeClasses(
                      `w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg mr-1 transition-all duration-300 ${
                        isActive
                          ? "bg-white/20"
                          : "bg-transparent group-hover:bg-white/10"
                      }`,
                      `w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg mr-1 transition-all duration-300 ${
                        index === 0
                          ? "!bg-[#FFC1CC]/40"
                          : index === 1
                          ? "!bg-[#B5EAD7]/40"
                          : index === 2
                          ? "!bg-[#C7CEEA]/40"
                          : "!bg-[#FFDEE9]/40"
                      } ${
                        isActive
                          ? index === 0
                            ? "!bg-[#FFC1CC]/60"
                            : index === 1
                            ? "!bg-[#B5EAD7]/60"
                            : index === 2
                            ? "!bg-[#C7CEEA]/60"
                            : "!bg-[#FFDEE9]/60"
                          : ""
                      }`
                    )}
                  >
                    <item.icon
                      className={getThemeClasses(
                        `w-5 h-5 sm:w-5 sm:h-5 flex-shrink-0 transition-colors duration-300 ${
                          isActive
                            ? "text-white"
                            : `${item.color} group-hover:scale-110`
                        }`,
                        isActive
                          ? "!text-[#4c1d1d]"
                          : "!text-[#4c1d1d] group-hover:scale-110"
                      )}
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
          className={getThemeClasses(
            "p-2 sm:p-4 border-t border-[#324D3E]/10 dark:border-gray-700 mt-auto",
            "!border-[#FFC1CC]/30"
          )}
          variants={navItemVariants}
        >
          <Link href="/profile">
            <motion.div
              className={getThemeClasses(
                "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-700/50 transition-colors mb-1 sm:mb-2 cursor-pointer",
                "hover:!bg-[#FFC1CC]/10"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
            <motion.div
              className={getThemeClasses(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0",
                "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9]"
              )}
              whileHover={{
                rotate: 360,
                transition: { duration: 0.6 },
              }}
            >
              {session?.user?.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.profileImageUrl}
                  alt={session.user?.name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className={getThemeClasses(
                    "text-white font-bold text-sm sm:text-base bg-gradient-to-r from-[#324D3E] to-[#4C3D19] w-full h-full flex items-center justify-center",
                    "!text-[#4c1d1d]"
                  )}
                >
                  {session?.user?.name?.charAt(0).toUpperCase() || "S"}
                </span>
              )}
            </motion.div>
            <div className="flex-1 min-w-0">
              <p
                className={getThemeClasses(
                  "font-semibold text-[#324D3E] dark:text-white text-sm sm:text-base truncate",
                  "!text-[#4c1d1d]"
                )}
              >
                {session?.user?.name || "Staff"}
              </p>
              <p
                className={getThemeClasses(
                  "text-xs sm:text-sm text-[#889063] dark:text-gray-400 truncate",
                  "!text-[#6b7280]"
                )}
              >
                {getRoleDisplayName(userRole)}
              </p>
            </div>
            </motion.div>
          </Link>

          {/* Logout button */}
          <motion.button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={getThemeClasses(
              "w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group",
              "!text-[#4c1d1d] hover:!bg-[#FFB3C6]/20"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className={getThemeClasses(
                "w-8 h-8 sm:w-10 sm:h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-800/60 transition-colors flex-shrink-0",
                "!bg-[#FFB3C6]/30 group-hover:!bg-[#FFB3C6]/50"
              )}
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-medium text-sm sm:text-base">Keluar</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Main content */}
      <div className="lg:ml-64 xl:ml-72">
        {/* Mobile menu button */}
        <div className="lg:hidden fixed top-4 right-4 z-40">
          <motion.button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={getThemeClasses(
              "p-2 rounded-xl text-[#324D3E] dark:text-white bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-md hover:bg-[#324D3E]/10 dark:hover:bg-gray-700/50 transition-colors",
              "!text-[#4c1d1d] !bg-white/80 hover:!bg-[#FFC1CC]/20"
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Menu className="w-6 h-6" />
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
