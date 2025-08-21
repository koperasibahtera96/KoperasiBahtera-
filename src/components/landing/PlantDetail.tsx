'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Button } from '@/components/ui/Button';

const plantDetails = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?ixlib=rb-4.0.3&auto=format&fit=crop&w=1074&q=80",
    title: "Tanaman Berkualitas Tinggi",
    subtitle: "Dipilih Khusus untuk Anda",
    leftContent: {
      heading: "Mengapa Tanaman Kami Special?",
      points: [
        "Bibit premium dari petani terpilih",
        "Sistem perawatan profesional 24/7", 
        "Teknologi modern untuk hasil optimal",
        "Jaminan kualitas dan hasil panen"
      ]
    },
    rightContent: {
      heading: "Proses Penanaman Terpercaya",
      description: "Setiap tanaman melalui proses seleksi ketat oleh ahli pertanian kami. Mulai dari pemilihan bibit, penanaman dengan teknologi modern, hingga perawatan harian yang intensif. Kami memastikan setiap tanaman tumbuh dengan optimal untuk memberikan hasil terbaik bagi investor.",
      stats: [
        { number: "98%", label: "Tingkat Keberhasilan" },
        { number: "24/7", label: "Monitoring Tanaman" },
        { number: "10+", label: "Tahun Pengalaman" }
      ]
    }
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
    title: "Teknologi Pertanian Modern",
    subtitle: "Inovasi untuk Hasil Maksimal",
    leftContent: {
      heading: "Teknologi Canggih yang Kami Gunakan",
      points: [
        "Sistem irigasi otomatis pintar",
        "Sensor kelembaban tanah real-time",
        "Pemupukan berbasis data analytics",
        "Monitoring via aplikasi mobile"
      ]
    },
    rightContent: {
      heading: "Hasil yang Terukur dan Terprediksi", 
      description: "Dengan menggunakan teknologi IoT (Internet of Things) dan AI (Artificial Intelligence), kami dapat memprediksi hasil panen dengan akurasi tinggi. Sistem monitoring 24/7 memastikan kondisi tanaman selalu optimal, sehingga risiko gagal panen sangat minimal.",
      stats: [
        { number: "95%", label: "Akurasi Prediksi" },
        { number: "3x", label: "Lebih Cepat Tumbuh" },
        { number: "40%", label: "Hemat Air" }
      ]
    }
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
    title: "Tim Ahli Berpengalaman",
    subtitle: "Profesional di Bidangnya",
    leftContent: {
      heading: "Tim Expert yang Mengurus Tanaman Anda",
      points: [
        "Ahli pertanian bersertifikat internasional",
        "Pengalaman 10+ tahun di industri",
        "Update berkala kondisi tanaman",
        "Konsultasi gratis kapan saja"
      ]
    },
    rightContent: {
      heading: "Dedikasi untuk Kesuksesan Anda",
      description: "Tim ahli kami terdiri dari para profesional dengan sertifikasi internasional dan pengalaman puluhan tahun. Mereka bekerja dengan dedikasi tinggi untuk memastikan investasi Anda memberikan hasil yang optimal. Setiap tanaman mendapat perhatian khusus layaknya 'anak sendiri'.",
      stats: [
        { number: "15+", label: "Ahli Berpengalaman" },
        { number: "5000+", label: "Tanaman Dikelola" },
        { number: "100%", label: "Kepuasan Investor" }
      ]
    }
  }
];

