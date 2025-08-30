'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAlert } from '@/components/ui/Alert';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import WhyInvestAndRulesSection from '@/components/landing/WhyInvestAndRulesSection';
import CTASection from '@/components/landing/CTASection';
import AboutSection from '@/components/landing/AboutSection';
import PlantShowcaseSection from '@/components/landing/PlantShowcaseSection';
import FAQSection from '@/components/landing/FAQSection';
import LandingFooter from '@/components/landing/LandingFooter';

function LandingPageContent() {
  const searchParams = useSearchParams();
  const { showSuccess, showError, AlertComponent } = useAlert();

  useEffect(() => {
    const status = searchParams.get('status');
    const orderId = searchParams.get('orderId');

    if (status === 'success' && orderId) {
      showSuccess(
        'Pembayaran Berhasil!',
        `Terima kasih! Pembayaran investasi Anda telah berhasil diproses. Order ID: ${orderId}. Tim kami akan segera memproses investasi Anda.`
      );
      
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      url.searchParams.delete('orderId');
      window.history.replaceState({}, '', url.toString());
    } else if (status === 'error') {
      showError(
        'Pembayaran Gagal',
        'Maaf, terjadi kesalahan dalam proses pembayaran. Silakan coba lagi atau hubungi customer service kami.'
      );
      
      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, showSuccess, showError]);

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)]">
      <AlertComponent />
      <LandingHeader />
      <LandingHero />
      <WhyInvestAndRulesSection />
      <CTASection />
      <AboutSection />
      <PlantShowcaseSection />
      <FAQSection />
      <LandingFooter />
    </div>
  );
}

export default function LandingPage() {
  return <LandingPageContent />;
}