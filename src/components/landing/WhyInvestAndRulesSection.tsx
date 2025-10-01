"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

const benefitsData = [
  {
    titleKey: "benefits.financial.title",
    descriptionKey: "benefits.financial.description",
    icon: "/landing/Keuntungan Finansial.png",
  },
  {
    titleKey: "benefits.longterm.title",
    descriptionKey: "benefits.longterm.description",
    icon: "/landing/Asset Jangka Panjang.png",
  },
  {
    titleKey: "benefits.environmental.title",
    descriptionKey: "benefits.environmental.description",
    icon: "/landing/Kontribusi Lingkungan.png",
  },
  {
    titleKey: "benefits.social.title",
    descriptionKey: "benefits.social.description",
    icon: "/landing/Dampak Sosial.png",
  },
  {
    titleKey: "benefits.legacy.title",
    descriptionKey: "benefits.legacy.description",
    icon: "/landing/Warisan Masa Depan.png",
  },
];

const rulesData = [
  {
    titleKey: "rules.package.title",
    descriptionKey: "rules.package.description",
  },
  {
    titleKey: "rules.duration.title",
    descriptionKey: "rules.duration.description",
  },
  {
    titleKey: "rules.profit.title",
    descriptionKey: "rules.profit.description",
  },
  {
    titleKey: "rules.transparency.title",
    descriptionKey: "rules.transparency.description",
  },
  {
    titleKey: "rules.risk.title",
    descriptionKey: "rules.risk.description",
  },
];

// Animation variants
const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const cardVariants: any = {
  hidden: {
    opacity: 0,
    y: 50,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      duration: 0.6,
    },
  },
};

const titleVariants: any = {
  hidden: {
    opacity: 0,
    y: -30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 20,
      duration: 0.8,
    },
  },
};

const iconVariants: any = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -180,
  },
  visible: {
    opacity: 1,
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

export default function WhyInvestAndRulesSection() {
  const { t } = useLanguage();
  return (
    <motion.section
      className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 bg-cover bg-center bg-no-repeat -mt-1"
      style={{
        backgroundImage: "url(/landing/kenapa-perlu-investasi-bg_2.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <div className="max-w-7xl mx-auto">
        {/* Why Invest Section */}
        <motion.div
          className="mb-8 sm:mb-12 lg:mb-16"
          variants={containerVariants}
        >
          {/* Section Title */}
          <motion.h2
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center text-[#4C3D19] mb-6 sm:mb-8 md:mb-10 lg:mb-12 font-[family-name:var(--font-poppins)]"
            variants={titleVariants}
            whileHover={{
              scale: 1.05,
              color: "#364D32",
              transition: { duration: 0.3 },
            }}
          >
            {t("benefits.title")}
          </motion.h2>

          {/* Benefits Grid - First Row (3 cards) */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-7 mb-6 sm:mb-8 md:mb-10"
            variants={containerVariants}
          >
            {benefitsData.slice(0, 3).map((benefit, index) => (
              <motion.div
                key={index}
                className="bg-[#FFFCE3] rounded-2xl p-4 sm:p-6 md:p-7 lg:p-8 shadow-sm"
                variants={cardVariants}
                whileHover={{
                  scale: 1.05,
                  y: -10,
                  boxShadow:
                    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  transition: { duration: 0.3 },
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center text-center">
                  <motion.div className="mb-3 sm:mb-4" variants={iconVariants}>
                    <motion.div
                      whileHover={{
                        rotate: 360,
                        transition: { duration: 0.6 },
                      }}
                    >
                      <Image
                        src={benefit.icon.replace(".png", ".webp")}
                        alt={t(benefit.titleKey)}
                        width={100}
                        height={100}
                        className="object-contain sm:w-[120px] sm:h-[120px]"
                        loading="lazy"
                      />
                    </motion.div>
                  </motion.div>
                  <motion.h3
                    className="text-lg sm:text-xl md:text-2xl font-bold text-[#4C3D19] mb-2 sm:mb-3 md:mb-4 font-[family-name:var(--font-poppins)]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    {t(benefit.titleKey)}
                  </motion.h3>
                  <motion.p
                    className="text-gray-600 text-xs sm:text-sm md:text-base leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    {t(benefit.descriptionKey)}
                  </motion.p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Benefits Grid - Second Row (2 cards centered) */}
          <motion.div
            className="flex justify-center"
            variants={containerVariants}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-5xl">
              {benefitsData.slice(3, 5).map((benefit, index) => (
                <motion.div
                  key={index + 3}
                  className="bg-[#FFFCE3] rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm"
                  variants={cardVariants}
                  whileHover={{
                    scale: 1.05,
                    y: -10,
                    boxShadow:
                      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    transition: { duration: 0.3 },
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      className="mb-3 sm:mb-4"
                      variants={iconVariants}
                    >
                      <motion.div
                        whileHover={{
                          rotate: 360,
                          transition: { duration: 0.6 },
                        }}
                      >
                        <Image
                          src={benefit.icon.replace(".png", ".webp")}
                          alt={t(benefit.titleKey)}
                          width={100}
                          height={100}
                          className="object-contain sm:w-[120px] sm:h-[120px]"
                          loading="lazy"
                        />
                      </motion.div>
                    </motion.div>
                    <motion.h3
                      className="text-lg sm:text-xl md:text-2xl font-bold text-[#4C3D19] mb-2 sm:mb-3 md:mb-4 font-[family-name:var(--font-poppins)]"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      {t(benefit.titleKey)}
                    </motion.h3>
                    <motion.p
                      className="text-gray-600 text-xs sm:text-sm md:text-base leading-relaxed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      {t(benefit.descriptionKey)}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Investment Rules Section */}
        <motion.div variants={containerVariants}>
          {/* Section Title */}
          <motion.h2
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center text-[#4C3D19] mb-6 sm:mb-8 md:mb-10 lg:mb-12 font-[family-name:var(--font-poppins)]"
            variants={titleVariants}
            whileHover={{
              scale: 1.05,
              color: "#364D32",
              transition: { duration: 0.3 },
            }}
          >
            {t("rules.title")}
          </motion.h2>

          {/* Rules Container */}
          <motion.div
            className="bg-[#FFFCE3] rounded-2xl p-4 sm:p-6 md:p-7 lg:p-8 shadow-sm"
            variants={cardVariants}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              transition: { duration: 0.3 },
            }}
          >
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 md:gap-7 lg:gap-8"
              variants={containerVariants}
            >
              {rulesData.map((rule, index) => (
                <motion.div
                  key={index}
                  className="text-center relative"
                  variants={cardVariants}
                  whileHover={{
                    scale: 1.05,
                    y: -5,
                    transition: { duration: 0.2 },
                  }}
                >
                  <motion.h3
                    className="text-base sm:text-lg md:text-xl font-bold text-[#4C3D19] mb-2 sm:mb-3 md:mb-3 lg:mb-4 font-[family-name:var(--font-poppins)]"
                    whileHover={{
                      color: "#364D32",
                      transition: { duration: 0.2 },
                    }}
                  >
                    {t(rule.titleKey)}
                  </motion.h3>
                  <motion.p
                    className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-sm leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 * index, duration: 0.5 }}
                  >
                    {t(rule.descriptionKey)}
                  </motion.p>
                  {/* Add vertical divider for all except last item */}
                  {index < rulesData.length - 1 && (
                    <motion.div
                      className="hidden lg:block absolute -right-4 top-0 bottom-0 w-px bg-gray-300"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
