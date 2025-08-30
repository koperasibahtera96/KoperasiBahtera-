'use client';

import Image from 'next/image';

const benefits = [
  {
    title: "Keuntungan Finansial",
    description: "Tanaman produktif yang memberikan hasil bernilai tinggi setelah masa permanen",
    icon: "/landing/Keuntungan Finansial.png"
  },
  {
    title: "Aset Jangka Panjang",
    description: "Nilai Tanaman bertambah seiring usia, cocok untuk tabungan masa depan",
    icon: "/landing/Asset Jangka Panjang.png"
  },
  {
    title: "Kontribusi Lingkungan",
    description: "Menjaga keseimbangan alam, mengurangi polusi, dan mendukung penghijauan",
    icon: "/landing/Kontribusi Lingkungan.png"
  },
  {
    title: "Dampak Sosial",
    description: "Membantu ekonomi petani dan masyarakat sekitar lokasi investasi",
    icon: "/landing/Dampak Sosial.png"
  },
  {
    title: "Warisan Masa Depan",
    description: "Tanaman yang bisa menjadi aset dan dapat diwariskan untuk generasi berikutnya",
    icon: "/landing/Warisan Masa Depan.png"
  }
];

const rules = [
  {
    title: "Investasi Hijau",
    description: "Setiap Anggota dapat mengikuti program ini dengan min membeli 1 paket (10 pohon) Investasi"
  },
  {
    title: "Jangka Waktu",
    description: "Investasi bersifat jangka menengah/panjang (5 - 7 tahun, tergantung jenis tanaman)"
  },
  {
    title: "Bagi Hasil",
    description: "Hasil panen akan diberikan setelah dikurangi biaya-biaya lainnya"
  },
  {
    title: "Transparansi",
    description: "Investor mendapat laporan berkala mengenai pertumbuhan tanaman, perawatan tanaman, kondisi lahan, dan proyeksi keuntungan"
  },
  {
    title: "Risiko",
    description: "Investor menyadari bahwa investasi tanaman bergantung pada faktor alam, perawatan, serta pasar"
  }
];

export default function WhyInvestAndRulesSection() {
  return (
    <section 
      className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/landing/kenapa-perlu-investasi-bg.png)',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Why Invest Section */}
        <div className="mb-8 sm:mb-12 lg:mb-16">
          {/* Section Title */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-[#4C3D19] mb-6 sm:mb-8 lg:mb-12 font-[family-name:var(--font-poppins)]">
            Kenapa Perlu Investasi?
          </h2>

          {/* Benefits Grid - First Row (3 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {benefits.slice(0, 3).map((benefit, index) => (
              <div key={index} className="bg-[#FFFCE3] rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 sm:mb-4">
                    <Image
                      src={benefit.icon}
                      alt={benefit.title}
                      width={100}
                      height={100}
                      className="object-contain sm:w-[120px] sm:h-[120px]"
                    />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#4C3D19] mb-2 sm:mb-3 font-[family-name:var(--font-poppins)]">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Benefits Grid - Second Row (2 cards centered) */}
          <div className="flex justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl">
              {benefits.slice(3, 5).map((benefit, index) => (
                <div key={index + 3} className="bg-[#FFFCE3] rounded-2xl p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 sm:mb-4">
                      <Image
                        src={benefit.icon}
                        alt={benefit.title}
                        width={100}
                        height={100}
                        className="object-contain sm:w-[120px] sm:h-[120px]"
                      />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#4C3D19] mb-2 sm:mb-3 font-[family-name:var(--font-poppins)]">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Investment Rules Section */}
        <div>
          {/* Section Title */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-[#4C3D19] mb-6 sm:mb-8 lg:mb-12 font-[family-name:var(--font-poppins)]">
            Aturan Investasi!
          </h2>

          {/* Rules Container */}
          <div className="bg-[#FFFCE3] rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
              {rules.map((rule, index) => (
                <div key={index} className="text-center relative">
                  <h3 className="text-base sm:text-lg font-bold text-[#4C3D19] mb-2 sm:mb-3 lg:mb-4 font-[family-name:var(--font-poppins)]">
                    {rule.title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    {rule.description}
                  </p>
                  {/* Add vertical divider for all except last item */}
                  {index < rules.length - 1 && (
                    <div className="hidden lg:block absolute -right-4 top-0 bottom-0 w-px bg-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}