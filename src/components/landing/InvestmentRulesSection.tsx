'use client';

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

export default function InvestmentRulesSection() {
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
          Aturan Investasi!
        </h2>

        {/* Rules Container */}
        <div className="bg-[#FFFCE3] rounded-2xl p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {rules.map((rule, index) => (
              <div key={index} className="text-center relative">
                <h3 className="text-lg font-bold text-[#4C3D19] mb-4 font-[family-name:var(--font-poppins)]">
                  {rule.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {rule.description}
                </p>
                {/* Add vertical divider for all except last item */}
                {index < rules.length - 1 && (
                  <div className="hidden md:block absolute -right-4 top-0 bottom-0 w-px bg-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}