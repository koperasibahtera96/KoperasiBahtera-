"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

function PengurusAvatar({ name }: { name: string }) {
  const [errored, setErrored] = useState(false);

  // The images in public/pengurus use the exact name + extension
  const filename = `${name}.jpg`;
  const src = `/pengurus/${encodeURIComponent(filename)}`;

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Some photos need to be shifted up so we see the top of the subject.
  const shouldShiftUp = /Halim Perdana|Meidi Asri/.test(name);

  return (
    <div className="relative mb-3 sm:mb-4">
      <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 mx-auto rounded-full overflow-hidden flex items-center justify-center shadow-lg bg-gray-100">
        {!errored ? (
          <Image
            src={src}
            alt={name}
            width={112}
            height={112}
            className="w-full h-full"
            style={{
              objectFit: "cover",
              objectPosition: shouldShiftUp ? "50% 25%" : "50% 50%",
            }}
            onError={() => setErrored(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 text-white font-bold text-lg">
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2,
    },
  },
};

const fadeInUp = {
  hidden: {
    opacity: 0,
    y: 60,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
      duration: 0.8,
    },
  },
};

export default function AboutSection() {
  const { t } = useLanguage();

  return (
    <motion.section
      className="bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: "url(/landing/tentang-kami.webp)",
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <motion.div
        className="relative z-10 flex flex-col h-full"
        variants={containerVariants}
      >
        {/* Top 75% height with white transparent background for text */}
        <motion.div
          className="h-3/4 bg-white/75 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Section Title */}
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-center text-[#2D3B30] mb-6 sm:mb-8 md:mb-10 lg:mb-12 font-[family-name:var(--font-poppins)] drop-shadow-sm"
            variants={fadeInUp}
            whileHover={{
              scale: 1.05,
              color: "#1F2937",
              transition: { duration: 0.3 },
            }}
          >
            {t('about.title')}
          </motion.h2>

          {/* Main content */}
          <motion.div
            className="mb-6 sm:mb-8 md:mb-10 lg:mb-12"
            variants={containerVariants}
          >
            <motion.p
              className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl leading-relaxed text-gray-900 mb-4 sm:mb-6 md:mb-7 font-medium"
              variants={fadeInUp}
            >
              <motion.span
                className="font-bold text-[#2D3B30]"
                whileHover={{
                  color: "#1F2937",
                  transition: { duration: 0.2 },
                }}
              >
                {t('about.companyName')}
              </motion.span>{" "}
              {t('about.description1')}
            </motion.p>

            <motion.p
              className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl leading-relaxed text-gray-900 mb-12 sm:mb-18 md:mb-24 lg:mb-32 xl:mb-36 font-medium"
              variants={fadeInUp}
            >
              {t('about.description2')}
            </motion.p>
          </motion.div>

          {/* Management Team Section */}
          <motion.div
            className="mb-8 sm:mb-12 md:mb-16"
            variants={containerVariants}
          >
            <motion.h3
              className="text-3xl sm:text-3xl lg:text-4xl font-black text-center text-[#2D3B30] mb-6 sm:mb-8 font-[family-name:var(--font-poppins)] drop-shadow-sm"
              variants={fadeInUp}
              whileHover={{
                scale: 1.05,
                color: "#1F2937",
                transition: { duration: 0.3 },
              }}
            >
              {t('about.managementTitle')}
            </motion.h3>

            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 max-w-5xl mx-auto"
              variants={containerVariants}
            >
              {/* Ketua Koperasi */}
              <motion.div
                className="flex flex-col items-center"
                variants={fadeInUp}
                whileHover={{
                  scale: 1.05,
                  transition: { duration: 0.3 },
                }}
              >
                <PengurusAvatar name="Halim Perdana Kusuma, S.H., M.H." />
                <h4 className="text-xs sm:text-sm lg:text-base font-bold text-[#2D3B30] mb-1 whitespace-nowrap">
                  Halim Perdana Kusuma, S.H., M.H.
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 font-medium">
                  {t('about.roles.chairman')}
                </p>
              </motion.div>

              {/* Sekretaris */}
              <motion.div
                className="flex flex-col items-center"
                variants={fadeInUp}
                whileHover={{
                  scale: 1.05,
                  transition: { duration: 0.3 },
                }}
              >
                <PengurusAvatar name="Meidi Asri, S.H., M.H." />
                <h4 className="text-xs sm:text-sm lg:text-base font-bold text-[#2D3B30] mb-1 whitespace-nowrap">
                  Meidi Asri, S.H., M.H.
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 font-medium">
                  {t('about.roles.secretary')}
                </p>
              </motion.div>

              {/* Bendahara */}
              <motion.div
                className="flex flex-col items-center"
                variants={fadeInUp}
                whileHover={{
                  scale: 1.05,
                  transition: { duration: 0.3 },
                }}
              >
                <PengurusAvatar name="Rika Ariyanti, S.E." />
                <h4 className="text-xs sm:text-sm lg:text-base font-bold text-[#2D3B30] mb-1 whitespace-nowrap">
                  Rika Aryanti, S.E.
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 font-medium">
                  {t('about.roles.treasurer')}
                </p>
              </motion.div>

              {/* Direktur */}
              <motion.div
                className="flex flex-col items-center"
                variants={fadeInUp}
                whileHover={{
                  scale: 1.05,
                  transition: { duration: 0.3 },
                }}
              >
                <PengurusAvatar name="Bobot Sudoyo, S.P., M.Si." />
                <h4 className="text-xs sm:text-sm lg:text-base font-bold text-[#2D3B30] mb-1 whitespace-nowrap">
                  Bobot Sudoyo, S.P., M.Si.
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 font-medium">
                  {t('about.roles.director')}
                </p>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Vision and Mission */}
          <motion.div
            className="flex flex-col items-center text-center gap-8 sm:gap-12 md:gap-16"
            variants={containerVariants}
          >
            {/* Vision */}
            <motion.div
              className="relative max-w-4xl"
              variants={fadeInUp}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.3 },
              }}
            >
              <motion.h3
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2D3B30] mb-3 sm:mb-4 lg:mb-6 font-[family-name:var(--font-poppins)] drop-shadow-sm"
                whileHover={{
                  color: "#1F2937",
                  scale: 1.05,
                  transition: { duration: 0.2 },
                }}
              >
                {t('about.vision.title')}
              </motion.h3>
              <motion.p
                className="text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed text-gray-900 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                {t('about.vision.content')}
              </motion.p>
            </motion.div>

            {/* Mission */}
            <motion.div
              className="relative max-w-4xl"
              variants={fadeInUp}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.3 },
              }}
            >
              <motion.h3
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2D3B30] mb-3 sm:mb-4 lg:mb-6 font-[family-name:var(--font-poppins)] drop-shadow-sm"
                whileHover={{
                  color: "#1F2937",
                  scale: 1.05,
                  transition: { duration: 0.2 },
                }}
              >
                {t('about.mission.title')}
              </motion.h3>
              <motion.p
                className="text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed text-gray-900 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                {t('about.mission.content').split('\n').map((line, index) => (
                  <span key={index}>
                    {line}
                    {index < t('about.mission.content').split('\n').length - 1 && <br />}
                  </span>
                ))}
              </motion.p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Bottom 25% height for image visibility */}
        <div className="h-1/4"></div>
      </motion.div>
    </motion.section>
  );
}
