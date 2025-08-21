'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Button } from '@/components/ui/Button';

const investmentCalculations = [
  {
    amount: "100.000",
    period: "6 Bulan",
    returns: "112.500",
    profit: "12.500",
    percentage: "12.5%",
    type: "Sayuran Organik"
  },
  {
    amount: "500.000", 
    period: "12 Bulan",
    returns: "610.000",
    profit: "110.000",
    percentage: "22%",
    type: "Buah Premium"
  },
  {
    amount: "1.000.000",
    period: "18 Bulan", 
    returns: "1.375.000",
    profit: "375.000",
    percentage: "37.5%",
    type: "Kayu Jati"
  }
];

const moneyFeatures = [
  {
    icon: "💰",
    title: "Keuntungan Pasti",
    description: "Sistem bagi hasil yang transparan dengan jaminan return sesuai proyeksi"
  },
  {
    icon: "📈", 
    title: "Pertumbuhan Konsisten",
    description: "Nilai investasi terus bertumbuh stabil setiap bulannya"
  },
  {
    icon: "🏦",
    title: "Lebih Baik dari Bank",
    description: "Return 10x lebih tinggi dibanding bunga deposito bank"
  },
  {
    icon: "🛡️",
    title: "Investasi Aman",
    description: "Risiko rendah dengan asuransi dan jaminan hasil 100%"
  }
];

function InvestmentCalculator() {
  const { elementRef, isVisible } = useScrollAnimation(0.2);

  return (
    <div ref={elementRef} className="relative py-24 overflow-hidden">
      {/* Golden background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1559526324-c1f275fbfa32?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/90 via-amber-500/85 to-yellow-600/90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/30 via-transparent to-yellow-900/20"></div>
      </div>
      
      {/* Floating money elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-8 h-8 text-yellow-300/20 animate-bounce" style={{ animationDelay: '0s' }}>💰</div>
        <div className="absolute top-40 right-20 w-6 h-6 text-amber-300/20 animate-bounce" style={{ animationDelay: '1s' }}>💎</div>
        <div className="absolute bottom-32 left-20 w-10 h-10 text-yellow-300/20 animate-bounce" style={{ animationDelay: '2s' }}>🪙</div>
        <div className="absolute bottom-20 right-10 w-7 h-7 text-amber-300/20 animate-bounce" style={{ animationDelay: '0.5s' }}>✨</div>
      </div>

      <div className="relative container-centered">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className={`transform transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-md text-sm font-bold mb-8">
              <div className="text-lg">💰</div>
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
              Kalkulator Keuntungan
            </div>
          </div>
          
          <h2 className={`text-4xl lg:text-6xl font-bold text-white mb-8 leading-tight transform transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`} style={{ transitionDelay: '200ms' }}>
            Lihat <span className="text-yellow-300 relative">
              Keuntungan Anda
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-yellow-300 rounded-full"></div>
            </span>
          </h2>
          
          <p className={`text-xl text-yellow-100 max-w-4xl mx-auto leading-relaxed transform transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`} style={{ transitionDelay: '400ms' }}>
            Hitung sendiri berapa <strong className="text-yellow-300">keuntungan yang bisa Anda dapatkan</strong> dari investasi tanaman bersama kami. 
            <strong className="text-yellow-300"> Profit real, hasil pasti!</strong>
          </p>
        </div>

        {/* Investment Calculator Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {investmentCalculations.map((calc, index) => (
            <div 
              key={index}
              className={`transform transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
              style={{ transitionDelay: `${600 + index * 200}ms` }}
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl hover:shadow-yellow-400/20 hover:scale-105 transition-all duration-300 group border-2 border-yellow-300/20">
                {/* Investment Type Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 text-yellow-900 rounded-full text-sm font-bold mb-6">
                  <div className="w-2 h-2 bg-yellow-700 rounded-full animate-pulse"></div>
                  {calc.type}
                </div>

                {/* Investment Amount */}
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-600 mb-2">Modal Investasi</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">Rp {calc.amount}</div>
                  <div className="text-amber-600 font-semibold">Periode: {calc.period}</div>
                </div>

                {/* Arrow */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-400 rounded-full text-yellow-900 font-bold text-xl group-hover:scale-110 transition-transform">
                    ↓
                  </div>
                </div>

                {/* Returns */}
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-600 mb-2">Total Hasil</div>
                  <div className="text-3xl font-bold text-emerald-600 mb-2">Rp {calc.returns}</div>
                  <div className="text-lg font-bold text-yellow-600">Keuntungan: +Rp {calc.profit}</div>
                </div>

                {/* Percentage Badge */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full font-bold text-lg shadow-lg">
                    <span className="text-2xl">🎯</span>
                    +{calc.percentage} Profit!
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Money Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {moneyFeatures.map((feature, index) => (
            <div 
              key={index}
              className={`bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center text-white hover:bg-white/20 transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
              style={{ transitionDelay: `${1200 + index * 100}ms` }}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold mb-3 text-yellow-300">{feature.title}</h3>
              <p className="text-yellow-100 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className={`transform transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`} style={{ transitionDelay: '1600ms' }}>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 lg:p-12 border border-white/20">
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Siap Meraih <span className="text-yellow-300">Keuntungan Berlimpah?</span>
              </h3>
              <p className="text-xl text-yellow-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Jangan sia-siakan kesempatan emas ini! Mulai investasi hari ini dan rasakan sendiri 
                bagaimana uang Anda bekerja untuk masa depan yang lebih cerah.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-10 py-4 text-lg transition-all duration-300 hover:scale-105 shadow-2xl"
                >
                  💰 Mulai Investasi Sekarang
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-2 border-white text-white hover:bg-white hover:text-yellow-600 font-bold px-10 py-4 text-lg transition-all duration-300 hover:scale-105"
                >
                  📊 Hitung Keuntungan Saya
                </Button>
              </div>
              
              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-yellow-100">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-300">✅</span>
                  <span className="text-sm font-medium">Jaminan ROI Sesuai Proyeksi</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-300">✅</span>
                  <span className="text-sm font-medium">Tanpa Biaya Tersembunyi</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-300">✅</span>
                  <span className="text-sm font-medium">Laporan Keuangan Transparan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvestmentReturns() {
  return (
    <section className="relative">
      <InvestmentCalculator />
    </section>
  );
}