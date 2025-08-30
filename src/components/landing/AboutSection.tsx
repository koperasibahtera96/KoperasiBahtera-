'use client';

export default function AboutSection() {
  return (
    <section
      className="bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: 'url(/landing/tentang-kami.jpg)',
      }}
    >
      <div className="relative z-10 flex flex-col h-full">
        {/* Top 75% height with white transparent background for text */}
        <div className="h-3/4 bg-white/75 p-4 sm:p-6 md:p-8 lg:p-12 w-full">
          {/* Section Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-center text-[#2D3B30] mb-6 sm:mb-8 lg:mb-12 font-[family-name:var(--font-poppins)] drop-shadow-sm">
            Tentang Kami
          </h2>

          {/* Main content */}
          <div className="mb-6 sm:mb-8 lg:mb-12">
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed text-gray-900 mb-4 sm:mb-6 font-medium">
              <span className="font-bold text-[#2D3B30]">Koperasi Bintang Merah Sejahtera (BAHTERA)</span> merupakan badan hukum koperasi tersertifikasi yang
              didirikan atas semangat gotong royong dan prinsip kekeluargaan. Hadir sebagai wadah pemberdayaan
              ekonomi yang inklusif, profesional dan berkelanjutan.
            </p>

            <p className="text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed text-gray-900 mb-12 sm:mb-24 lg:mb-36 font-medium">
              Sebagian upaya pelestarian lingkungan yang selaras dengan peningkatan kesejahteraan masyarakat, kami
              menginisiasi program penghijauan berbasis tanaman multi-komoditas di kawasan Hutan Produksi Tetap
              (HPT) dan Hutan Produksi (HP). Program ini bertujuan untuk pemulihan lahan, meningkatkan produktifitas
              hutan, serta mengoptimalkan potensi ekonomi kawasan melalui pendekatan agroforestri berkelanjutan.
            </p>
          </div>

          {/* Vision and Mission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {/* Vision */}
            <div className="relative">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2D3B30] mb-3 sm:mb-4 lg:mb-6 font-[family-name:var(--font-poppins)] drop-shadow-sm">
                Visi
              </h3>
              <p className="text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed text-gray-900 font-medium">
                Menjadi pemimpin dalam industri investasi pertanian dengan mendorong praktik berkelanjutan dan menghadirkan hasil terbaik bagi para investor.
              </p>
            </div>

            {/* Mission */}
            <div className="relative">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2D3B30] mb-3 sm:mb-4 lg:mb-6 font-[family-name:var(--font-poppins)] drop-shadow-sm">
                Misi
              </h3>
              <p className="text-sm sm:text-base lg:text-lg xl:text-xl leading-relaxed text-gray-900 font-medium">
                Menyediakan peluang investasi unggulan di sektor pertanian melalui seleksi proyek yang ketat, pengelolaan profesional, dan solusi inovatif.
              </p>

              {/* Vertical divider line */}
              <div className="hidden md:block absolute -left-3 lg:-left-6 top-0 bottom-0 w-px bg-gray-800"></div>
            </div>
          </div>
        </div>

        {/* Bottom 25% height for image visibility */}
        <div className="h-1/4"></div>
      </div>
    </section>
  );
}