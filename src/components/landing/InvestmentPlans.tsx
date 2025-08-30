'use client';


import { Button } from '@/components/ui/Button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CicilanModal } from './CicilanModal';

export function InvestmentPlans() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cicilanModal, setCicilanModal] = useState<{ isOpen: boolean; plan: any }>({
    isOpen: false,
    plan: null
  });

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInvestment = async (plan: any) => {
    if (!session) {
      router.push('/login');
      return;
    }

    setIsLoading(plan.name);

    try {
      const response = await fetch('/api/payment/create-investment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          user: session.user,
        }),
      });

      const data = await response.json();

      if (data.success && data.data && data.data.redirect_url) {
        window.location.href = data.data.redirect_url;
      } else {
        // Handle error - maybe show a toast notification
        console.error("Failed to get redirect URL");
        console.error("Full response data:", data);
      }
    } catch (error) {
      console.error('Error creating investment payment:', error);
    } finally {
      setIsLoading(null);
    }
  };

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCicilanSelect = (plan: any) => {
    if (!session) {
      router.push('/login');
      return;
    }
    setCicilanModal({ isOpen: true, plan });
  };


  const plans = [
    {
      name: "Paket 1 Pohon",
      price: 500000,
      duration: "5 Tahun",
      returns: "Rp 5.400.000",
      popular: false,
      installmentOptions: [
        { period: "Per 5 Tahun", amount: 5000000, perTree: 500000 },
        { period: "Per Tahun", amount: 1000000, perTree: 100000 },
        { period: "Per Bulan", amount: 83333, perTree: 8333 }
      ],
      features: [
        "1 Pohon pilihan (Aren/Jengkol/Gaharu/Alpukat)",
        "Proyeksi keuntungan Rp 5.400.000",
        "Cicilan mulai Rp 8.333/bulan",
        "Laporan berkala pertumbuhan",
        "Sertifikat kepemilikan pohon",
        "Transparansi penuh proses"
      ],
      plantType: "Multi-Komoditas",
      riskLevel: "Bergantung Alam"
    },
    {
      name: "Paket 10 Pohon (Kavling)",
      price: 5000000,
      duration: "5 Tahun",
      returns: "Rp 54.000.000",
      popular: true,
      installmentOptions: [
        { period: "Per 5 Tahun", amount: 5000000, perTree: 500000 },
        { period: "Per Tahun", amount: 1000000, perTree: 100000 },
        { period: "Per Bulan", amount: 83333, perTree: 8333 }
      ],
      features: [
        "10 Pohon dalam 1 kavling",
        "Proyeksi keuntungan Rp 54.000.000",
        "Cicilan mulai Rp 83.333/bulan untuk 10 pohon",
        "Pengelolaan profesional",
        "Laporan berkala dan transparansi",
        "Sertifikat kavling investasi",
        "Kunjungan lokasi berkala",
        "Dukungan tim ahli"
      ],
      plantType: "Kavling Multi-Komoditas",
      riskLevel: "Bergantung Alam"
    }
  ];

  const benefits = [
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      title: "Keuntungan Finansial",
      description: "Tanaman produktif yang memberikan hasil bernilai tinggi setelah masa panen"
    },
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      title: "Aset Jangka Panjang",
      description: "Nilai tanaman bertambah seiring usia, cocok untuk tabungan masa depan"
    },
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      title: "Kontribusi Lingkungan",
      description: "Menjaga keseimbangan alam, mengurangi polusi, dan mendukung penghijauan"
    },
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Dampak Sosial",
      description: "Membantu ekonomi petani dan masyarakat sekitar lokasi investasi"
    },
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
        </svg>
      ),
      title: "Warisan Masa Depan",
      description: "Tanaman yang bisa menjadi aset dan dapat diwariskan untuk generasi berikutnya"
    }
  ];

  return (
    <section id="investasi" className="relative py-24 overflow-hidden">
      {/* Beautiful greenhouse background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-emerald-50/90 to-white/95"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-white/60"></div>
      </div>

      <div className="relative container-centered">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-200 text-emerald-700 rounded-full text-sm font-bold mb-8 backdrop-blur-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
            Paket Investasi
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-8 leading-tight">
            Pilih Paket <span className="text-emerald-600 relative">
              Investasi Terbaik
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-emerald-200 rounded-full"></div>
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Kami menyediakan berbagai paket investasi tanaman yang disesuaikan dengan
            kebutuhan dan kemampuan finansial Anda. Semua paket dilengkapi dengan
            <strong className="text-red-600"> jaminan hasil 100%</strong> dan monitoring professional.
          </p>
        </div>

        {/* Investment Plans */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, index) => (
            <div key={index} className={`group ${
              plan.popular ? 'lg:-mt-6 lg:mb-6' : ''
            }`}>
              <div className={`bg-white rounded-lg p-8 lg:p-10 transition-all duration-300 group-hover:scale-102 ${
                plan.popular
                  ? 'border-2 border-red-500 bg-red-50/30'
                  : 'border border-gray-200 hover:border-red-200'
              }`}>

                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-md text-sm font-bold flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      Paling Populer
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold mb-4 ${
                    plan.popular
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {plan.plantType}
                  </div>

                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{plan.name}</h3>

                  <div className="mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-yellow-500">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div className="text-4xl lg:text-5xl font-bold text-gray-900">
                          Rp {plan.price.toLocaleString('id-ID')}
                        </div>
                        <span className="text-lg font-normal text-gray-600 ml-2">min</span>
                      </div>
                      <div className="text-gray-700 font-medium text-center">Durasi: {plan.duration}</div>
                    </div>
                  </div>

                  <div className={`rounded-lg p-6 border-2 ${
                    plan.popular
                      ? 'bg-red-600 text-white border-yellow-500'
                      : 'bg-red-100 border-red-200'
                  }`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        plan.popular ? 'bg-yellow-400' : 'bg-red-600'
                      }`}></div>
                      <div className={`text-3xl lg:text-4xl font-bold ${
                        plan.popular ? 'text-white' : 'text-red-700'
                      }`}>
                        {plan.returns}
                      </div>
                    </div>
                    <div className={`text-sm font-medium text-center ${
                      plan.popular ? 'text-red-100' : 'text-red-600'
                    }`}>
                      Projected Return
                    </div>
                  </div>
                </div>

                {/* Risk Level */}
                <div className="flex justify-between items-center mb-8 p-4 bg-gray-50 rounded-lg">
                  <span className="font-semibold text-gray-700">Tingkat Risiko:</span>
                  <span className={`font-bold px-3 py-1 rounded-md text-sm ${
                    plan.riskLevel === 'Rendah' ? 'bg-green-100 text-green-700' :
                    plan.riskLevel === 'Sedang' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {plan.riskLevel}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-md flex items-center justify-center mt-0.5">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-700 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <Button
                    variant={plan.popular ? "primary" : "outline"}
                    className={`w-full py-4 text-lg font-bold transition-all duration-200 ${
                      plan.popular
                        ? 'bg-red-600 hover:bg-red-700 hover:scale-102'
                        : 'border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white hover:scale-102'
                    }`}
                    size="lg"
                    onClick={() => handleInvestment(plan)}
                    loading={isLoading === plan.name}
                  >
                    {plan.popular ? 'Bayar Langsung Terpopuler' : 'Bayar Langsung'}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full py-4 text-lg font-bold border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all duration-200 hover:scale-102"
                    size="lg"
                    onClick={() => handleCicilanSelect(plan)}
                    disabled={isLoading === plan.name}
                  >
                    💳 Beli dengan Cicilan
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div id="manfaat" className="bg-gray-50 rounded-2xl p-8 lg:p-12">
          <div className="text-center mb-12">
            <h3 className="heading-secondary mb-4">Alasan Berinvestasi dengan Kami</h3>
            <p className="text-muted max-w-2xl mx-auto">
              Investasi hijau yang memberikan keuntungan finansial sekaligus berkontribusi
              pada kelestarian lingkungan dan kesejahteraan masyarakat.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex flex-col items-start gap-4 p-6 bg-white rounded-xl">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  {benefit.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">{benefit.title}</h4>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg p-8 lg:p-16 text-white">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-md text-emerald-100 text-sm font-semibold mb-8">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                Siap Bergabung?
              </div>

              <h3 className="text-3xl lg:text-5xl font-bold mb-6 leading-tight">
                <span className="text-emerald-200">Gabung Sekarang!</span>
              </h3>

              <p className="text-xl lg:text-2xl text-emerald-100 mb-10 max-w-3xl mx-auto leading-relaxed">
                <strong className="text-white">&quot;Bersama membangun masa depan hijau dan berkontribusi pada kelestarian lingkungan&quot;</strong>
                <br />
                Investasi Hijau, Hijaukan Bumi Sejahterakan Hati
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button
                  variant="primary"
                  size="lg"
                  className="bg-white text-red-700 hover:bg-red-50 font-bold px-10 py-4 text-lg transition-all duration-200 hover:scale-102"
                >
                  🌱 Gabung Sekarang!
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white hover:bg-white hover:text-red-700 font-bold px-10 py-4 text-lg backdrop-blur-sm transition-all duration-200 hover:scale-102"
                >
                  📞 Konsultasi Gratis
                </Button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-8 text-emerald-100">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-medium">Garansi 100%</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-medium">Terdaftar & Berizin</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-medium">Support 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cicilan Modal */}
      <CicilanModal
        isOpen={cicilanModal.isOpen}
        onClose={() => setCicilanModal({ isOpen: false, plan: null })}
        plan={cicilanModal.plan}
      />
    </section>
  );
}