function PlantDetailCard({ plant, index }: { plant: typeof plantDetails[0], index: number }) {
  const { elementRef, isVisible } = useScrollAnimation(0.3);
  
  return (
    <div ref={elementRef} className="py-24 relative overflow-hidden">
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-emerald-50/20 to-green-50/30"></div>
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px'
      }}></div>

      <div className="relative container-centered">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className={`text-4xl lg:text-5xl font-bold text-gray-900 mb-4 transform transition-all duration-1000 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          }`}>
            {plant.title}
          </h2>
          <p className={`text-xl text-emerald-600 font-semibold transform transition-all duration-1000 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`} style={{ transitionDelay: '200ms' }}>
            {plant.subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Left Content */}
          <div className={`lg:col-span-4 transform transition-all duration-1000 ${
            isVisible ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'
          }`} style={{ transitionDelay: '400ms' }}>
            <div className="bg-white rounded-2xl p-8 border border-emerald-100 hover:border-emerald-200 transition-all duration-300 group">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 group-hover:text-emerald-700 transition-colors">
                {plant.leftContent.heading}
              </h3>
              <div className="space-y-4">
                {plant.leftContent.points.map((point, i) => (
                  <div 
                    key={i}
                    className={`flex items-start gap-3 transform transition-all duration-500 ${
                      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                    }`}
                    style={{ transitionDelay: `${600 + i * 100}ms` }}
                  >
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center mt-0.5 group-hover:scale-110 transition-transform">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center Plant Image - Organic Shape */}
          <div className={`lg:col-span-4 flex justify-center transform transition-all duration-1200 ${
            isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-16 opacity-0 scale-95'
          }`} style={{ transitionDelay: '200ms' }}>
            <div className="relative group">
              {/* Decorative glowing elements */}
              <div className="absolute -inset-8 bg-gradient-to-r from-emerald-400/15 to-green-500/15 blur-2xl group-hover:blur-3xl transition-all duration-700 rounded-full"></div>
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-300/20 to-green-400/20 blur-xl group-hover:blur-2xl transition-all duration-700"></div>
              
              {/* Organic shaped image container */}
              <div className={`relative w-80 h-96 lg:w-96 lg:h-[450px] group-hover:scale-105 transition-transform duration-700 overflow-hidden ${
                index === 0 ? 'organic-shape-1' : index === 1 ? 'organic-shape-2' : 'organic-shape-3'
              }`}>
                <div 
                  className="absolute inset-0 bg-cover bg-center filter group-hover:saturate-110 group-hover:brightness-105 transition-all duration-700"
                  style={{ backgroundImage: `url(${plant.image})` }}
                />
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-green-600/10"></div>
                
                {/* Animated border effect */}
                <div className="absolute inset-0 border-4 border-emerald-300/30 group-hover:border-emerald-400/50 transition-all duration-700"></div>
              </div>
              
              {/* Floating premium badge */}
              <div className={`absolute -top-2 -right-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl px-4 py-2 shadow-xl transform transition-all duration-1000 ${
                isVisible ? 'translate-y-0 rotate-0 opacity-100' : 'translate-y-8 rotate-12 opacity-0'
              }`} style={{ transitionDelay: '800ms' }}>
                <div className="text-center">
                  <div className="text-lg font-bold">#{index + 1}</div>
                  <div className="text-xs font-semibold text-emerald-100">Premium</div>
                </div>
              </div>
              
              {/* Floating elements around the image */}
              <div className={`absolute -bottom-6 -left-4 w-6 h-6 bg-emerald-400 rounded-full animate-bounce transform transition-all duration-1000 ${
                isVisible ? 'opacity-70' : 'opacity-0'
              }`} style={{ transitionDelay: '1000ms', animationDelay: '0s' }}></div>
              
              <div className={`absolute top-4 -left-6 w-4 h-4 bg-green-400 rounded-full animate-bounce transform transition-all duration-1000 ${
                isVisible ? 'opacity-60' : 'opacity-0'
              }`} style={{ transitionDelay: '1200ms', animationDelay: '0.5s' }}></div>
              
              <div className={`absolute -top-4 right-8 w-3 h-3 bg-emerald-300 rounded-full animate-bounce transform transition-all duration-1000 ${
                isVisible ? 'opacity-80' : 'opacity-0'
              }`} style={{ transitionDelay: '1400ms', animationDelay: '1s' }}></div>
            </div>
          </div>

          {/* Right Content */}
          <div className={`lg:col-span-4 transform transition-all duration-1000 ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'
          }`} style={{ transitionDelay: '600ms' }}>
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-8 text-white relative overflow-hidden group">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M20 20c0 11.046-8.954 20-20 20v20h40V20H20z'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '40px 40px'
              }}></div>
              
              <div className="relative">
                <h3 className="text-2xl font-bold mb-4 group-hover:scale-105 transition-transform">
                  {plant.rightContent.heading}
                </h3>
                <p className="text-emerald-100 leading-relaxed mb-8 text-lg">
                  {plant.rightContent.description}
                </p>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {plant.rightContent.stats.map((stat, i) => (
                    <div 
                      key={i}
                      className={`text-center transform transition-all duration-700 ${
                        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`}
                      style={{ transitionDelay: `${1000 + i * 100}ms` }}
                    >
                      <div className="text-2xl lg:text-3xl font-bold text-white mb-1 group-hover:scale-110 transition-transform">
                        {stat.number}
                      </div>
                      <div className="text-emerald-200 text-sm font-semibold">{stat.label}</div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  variant="outline" 
                  className={`w-full border-2 border-white text-white hover:bg-white hover:text-emerald-600 font-bold py-3 transition-all duration-300 hover:scale-105 transform ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}
                  style={{ transitionDelay: '1200ms' }}
                >
                  Pelajari Lebih Detail
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlantDetail() {
  return (
    <section className="relative">
      {plantDetails.map((plant, index) => (
        <PlantDetailCard key={plant.id} plant={plant} index={index} />
      ))}
    </section>
  );
}