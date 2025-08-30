'use client';

import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAlert } from '@/components/ui/Alert';
import { CicilanModal } from './CicilanModal';

const plants = [
  {
    name: "gaharu",
    nameEn: "Aquilaria",
    years: "15 - 20 tahun",
    location: "Tumbuh di hutan tropis & subtropis",
    description: "Pohon bernilai tinggi yang tumbuh di daerah tropis Asia. Pohon ini siap dipanen saat bagian kayunya mengandung resin wangi yang terbentuk secara alami. Resin inilah yang menjadi komoditas utama gaharu, terkenal karena aroma khasnya.",
    productOlahan: [
      {
        name: "Kayu & Serbuk Gaharu",
        description: "Dibakar untuk menghasilkan aroma harum pada ritual dan meditasi."
      },
      {
        name: "Minyak Atsiri Gaharu",
        description: "Digunakan dalam parfum mewah dan aromaterapi."
      },
      {
        name: "Kerajinan Kayu Gaharu",
        description: "seperti tasbih atau perhiasan bernuansa wangi."
      },
    ],
    pricing: {
      monthly: "125.000",
      yearly: "1.500.000",
      fiveYears: "7.500.000",
      sellPrice: "15.000.000",
      profit: {
        yearly: "8.500.000",
        monthly: "708.333",
        weekly: "163.462",
        daily: "23.288"
      }
    },
    investmentPlan: {
      name: "Paket 10 Pohon Gaharu",
      price: 5000000,
      duration: "15-20 Tahun",
      returns: "Rp 150.000.000",
      plantType: "Gaharu Premium",
      riskLevel: "Bergantung Alam",
      installmentOptions: [
        { period: "Per 5 Tahun", amount: 5000000, perTree: 500000 },
        { period: "Per Tahun", amount: 1000000, perTree: 100000 },
        { period: "Per Bulan", amount: 125000, perTree: 12500 }
      ],
      features: [
        "10 Pohon Gaharu Premium",
        "Proyeksi keuntungan hingga Rp 150.000.000",
        "Cicilan mulai Rp 125.000/bulan",
        "Monitoring profesional & laporan berkala",
        "Sertifikat kepemilikan pohon",
        "Perawatan dan pemeliharaan terjamin",
        "Potensi hasil resin gaharu berkualitas tinggi"
      ]
    }
  },
  {
    name: "jengkol",
    nameEn: "Archidendron pauciflorum",
    years: "5 - 8 tahun",
    location: "Tumbuh di daerah tropis Asia Tenggara",
    description: "Pohon jengkol adalah pohon khas Asia Tenggara yang terkenal dengan bijinya beraroma kuat namun disukai banyak orang. Berbuah jika ditanam dari biji, dan lebih cepat jika menggunakan cangkok/okulasi. Dengan perawatan baik, pohon ini dapat berproduksi puluhan tahun.",
    productOlahan: [
      {
        name: "Biji Jengkol",
        description: "menjadi keripik dan masakan khas jengkol balado, gulai jengkol, dan sebagainya."
      },
      // {
      //   name: "Keripik Jengkol",
      //   description: "Olahan jengkol menjadi keripik renyah dan gurih."
      // },
      // {
      //   name: "Emping Jengkol",
      //   description: "Olahan tradisional jengkol menjadi emping khas."
      // },
      // {
      //   name: "Tepung Jengkol",
      //   description: "Tepung dari jengkol untuk berbagai keperluan kuliner."
      // }
    ],
    pricing: {
      monthly: "41.667",
      yearly: "500.000",
      fiveYears: "2.500.000",
      sellPrice: "4.000.000",
      profit: {
        yearly: "1.500.000",
        monthly: "125.000",
        weekly: "28.846",
        daily: "4.110"
      }
    },
    investmentPlan: {
      name: "Paket 10 Pohon Jengkol",
      price: 2500000,
      duration: "5-8 Tahun",
      returns: "Rp 40.000.000",
      plantType: "Jengkol Produktif",
      riskLevel: "Bergantung Alam",
      installmentOptions: [
        { period: "Per 5 Tahun", amount: 2500000, perTree: 250000 },
        { period: "Per Tahun", amount: 500000, perTree: 50000 },
        { period: "Per Bulan", amount: 41667, perTree: 4167 }
      ],
      features: [
        "10 Pohon Jengkol Produktif",
        "Proyeksi keuntungan hingga Rp 40.000.000",
        "Cicilan mulai Rp 41.667/bulan",
        "Panen reguler setelah berbuah",
        "Sertifikat kepemilikan pohon",
        "Perawatan profesional",
        "Pasar lokal yang stabil"
      ]
    }
  },
  {
    name: "alpukat",
    nameEn: "Persea americana",
    years: "3 - 5 tahun",
    location: "Tumbuh di daerah beriklim sedang & tropis",
    description: "Pohon buah tropis yang banyak dibudidayakan karena rasanya lezat dan kaya gizi. Berbuah 3-5 tahun jika berasal dari bibit okulasi, atau 6-8 tahun bila dari biji. Setelah matang, pohon ini dapat berproduksi puluhan tahun dengan perawatan yang baik. ",
    productOlahan: [
      {
        name: "Buah Alpukat",
        description: "Buah konsumsi yang mengandung daya serat tinggi."
      },
      {
        name: "Guacamole",
        description: "Saus khas Meksiko."
      },
      {
        name: "Minyak Alpukat",
        description: "TMasakan sehat dan perawatan kulit."
      },
    ],
    pricing: {
      monthly: "33.333",
      yearly: "400.000",
      fiveYears: "2.000.000",
      sellPrice: "3.500.000",
      profit: {
        yearly: "1.500.000",
        monthly: "125.000",
        weekly: "28.846",
        daily: "4.110"
      }
    },
    investmentPlan: {
      name: "Paket 10 Pohon Alpukat",
      price: 2000000,
      duration: "3-5 Tahun",
      returns: "Rp 35.000.000",
      plantType: "Alpukat Unggul",
      riskLevel: "Bergantung Alam",
      installmentOptions: [
        { period: "Per 5 Tahun", amount: 2000000, perTree: 200000 },
        { period: "Per Tahun", amount: 400000, perTree: 40000 },
        { period: "Per Bulan", amount: 33333, perTree: 3333 }
      ],
      features: [
        "10 Pohon Alpukat Unggul",
        "Proyeksi keuntungan hingga Rp 35.000.000",
        "Cicilan mulai Rp 33.333/bulan",
        "Panen cepat dalam 3-5 tahun",
        "Sertifikat kepemilikan pohon",
        "Buah berkualitas premium",
        "Permintaan pasar yang tinggi"
      ]
    }
  },
  {
    name: "aren",
    nameEn: "Arenga pinnata",
    years: "7 - 12 tahun",
    location: "Tumbuh di pegunungan & perbukitan",
    description: "Tanaman aren mulai dapat disadap niranya saat memasuki usia produktif, dengan hasil yang sangat dipengaruhi oleh kondisi tanah dan iklim. Penyadapan dilakukan pada tandan bunga jantan, dan pohon dapat terus menghasilkan nira selama beberapa tahun sebelum akhirnya menua.",
    productOlahan: [
      {
        name: "Gula Aren / Gula Semut",
        description: "Pemanis alami berbentuk cetakan atau butiran."
      },
      {
        name: "Kolang-kaling",
        description: "Buah aren yang diolah menjadi manisan atau campuran minuman."
      },
      {
        name: "Sirup Aren",
        description: "Cairan kental manis untuk campuran minuman dan kue."
      },
      {
        name: "Bioetanol",
        description: "Energi terbarukan dari fermentasi nira aren menggunakan Saccharomyces cerevisiae."
      }
    ],
    pricing: {
      monthly: "58.333",
      yearly: "700.000",
      fiveYears: "3.500.000",
      sellPrice: "8.000.000",
      profit: {
        yearly: "4.500.000",
        monthly: "375.000",
        weekly: "86.538",
        daily: "12.329"
      }
    },
    investmentPlan: {
      name: "Paket 10 Pohon Aren",
      price: 3500000,
      duration: "7-12 Tahun",
      returns: "Rp 80.000.000",
      plantType: "Aren Produktif",
      riskLevel: "Bergantung Alam",
      installmentOptions: [
        { period: "Per 5 Tahun", amount: 3500000, perTree: 350000 },
        { period: "Per Tahun", amount: 700000, perTree: 70000 },
        { period: "Per Bulan", amount: 58333, perTree: 5833 }
      ],
      features: [
        "10 Pohon Aren Produktif",
        "Proyeksi keuntungan hingga Rp 80.000.000",
        "Cicilan mulai Rp 58.333/bulan",
        "Produk gula aren dan nira premium",
        "Sertifikat kepemilikan pohon",
        "Potensi bioetanol sebagai energi terbarukan",
        "Pasar yang terus berkembang"
      ]
    }
  }
];

