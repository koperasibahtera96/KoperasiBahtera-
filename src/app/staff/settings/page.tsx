"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import StaffLayout from "@/components/staff/StaffLayout";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Settings as SettingsIcon,
  User,
} from "lucide-react";

export default function StaffSettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to get theme-aware classes
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  const themes = [
    {
      id: "light",
      name: "Light Mode",
      description: "Clean and bright interface",
      icon: Sun,
      colors: ["#ffffff", "#f8fafc", "#e2e8f0", "#cbd5e1"],
    },
    {
      id: "dark",
      name: "Dark Mode",
      description: "Easy on the eyes in low light",
      icon: Moon,
      colors: ["#1e293b", "#0f172a", "#334155", "#475569"],
    },
    {
      id: "system",
      name: "System",
      description: "Follow your device settings",
      icon: Monitor,
      colors: ["#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"],
    },
    {
      id: "pink",
      name: "Pink Theme",
      description: "Soft and elegant pink palette",
      icon: Palette,
      colors: ["#FFC1CC", "#FFDEE9", "#FFB3C6", "#FF91A4"],
    },
  ];

  if (!mounted) {
    return (
      <StaffLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <motion.div
        className="container mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={getThemeClasses("p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl", "!bg-[#FFC1CC]/40")}>
              <SettingsIcon className={getThemeClasses("h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400", "!text-[#4c1d1d]")} />
            </div>
            <h1 className={getThemeClasses("text-2xl sm:text-3xl md:text-4xl font-black text-[#324D3E] dark:text-white", "!text-[#4c1d1d]")}>
              Settings
            </h1>
          </div>
          <p className={getThemeClasses("text-base sm:text-lg text-[#889063] dark:text-gray-400 max-w-2xl mx-auto font-medium", "!text-[#6b7280]")}>
            Customize your experience and preferences
          </p>
        </motion.div>

        {/* Theme Settings Section */}
        <motion.div
          className={getThemeClasses("bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 dark:border-gray-700 hover:shadow-2xl transition-all duration-300", "!bg-white/95 !border-[#FFC1CC]/30")}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className={getThemeClasses("p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl", "!bg-[#C7CEEA]/40")}>
                <Palette className={getThemeClasses("h-5 w-5 text-purple-600 dark:text-purple-400", "!text-[#4c1d1d]")} />
              </div>
              <div>
                <h2 className={getThemeClasses("text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white", "!text-[#4c1d1d]")}>
                  Theme Preferences
                </h2>
                <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400", "!text-[#6b7280]")}>
                  Choose your preferred color scheme
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {themes.map((themeOption, index) => {
                const isActive = theme === themeOption.id;
                const Icon = themeOption.icon;

                // Define color palettes for each theme option like FinanceLayout
                const getCardClasses = () => {
                  if (mounted && theme === "pink") {
                    if (index === 0) return "bg-gradient-to-br from-white to-[#FFDEE9]/50"
                    if (index === 1) return "bg-gradient-to-br from-white to-[#B5EAD7]/50"
                    if (index === 2) return "bg-gradient-to-br from-white to-[#C7CEEA]/50"
                    if (index === 3) return "bg-gradient-to-br from-white to-[#FFF5BA]/50"
                  }
                  // Default theme colors
                  if (index === 0) return "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20"
                  if (index === 1) return "bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/30 dark:to-sky-800/20"
                  if (index === 2) return "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20"
                  if (index === 3) return "bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 dark:from-fuchsia-900/30 dark:to-fuchsia-800/20"
                }

                const getIconClasses = () => {
                  if (mounted && theme === "pink") {
                    if (index === 0) return "bg-[#FFC1CC]/30 text-[#4c1d1d]"
                    if (index === 1) return "bg-[#B5EAD7]/50 text-[#1f2937]"
                    if (index === 2) return "bg-[#C7CEEA]/50 text-[#1f2937]"
                    if (index === 3) return "bg-[#FFF5BA]/50 text-[#1f2937]"
                  }
                  // Default theme colors
                  if (index === 0) return "bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100"
                  if (index === 1) return "bg-sky-200 dark:bg-sky-700 text-sky-900 dark:text-sky-100"
                  if (index === 2) return "bg-indigo-200 dark:bg-indigo-700 text-indigo-900 dark:text-indigo-100"
                  if (index === 3) return "bg-fuchsia-200 dark:bg-fuchsia-700 text-fuchsia-900 dark:text-fuchsia-100"
                }

                return (
                  <motion.button
                    key={themeOption.id}
                    onClick={() => setTheme(themeOption.id)}
                    className={`group rounded-3xl ${getCardClasses()} p-6 border border-black/5 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-left relative ${isActive ? 'ring-2 ring-[#324D3E] dark:ring-blue-500' : ''}`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    style={mounted && theme === "pink" ? {} : {}}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute top-3 right-3 w-5 h-5 bg-[#324D3E] dark:bg-blue-500 rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                        style={mounted && theme === "pink" ? { backgroundColor: "#4c1d1d" } : {}}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getIconClasses()} transition-all duration-300 group-hover:scale-110`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className={`text-sm font-medium transition-colors duration-300 ${mounted && theme === "pink" ? "text-[#4c1d1d]" : "text-[#324D3E] dark:text-gray-100/90"}`}>
                        {themeOption.name}
                      </p>
                      <p className={`text-xs transition-colors duration-300 ${mounted && theme === "pink" ? "text-[#4c1d1d]/70" : "text-[#889063] dark:text-gray-400"}`}>
                        {themeOption.description}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* User Information Section */}
        <motion.div
          className={getThemeClasses("bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 dark:border-gray-700 hover:shadow-2xl transition-all duration-300", "!bg-white/95 !border-[#FFC1CC]/30")}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className={getThemeClasses("p-3 bg-green-100 dark:bg-green-900/30 rounded-2xl", "!bg-[#B5EAD7]/40")}>
                <User className={getThemeClasses("h-5 w-5 text-green-600 dark:text-green-400", "!text-[#4c1d1d]")} />
              </div>
              <div>
                <h2 className={getThemeClasses("text-lg sm:text-xl font-bold text-[#324D3E] dark:text-white", "!text-[#4c1d1d]")}>
                  Account Information
                </h2>
                <p className={getThemeClasses("text-sm text-[#889063] dark:text-gray-400", "!text-[#6b7280]")}>
                  Your profile details
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className={getThemeClasses("p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl", "!bg-[#FFC1CC]/10")}>
                <label className={getThemeClasses("text-sm font-medium text-[#889063] dark:text-gray-400 block mb-2", "!text-[#6b7280]")}>
                  Full Name
                </label>
                <p className={getThemeClasses("text-[#324D3E] dark:text-white font-semibold", "!text-[#4c1d1d]")}>
                  {session?.user?.name || "N/A"}
                </p>
              </div>

              <div className={getThemeClasses("p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl", "!bg-[#FFC1CC]/10")}>
                <label className={getThemeClasses("text-sm font-medium text-[#889063] dark:text-gray-400 block mb-2", "!text-[#6b7280]")}>
                  Email Address
                </label>
                <p className={getThemeClasses("text-[#324D3E] dark:text-white font-semibold", "!text-[#4c1d1d]")}>
                  {session?.user?.email || "N/A"}
                </p>
              </div>

              <div className={getThemeClasses("p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl", "!bg-[#FFC1CC]/10")}>
                <label className={getThemeClasses("text-sm font-medium text-[#889063] dark:text-gray-400 block mb-2", "!text-[#6b7280]")}>
                  Role
                </label>
                <p className={getThemeClasses("text-[#324D3E] dark:text-white font-semibold", "!text-[#4c1d1d]")}>
                  {session?.user?.role === 'marketing' ? 'Marketing Staff' :
                   session?.user?.role === 'marketing_head' ? 'Marketing Head' :
                   session?.user?.role === 'admin' ? 'Administrator' : 'Staff'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </StaffLayout>
  );
}