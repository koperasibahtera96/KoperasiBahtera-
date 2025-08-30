'use client';

import Image from 'next/image';
import { useState } from 'react';

const faqData = [
  {
    question: "Bagaimana Cara Kerjanya?",
    answer: "Sistem investasi kami bekerja melalui platform digital yang mudah diakses. Anda dapat memilih jenis tanaman, menentukan jumlah investasi, dan memantau perkembangan investasi Anda secara real-time melalui dashboard yang disediakan."
  },
  {
    question: "Seberapa Amankah Dana Saya Setelah Pengajuan?",
    answer: "Dana Anda akan dikelola secara transparan dan aman melalui sistem kemi yang telah terintegrasi dengan standar keamanan tingkat tinggi. Setiap dana keatas akan dialokasikan ke proyek-proyek yang telah melalui proses seleksi ketat, dan Anda akan mendapat laporan berkala mengenai penggunaan dana dan perkembangan proyek. Selain itu, kami menggunakan sistem perbankan digital yang aman dan terpercaya. Kami berkomitmen untuk menjaga kepercayaan Anda dengan memastikan setiap operasi mengikuti prosedur audit yang ketat sesuai tujuan Anda menginvestasikan dana kepada koperasi."
  },
  {
    question: "Apakah Peternakan Ini Dijamin untuk Jangka Panjang?",
    answer: "Ya, investasi pertanian kami dirancang untuk jangka panjang dengan jaminan keberlanjutan. Kami bekerja sama dengan petani berpengalaman dan menggunakan teknologi modern untuk memastikan produktivitas yang optimal sepanjang periode investasi."
  },
  {
    question: "Bagaimana Proses Investasi Pertanian Berkelanjutan?",
    answer: "Proses investasi dimulai dengan pendaftaran akun, pemilihan paket investasi, pembayaran, dan kemudian monitoring berkala. Kami menyediakan laporan transparan mengenai perkembangan tanaman, estimasi hasil panen, dan proyeksi keuntungan yang akan Anda terima."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/landing/faq-bg.png)',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Title at top center */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#4C3D19] mb-8 sm:mb-12 text-center font-[family-name:var(--font-poppins)]">
          Frequently Asked Question
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-4 items-start">
          {/* Left Side - Image */}
          <div className="flex flex-col items-center lg:items-start lg:w-fit">
            {/* FAQ Image */}
            <div className="relative max-w-md lg:max-w-lg">
              <Image
                src="/landing/FAQ.jpg"
                alt="FAQ Illustration"
                width={600}
                height={500}
                className="object-cover w-full h-[500px] lg:h-[400px] xl:h-[500px] rounded-3xl"
              />
            </div>
          </div>

          {/* Right Side - FAQ Questions */}
          <div className="divide-y divide-gray-300 lg:-ml-16 xl:-ml-20">
            {faqData.map((faq, index) => (
              <div key={index} className="py-4">
                {/* Question */}
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full py-2 text-left flex justify-between items-center group"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-[#4C3D19] font-[family-name:var(--font-poppins)] pr-4">
                    {faq.question}
                  </h3>
                  <div className={`transition-transform duration-200 flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`}>
                    <svg
                      className="w-5 h-5 text-[#4C3D19]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Answer */}
                <div className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className="pt-3 pr-8">
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}