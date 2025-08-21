'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useState } from 'react';

const plantFacts = [
  {
    name: "Gaharu",
    common: "Aquilaria malaccensis",
    emoji: "🌳",
    image: "/gaharu.jpeg",
    secretFact: "Kayu Termahal di Dunia",
    mainFact: "Gaharu menghasilkan resin aromatik yang bernilai hingga Rp 50 juta per kg, menjadikannya salah satu komoditas termahal di dunia.",
    weirdFacts: [
      "🌿 Gaharu hanya tumbuh di hutan tropis Asia Tenggara dan India",
      "💎 Resin gaharu terbentuk secara alami ketika pohon terinfeksi jamur tertentu",
      "🕰️ Proses pembentukan resin bisa memakan waktu 10-20 tahun",
      "🌍 Pasar ekspor utama: Timur Tengah, China, dan Jepang",
      "💰 Harga resin premium bisa mencapai Rp 100 juta per kg",
      "🏥 Digunakan dalam pengobatan tradisional dan parfum mewah"
    ],
    investmentHook: "ROI 300-500% dalam 8-12 tahun dengan perawatan minimal",
    imageShape: "hexagon",
    textLayout: "left",
    colors: {
      text: "emerald-600",
      gradient: "from-emerald-500 to-green-600",
      light: "from-emerald-50 to-green-100"
    }
  },
  {
    name: "Alpukat Mentega",
    common: "Persea americana",
    emoji: "🥑",
    image: "/alpukat.jpg",
    secretFact: "Superfood Ekspor Premium",
    mainFact: "Alpukat mentega Indonesia memiliki tekstur lembut dan rasa yang unik, membuatnya sangat diminati pasar internasional dengan harga premium.",
    weirdFacts: [
      "🌱 Alpukat mentega tumbuh optimal di dataran tinggi 800-1500 mdpl",
      "🌍 Ekspor utama ke Singapura, Malaysia, dan Timur Tengah",
      "💪 Kandungan lemak sehat dan antioksidan yang tinggi",
      "📈 Permintaan pasar meningkat 25% setiap tahun",
      "🌿 Tanaman tahan hama dan penyakit",
      "💰 Harga ekspor 3-5x lipat harga lokal"
    ],
    investmentHook: "ROI 200-300% dalam 5-8 tahun dengan pasar yang stabil",
    imageShape: "diamond",
    textLayout: "right",
    colors: {
      text: "yellow-600",
      gradient: "from-yellow-500 to-orange-600",
      light: "from-yellow-50 to-orange-100"
    }
  },
  {
    name: "Jengkol",
    common: "Archidendron pauciflorum",
    emoji: "🫘",
    image: "/jengkol.jpg",
    secretFact: "Investasi Kesehatan Masa Depan",
    mainFact: "Jengkol tidak hanya lezat, tapi juga kaya protein dan serat. Pasar farmasi dan makanan kesehatan yang berkembang pesat membuat nilai investasi semakin tinggi.",
    weirdFacts: [
      "🌿 Jengkol tumbuh optimal di tanah lembab dan subur",
      "💊 Kaya protein nabati dan serat pangan",
      "🏥 Digunakan dalam pengobatan tradisional",
      "📈 Pasar farmasi tumbuh 15% per tahun",
      "🌍 Ekspor ke Malaysia, Singapura, dan Thailand",
      "💰 Harga jengkol premium terus meningkat"
    ],
    investmentHook: "ROI 150-250% dalam 4-6 tahun dengan diversifikasi pasar",
    imageShape: "hexagon",
    textLayout: "left",
    colors: {
      text: "blue-600",
      gradient: "from-blue-500 to-indigo-600",
      light: "from-blue-50 to-indigo-100"
    }
  }
];

