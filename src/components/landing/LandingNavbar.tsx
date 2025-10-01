"use client";

import { AnimatePresence, motion } from "framer-motion";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { CameraSelfie, CameraSelfieRef } from "@/components/forms/CameraSelfie";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const cameraSelfieRef = useRef<CameraSelfieRef | null>(null);
  const [currentResubmission, setCurrentResubmission] = useState<any | null>(
    null
  );
  const [resubUserData, setResubUserData] = useState<any | null>(null);

  // Convert data URL to File object
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleCameraCapture = (imageDataUrl: string) => {
    const file = dataURLtoFile(imageDataUrl, `selfie_${Date.now()}.jpg`);
    setFaceFile(file);
    setResubmitMessage(t("resubmit.selfieTaken"));
  };
  const [uploading, setUploading] = useState(false);
  const [resubmitMessage, setResubmitMessage] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: session, status, update } = useSession();
  const { language, setLanguage, t } = useLanguage();

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

  // Fetch current user's latest resubmission
  useEffect(() => {
    const fetchResub = async () => {
      if (!session?.user) return;
      try {
        const res = await fetch("/api/user/resubmit-verification");
        if (!res.ok) return;
        const body = await res.json();
        // API returns { resubmission, user }
        setCurrentResubmission(body.data?.resubmission || null);
        setResubUserData(body.data?.user || null);
      } catch {
        // ignore the error
      }
    };
    fetchResub();
  }, [session?.user]);

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

  const handleRefreshStatus = useCallback(async () => {
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
  }, [session, isRefreshing, update]);

  // Prefer server-returned user data from the resubmit API when available
  const derivedVerificationStatus =
    resubUserData?.verificationStatus ??
    (session?.user as any)?.verificationStatus;
  const derivedVerificationNotes =
    resubUserData?.verificationNotes ??
    (session?.user as any)?.verificationNotes;
  const derivedCanPurchase =
    resubUserData?.canPurchase ?? (session?.user as any)?.canPurchase;

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
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 w-full bg-white/95 backdrop-blur-sm px-3 sm:px-4 lg:px-6 h-16 sm:h-20 lg:h-20 shadow-sm z-50 transition-all duration-300"
        initial="visible"
        animate="visible"
        variants={navVariants}
      >
        <div className="w-full h-full">
          <motion.div
            className="flex items-center justify-between w-full h-full"
            variants={navVariants}
          >
            {/* Logo and title */}
            <motion.div
              className="flex items-center space-x-2"
              variants={logoVariants}
            >
              <Image
                src="/images/koperasi-logo.webp"
                alt="Logo"
                width={64}
                height={64}
                className="rounded-full transition-all duration-300 w-12 h-12 lg:w-16 lg:h-16"
                onClick={() => router.push("/")}
              />
              {/* Header text shown on md+ including xl (desktop). Make font smaller on xl and truncate to avoid overflow when full navigation is visible */}
              <h1
                className="hidden sm:block text-gray-800 font-extrabold text-[14px] sm:text-[14.5px] md:text-[14px] lg:text-[16px] whitespace-nowrap"
                title="Koperasi BAHTERA"
              >
                Koperasi BAHTERA
              </h1>
            </motion.div>

            {/* Navigation - Only visible on very large screens when hideNavigation is false */}
            {!hideNavigation && (
              <motion.div
                className="hidden xl:flex items-center space-x-6 transition-all duration-300 justify-center"
                variants={navVariants}
              >
                {[
                  { key: "nav.beranda", id: "beranda" },
                  { key: "nav.program", id: "program" },
                  { key: "nav.produk", id: "produk" },
                  { key: "nav.review", id: "review" },
                  { key: "nav.tentangKami", id: "tentang-kami" },
                  { key: "nav.faq", id: "faq" },
                ].map((item) => (
                  <motion.button
                    key={item.key}
                    onClick={() => handleNavigationClick(item.id)}
                    className="text-gray-700 transition-colors font-medium px-2 md:px-2 lg:px-3 py-1 rounded-full hover:bg-[#324D3E] hover:text-white cursor-pointer text-sm md:text-sm lg:text-base whitespace-nowrap"
                    variants={itemVariants}
                    whileHover={{
                      scale: 1.05,
                      backgroundColor: "#324D3E",
                      color: "#ffffff",
                      transition: { duration: 0.2 },
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {t(item.key)}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Auth Buttons / User Menu */}
            <motion.div
              className="hidden sm:flex items-center space-x-1 md:space-x-1 lg:space-x-2 xl:space-x-4 justify-end"
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
                  {!hideNavigation && derivedCanPurchase ? (
                    <>
                      {/* Tanaman Saya Button */}
                      <motion.div>
                        <Link
                          href="/plants"
                          className="px-4 py-1.5 text-gray-700 transition-all duration-300 font-semibold rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white whitespace-nowrap text-sm"
                        >
                          {t("nav.tanamanSaya")}
                        </Link>
                      </motion.div>

                      {/* Pembayaran Saya Button */}
                      <motion.div>
                        <Link
                          href="/payments"
                          className="px-4 py-1.5 text-gray-700 transition-all duration-300 font-semibold rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white whitespace-nowrap text-sm"
                        >
                          {t("nav.pembayaran")}
                        </Link>
                      </motion.div>
                    </>
                  ) : !hideNavigation ? (
                    /* Verification Status Badge with Refresh */
                    <motion.div
                      className="flex items-center gap-1 md:gap-2 px-2 md:px-3 lg:px-4 py-1 bg-yellow-50 border border-yellow-200 rounded-full text-xs md:text-sm lg:text-base font-medium text-yellow-700"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span>
                        {derivedVerificationStatus === "pending"
                          ? t("status.pending")
                          : derivedVerificationStatus === "rejected"
                          ? t("status.rejected")
                          : t("status.notVerified")}
                      </span>
                      <motion.button
                        onClick={handleRefreshStatus}
                        disabled={isRefreshing}
                        className="ml-2 w-9 h-9 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 rounded-full shadow-md transition-colors disabled:opacity-60"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={t("status.refreshTitle")}
                      >
                        {isRefreshing ? (
                          <div className="w-4 h-4 border-2 border-yellow-700 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg
                            className="w-5 h-5 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20 12a8 8 0 10-4.906 7.341"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20 8v4h-4"
                            />
                          </svg>
                        )}
                      </motion.button>
                      {/* If rejected, show compact icon-only resubmit button (keeps width small) */}
                      {derivedVerificationStatus === "rejected" && (
                        <motion.button
                          onClick={() => {
                            setShowResubmitModal(true);
                            setResubmitMessage(null);
                          }}
                          className="ml-1 p-1 hover:bg-red-100 rounded-full transition-colors"
                          whileHover={{ scale: 1.05 }}
                          title={t("status.resubmitTitle")}
                          aria-label={t("status.resubmitTitle")}
                        >
                          {/* simple upload icon */}
                          <svg
                            className="w-3 h-3 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 3v12m0 0l-4-4m4 4 4-4M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"
                            />
                          </svg>
                        </motion.button>
                      )}
                    </motion.div>
                  ) : null}

                  {/* User Avatar with Dropdown */}
                  <div className="relative user-menu">
                    <motion.button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center space-x-2 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors overflow-hidden"
                    >
                      {(session.user as any).profileImageUrl ? (
                        <motion.div
                          className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#324D3E]"
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
                          className="w-10 h-10 bg-[#324D3E] rounded-full flex items-center justify-center text-white font-bold text-base"
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
                      <span className="text-gray-700 font-medium text-sm hidden md:inline max-w-[10rem] truncate">
                        {t("nav.hello")},{" "}
                        {session.user.name.length >= 5
                          ? `${session.user.name.slice(0, 5)}...`
                          : session.user.name}
                      </span>
                      <motion.svg
                        className="w-4 h-4 text-gray-500 flex-shrink-0"
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
                          {/* Language Switcher */}
                          <motion.div
                            className="w-full px-4 py-2 text-left text-gray-700 font-medium cursor-pointer"
                            whileHover={{
                              backgroundColor: "rgba(249, 250, 251, 1)", // highlight
                            }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <motion.div
                              className="flex items-center justify-between"
                              whileHover={{ x: 5 }} // nudge effect
                            >
                              <div className="flex items-center space-x-2">
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
                                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                                  />
                                </svg>
                              </div>
                              <div className="flex bg-gray-100 rounded-lg p-1">
                                <motion.button
                                  onClick={() => setLanguage("id")}
                                  className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                                    language === "id"
                                      ? "bg-white text-[#324D3E] shadow-sm"
                                      : "text-gray-600 hover:text-gray-800"
                                  }`}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  ID
                                </motion.button>
                                <motion.button
                                  onClick={() => setLanguage("en")}
                                  className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                                    language === "en"
                                      ? "bg-white text-[#324D3E] shadow-sm"
                                      : "text-gray-600 hover:text-gray-800"
                                  }`}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  EN
                                </motion.button>
                              </div>
                            </motion.div>
                          </motion.div>

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
                                <span>{t("nav.profile")}</span>
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
                              <span>{t("nav.logout")}</span>
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
                      {t("nav.masuk")}
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
                      {t("nav.daftar")}
                    </Link>
                  </motion.div>
                </motion.div>
              ) : null}
            </motion.div>

            {/* Mobile menu - Only show for logged in users */}
            {session?.user && (
              <div className="sm:hidden relative mobile-menu flex items-center space-x-2">
                {/* Mobile compact badge placed next to hamburger so it's always visible on small screens */}
                {!derivedCanPurchase && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded-full text-xs text-yellow-700">
                    <span>
                      {derivedVerificationStatus === "pending"
                        ? t("status.pendingShort")
                        : derivedVerificationStatus === "rejected"
                        ? t("status.rejectedShort")
                        : t("status.notVerifiedShort")}
                    </span>
                    <button
                      onClick={handleRefreshStatus}
                      disabled={isRefreshing}
                      className="ml-1 w-7 h-7 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 rounded-full shadow-md transition-colors disabled:opacity-60"
                      title={t("status.refreshTitle")}
                    >
                      {isRefreshing ? (
                        <div className="w-3 h-3 border-2 border-yellow-700 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg
                          className="w-4 h-4 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20 12a8 8 0 10-4.906 7.341"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20 8v4h-4"
                          />
                        </svg>
                      )}
                    </button>
                    {derivedVerificationStatus === "rejected" && (
                      <button
                        onClick={() => {
                          setShowResubmitModal(true);
                          setResubmitMessage(null);
                        }}
                        className="ml-1 p-1 hover:bg-red-100 rounded-full transition-colors"
                        title={t("status.resubmitTitle")}
                        aria-label={t("status.resubmitTitle")}
                      >
                        <svg
                          className="w-4 h-4 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 3v12m0 0l-4-4m4 4 4-4M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

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
                      // Force dropdown to appear below the navbar/hamburger by using explicit top positioning
                      className="absolute right-2 top-16 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 py-3 z-50"
                      initial={{
                        opacity: 0,
                        scale: 0.95,
                        y: -6,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.95,
                        y: -6,
                      }}
                      transition={{ duration: 0.18 }}
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
                              {t("nav.hello")},{" "}
                              {session.user.name?.split(" ")[0] || "User"}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {session.user.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {/* Language Switcher */}
                        <motion.div
                          className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors font-medium cursor-pointer border-b border-gray-100"
                          whileHover={{
                            backgroundColor: "rgba(249, 250, 251, 1)",
                            x: 5,
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
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
                                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                                />
                              </svg>
                            </div>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                              <motion.button
                                onClick={() => setLanguage("id")}
                                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                                  language === "id"
                                    ? "bg-white text-[#324D3E] shadow-sm"
                                    : "text-gray-600 hover:text-gray-800"
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                ID
                              </motion.button>
                              <motion.button
                                onClick={() => setLanguage("en")}
                                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                                  language === "en"
                                    ? "bg-white text-[#324D3E] shadow-sm"
                                    : "text-gray-600 hover:text-gray-800"
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                EN
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>

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
                              <span>{t("nav.profile")}</span>
                            </div>
                          </motion.div>
                        </Link>

                        {/* Conditional Menu Items for Verified Users */}
                        {derivedCanPurchase && (
                          <>
                            <Link href="/plants">
                              <motion.div
                                className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors font-medium cursor-pointer text-sm"
                                whileHover={{
                                  backgroundColor: "rgba(249, 250, 251, 1)",
                                  x: 5,
                                }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowMobileMenu(false)}
                              >
                                <div className="flex items-center space-x-3">
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
                                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                    />
                                  </svg>
                                  <span>{t("nav.tanamanSaya")}</span>
                                </div>
                              </motion.div>
                            </Link>

                            <Link href="/payments">
                              <motion.div
                                className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors font-medium cursor-pointer text-sm"
                                whileHover={{
                                  backgroundColor: "rgba(249, 250, 251, 1)",
                                  x: 5,
                                }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowMobileMenu(false)}
                              >
                                <div className="flex items-center space-x-3">
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
                                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                    />
                                  </svg>
                                  <span>{t("nav.pembayaran")}</span>
                                </div>
                              </motion.div>
                            </Link>
                          </>
                        )}

                        {/* Logout Button */}
                        {/* Resubmit entry for small screens when rejected */}
                        {derivedVerificationStatus === "rejected" && (
                          <motion.div
                            className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                            whileHover={{ x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setShowMobileMenu(false);
                              setShowResubmitModal(true);
                              setResubmitMessage(null);
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <svg
                                className="w-4 h-4 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 3v12m0 0l-4-4m4 4 4-4M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"
                                />
                              </svg>
                              <span>{t("status.resubmitTitle")}</span>
                            </div>
                          </motion.div>
                        )}
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
                            <span>{t("nav.logout")}</span>
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
                    className="px-2 md:px-3 py-1 text-gray-700 transition-all duration-300 font-medium rounded-full border border-[#324D3E] hover:border-[#4C3D19] hover:bg-[#4C3D19] hover:text-white text-xs md:text-sm"
                  >
                    {t("nav.masuk")}
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
                    className="px-2 md:px-3 py-1 bg-[#324D3E] text-white font-medium rounded-full transition-colors hover:bg-[#4C3D19] text-xs md:text-sm"
                  >
                    {t("nav.daftar")}
                  </Link>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.nav>
      {/* Modal rendered outside the nav to avoid layout constraints */}
      <AnimatePresence>
        {showResubmitModal && session?.user && (
          <motion.div
            // wrapper: fixed overlay; center on sm+ screens, but on small screens align to top so modal doesn't overflow viewport
            className="fixed inset-0 bg-black/60 z-[9999] p-4 sm:flex sm:items-center sm:justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              // On mobile: absolute near top-right (next to hamburger) but constrained height and scrollable; On sm+: centered modal
              className="absolute top-16 right-4 w-[92%] max-w-xs bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-2xl sm:static sm:mx-auto sm:w-full sm:max-w-2xl sm:p-6"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
            >
              {/* Make inner content scrollable and constrained so modal doesn't render below the screen */}
              <div className="max-h-[70vh] overflow-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("resubmit.title")}
                  </h3>
                  <button
                    onClick={() => {
                      cameraSelfieRef.current?.stopCamera();
                      setShowResubmitModal(false);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label={t("close")}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t("resubmit.description")}
                  </p>

                  {/* Show original admin rejection notes from user record, then resubmission-specific notes (if different) */}
                  {derivedVerificationNotes &&
                    derivedVerificationStatus === "rejected" && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-700">
                        <strong>{t("resubmit.rejectionNote")}</strong>
                        <p className="mt-1">{derivedVerificationNotes}</p>
                      </div>
                    )}

                  {currentResubmission?.status === "rejected" &&
                    currentResubmission.adminNotes &&
                    currentResubmission.adminNotes !==
                      derivedVerificationNotes && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-700">
                        <strong>{t("resubmit.rejectionNoteSecond")}</strong>
                        <p className="mt-1">
                          {currentResubmission.adminNotes ||
                            derivedVerificationNotes}
                        </p>
                      </div>
                    )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("resubmit.ktpLabel")}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setKtpFile(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("resubmit.selfieLabel")}
                    </label>
                    <div className="mt-2">
                      <CameraSelfie
                        ref={cameraSelfieRef}
                        onCapture={handleCameraCapture}
                      />

                      {/* selfie preview intentionally removed per UX request */}
                    </div>
                  </div>

                  {resubmitMessage && (
                    <div className="text-sm text-green-700">
                      {resubmitMessage}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        cameraSelfieRef.current?.stopCamera();
                        setShowResubmitModal(false);
                      }}
                      className="px-3 py-2 rounded-md border"
                    >
                      {t("resubmit.cancel")}
                    </button>
                    <button
                      onClick={async () => {
                        if (!ktpFile || !faceFile) {
                          setResubmitMessage(t("resubmit.uploadBothFiles"));
                          return;
                        }
                        setUploading(true);
                        setResubmitMessage(null);
                        try {
                          const upload = async (file: File) => {
                            const fd = new FormData();
                            fd.append("file", file);
                            const res = await fetch("/api/upload", {
                              method: "POST",
                              body: fd,
                            });
                            if (!res.ok) throw new Error("Upload gagal");
                            const j = await res.json();
                            return j.imageUrl;
                          };

                          const [ktpUrl, faceUrl] = await Promise.all([
                            upload(ktpFile),
                            upload(faceFile),
                          ]);

                          const res = await fetch(
                            "/api/user/resubmit-verification",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                ktpImageUrl: ktpUrl,
                                faceImageUrl: faceUrl,
                              }),
                            }
                          );

                          const body = await res.json();
                          if (!res.ok) {
                            throw new Error(
                              body?.error || "Gagal mengajukan ulang"
                            );
                          }

                          // server returns { resubmission, user }
                          setCurrentResubmission(
                            body.data?.resubmission || null
                          );
                          setResubUserData(body.data?.user || null);

                          setResubmitMessage(t("resubmit.success"));
                          // Stop camera, close modal, and prevent further resubmissions in UI until refresh
                          cameraSelfieRef.current?.stopCamera();
                          setShowResubmitModal(false);
                          // Refresh current resubmission from server so UI reflects pending state
                          try {
                            const refreshRes = await fetch(
                              "/api/user/resubmit-verification"
                            );
                            if (refreshRes.ok) {
                              const body = await refreshRes.json();
                              setCurrentResubmission(
                                body.data?.resubmission || null
                              );
                              setResubUserData(body.data?.user || null);
                            }
                          } catch {
                            // ignore
                          }
                          setKtpFile(null);
                          setFaceFile(null);
                          // Optionally refresh session user data
                          try {
                            await handleRefreshStatus();
                          } catch {}
                        } catch (err: any) {
                          console.error(err);
                          setResubmitMessage(
                            err?.message || t("resubmit.error")
                          );
                        } finally {
                          setUploading(false);
                        }
                      }}
                      disabled={uploading}
                      className="px-4 py-2 rounded-md bg-[#324D3E] text-white disabled:opacity-60"
                    >
                      {uploading
                        ? t("resubmit.uploading")
                        : t("resubmit.submit")}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
