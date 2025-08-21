import { Grid } from '@/components/layout/Grid';

export function ContactSection() {
  return (
    <section id="kontak" className="relative py-24 overflow-hidden">
      {/* Beautiful garden background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/85 via-emerald-800/80 to-green-900/85"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30"></div>
      </div>

      <div className="relative container-centered">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-200 text-emerald-700 rounded-md text-sm font-bold mb-8 backdrop-blur-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
            </svg>
            Testimoni Investor
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight">
            Apa Kata <span className="text-emerald-300 relative">
              Investor Kami
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-emerald-300 rounded-full"></div>
            </span>
          </h2>
          <p className="text-xl text-emerald-100 max-w-4xl mx-auto leading-relaxed">
            Dengarkan pengalaman langsung dari investor yang telah merasakan keuntungan investasi tanaman nusantara
          </p>
        </div>

        {/* Review Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Review 1 */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                AS
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">Ahmad Santoso</div>
                <div className="text-emerald-600 font-medium">Investor Gaharu</div>
              </div>
            </div>
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="text-yellow-400 text-xl">⭐</div>
              ))}
            </div>
            <p className="text-gray-700 leading-relaxed">
              &ldquo;Investasi gaharu memberikan return yang luar biasa! Dalam 8 tahun, saya sudah mendapatkan keuntungan 400%.
              Tim sangat profesional dan monitoring 24/7 membuat saya tenang.&rdquo;
            </p>
          </div>

          {/* Review 2 */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                SM
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">Sarah Mulyani</div>
                <div className="text-yellow-600 font-medium">Investor Alpukat</div>
              </div>
            </div>
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="text-yellow-400 text-xl">⭐</div>
              ))}
            </div>
            <p className="text-gray-700 leading-relaxed">
              &ldquo;Alpukat mentega adalah investasi yang sangat menguntungkan. Pasar ekspor yang stabil dan permintaan
              yang terus meningkat. ROI yang konsisten setiap tahunnya.&rdquo;
            </p>
          </div>

          {/* Review 3 */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                RJ
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">Rizki Jaya</div>
                <div className="text-blue-600 font-medium">Investor Jengkol</div>
              </div>
            </div>
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="text-yellow-400 text-xl">⭐</div>
              ))}
            </div>
            <p className="text-gray-700 leading-relaxed">
              &ldquo;Jengkol tidak hanya investasi yang menguntungkan, tapi juga berkontribusi pada kesehatan.
              Pasar farmasi yang berkembang pesat membuat nilai investasi semakin tinggi.&rdquo;
            </p>
          </div>
        </div>

        {/* Comment Submission Form */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl border border-white/20 shadow-xl">
            <h4 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Bagikan Pengalaman Anda
            </h4>
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jenis Investasi
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200">
                    <option>Pilih jenis investasi</option>
                    <option>Gaharu</option>
                    <option>Alpukat Mentega</option>
                    <option>Jengkol</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className="text-3xl text-gray-300 hover:text-yellow-400 transition-colors duration-200"
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Komentar & Pengalaman
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Bagikan pengalaman investasi Anda, tips, atau saran untuk investor lain..."
                ></textarea>
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  📝 Kirim Review
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: '#beranda', label: 'Beranda' },
    { href: '#tentang', label: 'Tentang Kami' },
    { href: '#investasi', label: 'Paket Investasi' },
    { href: '#manfaat', label: 'Manfaat' },
    { href: '#kontak', label: 'Kontak' },
  ];

  const services = [
    'Investasi Sayuran Organik',
    'Investasi Buah Premium',
    'Investasi Kayu Berkualitas',
    'Konsultasi Investasi',
    'Monitoring & Laporan',
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-centered py-16">
        <Grid cols={4} className="mb-12">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex-center">
                <span className="text-white font-bold text-lg">IH</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Investasi Hijau</h3>
                <p className="text-sm text-gray-400">Tanaman Berkualitas</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Platform investasi tanaman terpercaya dengan pengalaman lebih dari 10 tahun.
              Memberikan kesempatan investasi yang menguntungkan dan ramah lingkungan.
            </p>
            <div className="flex gap-4">
              <a
                href="https://wa.me/6281234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-lg flex-center transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.885 3.488A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
              </a>
              <a
                href="https://instagram.com/investasihijau"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-lg flex-center transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://facebook.com/investasihijau"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-lg flex-center transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-6">Navigasi</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-gray-300 hover:text-green-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-6">Layanan</h4>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service}>
                  <span className="text-gray-300">{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-6">Kontak</h4>
            <div className="space-y-4">
              <div>
                <p className="text-gray-300 mb-1">WhatsApp:</p>
                <p className="text-green-400 font-medium">+62 812-3456-7890</p>
              </div>
              <div>
                <p className="text-gray-300 mb-1">Email:</p>
                <p className="text-green-400 font-medium">info@investasihijau.com</p>
              </div>
              <div>
                <p className="text-gray-300 mb-1">Alamat:</p>
                <p className="text-gray-300">
                  Jl. Sudirman No. 123<br />
                  Jakarta Pusat 10110
                </p>
              </div>
            </div>
          </div>
        </Grid>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} Investasi Hijau. Semua hak cipta dilindungi.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                Syarat & Ketentuan
              </a>
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                Kebijakan Privasi
              </a>
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                FAQ
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}