function PlantFactCard({ plant }: { plant: typeof plantFacts[0] }) {
  const { elementRef } = useScrollAnimation(0.2);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeFact, setActiveFact] = useState(0);

  const getImageShape = (shape: string) => {
    switch (shape) {
      case 'hexagon':
        return 'clip-path-hexagon';
      case 'circle':
        return 'rounded-full';
      case 'diamond':
        return 'clip-path-diamond';
      default:
        return 'rounded-3xl';
    }
  };

  const colors = plant.colors;
  const imageShapeClass = getImageShape(plant.imageShape);

  return (
    <div ref={elementRef} className="py-12 overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, ${colors.text} 2px, transparent 2px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="container-centered relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Left Column - Facts & Content */}
          <div className="lg:col-span-5 relative z-20">
            <div className="space-y-8">
              {/* Header Section - Simplified */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 bg-gradient-to-r ${colors.gradient} rounded-2xl flex items-center justify-center shadow-xl`}>
                    <span className="text-3xl">{plant.emoji}</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 font-medium">{plant.common}</div>
                    <div className="text-3xl font-bold text-gray-900">{plant.name}</div>
                  </div>
                </div>

                {/* Main Secret Fact - Highlighted */}
                <div className="space-y-4">
                  <h3 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {plant.secretFact}
                  </h3>
                  <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                </div>

                {/* Key Fact - Highlighted Box */}
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-6 rounded-2xl border-2 border-yellow-400 shadow-lg">
                  <p className="text-lg text-gray-800 leading-relaxed font-semibold">
                    {plant.mainFact}
                  </p>
                </div>
              </div>

              {/* Core Facts - Streamlined */}
              <div className="space-y-6">
                <h4 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  Fakta Kunci
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  {plant.weirdFacts.slice(0, 3).map((fact, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                        activeFact === i
                          ? `bg-gradient-to-r ${colors.light} border-2 border-${colors.text} shadow-lg`
                          : 'bg-white border border-gray-200 hover:border-yellow-300 shadow-md hover:shadow-lg'
                      }`}
                      onClick={() => setActiveFact(i)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-lg flex-shrink-0">{fact.split(' ')[0]}</div>
                        <span className="text-sm text-gray-700 leading-relaxed">{fact.substring(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investment Hook */}
              {true && (
                <div className="bg-gradient-to-r from-emerald-100 to-green-100 p-6 rounded-2xl border-2 border-emerald-400 shadow-xl">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-3xl">💰</div>
                    <div>
                      <h5 className="font-bold text-lg text-emerald-800">Investasi</h5>
                      <p className="text-emerald-700 font-semibold">{plant.investmentHook}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Column - Image (Below content) */}
          <div className="lg:col-span-2 flex justify-center relative z-10">
            <div className="relative group">
              <div
                className={`relative h-96 lg:h-[600px] w-80 overflow-hidden ${imageShapeClass} shadow-2xl transform transition-all duration-700 hover:scale-105 cursor-pointer`}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div
                  className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 ${imageShapeClass}`}
                  style={{ backgroundImage: `url(${plant.image})` }}
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent ${imageShapeClass}`} />

                {/* Subtle Click Indicator */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Bottom Decorative Element */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                <div className={`w-24 h-2 bg-gradient-to-r ${colors.gradient} rounded-full shadow-lg`}></div>
              </div>
            </div>
          </div>

          {/* Right Column - Streamlined Content */}
          <div className="lg:col-span-5 relative z-20">
            <div className="space-y-8">
              {/* Key Benefits - Highlighted */}
              <div className="space-y-6">
                <h4 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="text-2xl">💎</span>
                  Keunggulan
                </h4>

                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl border-2 border-emerald-200 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl">🌱</div>
                      <div>
                        <h5 className="font-bold text-emerald-800 mb-2">Pertumbuhan Optimal</h5>
                        <p className="text-emerald-700 text-sm">
                          Perawatan minimal, hasil maksimal
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl">📈</div>
                      <div>
                        <h5 className="font-bold text-blue-800 mb-2">Return Tinggi</h5>
                        <p className="text-blue-700 text-sm">
                          Potensi 300% dalam 8-12 tahun
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats - Streamlined */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-md text-center border border-gray-100">
                  <div className="text-2xl font-bold text-gray-800">8-12</div>
                  <div className="text-xs text-gray-600">Tahun</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-md text-center border border-gray-100">
                  <div className="text-2xl font-bold text-gray-800">15+</div>
                  <div className="text-xs text-gray-600">Negara</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlantShowcase() {
  const { elementRef } = useScrollAnimation(0.1);

  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-40 h-40 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-full opacity-20 animate-pulse blur-xl"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-gradient-to-r from-emerald-200 to-green-200 rounded-full opacity-20 animate-pulse blur-xl" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 left-20 w-36 h-36 bg-gradient-to-r from-amber-200 to-yellow-200 rounded-full opacity-20 animate-pulse blur-xl" style={{animationDelay: '2s'}}></div>

        {/* Floating Geometric Shapes */}
        <div className="absolute top-1/4 right-1/4 w-8 h-8 bg-yellow-400/30 rotate-45 animate-bounce" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-1/4 left-1/4 w-6 h-6 bg-emerald-400/30 rounded-full animate-bounce" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-10 h-10 bg-amber-400/30 transform rotate-45 animate-bounce" style={{animationDelay: '2.5s'}}></div>
      </div>

      <div className="container-centered relative z-10">
        {/* Enhanced Section Header */}
        <div ref={elementRef} className="text-center mb-32">
                      <div className="transform transition-all duration-700 translate-y-0 opacity-100">
            {/* Animated Badge */}
            <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-yellow-500/10 to-emerald-500/10 border-2 border-yellow-300 text-yellow-700 rounded-full text-sm font-bold mb-12 hover:scale-105 transition-transform duration-300 cursor-default shadow-xl backdrop-blur-sm">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
              </div>
              <span className="text-lg font-semibold">🌟 Fakta Tersembunyi Tanaman Nusantara</span>
            </div>

            {/* Main Title with Enhanced Styling */}
            <h2
              className="text-5xl lg:text-7xl font-bold mb-12 leading-tight transform transition-all duration-700 translate-y-0 opacity-100"
              style={{ transitionDelay: '200ms' }}
            >
              <span className="bg-gradient-to-r from-gray-900 via-emerald-600 to-gray-900 bg-clip-text text-transparent">
                Fakta Menakjubkan
              </span>
              <br />
              <span className="text-emerald-600 relative inline-block">
                Tanaman Indonesia
                <div className="absolute -bottom-3 left-0 right-0 h-2 bg-gradient-to-r from-emerald-200 via-yellow-200 to-emerald-200 rounded-full"></div>
              </span>
            </h2>

            {/* Enhanced Description */}
            <div
              className="max-w-5xl mx-auto space-y-6 transform transition-all duration-700 translate-y-0 opacity-100"
              style={{ transitionDelay: '400ms' }}
            >
              <p className="text-xl text-gray-600 leading-relaxed">
                Ternyata tanaman lokal Indonesia menyimpan rahasia luar biasa!
                <strong className="text-emerald-600">Fakta mengejutkan</strong>,
                <strong className="text-emerald-600">peluang investasi emas</strong>, dan
                <strong className="text-emerald-600">keajaiban yang tak terduga</strong>.
              </p>

            </div>
          </div>
        </div>
      </div>

      {/* Plant Cards with Enhanced Layout */}
      <div>
        {plantFacts.map((plant, index) => (
          <PlantFactCard key={index} plant={plant} />
        ))}
      </div>
    </section>
  );
}