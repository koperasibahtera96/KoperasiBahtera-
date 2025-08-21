'use client';


import { Grid } from '@/components/layout/Grid';
import { Button } from '@/components/ui/Button';

export function InvestmentPlans() {


  const plans = [
    {
      name: "Paket Pemula",
      price: "100.000",
      duration: "6 Bulan",
      returns: "12-15%",
      popular: false,
      features: [
        "Modal minimum Rp 100.000",
        "Return 12-15% dalam 6 bulan",
        "Tanaman sayuran organik",
        "Monitoring bulanan",
        "Garansi hasil 100%",
        "Sertifikat kepemilikan"
      ],
      plantType: "Sayuran Organik",
      riskLevel: "Rendah"
    },
    {
      name: "Paket Standar",
      price: "500.000",
      duration: "12 Bulan",
      returns: "18-22%",
      popular: true,
      features: [
        "Modal minimum Rp 500.000",
        "Return 18-22% dalam 12 bulan",
        "Tanaman buah premium",
        "Monitoring mingguan",
        "Garansi hasil 100%",
        "Sertifikat kepemilikan",
        "Bonus konsultasi gratis",
        "Update foto progress"
      ],
      plantType: "Buah Premium",
      riskLevel: "Sedang"
    },
    {
      name: "Paket Premium",
      price: "1.000.000",
      duration: "18 Bulan",
      returns: "25-30%",
      popular: false,
      features: [
        "Modal minimum Rp 1.000.000",
        "Return 25-30% dalam 18 bulan",
        "Tanaman kayu berkualitas tinggi",
        "Monitoring harian",
        "Garansi hasil 100%",
        "Sertifikat kepemilikan",
        "Konsultasi ahli unlimited",
        "Kunjungan lapangan gratis",
        "Prioritas customer service"
      ],
      plantType: "Kayu Premium",
      riskLevel: "Sedang-Tinggi"
    }
  ];

  const benefits = [
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      title: "Passive Income",
      description: "Dapatkan penghasilan tanpa harus bekerja aktif"
    },
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Hasil Terjamin",
      description: "100% garansi hasil sesuai proyeksi yang dijanjikan"
    },
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      title: "Diversifikasi Portfolio",
      description: "Tambahkan aset riil ke dalam portfolio investasi Anda"
    },
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      title: "Ramah Lingkungan",
      description: "Investasi yang memberikan dampak positif bagi lingkungan"
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
            <strong className="text-emerald-600"> jaminan hasil 100%</strong> dan monitoring professional.
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
                  ? 'border-2 border-emerald-500 bg-emerald-50/30'
                  : 'border border-gray-200 hover:border-emerald-200'
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
                      ? 'bg-emerald-100 text-emerald-700'
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
                          Rp {plan.price.toLocaleString()}
                        </div>
                        <span className="text-lg font-normal text-gray-600 ml-2">min</span>
                      </div>
                      <div className="text-gray-700 font-medium text-center">Durasi: {plan.duration}</div>
                    </div>
                  </div>

                  <div className={`rounded-lg p-6 border-2 ${
                    plan.popular
                      ? 'bg-emerald-600 text-white border-yellow-500'
                      : 'bg-emerald-100 border-emerald-200'
                  }`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        plan.popular ? 'bg-yellow-400' : 'bg-emerald-600'
                      }`}></div>
                      <div className={`text-3xl lg:text-4xl font-bold ${
                        plan.popular ? 'text-white' : 'text-emerald-700'
                      }`}>
                        {plan.returns}
                      </div>
                    </div>
                    <div className={`text-sm font-medium text-center ${
                      plan.popular ? 'text-emerald-100' : 'text-emerald-600'
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
                      <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center mt-0.5">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-700 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  variant={plan.popular ? "primary" : "outline"}
                  className={`w-full py-4 text-lg font-bold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-emerald-600 hover:bg-emerald-700 hover:scale-102'
                      : 'border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:scale-102'
                  }`}
                  size="lg"
                >
                  {plan.popular ? 'Pilih Paket Terpopuler' : 'Pilih Paket Ini'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div id="manfaat" className="bg-gray-50 rounded-2xl p-8 lg:p-12">
          <div className="text-center mb-12">
            <h3 className="heading-secondary mb-4">Manfaat Investasi Tanaman</h3>
            <p className="text-muted max-w-2xl mx-auto">
              Investasi tanaman menawarkan keuntungan unik yang tidak bisa Anda dapatkan
              dari instrumen investasi konvensional lainnya.
            </p>
          </div>

          <Grid cols={2}>
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4 p-6 bg-white rounded-xl">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex-center">
                  {benefit.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">{benefit.title}</h4>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </Grid>
        </div>

        {/* CTA Section */}
        <div className="mt-20">
          <div className="bg-emerald-600 rounded-lg p-8 lg:p-16 text-white">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-md text-emerald-100 text-sm font-semibold mb-8">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                Siap Bergabung?
              </div>

              <h3 className="text-3xl lg:text-5xl font-bold mb-6 leading-tight">
                Mulai <span className="text-emerald-200">Investasi Hijau</span> Anda Hari Ini
              </h3>

              <p className="text-xl lg:text-2xl text-emerald-100 mb-10 max-w-3xl mx-auto leading-relaxed">
                Bergabunglah dengan <strong className="text-white">5000+ investor</strong> yang telah merasakan keuntungan
                dari investasi tanaman bersama kami. <strong className="text-white">Mulai dari Rp 100.000 saja!</strong>
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button
                  variant="primary"
                  size="lg"
                  className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-10 py-4 text-lg transition-all duration-200 hover:scale-102"
                >
                  🌱 Mulai Investasi Sekarang
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white hover:bg-white hover:text-emerald-700 font-bold px-10 py-4 text-lg backdrop-blur-sm transition-all duration-200 hover:scale-102"
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
    </section>
  );
}