export default function PlantShowcaseSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [cicilanModal, setCicilanModal] = useState<{ isOpen: boolean; plant: any }>({
    isOpen: false,
    plant: null
  });
  const { showSuccess, showError, AlertComponent } = useAlert();

  const handleInvestment = async (plant: any) => {
    if (!session) {
      router.push('/login');
      return;
    }

    setIsLoading(plant.name);

    try {
      const response = await fetch('/api/payment/create-investment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plant.investmentPlan,
          user: session.user,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        showError('Gagal Membuat Pembayaran', data.error || 'Terjadi kesalahan pada server');
        return;
      }

      if (data.success && data.data && data.data.redirect_url) {
        window.location.href = data.data.redirect_url;
      } else {
        console.error("Failed to get redirect URL");
        console.error("Full response data:", data);
        showError('Gagal Membuat Pembayaran', 'Gagal membuat pembayaran. Silakan coba lagi atau hubungi customer service.');
      }
    } catch (error) {
      console.error('Error creating investment payment:', error);
      showError('Kesalahan Pembayaran', 'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleCicilanSelect = (plant: any) => {
    if (!session) {
      router.push('/login');
      return;
    }
    setCicilanModal({ isOpen: true, plant: plant.investmentPlan });
  };
  return (
    <section className="bg-[#4A5C57]">
      <AlertComponent />
      <div>
        {plants.map((plant, index) => (
          <div
            key={index}
            className="min-h-screen relative overflow-hidden bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/landing/product-bg.png)',
            }}
          >
            {/* Inner content container - 75% of width and height */}
            <div className={`min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 ${index === 0 ? 'pt-8 sm:pt-12 lg:pt-16' : 'py-8 sm:py-12 lg:py-16'}`}>
              <div className="bg-[#FFFCE3] rounded-3xl p-4 sm:p-6 lg:p-8 relative overflow-hidden shadow-lg w-full max-w-7xl lg:max-w-none xl:max-w-7xl" style={{ minHeight: '70vh', width: '95%' }}>
                <div className="h-full flex flex-col">
                  {/* Main Content Area */}
                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[500px_1fr_350px] gap-4 sm:gap-6 lg:gap-8 items-center">
                    {/* Left Section - Plant Info */}
                    <div className="space-y-6">
                      {/* Plant Title */}
                      <div className="bg-[#324D3E] rounded-r-2xl w-max px-4 sm:px-6 lg:px-8 py-3 lg:py-4 text-white -ml-4 sm:-ml-6 lg:-ml-8">
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold font-[family-name:var(--font-poppins)] capitalize">
                          Tanaman {plant.name}
                        </h3>
                      </div>

                      {/* Plant Details - Outside/below the title box */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 lg:gap-4 text-xs sm:text-sm font-medium text-gray-700 pl-2">
                        <span className="text-gray-700">{plant.nameEn}</span>
                        <div className="hidden sm:block w-px h-3 sm:h-4 bg-gray-400"></div>
                        <span className="text-gray-700">{plant.years}</span>
                        <div className="hidden sm:block w-px h-3 sm:h-4 bg-gray-400"></div>
                        <span className="text-gray-700">{plant.location}</span>
                      </div>

                      {/* Description */}
                      <div className="hidden lg:block">
                        <p className="text-sm lg:text-base leading-relaxed text-gray-700 font-medium">
                          {plant.description}
                        </p>
                      </div>

                      {/* Product Information */}
                      <div className="hidden xl:block">
                        <h4 className="text-base lg:text-lg font-bold text-[#4A5C57] mb-3 font-[family-name:var(--font-poppins)]">
                          Produk Olahan dari {plant.name}:
                        </h4>
                        <ul className="space-y-2 text-xs lg:text-sm">
                          {plant.productOlahan.map((product, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-[#4A5C57] mr-2">•</span>
                              <div>
                                <strong>{product.name}</strong><br />
                                <span className="text-gray-600">{product.description}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Center Section - Plant Image */}
                    <div className="flex justify-center items-center md:col-span-2 xl:col-span-1 order-first md:order-none">
                      <Image
                        src={`/landing/${plant.name}.png`}
                        alt={`Tanaman ${plant.name}`}
                        width={250}
                        height={350}
                        className="object-contain max-h-[250px] sm:max-h-[300px] lg:max-h-[400px] w-auto"
                      />
                    </div>

                    {/* Right Section - Investment Info */}
                    <div className="space-y-3 sm:space-y-4 flex flex-col justify-start md:col-span-2 xl:col-span-1">
                      {/* Investment Simulation Card */}
                      <div className="bg-gradient-to-r from-[#324D3E] via-[#507863] via-[#669D7E] to-[#748390] rounded-2xl p-3 sm:p-4 text-white shadow-md relative z-10">
                        <h4 className="text-base sm:text-lg font-bold mb-2 font-[family-name:var(--font-poppins)]">
                          Simulasi Cicilan Per 10 Pohon
                        </h4>
                        <p className="text-xs sm:text-sm mb-2">Mulai Dari</p>
                        <div className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                          Rp {plant.pricing.monthly} <span className="text-xs sm:text-sm font-normal">/bulan</span>
                        </div>
                        <button
                          className="w-full bg-white text-[#4A5C57] py-2 px-4 rounded-full font-bold text-xs sm:text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                          onClick={() => handleInvestment(plant)}
                          disabled={isLoading === plant.name}
                        >
                          {isLoading === plant.name ? 'Processing...' : 'Bayar Langsung'}
                        </button>
                      </div>

                      {/* Investment Details */}
                      <div className="relative -mt-8 sm:-mt-12">
                        <div className="bg-white rounded-2xl p-4 shadow-md border relative z-0 pt-8 sm:pt-12">
                          <h5 className="text-lg font-bold text-[#4A5C57] mb-3 font-[family-name:var(--font-poppins)]">
                            Lainnya
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Per Tahun</span>
                              <span className="font-bold text-gray-900">Rp {plant.pricing.yearly}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Per 5 Tahun</span>
                              <span className="font-bold text-gray-900">Rp {plant.pricing.fiveYears}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-gray-700">Harga Jual Pohon</span>
                              <span className="font-bold text-gray-900">Rp {plant.pricing.sellPrice}</span>
                            </div>
                          </div>
                          <button
                            className="w-full mt-3 bg-[#324D3E] text-white py-2 px-4 rounded-full font-bold text-xs sm:text-sm hover:bg-[#4C3D19] transition-colors"
                            onClick={() => handleCicilanSelect(plant)}
                            disabled={isLoading === plant.name}
                          >
                            💳 Beli dengan Cicilan
                          </button>
                        </div>
                      </div>

                      {/* Profit Projection */}
                      <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-md">
                        <h5 className="text-lg font-bold text-[#4A5C57] mb-2 font-[family-name:var(--font-poppins)]">
                          Pendapatan / Keuntungan Bersih
                        </h5>
                        <div className="text-2xl font-bold text-[#4A5C57] mb-3">
                          Rp {plant.pricing.profit.yearly} <span className="text-sm font-normal">/tahun</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bulanan</span>
                            <span className="font-semibold">Rp {plant.pricing.profit.monthly}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Mingguan</span>
                            <span className="font-semibold">Rp {plant.pricing.profit.weekly}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Harian</span>
                            <span className="font-semibold">Rp {plant.pricing.profit.daily}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          *Simulasi Perhitungan Keuntungan investasi setelah dikurangi biaya - biaya lainnya
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cicilan Modal */}
      <CicilanModal
        isOpen={cicilanModal.isOpen}
        onClose={() => setCicilanModal({ isOpen: false, plant: null })}
        plan={cicilanModal.plant}
        onSuccess={showSuccess}
        onError={showError}
      />
    </section>
  );
}