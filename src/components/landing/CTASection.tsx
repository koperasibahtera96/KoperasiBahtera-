'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';


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
    x: -100
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
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
      damping: 15
    }
  }
};

const pulseAnimation = {
  animate: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
};

interface CTASectionProps {
  className?: string;
}

export default function CTASection({ className = '' }: CTASectionProps) {
  const router = useRouter()
  return (
    <motion.section 
      className={`py-8 sm:py-10 lg:py-12 px-4 sm:px-6 bg-[#E5D7C4] ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8"
          variants={containerVariants}
        >
          {/* Left side with icon and text */}
          <motion.div 
            className="flex items-center space-x-3 sm:space-x-4 text-center lg:text-left"
            variants={slideInFromLeft}
          >
            {/* Light bulb icon */}
            <motion.div 
              className="flex-shrink-0"
              {...pulseAnimation}
              whileHover={{ 
                rotate: [0, -10, 10, -10, 0],
                transition: { duration: 0.5 }
              }}
            >
              <Image
                src="/landing/light.webp"
                alt="Light bulb"
                width={50}
                height={50}
                className="object-contain sm:w-[60px] sm:h-[60px]"
                loading="lazy"
              />
            </motion.div>

            {/* Text content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <motion.h3 
                className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-[#4C3D19] mb-1 sm:mb-2 md:mb-3 font-[family-name:var(--font-poppins)]"
                whileHover={{ 
                  scale: 1.02,
                  color: "#364D32",
                  transition: { duration: 0.3 }
                }}
              >
                Investasi Hijau, Hijaukan Bumi Sejahterakan Hati
              </motion.h3>
              <motion.p 
                className="text-gray-600 text-sm sm:text-base md:text-lg lg:text-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                Bersama membangun masa depan hijau dan berkontribusi pada kelestarian lingkungan
              </motion.p>
            </motion.div>
          </motion.div>

          {/* Right side with CTA button */}
          <motion.div 
            className="flex-shrink-0 w-full lg:w-auto"
            variants={slideInFromRight}
          >
            <motion.button 
              className="w-full lg:w-auto bg-[#4C3D19] text-white px-8 sm:px-10 md:px-11 lg:px-12 py-4 sm:py-5 md:py-5.5 lg:py-6 rounded-full text-base sm:text-lg md:text-xl lg:text-2xl font-semibold hover:bg-[#344C3D] transition-colors shadow-lg font-[family-name:var(--font-poppins)] lg:min-w-[280px]"
              onClick={() => {
                const investasiSection = document.getElementById('produk');
                if (investasiSection) {
                  investasiSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 10px 25px rgba(76, 61, 25, 0.3)",
                y: -3
              }}
              whileTap={{ scale: 0.95 }}
              animate={{
                boxShadow: [
                  "0 4px 15px rgba(76, 61, 25, 0.2)",
                  "0 8px 25px rgba(76, 61, 25, 0.3)",
                  "0 4px 15px rgba(76, 61, 25, 0.2)"
                ],
                transition: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut" as const
                }
              }}
            >
              Gabung Sekarang
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}