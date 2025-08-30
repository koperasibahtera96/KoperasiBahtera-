'use client';

import Image from 'next/image';

export default function CTASection() {
  return (
    <section className="py-8 sm:py-10 lg:py-12 px-4 sm:px-6 bg-[#E5D7C4]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
          {/* Left side with icon and text */}
          <div className="flex items-center space-x-3 sm:space-x-4 text-center lg:text-left">
            {/* Light bulb icon */}
            <div className="flex-shrink-0">
              <Image
                src="/landing/light.png"
                alt="Light bulb"
                width={50}
                height={50}
                className="object-contain sm:w-[60px] sm:h-[60px]"
              />
            </div>

            {/* Text content */}
            <div>
              <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#4C3D19] mb-1 sm:mb-2 font-[family-name:var(--font-poppins)]">
                Investasi Hijau, Hijaukan Bumi Sejahterakan Hati
              </h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Bersama membangun masa depan hijau dan berkontribusi pada kelestarian lingkungan
              </p>
            </div>
          </div>

          {/* Right side with CTA button */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            <button className="w-full lg:w-auto bg-[#4C3D19] text-white px-8 sm:px-10 lg:px-12 py-4 sm:py-5 lg:py-6 rounded-full text-base sm:text-lg lg:text-xl font-semibold hover:bg-[#344C3D] transition-colors shadow-lg font-[family-name:var(--font-poppins)] lg:min-w-[240px]">
              Gabung Sekarang
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}