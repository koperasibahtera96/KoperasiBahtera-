"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0,
    },
  },
};

const slideInFromLeft: any = {
  hidden: {
    opacity: 0,
    x: -50,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "tween",
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

const fadeInUp: any = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "tween",
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

// const scaleIn: any = {
//   hidden: {
//     opacity: 0,
//     scale: 0.95,
//   },
//   visible: {
//     opacity: 1,
//     scale: 1,
//     transition: {
//       type: "tween",
//       duration: 0.2,
//       ease: "easeOut",
//     },
//   },
// };

export default function LandingHero() {
  const [_imageLoaded, setImageLoaded] = useState(false);
  const { t } = useLanguage();

  return (
    <motion.section
      className="relative h-screen flex items-center justify-start w-full light"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Background Image - Optimized with Next.js Image */}
      <div className="absolute inset-0">
        <Image
          src="/landing/hero-bg.webp"
          alt="Hero background - sustainable agriculture investment"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          onLoad={() => setImageLoaded(true)}
        />
        {/* White overlay to brighten the image */}
        <div className="absolute inset-0 bg-white opacity-50"></div>
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 ml-4 sm:ml-8 md:ml-12 lg:ml-16 xl:ml-24 max-w-[85%] px-3 md:px-5 lg:px-6 text-left"
        variants={containerVariants}
      >
        <div>
          {/* Subtitle */}
          <motion.p
            className="text-base sm:text-lg md:text-xl lg:text-2xl mb-3 sm:mb-4 md:mb-5 italic font-medium text-[#4C3D19] block"
            variants={slideInFromLeft}
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* Main Title */}
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-[85%] font-bold leading-tight mb-4 sm:mb-6 md:mb-7 font-[family-name:var(--font-poppins)]"
            variants={containerVariants}
          >
            <motion.span
              className="block text-[#4C3D19]"
              variants={slideInFromLeft}
              whileHover={{
                scale: 1.05,
                color: "#364D32",
                transition: { duration: 0.3 },
              }}
            >
              {t("hero.title.line1")}
            </motion.span>
            <motion.span
              className="block text-[#4C3D19]"
              variants={slideInFromLeft}
              whileHover={{
                scale: 1.05,
                color: "#364D32",
                transition: { duration: 0.3 },
              }}
            >
              {t("hero.title.line2")}
            </motion.span>
          </motion.h1>

          {/* Description */}
          <motion.p
            className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl leading-relaxed mb-6 sm:mb-8 md:mb-10 max-w-[50rem] text-[#4C3D19]"
            variants={fadeInUp}
          >
            {t("hero.description")}
          </motion.p>

          {/* CTA Button */}
          {/* <motion.button
            className="bg-gradient-to-r from-[#364D32] to-[#889063] text-white px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 rounded-full text-base sm:text-lg md:text-xl font-semibold hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 shadow-lg"
            variants={scaleIn}
            onClick={() => {
              const investasiSection = document.getElementById("investasi");
              if (investasiSection) {
                investasiSection.scrollIntoView({ behavior: "smooth" });
              }
            }}
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.1 },
            }}
            whileTap={{ scale: 0.98 }}
          >
            {t("hero.cta")}
          </motion.button> */}
        </div>
      </motion.div>

      {/* Scroll indicator - Simplified */}
      {/* <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-700 cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
        onClick={() => {
          const investasiSection = document.getElementById("investasi");
          if (investasiSection) {
            investasiSection.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        <motion.div
          className="flex flex-col items-center"
          animate={{
            y: [0, -5, 0],
            transition: {
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        >
          <svg
            className="w-6 h-6 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          <span className="text-sm text-[#324D3E] font-bold">
            {t("hero.scrollMore")}
          </span>
        </motion.div>
      </motion.div> */}
    </motion.section>
  );
}
