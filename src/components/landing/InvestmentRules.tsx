'use client';

export function InvestmentRules() {
  const investmentRules = [
    {
      title: "Investasi Hijau",
      description: "Setiap Anggota dapat mengikuti program ini dengan min membeli 1 paket (10 pohon) investasi",
      icon: "🌱"
    },
    {
      title: "Jangka Waktu",
      description: "Investasi bersifat jangka menengah/panjang (5 – 7 tahun, tergantung jenis tanaman)",
      icon: "⏰"
    },
    {
      title: "Bagi Hasil",
      description: "Hasil panen akan diberikan setelah dikurangi biaya – biaya lainnya",
      icon: "💰"
    },
    {
      title: "Transparansi",
      description: "Investor mendapat laporan berkala mengenai pertumbuhan tanaman, perawatan tanaman, kondisi lahan, dan proyeksi keuntungan",
      icon: "📊"
    },
    {
      title: "Risiko",
      description: "Investor menyadari bahwa investasi tanaman bergantung pada faktor alam, perawatan, serta pasar",
      icon: "⚠️"
    },
    {
      title: "Legalitas",
      description: "Perjanjian kerja sama dituangkan dalam kontrak resmi untuk menjamin hak & kewajiban kedua belah pihak",
      icon: "📜"
    }
  ];

  return (
    <section id="aturan" className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="container-centered">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-200 text-emerald-700 rounded-full text-sm font-bold mb-8">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            Aturan Investasi
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Ketentuan & <span className="text-emerald-600 relative">
              Aturan Main
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-red-200 rounded-full"></div>
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Pahami dengan baik ketentuan dan aturan investasi kami untuk memastikan 
            investasi Anda berjalan sesuai harapan dan memberikan hasil optimal.
          </p>
        </div>

        {/* Rules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {investmentRules.map((rule, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-red-200 hover:transform hover:scale-105"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-2xl shadow-lg">
                  {rule.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {rule.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {rule.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Important Notice */}
        <div className="mt-16 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Penting untuk Diperhatikan
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Investasi tanaman adalah investasi jangka panjang yang memerlukan kesabaran dan pemahaman tentang risiko. 
                Pastikan Anda membaca dan memahami seluruh ketentuan sebelum memulai investasi. 
                Konsultasikan dengan tim kami jika ada hal yang perlu diperjelas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}