'use client';

export function AboutUs() {
  const teamMembers = [
    {
      name: "Halim Perdana Kusuma, S.H., M.H.",
      position: "Ketua",
      image: "/api/placeholder/200/250"
    },
    {
      name: "Meidi Asri, S.H., M.H.",
      position: "Sekretaris",
      image: "/api/placeholder/200/250"
    },
    {
      name: "Rika Aryanti, S.E.",
      position: "Bendahara",
      image: "/api/placeholder/200/250"
    },
    {
      name: "Bobot Sudoyo, S.P., M.Si.",
      position: "Direktur Operasional",
      image: "/api/placeholder/200/250"
    }
  ];

  return (
    <section id="tentang" className="py-24 bg-white">
      <div className="container-centered">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-200 text-emerald-700 rounded-full text-sm font-bold mb-8">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
            </svg>
            Tentang Kami
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Koperasi <span className="text-emerald-600 relative">
              Bintang Merah Sejahtera
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-red-200 rounded-full"></div>
            </span>
          </h2>
          <div className="text-xl text-red-700 font-bold mb-6">
            (BAHTERA)
          </div>
        </div>

        {/* Company Description */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-gradient-to-r from-red-50 to-green-50 rounded-2xl p-8 lg:p-12 border border-red-200">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              <strong className="text-red-700">Koperasi Bintang Merah Sejahtera (BAHTERA)</strong> merupakan badan hukum koperasi tersertifikasi yang 
              didirikan atas semangat gotong royong dan prinsip kekeluargaan.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Hadir sebagai wadah pemberdayaan ekonomi yang inklusif, profesional dan berkelanjutan.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Sebagai upaya pelestarian lingkungan yang selaras dengan peningkatan kesejahteraan masyarakat, 
              kami menginisiasi program penghijauan berbasis tanaman multi-komoditas di kawasan Hutan 
              Produksi Tetap (HPT) dan Hutan Produksi (HP). Program ini bertujuan untuk pemulihan lahan, 
              meningkatkan produktifitas hutan, serta mengoptimalkan potensi ekonomi kawasan melalui 
              pendekatan agroforestri berkelanjutan.
            </p>
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="grid lg:grid-cols-2 gap-8 mb-20">
          {/* Vision */}
          <div className="bg-gradient-to-br from-red-50 to-yellow-50 rounded-xl p-8 border border-red-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-red-900">Visi</h3>
            </div>
            <div className="bg-white rounded-lg p-6 min-h-[120px] flex items-center justify-center border border-red-100">
              <p className="text-gray-600 text-center italic">
                Visi akan diisi sesuai dengan dokumen resmi koperasi
              </p>
            </div>
          </div>

          {/* Mission */}
          <div className="bg-gradient-to-br from-green-50 to-yellow-50 rounded-xl p-8 border border-green-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-green-900">Misi</h3>
            </div>
            <div className="bg-white rounded-lg p-6 min-h-[120px] flex items-center justify-center border border-green-100">
              <p className="text-gray-600 text-center italic">
                Misi akan diisi sesuai dengan dokumen resmi koperasi
              </p>
            </div>
          </div>
        </div>

        {/* Team Management */}
        <div>
          <div className="text-center mb-12">
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Tim <span className="text-red-600">Manajemen</span>
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Dipimpin oleh tim berpengalaman dengan dedikasi tinggi untuk 
              kesuksesan program investasi hijau berkelanjutan.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="group">
                <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105 border border-gray-100">
                  {/* Photo Placeholder */}
                  <div className="relative h-64 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 text-center">
                    <h4 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                      {member.name}
                    </h4>
                    <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      {member.position}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Ingin Mengetahui Lebih Lanjut?
            </h3>
            <p className="text-yellow-100 mb-6 max-w-2xl mx-auto">
              Hubungi tim kami untuk konsultasi mengenai program investasi hijau 
              dan bagaimana Anda dapat bergabung dengan misi pelestarian lingkungan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-red-700 hover:bg-red-50 font-bold px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105">
                📞 Hubungi Kami
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-emerald-700 font-bold px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105">
                📧 Email Kami
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}