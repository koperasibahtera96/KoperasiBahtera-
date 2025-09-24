'use client';

import Image from 'next/image';
import { useState } from 'react';

const faqData = [
  {
    question: "Bagaimana Cara Kerjanya?",
    answer: "Sistem kami bekerja melalui platform digital yang mudah diakses. Anda dapat memilih jenis tanaman, menentukan jumlah paket, dan memantau perkembangan tanaman Anda secara real-time melalui dashboard yang disediakan."
  },
  {
    question: "Seberapa Amankah Dana Saya Setelah Pengajuan?",
    answer: "Dana Anda akan dikelola secara transparan dan aman melalui sistem kami yang telah terintegrasi dengan standar keamanan tingkat tinggi. Setiap dana akan dialokasikan ke proyek-proyek yang telah melalui proses seleksi ketat, dan Anda akan mendapat laporan berkala mengenai penggunaan dana dan perkembangan proyek. Selain itu, kami menggunakan sistem perbankan digital yang aman dan terpercaya. Kami berkomitmen untuk menjaga kepercayaan Anda dengan memastikan setiap operasi mengikuti prosedur audit yang ketat sesuai tujuan pembelian paket tanaman Anda."
  },
  {
    question: "Apakah Pertanian Ini Dijamin untuk Jangka Panjang?",
    answer: "Ya, paket pertanian kami dirancang untuk jangka panjang dengan jaminan keberlanjutan. Kami bekerja sama dengan petani berpengalaman dan menggunakan teknologi modern untuk memastikan produktivitas yang optimal sepanjang periode pembelian paket."
  },
  {
    question: "Bagaimana Proses Pembelian Paket Pertanian Berkelanjutan?",
    answer: "Proses pembelian paket dimulai dengan pendaftaran akun, pemilihan paket tanaman, pembayaran, dan kemudian monitoring berkala. Kami menyediakan laporan transparan mengenai perkembangan tanaman, estimasi hasil panen, dan proyeksi keuntungan yang akan Anda terima."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      className="py-12 sm:py-16 md:py-18 lg:py-20 px-4 sm:px-6 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/landing/faq-bg.webp)',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Title at top center */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#4C3D19] mb-8 sm:mb-10 md:mb-12 text-center font-[family-name:var(--font-poppins)]">
          Frequently Asked Question
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3 lg:gap-8 xl:gap-12 items-start">
          {/* Left Side - Image */}
          <div className="flex flex-col items-center lg:items-start lg:w-fit">
            {/* FAQ Image */}
            <div className="relative max-w-md lg:max-w-md xl:max-w-lg">
              <Image
                src="/landing/FAQ.webp"
                alt="FAQ Illustration"
                width={600}
                height={500}
                className="object-cover w-full h-[400px] md:h-[500px] lg:h-[350px] xl:h-[450px] rounded-3xl"
                loading="lazy"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGBkbHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyydw3Vm7nksNvEMEuzgxW1vfG+nW9n1YrWb04m0xYnlVTsrLuA9O48/PbwgIm2eaWcA3DRTJrvkv8Ab7pF0pXyUMjhqBQgp1fT8/1u7j6b+fQpH4k3VFsWJb1m3W/G65qJ7bAKsRAmKjLJoGhgJCf0YdkODBrNNNnPrG0l16LTcKU5PpKl+T2rQ7VJKgAA=="
              />
            </div>
          </div>

          {/* Right Side - FAQ Questions */}
          <div className="divide-y divide-gray-300 md:mt-6 lg:mt-0 lg:-ml-8 xl:-ml-12">
            {faqData.map((faq, index) => (
              <div key={index} className="py-4 md:py-5 lg:py-4">
                {/* Question */}
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full py-2 md:py-3 lg:py-2 text-left flex justify-between items-center group"
                >
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#4C3D19] font-[family-name:var(--font-poppins)] pr-4 md:pr-6">
                    {faq.question}
                  </h3>
                  <div className={`transition-transform duration-200 flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`}>
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6 lg:w-5 lg:h-5 text-[#4C3D19]"
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
                    ? 'max-h-[500px] md:max-h-[600px] opacity-100'
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className="pt-3 pr-6 md:pr-8">
                    <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
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