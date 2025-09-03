"use client";

import { AnimatePresence, motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navVariants: any = {
  hidden: {
    y: -100,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      duration: 0.8,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: any = {
  hidden: {
    y: -20,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15,
    },
  },
};

const logoVariants: any = {
  hidden: {
    scale: 0,
    rotate: -180,
  },
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

interface LandingNavbarProps {
  hideNavigation?: boolean;
}

export default function LandingNavbar({
  hideNavigation = false,
}: LandingNavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: session, status, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-menu")) {
        setShowUserMenu(false);
      }
      if (!target.closest(".mobile-menu")) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle hash navigation when component mounts
  useEffect(() => {
    const handleHashNavigation = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash.replace("#", "");
        if (hash) {
          setTimeout(() => {
            const section = document.getElementById(hash);
            if (section) {
              section.scrollIntoView({ behavior: "smooth" });
            }
          }, 100); // Small delay to ensure DOM is ready
        }
      }
    };

    // Handle on mount
    handleHashNavigation();

    // Handle hash changes
    window.addEventListener("hashchange", handleHashNavigation);

    return () => {
      window.removeEventListener("hashchange", handleHashNavigation);
    };
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  const handleRefreshStatus = async () => {
    if (!session?.user || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const response = await fetch("/api/user/refresh-session", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          await update({
            ...session,
            user: {
              ...session.user,
              ...data.user,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error refreshing status:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNavigationClick = (item: string) => {
    const sectionId = item.toLowerCase().replace(" ", "-");

    // Check if we're on the home page
    if (typeof window !== "undefined") {
      const isHomePage =
        window.location.pathname === "/" || window.location.pathname === "";

      if (isHomePage) {
        // We're on the home page, just scroll to the section
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        // We're on a different page, navigate to home with hash
        router.push(`/#${sectionId}`);
      }
    }
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 w-full bg-white/95 backdrop-blur-sm px-4 sm:px-6 lg:px-10 py-3 shadow-sm z-50 transition-all duration-300"
      initial="hidden"
      animate="visible"
      variants={navVariants}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="flex items-center justify-between"
          variants={navVariants}
        >
          {/* Logo */}
          <motion.div
            className="flex items-center"
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
              width={50}
              height={50}
              className="rounded-full transition-all duration-300"
            />
          </motion.div>

          {/* Navigation - Always visible when hideNavigation is false */}
          {!hideNavigation && (
            <motion.div
              className="hidden md:flex items-center space-x-8 transition-all duration-300"
              variants={navVariants}
            >
              {[
                "Beranda",
                "Produk",
                "Tentang Kami",
                "Review",
                "Investasi",
                "FAQ",
              ].map((item) => (
                <motion.button
                  key={item}
                  onClick={() => handleNavigationClick(item)}
                  className="text-gray-700 transition-colors font-medium px-3 py-1 rounded-full hover:bg-[#324D3E] hover:text-white cursor-pointer"
                  variants={itemVariants}
                  whileHover={{
                    scale: 1.05,
                    backgroundColor: "#324D3E",
                    color: "#ffffff",
                    transition: { duration: 0.2 },
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item}
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Auth Buttons / User Menu */}
          <motion.div
            className="hidden sm:flex items-center space-x-1 md:space-x-2 lg:space-x-4"
            variants={navVariants}
          >
            {status === "loading" ? (
              <motion.div
                className="w-10 h-10 bg-gray-200 rounded-full"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ) : session?.user ? (
              <motion.div
                className="flex items-center space-x-1 md:space-x-2 lg:space-x-3"
                variants={itemVariants}
              >
                {/* Show buttons only if user can purchase and navigation is not hidden */}
                {!hideNavigation && session.user.canPurchase ? (
                  <>
                    {/* Investasi Saya Button */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        href="/investasi"
                        className="px-3 py-1 text-gray-700 transition-all duration-300 font-medium rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white whitespace-nowrap"
                      >
                        Investasi Saya
                      </Link>
                    </motion.div>

                    {/* Cicilan Saya Button */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        href="/cicilan"
                        className="px-3 py-1 text-gray-700 transition-all duration-300 font-medium rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white whitespace-nowrap"
                      >
                        Cicilan Saya
                      </Link>
                    </motion.div>
                  </>
                ) : !hideNavigation ? (
                  /* Verification Status Badge with Refresh */
                  <motion.div
                    className="flex items-center gap-1 md:gap-2 px-2 md:px-3 lg:px-4 py-1 bg-yellow-50 border border-yellow-200 rounded-full text-xs md:text-sm font-medium text-yellow-700"
                    whileHover={{ scale: 1.05 }}
                  >
                    <span>
                      {session.user.verificationStatus === "pending"
                        ? "⏳ Menunggu Verifikasi"
                        : session.user.verificationStatus === "rejected"
                        ? "❌ Verifikasi Ditolak"
                        : "⏳ Belum Diverifikasi"}
                    </span>
                    <motion.button
                      onClick={handleRefreshStatus}
                      disabled={isRefreshing}
                      className="ml-1 p-1 hover:bg-yellow-100 rounded-full transition-colors disabled:opacity-50"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Periksa Status Terbaru"
                    >
                      {isRefreshing ? (
                        <div className="w-3 h-3 border border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg
                          className="w-3 h-3 text-yellow-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      )}
                    </motion.button>
                  </motion.div>
                ) : null}

                {/* User Avatar with Dropdown */}
                <div className="relative user-menu">
                  <motion.button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {(session.user as any).profileImageUrl ? (
                      <motion.div
                        className="w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden border-2 border-[#324D3E]"
                        whileHover={{
                          borderColor: "#4C3D19",
                          rotate: 5,
                        }}
                        transition={{ duration: 0.6 }}
                      >
                        <Image
                          width={40}
                          height={40}
                          src={(session.user as any).profileImageUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        className="w-8 h-8 lg:w-10 lg:h-10 bg-[#324D3E] rounded-full flex items-center justify-center text-white font-bold text-sm lg:text-base"
                        whileHover={{
                          backgroundColor: "#4C3D19",
                          rotate: 360,
                        }}
                        transition={{ duration: 0.6 }}
                      >
                        {session.user.name?.charAt(0).toUpperCase() ||
                          (session.user as any).fullName
                            ?.charAt(0)
                            .toUpperCase() ||
                          "U"}
                      </motion.div>
                    )}
                    <span className="text-gray-700 font-medium text-xs md:text-sm lg:text-base hidden md:inline">
                      Hello, {session.user.name?.split(" ")[0] || "User"}
                    </span>
                    <motion.svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      animate={{
                        rotate: showUserMenu ? 180 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </motion.svg>
                  </motion.button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50"
                        initial={{
                          opacity: 0,
                          scale: 0.95,
                          y: -10,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.95,
                          y: -10,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Profile */}
                        <Link href="/profile">
                          <motion.div
                            className="w-full px-4 py-2 text-left text-gray-700 font-medium cursor-pointer"
                            whileHover={{
                              backgroundColor: "rgba(249, 250, 251, 1)", // highlight
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowUserMenu(false)}
                          >
                            <motion.div
                              className="flex items-center space-x-2"
                              whileHover={{ x: 5 }} // nudge effect
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              <span>Profile</span>
                            </motion.div>
                          </motion.div>
                        </Link>

                        {/* Logout */}
                        <motion.button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-red-600 font-medium"
                          whileHover={{
                            backgroundColor: "rgba(254, 242, 242, 1)", // highlight
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <motion.div
                            className="flex items-center space-x-2"
                            whileHover={{ x: 5 }} // nudge effect
                          >
                            <svg
                              className="w-4 h-4"
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
                            <span>Logout</span>
                          </motion.div>
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : !hideNavigation ? (
              <motion.div
                className="flex items-center space-x-1 md:space-x-2 lg:space-x-4"
                variants={itemVariants}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/login"
                    className="px-3 py-1 text-gray-700 transition-all duration-300 font-medium rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white whitespace-nowrap"
                  >
                    Masuk
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/register"
                    className="px-3 py-1 bg-[#324D3E] text-white font-medium rounded-full transition-colors hover:bg-[#4C3D19] whitespace-nowrap"
                  >
                    Daftar Sekarang
                  </Link>
                </motion.div>
              </motion.div>
            ) : null}
          </motion.div>

          {/* Mobile menu - Only show for logged in users */}
          {session?.user && (
            <div className="sm:hidden relative mobile-menu">
              <motion.button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-gray-700"
                variants={itemVariants}
                whileHover={{
                  scale: 1.1,
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                  borderRadius: "50%",
                }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{
                    rotate: showMobileMenu ? 90 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </motion.svg>
              </motion.button>

              {/* Mobile Dropdown Menu */}
              <AnimatePresence>
                {showMobileMenu && (
                  <motion.div
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 py-3 z-50"
                    initial={{
                      opacity: 0,
                      scale: 0.95,
                      y: -10,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.95,
                      y: -10,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        {(session.user as any).profileImageUrl ? (
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#324D3E]">
                            <Image
                              src={(session.user as any).profileImageUrl}
                              alt="Profile"
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-[#324D3E] rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {session.user.name?.charAt(0).toUpperCase() ||
                              (session.user as any).fullName
                                ?.charAt(0)
                                .toUpperCase() ||
                              "U"}
                          </div>
                        )}
                        <div>
                          <p className="text-gray-900 font-medium text-sm">
                            Hello, {session.user.name?.split(" ")[0] || "User"}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {session.user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {/* Profile Link */}
                      <Link href="/profile">
                        <motion.div
                          className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                          whileHover={{
                            backgroundColor: "rgba(249, 250, 251, 1)",
                            x: 5,
                          }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowMobileMenu(false)}
                        >
                          <div className="flex items-center space-x-3">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            <span>Profile</span>
                          </div>
                        </motion.div>
                      </Link>

                      {/* Conditional Menu Items for Verified Users */}
                      {session.user.canPurchase && (
                        <>
                          <Link href="/investasi">
                            <motion.div
                              className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                              whileHover={{
                                backgroundColor: "rgba(249, 250, 251, 1)",
                                x: 5,
                              }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setShowMobileMenu(false)}
                            >
                              <div className="flex items-center space-x-3">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                  />
                                </svg>
                                <span>Investasi Saya</span>
                              </div>
                            </motion.div>
                          </Link>

                          <Link href="/cicilan">
                            <motion.div
                              className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                              whileHover={{
                                backgroundColor: "rgba(249, 250, 251, 1)",
                                x: 5,
                              }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setShowMobileMenu(false)}
                            >
                              <div className="flex items-center space-x-3">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                  />
                                </svg>
                                <span>Cicilan Saya</span>
                              </div>
                            </motion.div>
                          </Link>
                        </>
                      )}

                      {/* Logout Button */}
                      <motion.button
                        onClick={() => {
                          setShowMobileMenu(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors font-medium"
                        whileHover={{
                          backgroundColor: "rgba(254, 242, 242, 1)",
                          x: 5,
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center space-x-3">
                          <svg
                            className="w-5 h-5"
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
                          <span>Logout</span>
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Mobile auth buttons for non-logged in users */}
          {!session?.user && (
            <div className="sm:hidden flex items-center space-x-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/login"
                  className="px-3 py-1 text-gray-700 transition-all duration-300 font-medium rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white text-sm"
                >
                  Masuk
                </Link>
              </motion.div>
              <motion.div
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1)",
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/register"
                  className="px-3 py-1 bg-[#324D3E] text-white font-medium rounded-full transition-colors hover:bg-[#4C3D19] text-sm"
                >
                  Daftar
                </Link>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.nav>
  );
}
