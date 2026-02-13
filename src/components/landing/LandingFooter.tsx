'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { EnhancedLegalModal } from '@/components/ui/enhanced-legal-modal';
import { KebijakanPrivasiContent } from '@/components/legal/kebijakan-privasi';
import { SyaratDanKetentuanContent } from '@/components/legal/syarat-dan-ketentuan';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

const itemVariants: any = {
  hidden: { 
    opacity: 0, 
    y: 30
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      duration: 0.6
    }
  }
};

export default function LandingFooter() {
  const { t } = useLanguage();

  const footerLinks = [
    {
      key: 'footer.links.privacy',
      content: <KebijakanPrivasiContent />
    },
    {
      key: 'footer.links.conditions',
      content: <SyaratDanKetentuanContent />
    }
  ];

  return (
    <motion.footer 
      className="bg-[#2D3B30] text-white py-12 sm:py-16 md:py-18 px-4 sm:px-6"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <div className="max-w-[1400px] mx-auto">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8 md:gap-10 lg:gap-20"
          variants={containerVariants}
        >
          {/* Company Info */}
          <motion.div 
            variants={itemVariants as any}
          >
            <motion.div 
              className="flex items-start gap-4 mb-4"
              whileHover={{ scale: 1.02 }}
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="flex-shrink-0"
              >
                <Image
                  src="/images/koperasi-logo.webp"
                  alt="Koperasi Logo"
                  width={60}
                  height={60}
                  className="rounded-full"
                />
              </motion.div>
              <div className="flex-1">
                <motion.h3 
                  className="text-lg md:text-xl lg:text-2xl font-bold font-[family-name:var(--font-poppins)] mb-1 leading-tight"
                  whileHover={{ color: "#E5D7C4" }}
                >
                  {t('footer.company.name')}
                </motion.h3>
                <p className="text-sm md:text-base text-gray-300">{t('footer.company.abbreviation')}</p>
              </div>
            </motion.div>
            <motion.p 
              className="text-sm md:text-base text-gray-300 leading-relaxed mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {t('footer.company.description')}
            </motion.p>
          </motion.div>

          {/* SPR Foundation Logo */}
          <motion.div
            variants={itemVariants}
            className="flex justify-center items-start -mt-12"
          >
            <div className="mt-0">
              <Image
                src="/landing/SPR_FOUNDATION_4.png"
                alt="SPR Foundation"
                width={250}
                height={250}
                className=""
              />
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            variants={itemVariants}
          >
            <motion.h4 
              className="text-lg font-bold mb-4 font-[family-name:var(--font-poppins)]"
              whileHover={{ color: "#E5D7C4" }}
            >
              {t('footer.contact.title')}
            </motion.h4>
            <motion.div 
              className="space-y-3 text-gray-300"
              variants={containerVariants}
            >
              <motion.div 
                className="flex items-start"
                variants={itemVariants}
                whileHover={{ x: 5 }}
              >
                <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <p className="text-sm">
                  {t('footer.contact.address')}
                </p>
              </motion.div>
              
              <motion.div 
                className="flex items-center"
                variants={itemVariants}
                whileHover={{ x: 5 }}
              >
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                <p className="text-sm">{t('footer.contact.phone')}</p>
              </motion.div>
              
              <motion.div 
                className="flex items-center"
                variants={itemVariants}
                whileHover={{ x: 5 }}
              >
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <p className="text-sm">{t('footer.contact.email')}</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Bottom Section */}
        <motion.div 
          className="border-t border-gray-600 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <motion.p 
            className="text-gray-400 text-sm mb-4 sm:mb-0"
            variants={itemVariants}
          >
            {t('footer.copyright')}
          </motion.p>
          <motion.div 
            className="flex space-x-6 text-sm text-gray-400"
            variants={containerVariants}
          >
            {footerLinks.map((link) => (
              <EnhancedLegalModal
                key={link.key}
                triggerText={t(link.key)}
                title={t(link.key)}
                viewOnly
                triggerElement={
                  <motion.button
                    type="button"
                    className="hover:text-white transition-colors"
                    variants={itemVariants}
                    whileHover={{ color: "#E5D7C4" }}
                  >
                    {t(link.key)}
                  </motion.button>
                }
              >
                {link.content}
              </EnhancedLegalModal>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.footer>
  );
}
