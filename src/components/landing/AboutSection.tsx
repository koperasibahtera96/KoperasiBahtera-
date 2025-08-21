'use client';

import { Button } from '@/components/ui/Button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export function AboutSection() {
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation(0.2);
  const { elementRef: featuresRef, isVisible: featuresVisible } = useScrollAnimation(0.1);
  const { elementRef: storyRef, isVisible: storyVisible } = useScrollAnimation(0.2);

  const features = [
    {
      icon: "🛡️",
      image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=1926&q=80",
      title: "Terpercaya & Aman",
      description: "Platform investasi tanaman yang telah terdaftar dan diawasi oleh otoritas terkait dengan sertifikasi internasional.",
      highlight: "Sertifikat ISO 9001:2015",
      stats: "5000+ Investor",
      color: "emerald"
    },
    {
      icon: "📈",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80",
      title: "Return Menarik",
      description: "Nikmati keuntungan hingga 25% per tahun dengan sistem bagi hasil yang transparan dan terbukti.",
      highlight: "ROI hingga 25% per tahun",
      stats: "25% Return",
      color: "yellow"
    },
    {
      icon: "💰",
      image: "https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1935&q=80",
      title: "Modal Terjangkau",
      description: "Mulai investasi dari Rp 100.000 saja. Cocok untuk semua kalangan dari pelajar hingga pensiunan.",
      highlight: "Mulai dari Rp 100K",
      stats: "100K Minimum",
      color: "green"
    },
    {
      icon: "🌱",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?ixlib=rb-4.0.3&auto=format&fit=crop&w=1926&q=80",
      title: "Ramah Lingkungan",
      description: "Investasi yang memberikan dampak positif bagi lingkungan dan masa depan bumi untuk generasi mendatang.",
      highlight: "Organic Certified",
      stats: "100% Organic",
      color: "teal"
    }
  ];

  return (
    <section id="tentang" className="relative py-24 overflow-hidden">
      {/* Beautiful background image */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 via-green-800/75 to-emerald-900/80"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20"></div>
      </div>

      <div className="relative container-centered">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-20">
          <div className={`transform transition-all duration-700 ${headerVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-md text-sm font-semibold mb-6">
              <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
              Tentang Kami
            </div>
          </div>

          <h2 className={`text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight transform transition-all duration-700 ${headerVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`} style={{ transitionDelay: '200ms' }}>
            Mengapa Memilih <span className="text-emerald-300 relative">
              Investasi Hijau
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-emerald-300 rounded-full"></div>
            </span>?
          </h2>

          <p className={`text-xl text-emerald-100 max-w-4xl mx-auto leading-relaxed transform transition-all duration-700 ${headerVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`} style={{ transitionDelay: '400ms' }}>
            Dengan pengalaman lebih dari <strong className="text-emerald-300">10 tahun</strong> di bidang pertanian dan investasi,
            kami berkomitmen memberikan kesempatan investasi tanaman terbaik dengan
            keuntungan yang menggiurkan dan risiko yang terukur.
          </p>
        </div>

        {/* Visual Features Grid */}
        <div ref={featuresRef} className="grid lg:grid-cols-2 gap-12 mb-20">
          {features.map((feature, index) => {
            const getColorClasses = (color: string) => {
              switch (color) {
                case 'emerald': return { bg: 'from-emerald-500 to-green-600', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' };
                case 'yellow': return { bg: 'from-yellow-500 to-amber-600', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' };
                case 'green': return { bg: 'from-green-500 to-emerald-600', text: 'text-green-600', badge: 'bg-green-100 text-green-700' };
                case 'teal': return { bg: 'from-teal-500 to-cyan-600', text: 'text-teal-600', badge: 'bg-teal-100 text-teal-700' };
                default: return { bg: 'from-emerald-500 to-green-600', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' };
              }
            };
            const colors = getColorClasses(feature.color);

            return (
              <div
                key={index}
                className={`relative bg-white rounded-2xl overflow-hidden transition-all duration-700 hover:scale-[1.02] group transform shadow-lg hover:shadow-2xl ${
                  featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                {/* Background Image */}
                <div className="relative h-48 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${feature.image})` }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${colors.bg} opacity-80 group-hover:opacity-70 transition-opacity`}></div>

                  {/* Large Emoji Icon */}
                  <div className="absolute top-6 left-6">
                    <div className="text-6xl transform group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">
                      {feature.icon}
                    </div>
                  </div>

                  {/* Stats Badge */}
                  <div className="absolute top-6 right-6">
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg transform group-hover:scale-105 transition-transform">
                      <div className={`text-lg font-bold ${colors.text}`}>{feature.stats}</div>
                    </div>
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-8">
                  <h3 className={`text-2xl font-bold text-gray-900 mb-4 group-hover:${colors.text} transition-colors`}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-6 text-lg">
                    {feature.description}
                  </p>

                  {/* Highlight Badge */}
                  <div className="flex items-center justify-between">
                    <div className={`inline-flex items-center gap-2 ${colors.badge} px-4 py-2 rounded-full font-bold text-sm`}>
                      <div className={`w-2 h-2 bg-current rounded-full animate-pulse`}></div>
                      {feature.highlight}
                    </div>

                    {/* Arrow */}
                    <div className={`w-8 h-8 ${colors.bg} rounded-full flex items-center justify-center text-white transform group-hover:scale-110 group-hover:rotate-12 transition-all`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Enhanced Company Story */}
        <div ref={storyRef} className={`relative bg-white rounded-2xl p-8 lg:p-16 border border-gray-200 overflow-hidden transform transition-all duration-1000 ${
          storyVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
        }`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 text-6xl text-emerald-300 animate-pulse">🌱</div>
            <div className="absolute top-20 right-20 text-4xl text-green-300 animate-pulse" style={{ animationDelay: '1s' }}>🌿</div>
            <div className="absolute bottom-20 left-20 text-5xl text-teal-300 animate-pulse" style={{ animationDelay: '2s' }}>🍃</div>
            <div className="absolute bottom-10 right-10 text-3xl text-emerald-300 animate-pulse" style={{ animationDelay: '0.5s' }}>🌳</div>
          </div>

          <div className="relative grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-md text-sm font-semibold mb-6 transform transition-all duration-700 ${
                storyVisible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
              }`} style={{ transitionDelay: '200ms' }}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Cerita Kami
              </div>
              <h3 className={`text-3xl lg:text-4xl font-bold text-gray-900 mb-8 leading-tight transform transition-all duration-700 ${
                storyVisible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
              }`} style={{ transitionDelay: '400ms' }}>
                Misi Hijau untuk <span className="text-emerald-600">Masa Depan</span>
              </h3>
              <div className="space-y-6 text-gray-700 leading-relaxed text-lg">
                <p className={`relative pl-6 transform transition-all duration-700 ${
                  storyVisible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
                }`} style={{ transitionDelay: '600ms' }}>
                  <div className="absolute left-0 top-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <strong className="text-emerald-700">Investasi Hijau</strong> dimulai dari kepedulian terhadap
                  lingkungan dan keinginan untuk memberikan alternatif investasi yang
                  menguntungkan sekaligus berdampak positif.
                </p>
                <p className={`relative pl-6 transform transition-all duration-700 ${
                  storyVisible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
                }`} style={{ transitionDelay: '800ms' }}>
                  <div className="absolute left-0 top-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  Kami percaya bahwa investasi tidak hanya tentang keuntungan finansial,
                  tetapi juga tentang menciptakan masa depan yang lebih hijau dan
                  berkelanjutan untuk generasi mendatang.
                </p>
                <p className={`relative pl-6 transform transition-all duration-700 ${
                  storyVisible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
                }`} style={{ transitionDelay: '1000ms' }}>
                  <div className="absolute left-0 top-2 w-2 h-2 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  Dengan tim ahli yang berpengalaman dan teknologi pertanian modern,
                  kami telah membantu <strong className="text-emerald-600">5000+ investor</strong> meraih keuntungan sambil berkontribusi
                  pada kelestarian lingkungan.
                </p>
              </div>
              <div className={`mt-10 flex flex-col sm:flex-row gap-4 transform transition-all duration-700 ${
                storyVisible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
              }`} style={{ transitionDelay: '1200ms' }}>
                <Button variant="primary" size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105">
                  Pelajari Lebih Lanjut
                </Button>
                <Button variant="outline" size="lg" className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-8 py-4 text-lg font-semibold transition-all duration-300">
                  Lihat Portfolio
                </Button>
              </div>
            </div>

            <div className="lg:pl-8">
              <div className={`relative bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl p-8 lg:p-10 text-white overflow-hidden transform transition-all duration-1000 ${
                storyVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`} style={{ transitionDelay: '400ms' }}>
                {/* Animated Background Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-125 transition-transform duration-700"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/20 rounded-full transform -translate-x-12 translate-y-12 group-hover:scale-110 transition-transform duration-700"></div>

                <div className="relative">
                  <div className="text-center mb-8">
                    <div className="text-4xl mb-3">🏆</div>
                    <h4 className="text-2xl font-bold">Prestasi Kami</h4>
                    <div className="w-16 h-1 bg-yellow-400 rounded-full mx-auto mt-2"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="text-center group bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors">
                      <div className="text-3xl mb-2">👥</div>
                      <div className="text-4xl lg:text-5xl font-bold mb-3 text-yellow-300 group-hover:scale-110 transition-transform duration-300">5000+</div>
                      <div className="text-emerald-100 font-semibold">Investor Aktif</div>
                    </div>
                    <div className="text-center group bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors">
                      <div className="text-3xl mb-2">🕰️</div>
                      <div className="text-4xl lg:text-5xl font-bold mb-3 text-yellow-300 group-hover:scale-110 transition-transform duration-300">10+</div>
                      <div className="text-emerald-100 font-semibold">Tahun Pengalaman</div>
                    </div>
                    <div className="text-center group bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors">
                      <div className="text-3xl mb-2">📈</div>
                      <div className="text-4xl lg:text-5xl font-bold mb-3 text-yellow-300 group-hover:scale-110 transition-transform duration-300">25%</div>
                      <div className="text-emerald-100 font-semibold">Return Rata-rata</div>
                    </div>
                    <div className="text-center group bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors">
                      <div className="text-3xl mb-2">🎆</div>
                      <div className="text-4xl lg:text-5xl font-bold mb-3 text-yellow-300 group-hover:scale-110 transition-transform duration-300">100%</div>
                      <div className="text-emerald-100 font-semibold">Kepuasan Klien</div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-emerald-400/30">
                    <div className="text-center mb-4">
                      <div className="text-2xl mb-2">🏅</div>
                      <h5 className="font-bold">Sertifikat & Penghargaan</h5>
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center">
                      <div className="bg-gradient-to-r from-yellow-400/20 to-amber-500/20 px-4 py-3 text-white text-sm rounded-xl border-2 border-yellow-400/30 hover:border-yellow-400/50 transition-all duration-300 flex items-center gap-2 group">
                        <span className="text-lg group-hover:scale-125 transition-transform">🏆</span>
                        <span className="font-semibold">ISO 9001:2015</span>
                      </div>
                      <div className="bg-gradient-to-r from-green-400/20 to-emerald-500/20 px-4 py-3 text-white text-sm rounded-xl border-2 border-green-400/30 hover:border-green-400/50 transition-all duration-300 flex items-center gap-2 group">
                        <span className="text-lg group-hover:scale-125 transition-transform">🌱</span>
                        <span className="font-semibold">Organic Certified</span>
                      </div>
                      <div className="bg-gradient-to-r from-amber-400/20 to-yellow-500/20 px-4 py-3 text-white text-sm rounded-xl border-2 border-amber-400/30 hover:border-amber-400/50 transition-all duration-300 flex items-center gap-2 group">
                        <span className="text-lg group-hover:scale-125 transition-transform">⭐</span>
                        <span className="font-semibold">Best Investment 2023</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}