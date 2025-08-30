'use client';

export default function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-start w-full">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
        style={{
          backgroundImage: 'url(/landing/hero-bg.png)',
        }}
      >
      </div>

      {/* Content */}
      <div className="relative z-10 ml-4 sm:ml-8 md:ml-16 lg:ml-24 max-w-4xl px-3 md:px-4 lg:px-6 text-left">
        <div>
          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl mb-3 sm:mb-4 italic font-medium text-[#4C3D19] block">
            Untuk Masa Depan
          </p>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl max-w-[1052px] font-bold leading-tight mb-4 sm:mb-6 font-[family-name:var(--font-poppins)]">
            <span className="block text-[#4C3D19]">Investasi Pertanian</span>
            <span className="block text-[#4C3D19]">Berkelanjutan yang Mudah</span>
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed mb-6 sm:mb-8 max-w-[50rem] text-[#4C3D19]">
            Solusi tepat bagi Anda yang ingin meraih keuntungan sekaligus memberikan dampak positif
            bagi lingkungan dan masyarakat. Melalui sistem investasi yang sederhana dan transparan,
            Anda dapat ikut mendukung petani lokal untuk meningkatkan hasil panen.
          </p>

          {/* CTA Button */}
          <button className="bg-gradient-to-r from-[#364D32] to-[#889063] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 shadow-lg">
            Mulai Investasi
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-700">
        <div className="flex flex-col items-center animate-bounce">
          <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="text-sm text-[#324D3E] font-bold">Selengkapnya</span>
        </div>
      </div>
    </section>
  );
}