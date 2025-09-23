"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { motion } from "framer-motion";
import {
  Heart,
  Monitor,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function FinanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeOptions = [
    {
      value: "light",
      label: "Mode Terang",
      description: "Tampilan terang untuk penggunaan sehari-hari",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Mode Gelap",
      description: "Tampilan gelap untuk mengurangi kelelahan mata",
      icon: Moon,
    },
    {
      value: "pink",
      label: "Mode Pink",
      description: "Tampilan pink yang lembut dan feminin",
      icon: Heart,
    },
    {
      value: "system",
      label: "Ikuti Sistem",
      description: "Menyesuaikan dengan pengaturan perangkat",
      icon: Monitor,
    },
  ];

  if (!mounted) {
    return null;
  }

  return (
    <FinanceSidebar>
      <div className="p-6 space-y-8 font-[family-name:var(--font-poppins)]">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
                  Pengaturan Finance
                </h1>
                <p className="text-[#889063] dark:text-gray-300 text-lg transition-colors duration-300">
                  Konfigurasi tampilan dan preferensi sistem
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Theme Settings */}
        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 border border-[#324D3E]/10 dark:border-gray-700 shadow-xl transition-colors duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#324D3E] dark:text-white mb-2 transition-colors duration-300">
              Tampilan
            </h2>
            <p className="text-[#889063] dark:text-gray-300 transition-colors duration-300">
              Pilih tema tampilan yang sesuai dengan preferensi Anda
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {themeOptions.map((option) => {
              const isActive = theme === option.value;
              const IconComponent = option.icon;
              
              return (
                <motion.button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`
                    relative p-6 rounded-2xl border-2 transition-all duration-300 text-left
                    ${
                      isActive
                        ? "border-[#324D3E] dark:border-white bg-[#324D3E]/5 dark:bg-gray-700/50"
                        : "border-[#324D3E]/20 dark:border-gray-600 hover:border-[#324D3E]/50 dark:hover:border-gray-500 hover:bg-[#324D3E]/5 dark:hover:bg-gray-700/30"
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className={`
                        p-3 rounded-xl transition-colors duration-300
                        ${
                          isActive
                            ? "bg-[#324D3E] dark:bg-white text-white dark:text-[#324D3E]"
                            : "bg-[#324D3E]/10 dark:bg-gray-600 text-[#324D3E] dark:text-gray-300"
                        }
                      `}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`
                          font-semibold transition-colors duration-300
                          ${
                            isActive
                              ? "text-[#324D3E] dark:text-white"
                              : "text-[#324D3E] dark:text-gray-200"
                          }
                        `}
                      >
                        {option.label}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-[#889063] dark:text-gray-400 transition-colors duration-300">
                    {option.description}
                  </p>
                  
                  {isActive && (
                    <motion.div
                      className="absolute top-4 right-4 w-3 h-3 bg-[#324D3E] dark:bg-white rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Current Theme Display */}
        <motion.div
          className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-lg rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#324D3E] dark:text-white mb-1 transition-colors duration-300">
                Tema Aktif
              </h3>
              <p className="text-[#889063] dark:text-gray-300 transition-colors duration-300">
                {themeOptions.find(option => option.value === theme)?.label || "Tidak diketahui"}
              </p>
            </div>
            <div className="p-4 bg-[#324D3E]/10 dark:bg-gray-600/50 pink:bg-pink-100 rounded-2xl transition-colors duration-300">
              {theme === "dark" && <Moon className="h-6 w-6 text-[#324D3E] dark:text-gray-300 pink:text-pink-600" />}
              {theme === "light" && <Sun className="h-6 w-6 text-[#324D3E] dark:text-gray-300 pink:text-pink-600" />}
              {theme === "pink" && <Heart className="h-6 w-6 text-[#324D3E] dark:text-gray-300 pink:text-pink-600" />}
              {theme === "system" && <Monitor className="h-6 w-6 text-[#324D3E] dark:text-gray-300 pink:text-pink-600" />}
            </div>
          </div>
        </motion.div>
      </div>
    </FinanceSidebar>
  );
}