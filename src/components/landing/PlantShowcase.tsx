'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useState } from 'react';

const plantFacts = [
  {
    name: "Aren",
    common: "Arenga pinnata",
    emoji: "🌴",
    image: "/aren.png",
    secretFact: "Pohon Serbaguna Nusantara",
    mainFact: "Tanaman aren mulai bisa disadap niranya setelah berusia 7-12 tahun. Nira aren dapat diolah menjadi gula aren, kolangkaling, sirup, hingga bioetanol dengan nilai ekonomi tinggi.",
    weirdFacts: [
      "🌿 Tumbuh optimal di daerah pegunungan dan perbukitan Indonesia",
      "🍯 Nira aren mengandung gula alami dengan rasa khas",
      "🕰️ Pohon bisa terus menghasilkan selama beberapa tahun sebelum menua",
      "🌍 Produk aren diminati pasar ekspor sebagai pemanis alami",
      "💰 Gula aren premium bernilai tinggi di pasar internasional",
      "⚡ Nira aren dapat difermentasi menjadi bioetanol ramah lingkungan"
    ],
    investmentHook: "Produksi berkelanjutan 7-15 tahun dengan multiple income streams",
    imageShape: "hexagon",
    textLayout: "left",
    colors: {
      text: "amber-600",
      gradient: "from-amber-500 to-orange-600",
      light: "from-amber-50 to-orange-100"
    }
  },
  {
    name: "Jengkol",
    common: "Archidendron pauciflorum",
    emoji: "🫘",
    image: "/jengkol.png",
    secretFact: "Hidden Gem Asia Tenggara",
    mainFact: "Pohon jengkol mulai berbuah setelah 5-7 tahun dan dapat berproduksi puluhan tahun. Biji jengkol dapat diolah menjadi keripik dan berbagai masakan khas yang bernilai ekonomi.",
    weirdFacts: [
      "🌿 Pohon khas Asia Tenggara dengan aroma kuat namun disukai",
      "💪 Kaya protein nabati dan mineral penting",
      "🍳 Dapat diolah menjadi jengkol balado dan gulai jengkol",
      "📈 Permintaan pasar terus stabil dengan harga yang baik",
      "🌍 Ekspor ke Malaysia, Singapura, dan negara ASEAN",
      "💰 Produk olahan jengkol semakin beragam dan bernilai"
    ],
    investmentHook: "Investasi jangka panjang dengan produksi konsisten 20+ tahun",
    imageShape: "diamond",
    textLayout: "right",
    colors: {
      text: "green-600",
      gradient: "from-green-500 to-emerald-600",
      light: "from-green-50 to-emerald-100"
    }
  },
  {
    name: "Gaharu",
    common: "Aquilaria spp",
    emoji: "🌳",
    image: "/gaharu.png",
    secretFact: "Emas Hijau Indonesia",
    mainFact: "Pohon gaharu siap dipanen setelah 5-8 tahun ketika kayunya mengandung resin wangi. Gaharu menghasilkan kayu, serbuk, minyak atsiri, dan kerajinan bernilai tinggi untuk ritual dan parfum mewah.",
    weirdFacts: [
      "🌿 Tumbuh di daerah tropis Asia dengan resin wangi alami",
      "🕯️ Kayu dan serbuk dibakar untuk aroma harum pada ritual",
      "💎 Minyak atsiri gaharu digunakan dalam parfum mewah",
      "🎨 Kayu gaharu diolah menjadi kerajinan seperti tasbih",
      "🌍 Pasar utama: Timur Tengah, China, dan Asia Timur",
      "💰 Harga premium karena aroma khas dan kelangkaannya"
    ],
    investmentHook: "ROI tinggi dalam 5-8 tahun dengan nilai resin yang terus naik",
    imageShape: "hexagon",
    textLayout: "left",
    colors: {
      text: "purple-600",
      gradient: "from-purple-500 to-indigo-600",
      light: "from-purple-50 to-indigo-100"
    }
  },
  {
    name: "Alpukat",
    common: "Persea americana",
    emoji: "🥑",
    image: "/alpukat.png",
    secretFact: "Superfood Global Favorite",
    mainFact: "Pohon alpukat mulai berbuah setelah 3-8 tahun dan dapat berproduksi puluhan tahun. Buah alpukat kaya serat tinggi, dapat diolah menjadi guacamole, dan minyak alpukat untuk kesehatan.",
    weirdFacts: [
      "🌱 Buah tropis yang dibudidayakan karena rasa lezat dan kaya gizi",
      "💪 Mengandung serat tinggi dan lemak sehat untuk tubuh",
      "🥗 Diolah menjadi guacamole, saus khas Meksiko yang populer",
      "✨ Minyak alpukat digunakan untuk masakan sehat dan perawatan kulit",
      "📈 Permintaan global terus meningkat sebagai superfood",
      "🌍 Pasar ekspor berkembang pesat ke berbagai negara"
    ],
    investmentHook: "Pasar global yang stabil dengan tren kesehatan yang terus naik",
    imageShape: "diamond",
    textLayout: "right",
    colors: {
      text: "emerald-600",
      gradient: "from-emerald-500 to-green-600",
      light: "from-emerald-50 to-green-100"
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