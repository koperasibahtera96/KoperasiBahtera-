import { ContactSection, Footer } from '@/components/landing/ContactFooter';
import { HeroCarousel } from '@/components/landing/HeroCarousel';
import { InvestmentPlans } from '@/components/landing/InvestmentPlans';
import { PlantDetail } from '@/components/landing/PlantDetail';
import { PlantShowcase } from '@/components/landing/PlantShowcase';
import { Navbar } from '@/components/layout/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroCarousel />
        <PlantDetail />
        {/* <AboutSection /> */}
        <PlantShowcase />
        <InvestmentPlans />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
