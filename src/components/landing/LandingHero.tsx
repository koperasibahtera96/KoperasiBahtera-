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

const slideInFromLeft = {
  hidden: { 
    opacity: 0, 
    x: -100,
    y: 50
  },
  visible: { 
    opacity: 1, 
    x: 0,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      duration: 0.8
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
      type: "spring",
      stiffness: 120,
      damping: 20,
      duration: 0.6
    }
  }
};

const scaleIn = {
  hidden: { 
    opacity: 0, 
    scale: 0.8
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 20,
      duration: 0.6
    }
  }
};

export default function LandingHero() {
  return (
    <motion.section 
      className="relative min-h-screen flex items-center justify-start w-full"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Background Image */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
        style={{
          backgroundImage: 'url(/landing/hero-bg.png)',
        }}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
      </motion.div>

      {/* Content */}
      <motion.div 
        className="relative z-10 ml-4 sm:ml-8 md:ml-16 lg:ml-24 max-w-4xl px-3 md:px-4 lg:px-6 text-left"
        variants={containerVariants}
      >
        <div>
          {/* Subtitle */}
          <motion.p 
            className="text-base sm:text-lg md:text-xl mb-3 sm:mb-4 italic font-medium text-[#4C3D19] block"
            variants={slideInFromLeft}
          >
            Untuk Masa Depan
          </motion.p>

          {/* Main Title */}
          <motion.h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl max-w-[1052px] font-bold leading-tight mb-4 sm:mb-6 font-[family-name:var(--font-poppins)]"
            variants={containerVariants}
          >
            <motion.span 
              className="block text-[#4C3D19]"
              variants={slideInFromLeft}
              whileHover={{ 
                scale: 1.05,
                color: "#364D32",
                transition: { duration: 0.3 }
              }}
            >
              Investasi Pertanian
            </motion.span>
            <motion.span 
              className="block text-[#4C3D19]"
              variants={slideInFromLeft}
              whileHover={{ 
                scale: 1.05,
                color: "#364D32",
                transition: { duration: 0.3 }
              }}
            >
              Berkelanjutan yang Mudah
            </motion.span>
          </motion.h1>

          {/* Description */}
          <motion.p 
            className="text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed mb-6 sm:mb-8 max-w-[50rem] text-[#4C3D19]"
            variants={fadeInUp}
          >
            Solusi tepat bagi Anda yang ingin meraih keuntungan sekaligus memberikan dampak positif
            bagi lingkungan dan masyarakat. Melalui sistem investasi yang sederhana dan transparan,
            Anda dapat ikut mendukung petani lokal untuk meningkatkan hasil panen.
          </motion.p>

          {/* CTA Button */}
          <motion.button 
            className="bg-gradient-to-r from-[#364D32] to-[#889063] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 shadow-lg"
            variants={scaleIn}
            onClick={() => {
              const investasiSection = document.getElementById('investasi');
              if (investasiSection) {
                investasiSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 10px 25px rgba(54, 77, 50, 0.3)",
              y: -2
            }}
            whileTap={{ scale: 0.95 }}
          >
            Mulai Investasi
          </motion.button>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-700 cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
        onClick={() => {
          const investasiSection = document.getElementById('investasi');
          if (investasiSection) {
            investasiSection.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      >
        <motion.div 
          className="flex flex-col items-center"
          animate={{ 
            y: [0, -10, 0],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          whileHover={{ scale: 1.1 }}
        >
          <motion.svg 
            className="w-6 h-6 mb-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            animate={{ 
              rotate: [0, 5, -5, 0],
              transition: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </motion.svg>
          <span className="text-sm text-[#324D3E] font-bold">Selengkapnya</span>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}