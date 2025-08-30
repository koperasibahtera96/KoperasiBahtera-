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

export default function WhyInvestSection() {
  return (
    <section 
      className="py-16 px-6 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/landing/kenapa-perlu-investasi-bg.png)',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <h2 className="text-4xl md:text-5xl font-bold text-center text-[#4C3D19] mb-12 font-[family-name:var(--font-poppins)]">
          Kenapa Perlu Investasi?
        </h2>

        {/* Benefits Grid - First Row (3 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {benefits.slice(0, 3).map((benefit, index) => (
            <div key={index} className="bg-[#FFFCE3] rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <Image
                    src={benefit.icon}
                    alt={benefit.title}
                    width={120}
                    height={120}
                    className="object-contain"
                  />
                </div>
                <h3 className="text-xl font-bold text-[#4C3D19] mb-3 font-[family-name:var(--font-poppins)]">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits Grid - Second Row (2 cards centered) */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {benefits.slice(3, 5).map((benefit, index) => (
              <div key={index + 3} className="bg-[#FFFCE3] rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <Image
                      src={benefit.icon}
                      alt={benefit.title}
                      width={120}
                      height={120}
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-[#4C3D19] mb-3 font-[family-name:var(--font-poppins)]">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}