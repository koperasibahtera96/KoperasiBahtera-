'use client';

import { ContactSection, Footer } from '@/components/landing/ContactFooter';
import { HeroCarousel } from '@/components/landing/HeroCarousel';
import { InvestmentPlans } from '@/components/landing/InvestmentPlans';
import { InvestmentRules } from '@/components/landing/InvestmentRules';
import { AboutUs } from '@/components/landing/AboutUs';
import { PlantDetail } from '@/components/landing/PlantDetail';
import { PlantShowcase } from '@/components/landing/PlantShowcase';
import { Navbar } from '@/components/layout/Navbar';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const searchParams = useSearchParams();

    useEffect(() => {
    const orderId = searchParams.get('orderId');
    const paymentType = searchParams.get('paymentType');

    if (orderId) {
      if (paymentType === 'investment') {
        // Show investment success alert
        alert(`Pembayaran Investasi Berhasil!\n\nOrder ID: ${orderId}\nStatus: Berhasil\n\nTerima kasih atas investasi Anda!`);
      } else if (paymentType === 'registration') {
        // Show registration success alert
        alert(`Pendaftaran Berhasil!\n\nOrder ID: ${orderId}\nStatus: Berhasil\n\nSelamat datang! Akun Anda telah dibuat.`);
      } else {
        // Generic success alert for backward compatibility
        alert(`Pembayaran Berhasil!\n\nOrder ID: ${orderId}\nStatus: Berhasil\n\nTerima kasih!`);
      }

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('orderId');
      url.searchParams.delete('paymentType');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroCarousel />
        <PlantDetail />
        <PlantShowcase />
        <InvestmentPlans />
        <InvestmentRules />
        <AboutUs />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
