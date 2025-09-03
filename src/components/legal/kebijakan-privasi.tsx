
import React from 'react';

export const KebijakanPrivasiContent = () => (
  <div className="prose prose-sm max-w-none text-gray-700">
    <h2 className="text-xl font-bold text-gray-800 mb-4">Kebijakan Privasi</h2>
    <p className="mb-4">
      Privasi Anda penting bagi kami di Aplikasi Investasi Hijau. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda.
    </p>

    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">1. Informasi yang Kami Kumpulkan</h3>
    <ul className="list-disc list-inside space-y-2">
      <li><strong>Data Pribadi:</strong> Nama, tanggal lahir, alamat email, nomor telepon, alamat, pekerjaan, dan foto KTP serta wajah untuk verifikasi.</li>
      <li><strong>Data Transaksi:</strong> Rincian investasi, pembayaran, dan riwayat transaksi Anda.</li>
      <li><strong>Data Penggunaan:</strong> Informasi tentang bagaimana Anda menggunakan aplikasi kami, termasuk alamat IP dan jenis perangkat.</li>
    </ul>

    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">2. Bagaimana Kami Menggunakan Informasi Anda</h3>
    <ul className="list-disc list-inside space-y-2">
      <li>Untuk memverifikasi identitas Anda (KYC - Know Your Customer).</li>
      <li>Untuk memproses pendaftaran, investasi, dan transaksi lainnya.</li>
      <li>Untuk berkomunikasi dengan Anda mengenai akun dan layanan kami.</li>
      <li>Untuk meningkatkan keamanan dan kualitas aplikasi kami.</li>
      <li>Untuk mematuhi kewajiban hukum dan peraturan yang berlaku.</li>
    </ul>

    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">3. Keamanan Data</h3>
    <ul className="list-disc list-inside space-y-2">
      <li>Kami menerapkan langkah-langkah keamanan teknis dan organisasi untuk melindungi data Anda dari akses yang tidak sah.</li>
      <li>Data sensitif seperti password dienkripsi.</li>
      <li>Akses ke data pribadi Anda hanya diberikan kepada staf yang berwenang.</li>
    </ul>

    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">4. Berbagi Informasi</h3>
    <p>
      Kami tidak akan menjual atau menyewakan informasi pribadi Anda. Kami hanya dapat membagikan informasi Anda kepada pihak ketiga dalam kondisi berikut:
    </p>
    <ul className="list-disc list-inside space-y-2 mt-2">
      <li>Dengan penyedia layanan pembayaran untuk memproses transaksi.</li>
      <li>Dengan pihak berwenang jika diwajibkan oleh hukum.</li>
    </ul>

    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">5. Hak Anda</h3>
    <p>
      Anda memiliki hak untuk mengakses dan memperbarui informasi pribadi Anda melalui profil akun Anda.
    </p>

    <p className="mt-6">
      Dengan menggunakan aplikasi kami, Anda menyetujui pengumpulan dan penggunaan informasi Anda sesuai dengan Kebijakan Privasi ini.
    </p>
  </div>
);
