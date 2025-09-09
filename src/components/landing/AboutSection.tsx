'use client';

import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2
    }
  }
};

const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 60
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
      duration: 0.8
    }
  }
};

const slideInFromLeft = {
  hidden: { 
    opacity: 0, 
    x: -100
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
      duration: 0.8
    }
  }
};

const slideInFromRight = {
  hidden: { 
    opacity: 0, 
    x: 100
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
      duration: 0.8
    }
  }
};

export default function AboutSection() {
  return (
    <motion.section
      className="bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: 'url(/landing/tentang-kami.webp)',
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
              transition: { duration: 0.3 }
            }}
          >
            Tentang Kami
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
                  transition: { duration: 0.2 }
                }}
              >
                Koperasi Bintang Merah Sejahtera (BAHTERA)
              </motion.span> merupakan badan hukum koperasi tersertifikasi yang
              didirikan atas semangat gotong royong dan prinsip kekeluargaan. Hadir sebagai wadah pemberdayaan
              ekonomi yang inklusif, profesional dan berkelanjutan.
            </motion.p>

            <motion.p 
              className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl leading-relaxed text-gray-900 mb-12 sm:mb-18 md:mb-24 lg:mb-32 xl:mb-36 font-medium"
              variants={fadeInUp}
            >
              Sebagian upaya pelestarian lingkungan yang selaras dengan peningkatan kesejahteraan masyarakat, kami
              menginisiasi program penghijauan berbasis tanaman multi-komoditas di kawasan Hutan Produksi Tetap
              (HPT) dan Hutan Produksi (HP). Program ini bertujuan untuk pemulihan lahan, meningkatkan produktifitas
              hutan, serta mengoptimalkan potensi ekonomi kawasan melalui pendekatan agroforestri berkelanjutan.
            </motion.p>
          </motion.div>

          {/* Vision and Mission */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12"
            variants={containerVariants}
          >
            {/* Vision */}
            <motion.div 
              className="relative"
              variants={slideInFromLeft}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.3 }
              }}
            >
              <motion.h3 
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2D3B30] mb-3 sm:mb-4 lg:mb-6 font-[family-name:var(--font-poppins)] drop-shadow-sm"
                whileHover={{ 
                  color: "#1F2937",
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                Visi
              </motion.h3>
              <motion.p 
                className="text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed text-gray-900 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                Menjadi pemimpin dalam industri investasi pertanian dengan mendorong praktik berkelanjutan dan menghadirkan hasil terbaik bagi para investor.
              </motion.p>
            </motion.div>

            {/* Mission */}
            <motion.div 
              className="relative"
              variants={slideInFromRight}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.3 }
              }}
            >
              <motion.h3 
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2D3B30] mb-3 sm:mb-4 lg:mb-6 font-[family-name:var(--font-poppins)] drop-shadow-sm"
                whileHover={{ 
                  color: "#1F2937",
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                Misi
              </motion.h3>
              <motion.p 
                className="text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed text-gray-900 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                Menyediakan peluang investasi unggulan di sektor pertanian melalui seleksi proyek yang ketat, pengelolaan profesional, dan solusi inovatif.
              </motion.p>

              {/* Vertical divider line */}
              <motion.div 
                className="hidden md:block absolute -left-3 lg:-left-6 top-0 bottom-0 w-px bg-gray-800"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Bottom 25% height for image visibility */}
        <div className="h-1/4"></div>
      </motion.div>
    </motion.section>
  );
}