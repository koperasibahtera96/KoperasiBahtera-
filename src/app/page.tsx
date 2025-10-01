"use client";

import AboutSection from "@/components/landing/AboutSection";
import CTASection from "@/components/landing/CTASection";
import FAQSection from "@/components/landing/FAQSection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import PlantShowcaseSection from "@/components/landing/PlantShowcaseSection";
import ReviewSection from "@/components/landing/ReviewSection";
import WhatsAppIcon from "@/components/landing/WhatsAppIcon";
import WhyInvestAndRulesSection from "@/components/landing/WhyInvestAndRulesSection";
import { useAlert } from "@/components/ui/Alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function LandingPageContent() {
  const searchParams = useSearchParams();
  const { showSuccess, showError, AlertComponent } = useAlert();
  const { t } = useLanguage();

  useEffect(() => {
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");

    if (status === "success" && orderId) {
      showSuccess(
        t("payment.success.title"),
        t("payment.success.message", { orderId })
      );

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("status");
      url.searchParams.delete("orderId");
      window.history.replaceState({}, "", url.toString());
    } else if (status === "error") {
      showError(t("payment.error.title"), t("payment.error.message"));

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("status");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, showSuccess, showError, t]);

  return (
    <>
      {/*  <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)]"> } */}
      <AlertComponent />
      <LandingHeader />
      <section id="beranda">
        <LandingHero />
      </section>
      <section id="program">
        <WhyInvestAndRulesSection />
      </section>
      <CTASection />
      <section id="produk">
        <PlantShowcaseSection />
      </section>
      {/* <section id="tentang-kami">
        <AboutSection />
      </section> */}
      <section id="review">
        <ReviewSection />
      </section>
      {/* <section id="investasi">
        <PlantShowcaseSection />
      </section> */}
      <section id="tentang-kami">
        <AboutSection />
      </section>
      <section id="faq">
        <FAQSection />
      </section>
      <LandingFooter />
      <WhatsAppIcon />
      {/* </div> */}
    </>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LandingPageContent />
    </Suspense>
  );
}
