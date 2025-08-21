'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const heroSlides = [
  {
    id: 1,
    title: "Investasi Tanaman Terpercaya",
    subtitle: "Masa Depan Hijau, Keuntungan Pasti",
    description: "Bergabunglah dengan ribuan investor yang telah merasakan keuntungan dari investasi tanaman berkualitas tinggi. Mulai dari Rp 100.000 saja!",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
    cta: "Mulai Investasi Sekarang"
  },
  {
    id: 2,
    title: "Tanaman Premium Pilihan",
    subtitle: "Kualitas Terjamin, Hasil Maksimal",
    description: "Kami menyediakan bibit tanaman premium dengan tingkat keberhasilan tinggi. Didukung teknologi modern dan pengalaman puluhan tahun.",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
    cta: "Lihat Katalog Tanaman"
  },
  {
    id: 3,
    title: "Keuntungan Hingga 25% Per Tahun",
    subtitle: "Investasi Aman, Return Menarik",
    description: "Nikmati keuntungan stabil dengan sistem bagi hasil yang transparan. Investasi Anda dikelola oleh ahli pertanian berpengalaman.",
    image: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
    cta: "Hitung Keuntungan"
  }
];

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  return (
    <section id="beranda" className="relative overflow-hidden">
      {/* Background Images Container */}
      <div className="relative h-[600px] lg:h-[700px]">
        {heroSlides.map((slide, index) => (
          <div
            key={`bg-${slide.id}`}
            className={cn(
              'absolute inset-0 transition-all duration-1000 ease-in-out',
              index === currentSlide 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-105'
            )}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        ))}

        {/* Fixed Content Overlay */}
        <div className="relative z-10 h-full">
          <div className="container-centered h-full">
            <div className="flex items-center h-full">
              <div className="max-w-3xl">
                {/* Animated subtitle */}
                <div className="mb-6 overflow-hidden">
                  <span className={cn(
                    "inline-block px-6 py-3 bg-emerald-500/90 text-white rounded-full text-sm font-semibold backdrop-blur-sm shadow-lg transition-all duration-700",
                    "transform",
                    currentSlide >= 0 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  )}>
                    {heroSlides[currentSlide]?.subtitle}
                  </span>
                </div>
                
                {/* Animated title */}
                <div className="mb-8 overflow-hidden">
                  <h1 className={cn(
                    "text-4xl lg:text-7xl font-bold text-white leading-tight transition-all duration-700 delay-100",
                    "transform drop-shadow-2xl",
                    currentSlide >= 0 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  )}>
                    {heroSlides[currentSlide]?.title}
                  </h1>
                </div>
                
                {/* Animated description */}
                <div className="mb-10 overflow-hidden">
                  <p className={cn(
                    "text-lg lg:text-xl text-white/95 leading-relaxed max-w-2xl transition-all duration-700 delay-200",
                    "transform drop-shadow-lg",
                    currentSlide >= 0 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                  )}>
                    {heroSlides[currentSlide]?.description}
                  </p>
                </div>
                
                {/* Animated buttons */}
                <div className={cn(
                  "flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-300",
                  "transform",
                  currentSlide >= 0 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                )}>
                  <Button 
                    variant="primary" 
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-10 py-4 text-lg transition-all duration-200 hover:scale-102"
                  >
                    {heroSlides[currentSlide]?.cta}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="border-2 border-white text-white hover:bg-white hover:text-emerald-700 font-bold px-10 py-4 text-lg backdrop-blur-sm transition-all duration-200 hover:scale-102"
                  >
                    Pelajari Lebih Lanjut
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/25 hover:bg-white/35 rounded-lg backdrop-blur-sm transition-all duration-200 group border border-white/30 z-20"
        >
          <svg className="w-5 h-5 text-white mx-auto group-hover:scale-105 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/25 hover:bg-white/35 rounded-lg backdrop-blur-sm transition-all duration-200 group border border-white/30 z-20"
        >
          <svg className="w-5 h-5 text-white mx-auto group-hover:scale-105 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'transition-all duration-300 border border-white/50',
                index === currentSlide 
                  ? 'w-10 h-3 bg-white border-white rounded-sm' 
                  : 'w-3 h-3 bg-white/30 hover:bg-white/60 rounded-sm'
              )}
            />
          ))}
        </div>

        {/* Subtle decorative elements */}
        <div className="absolute top-20 right-20 w-16 h-16 bg-emerald-400/10 rounded-lg blur-lg animate-pulse"></div>
        <div className="absolute bottom-32 right-32 w-12 h-12 bg-white/10 rounded-lg blur-md animate-pulse delay-700"></div>
      </div>

      {/* Trust Indicators */}
      <div className="bg-white py-8 border-b">
        <div className="container-centered">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl lg:text-3xl font-bold text-green-600 mb-1">5000+</div>
              <div className="text-gray-600 text-sm">Investor Terpercaya</div>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-bold text-green-600 mb-1">25%</div>
              <div className="text-gray-600 text-sm">Return Tahunan</div>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-bold text-green-600 mb-1">10+</div>
              <div className="text-gray-600 text-sm">Tahun Pengalaman</div>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-bold text-green-600 mb-1">100%</div>
              <div className="text-gray-600 text-sm">Hasil Terjamin</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}