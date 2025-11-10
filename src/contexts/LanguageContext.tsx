"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "id" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const translations = {
  id: {
    // Navigation
    "nav.beranda": "Beranda",
    "nav.program": "Program",
    "nav.produk": "Produk",
    "nav.review": "Review",
    "nav.tentangKami": "Tentang Kami",
    "nav.faq": "FAQ",
    "nav.tanamanSaya": "Tanaman Saya",
    "nav.pembayaran": "Pembayaran",
    "nav.masuk": "Masuk",
    "nav.daftar": "Daftar Sekarang",
    "nav.profile": "Profile",
    "nav.logout": "Logout",
    "nav.hello": "Hello",

    // Status messages
    "status.pending": "⏳ Menunggu Verifikasi",
    "status.rejected": "❌ Verifikasi Ditolak",
    "status.notVerified": "⏳ Belum Diverifikasi",
    "status.pendingShort": "⏳ Menunggu",
    "status.rejectedShort": "❌ Ditolak",
    "status.notVerifiedShort": "⏳ Belum",
    "status.refreshTitle": "Periksa Status Terbaru",
    "status.resubmitTitle": "Ajukan Ulang Verifikasi",

    // Payment messages
    "payment.success.title": "Pembayaran Berhasil!",
    "payment.success.message":
      "Terima kasih! Pembayaran investasi Anda telah berhasil diproses. Order ID: {orderId}. Tim kami akan segera memproses investasi Anda.",
    "payment.error.title": "Pembayaran Gagal",
    "payment.error.message":
      "Maaf, terjadi kesalahan dalam proses pembayaran. Silakan coba lagi atau hubungi customer service kami.",

    // Resubmit modal
    "resubmit.title": "Ajukan Ulang Verifikasi",
    "resubmit.description":
      "Silakan unggah ulang foto KTP dan foto selfie Anda. Tim admin akan meninjau ulang data Anda.",
    "resubmit.rejectionNote": "Catatan penolakan:",
    "resubmit.rejectionNoteSecond": "Catatan penolakan:",
    "resubmit.ktpLabel": "Foto KTP",
    "resubmit.selfieLabel": "Foto Selfie (Ambil dari kamera)",
    "resubmit.selfieTaken":
      "Foto selfie diambil. Anda dapat mengirim atau ambil ulang.",
    "resubmit.cancel": "Batal",
    "resubmit.submit": "Kirim Pengajuan Ulang",
    "resubmit.uploading": "Mengunggah...",
    "resubmit.uploadBothFiles": "Silakan unggah kedua file terlebih dahulu",
    "resubmit.success":
      "Permintaan pengajuan ulang berhasil dikirim. Mohon tunggu peninjauan admin.",
    "resubmit.error": "Terjadi kesalahan saat mengajukan ulang",

    // Language
    "language.switch": "Ganti Bahasa",
    "language.indonesian": "ID",
    "language.english": "EN",

    // Hero Section
    "hero.subtitle": "Untuk Masa Depan",
    "hero.title.line1": "Pembiayaan Pengembangan Usaha Pertanian",
    "hero.title.line2": "Berkelanjutan yang Mudah",
    "hero.description":
      "Solusi tepat bagi Anda yang ingin meraih keuntungan sekaligus memberikan dampak positif bagi lingkungan dan masyarakat. Melalui sistem investasi yang sederhana dan transparan, Anda dapat ikut mendukung petani lokal untuk meningkatkan hasil panen.",
    "hero.cta": "Mulai Sekarang",
    "hero.scrollMore": "Selengkapnya",

    // Benefits Section
    "benefits.title": "Dampak dan Manfaat",
    "benefits.financial.title": "Keuntungan Finansial",
    "benefits.financial.description":
      "Tanaman produktif yang memberikan hasil bernilai tinggi setelah masa permanen",
    "benefits.longterm.title": "Aset Jangka Panjang",
    "benefits.longterm.description":
      "Nilai Tanaman bertambah seiring usia, cocok untuk tabungan masa depan",
    "benefits.environmental.title": "Kontribusi Lingkungan",
    "benefits.environmental.description":
      "Menjaga keseimbangan alam, mengurangi polusi, dan mendukung penghijauan",
    "benefits.social.title": "Dampak Sosial",
    "benefits.social.description":
      "Membantu ekonomi petani dan masyarakat sekitar lokasi pertanian",
    "benefits.legacy.title": "Warisan Masa Depan",
    "benefits.legacy.description":
      "Tanaman yang bisa menjadi aset dan dapat diwariskan untuk generasi berikutnya",

    // Rules Section
    "rules.title": "Panduan Berpartisipasi!",
    "rules.package.title": "Pembiayaan Paket",
    "rules.package.description":
      "Setiap Anggota dapat mengikuti program ini dengan minimal membeli 1 paket (10 Pohon) Tanaman.",
    "rules.duration.title": "Jangka Waktu",
    "rules.duration.description":
      "Program ini bersifat jangka menengah/panjang (5-7 tahun, tergantung jenis tanaman)",
    "rules.profit.title": "Bagi Hasil",
    "rules.profit.description":
      "Hasil panen akan diberikan setelah dikurangi biaya-biaya lainnya",
    "rules.transparency.title": "Transparansi",
    "rules.transparency.description":
      "Anggota mendapat laporan berkala mengenai pertumbuhan tanaman, perawatan tanaman, kondisi lahan, dan proyeksi keuntungan",
    "rules.risk.title": "Risiko",
    "rules.risk.description":
      "Anggota menyadari bahwa program ini bergantung pada faktor alam, perawatan, serta pasar",

    // CTA Section
    "cta.title": "Tanam Hari ini, Hijaukan Bumi Sejahterakan Hati",
    "cta.description":
      "Bersama membangun masa depan hijau dan berkontribusi pada kelestarian lingkungan",
    "cta.button": "Gabung Sekarang",

    // Plant Showcase Section
    "plants.title": "Langkah Hijau Anda Dimulai di Sini",
    "plants.subtitle":
      "Kenali tanaman terbaik untuk Anda, baik untuk langkah awal maupun kontribusi berkelanjutan.",
    "plants.loading": "Memuat data tanaman...",
    "plants.plantName": "Tanaman {name}",
    "plants.simulationTitle": "Simulasi Cicilan Per 10 Pohon",
    "plants.buyNow": "Beli Sekarang",
    "plants.startingFrom": "Mulai Dari",
    "plants.fullPayment": "Pembayaran Penuh",
    "plants.perMonth": "Per Bulan",
    "plants.perPackage": "/Paket",
    "plants.packageInfo": "10 Pohon / Paket",
    "plants.payDirectly": "Bayar Langsung",
    "plants.comingSoon": "Segera Hadir",
    "plants.others": "Lainnya",
    "plants.perYear": "Per Tahun",
    "plants.perFiveYears": "Per 5 Tahun",
    "plants.sellPrice": "Harga Jual Pohon",
    "plants.buyWithInstallment": "💳 Beli dengan Cicilan",
    "plants.installmentDuration": "*Selama {years} tahun masa tanam",
    "plants.profitTitle": "Dapatkan KEUNTUNGAN Hingga",
    "plants.profitPerYear": "/tahun",
    "plants.monthly": "Bulanan",
    "plants.weekly": "Mingguan",
    "plants.daily": "Harian",
    "plants.profitDisclaimer":
      "*Selama ± 15 tahun masa panen",
    "plants.processingProducts": "Produk Olahan dari {name}:",
    "plants.chooseInvestment": "Pilih Investasi",
    "plants.choosePackage": "Pilih Paket Investasi",
    "plants.noPackagesAvailable": "Belum ada paket investasi yang tersedia",
    "plants.investmentDetails": "Detail Investasi",
    "plants.plantType": "Jenis Tanaman:",
    "plants.duration": "Durasi:",
    "plants.treeCount": "Jumlah Pohon:",
    "plants.trees": "Pohon",
    "plants.totalPrice": "Total Harga:",
    "plants.estimatedReturn": "Estimasi Keuntungan Per Bulan:",
    "plants.riskLevel": "Risk Level:",
    "plants.continuePayment": "Lanjutkan Pembayaran",
    "plants.processing2": "Memproses...",
    "plants.cancel": "Batal",
    "plants.orderDetails": "Rincian Pesanan",
    "plants.contractDetails": "Detail Kontrak",
    "plants.contractNumber": "No. Kontrak:",
    "plants.packageType": "Jenis Paket:",
    "plants.packagePrice": "Harga Paket:",
    "plants.paymentType": "Tipe Pembayaran:",
    "plants.paymentTypeFull": "Lunas",
    "plants.referralCode": "Kode Referral (Opsional)",
    "plants.enterReferralCode": "Masukkan Kode Referral:",
    "plants.referralCodeFormat":
      "Kode referral 6 karakter hurif kapital dan angka",
    "plants.confirmationTitle": "Konfirmasi Pesanan",
    "plants.confirmationMessage":
      'Dengan menekan "Lanjutkan", kontrak akan dibuat dan Anda akan diarahkan ke halaman penandatanganan kontrak.',
    "plants.back": "Kembali",
    "plants.continue": "Lanjutkan",
    "plants.creatingContract": "Membuat Kontrak...",
    "plants.contractCreated": "Kontrak Berhasil Dibuat!",
    "plants.contractCreatedMessage":
      "Kontrak {contractNumber} telah dibuat. Anda akan diarahkan untuk menandatangani kontrak.",
    "plants.contractError": "Kesalahan Kontrak",
    "plants.contractErrorMessage": "Terjadi kesalahan saat membuat kontrak.",
    "plants.invalidReferralCode": "Kode Referral Tidak Valid",
    "plants.invalidReferralCodeMessage":
      "Kode referral harus 6 karakter huruf kapital dan angka",
    "plants.contractCreationError": "Gagal Membuat Kontrak",
    "plants.contractCreationErrorMessage":
      "Gagal membuat kontrak. Silakan coba lagi.",
    "plants.verificationRequired": "Verifikasi Diperlukan",
    "plants.verificationRequiredMessage":
      "Akun Anda harus diverifikasi terlebih dahulu untuk melakukan pembelian.",
    // Additional plants page texts
    "plants.myPlantsTitle": "Tanaman Saya",
    "plants.manageSubtitle": "Kelola dan pantau tanaman Anda",
    "plants.empty.title": "Belum Ada Tanaman",
    "plants.empty.description":
      "Mulai pembelian paket Anda hari ini dan berkontribusi untuk masa depan yang lebih berkelanjutan.",
    "plants.empty.cta": "Mulai Bergabung",
    "plants.summary": "Ringkasan Tanaman",
    "plants.infoTitle": "Informasi Tanaman",
    "plants.recentHistory": "Riwayat Terbaru",
    "plants.fullHistory": "Riwayat Lengkap",
    "plants.financialActivity": "Aktivitas Keuangan Terbaru",
    "plants.downloadPdf": "Download PDF",
    "plants.locked": "TERKUNCI",
    "plants.location": "Lokasi:",
    "plants.blockKav": "Blok / Kav:",
    "plants.income": "Pendapatan:",
    "plants.operationalCosts": "Biaya Operasional:",
    "plants.nextPayment": "Pembayaran Berikutnya:",
    "media.imageLoadError": "Gambar tidak dapat dimuat",
    "media.noMedia": "Tidak ada media",
    "media.addedBy": "Ditambahkan oleh:",
    "media.videoNotSupported": "Browser Anda tidak mendukung video HTML5.",
    "plants.moreHistory": "+{count} riwayat lainnya",
    "plants.purchaseDate": "Tanggal Pembelian",
    "plants.status.approved": "Aktif",
    "plants.status.pending": "Menunggu",
    "plants.status.cancelled": "Dibatalkan",
    "plants.status.active": "Aktif",
    "plants.status.completed": "Selesai",
    "plants.plant": "Tanaman",
    "plants.plantInfo": "Informasi Tanaman",
    "plants.disabled": "DINONAKTIFKAN",
    "plants.installmentNumber": "Cicilan ke-",
    "plants.dueDate": "Jatuh tempo",
    "plants.contractRejectedPermanent": "Kontrak Ditolak Permanen",
    "plants.maxAttemptsReached":
      "Maksimal percobaan kontrak telah tercapai ({maxAttempts}x)",
    "plants.paymentDisabled": "Pembayaran dan akses tanaman dinonaktifkan",
    "plants.contractNeedsReview": "Kontrak Memerlukan Review",
    "plants.contractAttempts": "Percobaan kontrak",
    "plants.contactAdmin": "Silakan hubungi admin untuk bantuan",
    "plants.contractNeedsResubmission": "Kontrak Perlu Diajukan Ulang",
    "plants.visitPaymentPage":
      "Kunjungi halaman pembayaran untuk mengajukan ulang kontrak",
    "plants.plantAllocationDisabled":
      "Alokasi tanaman dinonaktifkan - Kontrak ditolak permanen",
    "plants.plantWillBeAllocated":
      "Tanaman akan dialokasikan setelah pembayaran dikonfirmasi",
    "plants.plantDetails": "Detail Tanaman",
    "plants.completeHistory": "Riwayat Lengkap",
    "plants.recentFinancialActivity": "Aktivitas Keuangan Terbaru",

    // Additional plants page (EN keys will be added in the en section)

    // Review Section
    "reviews.title": "Review Investor",
    "reviews.subtitle":
      "Apa kata para investor tentang pengalaman investasi mereka bersama kami",
    "reviews.videoError": "Video testimonial tidak dapat diputar",
    "reviews.featuredTestimonial": "Featured Testimonial",
    "reviews.investorPhoto": "Investor Photo",
    "reviews.stars": "{rating}/5 Bintang",
    "reviews.ratingTitle": "Rating Kami",
    "reviews.ratingsCount": "{count} rating",
    "reviews.shareExperience": "Bagikan Pengalaman Anda",
    "reviews.satisfactionRating": "Rating Kepuasan",
    "reviews.starsCount": "{rating} dari 5 bintang",
    "reviews.nameLabel": "Nama *",
    "reviews.namePlaceholder": "Masukkan Nama",
    "reviews.cityLabel": "Kota *",
    "reviews.cityPlaceholder": "Pilih Kota",
    "reviews.emailLabel": "Email (tidak di publikasikan) *",
    "reviews.emailPlaceholder": "Masukkan Email",
    "reviews.descriptionLabel": "Deskripsi *",
    "reviews.descriptionPlaceholder": "Masukkan Pengalaman Anda",
    "reviews.charactersCount": "{count}/500 karakter",
    "reviews.uploadPhoto": "Upload Foto",
    "reviews.browseFile": "Browse File",
    "reviews.maxSize": "Max 5MB",
    "reviews.uploading": "Mengupload...",
    "reviews.submitButton": "📝 Kirim",
    "reviews.submitting": "Mengirim...",
    "reviews.fileTooLarge": "File Terlalu Besar",
    "reviews.fileTooLargeMessage":
      "Ukuran file maksimal 5MB. Silakan pilih file yang lebih kecil.",
    "reviews.unsupportedFormat": "Format File Tidak Didukung",
    "reviews.unsupportedFormatMessage":
      "Hanya file JPEG, PNG, dan WebP yang diperbolehkan.",
    "reviews.uploadFailed": "Gagal Upload",
    "reviews.uploadFailedMessage": "Gagal mengupload foto. Silakan coba lagi.",
    "reviews.reviewSuccess": "Review Berhasil Dikirim!",
    "reviews.reviewSuccessMessage":
      "Admin akan meninjau review Anda sebelum dipublikasikan.",
    "reviews.reviewFailed": "Gagal Mengirim Review",
    "reviews.reviewFailedMessage": "Gagal mengirim review. Silakan coba lagi.",
    "reviews.cities.jakarta": "Jakarta",
    "reviews.cities.bandung": "Bandung",
    "reviews.cities.surabaya": "Surabaya",
    "reviews.cities.yogyakarta": "Yogyakarta",
    "reviews.cities.semarang": "Semarang",
    "reviews.cities.medan": "Medan",
    "reviews.cities.makassar": "Makassar",
    "reviews.cities.palembang": "Palembang",
    "reviews.cities.other": "Lainnya",

    // About Section
    "about.title": "Tentang Kami",
    "about.companyName": "Koperasi Bintang Merah Sejahtera (BAHTERA)",
    "about.description1":
      "Koperasi Bintang Merah Sejahtera (BAHTERA) merupakan badan hukum koperasi tersertifikasi yang didirikan atas semangat gotong royong dan prinsip kekeluargaan. Hadir sebagai wadah pemberdayaan ekonomi yang inklusif, profesional dan berkelanjutan.",
    "about.description2":
      "Sebagai upaya pelestarian lingkungan yang selaras dengan peningkatan kesejahteraan masyarakat, kami menginisiasi program penghijauan berbasis tanaman multi-komoditas di kawasan Hutan. Program ini juga sejalan dengan program pemerintah dimana salah satu fokus utamanya adalah swasembada energi (Bioetanol), ketahanan pangan dan konservasi lahan. Selain itu, peningkatkan produktifitas hutan serta mengoptimalkan potensi ekonomi kawasan melalui pendekatan agroforestri berkelanjutan juga menjadi tujuan kami.",
    "about.managementTitle": "Pengurus",
    "about.roles.chairman": "Ketua Koperasi",
    "about.roles.secretary": "Sekretaris",
    "about.roles.treasurer": "Bendahara",
    "about.roles.director": "Direktur",
    "about.vision.title": "Visi",
    "about.vision.content":
      "Koperasi yang Kuat dan Mandiri untuk Masa Depan yang Berkelanjutan",
    "about.mission.title": "Misi",
    "about.mission.content":
      "• Pemberdayaan anggota dan Pengelolaan berkelanjutan\n• Meningkatkan Kesejahteraan dan Lingkungan\n• Kemitraan & Jaringan Bisnis\n• Memperkuat Kapasitas Ekonomi Anggota",

    // FAQ Section
    "faq.title": "Frequently Asked Question",
    "faq.questions.howItWorks.question": "Bagaimana Cara Kerjanya?",
    "faq.questions.howItWorks.answer":
      "Sistem kami bekerja melalui platform digital yang mudah diakses. Anda dapat memilih jenis tanaman, menentukan jumlah paket, dan memantau perkembangan tanaman Anda secara real-time melalui dashboard yang disediakan.",
    "faq.questions.fundSafety.question":
      "Seberapa Amankah Dana Saya Setelah Pengajuan?",
    "faq.questions.fundSafety.answer":
      "Dana Anda akan dikelola secara transparan dan aman melalui sistem kami yang telah terintegrasi dengan standar keamanan tingkat tinggi. Setiap dana akan dialokasikan ke proyek-proyek yang telah melalui proses seleksi ketat, dan Anda akan mendapat laporan berkala mengenai penggunaan dana dan perkembangan proyek. Selain itu, kami menggunakan sistem perbankan digital yang aman dan terpercaya. Kami berkomitmen untuk menjaga kepercayaan Anda dengan memastikan setiap operasi mengikuti prosedur audit yang ketat sesuai tujuan pembelian paket tanaman Anda.",
    "faq.questions.longTermGuarantee.question":
      "Apakah Pertanian Ini Dijamin untuk Jangka Panjang?",
    "faq.questions.longTermGuarantee.answer":
      "Ya, paket pertanian kami dirancang untuk jangka panjang dengan jaminan keberlanjutan. Kami bekerja sama dengan petani berpengalaman dan menggunakan teknologi modern untuk memastikan produktivitas yang optimal sepanjang periode pembelian paket.",
    "faq.questions.purchaseProcess.question":
      "Bagaimana Proses Pembelian Paket Pertanian Berkelanjutan?",
    "faq.questions.purchaseProcess.answer":
      "Proses pembelian paket dimulai dengan pendaftaran akun, pemilihan paket tanaman, pembayaran, dan kemudian monitoring berkala. Kami menyediakan laporan transparan mengenai perkembangan tanaman, estimasi hasil panen, dan proyeksi keuntungan yang akan Anda terima.",

    // Footer Section
    "footer.company.name": "Koperasi Bintang Merah Sejahtera",
    "footer.company.abbreviation": "(BAHTERA)",
    "footer.company.description":
      "Solusi tepat bagi Anda yang ingin meraih keuntungan sekaligus memberikan dampak positif bagi lingkungan dan masyarakat melalui pertanian berkelanjutan.",
    "footer.navigation.title": "Navigasi",
    "footer.navigation.home": "Beranda",
    "footer.navigation.program": "Program",
    "footer.navigation.aboutUs": "Tentang Kami",
    "footer.navigation.products": "Produk",
    "footer.navigation.faq": "FAQ",
    "footer.contact.title": "Hubungi Kami",
    "footer.contact.address":
      "Bintaro Business Center Jl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330",
    "footer.contact.phone": "+62 81118893679",
    "footer.contact.email": "bintangmerahsejahtera@gmail.com",
    "footer.copyright":
      "© 2024 Koperasi Bintang Merah Sejahtera (BAHTERA). All rights reserved.",
    "footer.links.privacy": "Privacy Policy",
    "footer.links.terms": "Terms of Service",
    "footer.links.conditions": "Syarat & Ketentuan",

    // WhatsApp Icon
    "whatsapp.ariaLabel": "Chat di WhatsApp",
    "whatsapp.altText": "Ikon WhatsApp",

    // Payments Page
    "payments.status.pending": "Belum Bayar",
    "payments.status.submitted": "Menunggu Review",
    "payments.status.approved": "Disetujui",
    "payments.status.completed": "Selesai",
    "payments.status.rejected": "Ditolak",
    "payments.status.overdue": "Terlambat",
    "payments.status.notCreated": "Belum Tersedia",
    "payments.billingPeriod.monthly": "Bulanan",
    "payments.billingPeriod.quarterly": "Triwulan",
    "payments.billingPeriod.yearly": "Tahunan",
    "payments.errors.paymentFailed": "Gagal",
    "payments.errors.paymentFailedMessage": "Gagal membuat pembayaran",
    "payments.errors.general": "Kesalahan",
    "payments.errors.generalMessage":
      "Terjadi kesalahan saat membuat pembayaran",
    "payments.errors.contractDownloadFailed": "Failed to download contract",
    "payments.errors.contractDataFailed": "Failed to fetch contract data",
    "payments.errors.contractDownloadError":
      "An error occurred while downloading the contract",
    "payments.errors.contractNotAvailable": "Contract data not available",
    "payments.errors.pdfGenerationFailed": "Gagal membuat PDF kontrak",
    "payments.errors.paymentProcessError":
      "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.",
    "payments.errors.uploadImageFailed": "Gagal Mengunggah Gambar",
    "payments.form.contractInfo": "Informasi Kontrak",
    "payments.form.product": "Produk:",
    "payments.form.contractId": "ID Kontrak:",
    "payments.form.type": "Jenis:",
    "payments.form.typeInstallment": "Cicilan",
    "payments.form.typeFullPayment": "Pembayaran Penuh",
    "payments.form.resubmissionStatus": "Status Pengajuan Ulang",
    "payments.form.attempt": "Percobaan:",
    "payments.form.lastRejectionReason": "Alasan penolakan terakhir:",
    "payments.signature.instructions":
      "Buat tanda tangan Anda di area yang disediakan|Pastikan tanda tangan jelas dan sesuai dengan identitas Anda|Tanda tangan yang sama dengan pengajuan sebelumnya lebih direkomendasikan|Kontrak akan direview ulang oleh admin setelah pengajuan",
    "signature.drawSignature": "Gambar Tanda Tangan",
    "signature.uploadImage": "Unggah Tanda Tangan",
    "signature.drawInstructions": "Gambar tanda tangan Anda di area di atas",
    "signature.helperCanvas":
      "Gambar ini akan disimpan dan digunakan untuk membuat tanda tangan Anda",
    "payments.ui.referralCodeUsed": "Digunakan untuk pembayaran ini",
    "payments.ui.adminNote": "Catatan Admin:",
    "payments.ui.rejectionReason": "Alasan Penolakan:",
    "payments.rejection.proofUnclear": "Bukti Tidak Jelas Silahkan Unggah Kembali Bukti Pembayaran Yang Benar/Valid",
    "payments.rejection.amountMismatch": "Nominal Transfer Tidak Sesuai Dengan Jumlah Yang Ditagihkan",
    "payments.rejection.invalidProof": "Bukti Pembayaran Tidak Valid atau tidak dapat di verifikasi",
    "payments.rejection.fundsNotRecorded": "Dana Belum Tercatat Pada Sistem Bank Saat Proses Verifikasi",
    "payments.ui.viewAll": "Lihat Semua ({count} lainnya)",
    "payments.ui.viewLess": "Lihat Lebih Sedikit",
    "payments.pdf.name": "Nama",
    "payments.pdf.birthPlace": "Tempat/Tgl Lahir",
    "payments.pdf.email": "Email",
    "payments.pdf.contact": "Nomor Kontak",
    "payments.pdf.job": "Pekerjaan",
    "payments.pdf.address": "Alamat",
    "payments.stats.totalPackages": "Total Paket",
    "payments.stats.paymentValue": "Nilai Pembayaran",
    "payments.stats.paid": "Sudah Dibayar",
    "payments.stats.overdue": "Terlambat",
    "payments.stats.upcoming": "Mendatang",
    "payments.portfolio.title": "Ringkasan Portfolio",
    "payments.cards.totalPackage": "Total Paket:",
    "payments.cards.created": "• Dibuat:",
    "payments.cards.paymentStatus": "Status Pembayaran",
    "payments.cards.contractPendingApproval":
      "Kontrak Menunggu Persetujuan Admin",
    "payments.cards.canMakePayment":
      "Anda sudah dapat melakukan pembayaran sekarang",
    "payments.cards.referralCodeRegistered": "Kode Referral Terdaftar",
    "payments.cards.totalPayment": "Pembayaran Total",
    "payments.cards.dueDate": "Jatuh tempo:",
    "payments.cards.paymentCompleted": "Pembayaran Selesai",
    "payments.cards.fullPayment": "Pembayaran Penuh",
    "payments.cards.contractId": "Contract ID:",
    "payments.contract.rejectedByAdmin": "Ditolak oleh Admin",
    "payments.contract.download": "Unduh Kontrak",
    "payments.contract.rejectedByAdminMessage": "{current} dari {max} ditolak",
    "payments.contract.resubmit": "Submit Ulang Kontrak",
    "payments.retry.resubmissionStatus": "Status Pengajuan Ulang:",
    "payments.retry.attempts": "Percobaan:",
    "payments.retry.lastRejectionReason": "Alasan penolakan terakhir:",
    "payments.retry.adminNotes": "Catatan Admin:",
    "payments.retry.instruction1":
      "Silakan unggah ulang foto KTP dan foto selfie Anda.",
    "payments.retry.instruction2":
      "Tim admin kami akan meninjau data Anda lagi setelah pengajuan.",
    "payments.retry.instruction3":
      "Silakan tunggu persetujuan admin sebelum mengajukan ulang.",
    "payments.retry.instruction4":
      "Pastikan tanda tangan Anda jelas dan sesuai dengan identitas Anda.",
    "payments.retry.signatureLabel": "Tanda Tangan:",
    "payments.retry.instructionsTitle": "Instruksi Pengajuan Ulang",
    "payments.retry.submitting": "Mengirim...",
    "payments.retry.of": "dari",
    "payments.retry.cancel": "Cancel",
    "payments.retry.submit": "Kirim Pengajuan Ulang",
    "payments.empty.noPayments": "Belum ada pembayaran paket",
    "payments.empty.startPurchase": "Mulai pembelian sekarang!",
    "payments.empty.viewPackages": "Lihat Paket Tanaman",
    "payments.success.title": "Berhasil!",
    "payments.success.contractResubmitted":
      "Kontrak berhasil diajukan ulang dan sedang menunggu review admin",
    "payments.buttons.payNow": "Bayar Sekarang",
    "payments.buttons.selectPaymentMethod": "Pilih Metode Pembayaran",
    "payments.buttons.uploadProof": "Upload Bukti Bayar",
    "payments.buttons.changeProof": "Ganti Bukti Bayar",
    "payments.buttons.uploading": "Mengunggah...",
    "payments.proof.noProof": "Belum ada bukti",
    "payments.proof.rejected": "Ditolak:",
    "payments.proof.approved": "Disetujui",
    "payments.proof.pendingVerification": "Menunggu Verifikasi",
    "payments.proof.paymentApproved": "✓ Pembayaran telah disetujui",
    "payments.proof.uploadTitle": "Upload Bukti Pembayaran #{number}",
    "payments.proof.upload": "Upload",
    "payments.progress.title": "Progress Pembayaran",
    "payments.filters.all": "Semua",
    "payments.filters.active": "Aktif",
    "payments.filters.overdue": "Terlambat",
    "payments.filters.completed": "Selesai",
    "payments.filters.installment": "Cicilan",
    "payments.filters.fullPayment": "Pembayaran Penuh",
    "payments.installments.scheduleTitle": "Jadwal Angsuran ({count} angsuran)",
    "payments.installments.installmentNumber": "Angsuran #",
    "payments.approval.contractApproved": "Kontrak Telah Disetujui Admin",
    "payments.approval.approvedOn": "Disetujui pada:",
    "payments.willBeDetermined": "Akan ditentukan",
    "payments.contract.notSigned": "Kontrak Belum Ditandatangani",
    "payments.contract.notSignedMessage":
      "Silakan tandatangani kontrak sebelum melakukan pembayaran",
    "payments.contract.signHere": "Tandatangani Kontrak",

    // Profile Page
    "profile.title": "Informasi Profil",
    "profile.loading": "Memuat profil...",
    "profile.userId": "User ID",
    "profile.changeProfilePhoto": "Ubah Foto Profil",
    "profile.uploading": "Mengunggah...",
    "profile.generateKartuAnggota": "Generate Kartu Anggota",
    "profile.kartuNotAvailable": "Kartu tidak tersedia",
    "profile.accountMustBeVerified":
      "Akun Anda harus diverifikasi oleh admin sebelum dapat menghasilkan kartu anggota.",
    "profile.personalInfo": "Informasi Pribadi",
    "profile.fullName": "Nama Lengkap",
    "profile.email": "Email",
    "profile.phoneNumber": "Nomor Telepon",
    "profile.dateOfBirth": "Tanggal Lahir",
    "profile.nik": "NIK",
    "profile.ktpAddress": "Alamat KTP",
    "profile.fullAddress": "Alamat Lengkap",
    "profile.village": "Desa/Kelurahan",
    "profile.city": "Kota/Kabupaten",
    "profile.province": "Provinsi",
    "profile.postalCode": "Kode Pos",
    "profile.domisiliAddress": "Alamat Domisili",
    "profile.occupation": "Pekerjaan",
    "profile.verificationStatus": "Status Verifikasi",
    "profile.verified": "Terverifikasi",
    "profile.pendingReview": "Menunggu Review",
    "profile.notVerified": "Belum Terverifikasi",
    "profile.security": "Keamanan",
    "profile.changePassword": "Ubah Password",
    "profile.cancel": "Batal",
    "profile.currentPassword": "Password Saat Ini",
    "profile.enterCurrentPassword": "Masukkan password saat ini",
    "profile.newPassword": "Password Baru",
    "profile.enterNewPassword": "Masukkan password baru",
    "profile.passwordRequirements": "Password harus mengandung:",
    "profile.minCharacters": "Minimal 8 karakter",
    "profile.lowercase": "Huruf kecil (a-z)",
    "profile.uppercase": "Huruf besar (A-Z)",
    "profile.numbers": "Angka (0-9)",
    "profile.specialCharacters": "Karakter khusus (@$!%*?&)",
    "profile.confirmNewPassword": "Konfirmasi Password Baru",
    "profile.confirmPasswordPlaceholder": "Konfirmasi password baru",
    "profile.updatePassword": "Update Password",
    "profile.updating": "Memperbarui...",
    "profile.password": "Password",
    "profile.hiddenForSecurity": "Tersembunyi untuk keamanan",
    "profile.requestSent": "• Permintaan Terkirim",
    "profile.enterFullName": "Masukkan nama lengkap",
    "profile.reasonForChange": "Alasan perubahan (opsional)",
    "profile.enterEmail": "Masukkan alamat email",
    "profile.reasonForEmailChange": "Alasan perubahan email (opsional)",
    "profile.enterPhoneNumber": "Masukkan nomor telepon",
    "profile.notProvided": "Tidak tersedia",
    "profile.errorFileTooLarge": "Ukuran file harus kurang dari 5MB",
    "profile.errorInvalidImage": "Silakan pilih file gambar yang valid",

    // Cicilan Modal
    "cicilan.title": "Cicilan {plantName}",
    "cicilan.choosePackage": "Pilih Paket Investasi",
    "cicilan.noPackagesAvailable": "Belum ada paket investasi yang tersedia",
    "cicilan.packageDetails": "Detail Paket",
    "cicilan.selectedPackage": "Paket Terpilih:",
    "cicilan.treeCount": "Jumlah Pohon:",
    "cicilan.trees": "Pohon",
    "cicilan.totalInvestment": "Total Investasi:",
    "cicilan.estimatedReturn": "Estimasi Keuntungan Per Bulan:",
    "cicilan.chooseInstallmentPeriod": "Pilih Jangka Waktu Cicilan",
    "cicilan.timesPayment": "kali bayar",
    "cicilan.perInstallment": "per angsuran",
    "cicilan.howItWorks": "Cara Kerja Cicilan",
    "cicilan.step1": "Buat dan tandatangani kontrak investasi terlebih dahulu",
    "cicilan.step2": "Menunggu persetujuan admin untuk kontrak Anda",
    "cicilan.step3": "Setelah disetujui, Anda dapat mulai cicilan pembayaran",
    "cicilan.step4": "Upload bukti pembayaran setiap periode cicilan",
    "cicilan.step5": "Investasi dimulai setelah pembayaran pertama disetujui",
    "cicilan.cancel": "Batal",
    "cicilan.createContract": "Buat Kontrak",
    "cicilan.processing": "Memproses...",
    "cicilan.orderDetails": "Rincian Pesanan",
    "cicilan.contractDetails": "Detail Kontrak",
    "cicilan.contractNumber": "No. Kontrak:",
    "cicilan.packageType": "Jenis Paket:",
    "cicilan.packagePrice": "Harga Paket:",
    "cicilan.paymentType": "Tipe Pembayaran:",
    "cicilan.installmentPer": "Angsuran per {period}:",
    "cicilan.referralCode": "Kode Referral (Opsional)",
    "cicilan.enterReferralCode": "Masukkan Kode Referral:",
    "cicilan.referralCodeFormat":
      "Kode referral 6 karakter huruf kapital dan angka",
    "cicilan.orderConfirmation": "Konfirmasi Pesanan",
    "cicilan.orderConfirmationMessage":
      'Dengan menekan "Lanjutkan", kontrak akan dibuat dan Anda akan diarahkan ke halaman penandatanganan kontrak.',
    "cicilan.back": "Kembali",
    "cicilan.continue": "Lanjutkan",
    "cicilan.creatingContract": "Membuat Kontrak...",
    "cicilan.invalidReferralCode": "Kode Referral Tidak Valid",
    "cicilan.invalidReferralCodeMessage":
      "Kode referral harus 6 karakter huruf kapital dan angka",
    "cicilan.contractCreated": "Kontrak Berhasil Dibuat!",
    "cicilan.contractCreatedMessage":
      "Kontrak {contractNumber} telah dibuat. Anda akan diarahkan untuk menandatangani kontrak.",
    "cicilan.contractError": "Gagal Membuat Kontrak",
    "cicilan.error": "Error",
    "cicilan.errorCreatingContract": "Terjadi kesalahan saat membuat kontrak",
    "cicilan.errorPreparingContract":
      "Terjadi kesalahan saat menyiapkan kontrak",
    "signature.clear": "Bersihkan",

    // General
    loading: "Loading...",
    close: "Tutup",
  },
  en: {
    // Navigation
    "nav.beranda": "Home",
    "nav.program": "Program",
    "nav.produk": "Products",
    "nav.review": "Reviews",
    "nav.tentangKami": "About Us",
    "nav.faq": "FAQ",
    "nav.tanamanSaya": "My Plants",
    "nav.pembayaran": "Payments",
    "nav.masuk": "Login",
    "nav.daftar": "Register Now",
    "nav.profile": "Profile",
    "nav.logout": "Logout",
    "nav.hello": "Hello",

    // Status messages
    "status.pending": "⏳ Verification Pending",
    "status.rejected": "❌ Verification Rejected",
    "status.notVerified": "⏳ Not Verified",
    "status.pendingShort": "⏳ Pending",
    "status.rejectedShort": "❌ Rejected",
    "status.notVerifiedShort": "⏳ Not Yet",
    "status.refreshTitle": "Check Latest Status",
    "status.resubmitTitle": "Resubmit Verification",

    // Payment messages
    "payment.success.title": "Payment Successful!",
    "payment.success.message":
      "Thank you! Your investment payment has been successfully processed. Order ID: {orderId}. Our team will process your investment shortly.",
    "payment.error.title": "Payment Failed",
    "payment.error.message":
      "Sorry, there was an error processing your payment. Please try again or contact our customer service.",

    // Resubmit modal
    "resubmit.title": "Resubmit Verification",
    "resubmit.description":
      "Please re-upload your ID card photo and selfie photo. Our admin team will review your data again.",
    "resubmit.rejectionNote": "Rejection note:",
    "resubmit.rejectionNoteSecond": "Rejection note:",
    "resubmit.ktpLabel": "ID Card Photo",
    "resubmit.selfieLabel": "Selfie Photo (Take from camera)",
    "resubmit.selfieTaken": "Selfie photo taken. You can submit or retake.",
    "resubmit.cancel": "Cancel",
    "resubmit.submit": "Submit Resubmission",
    "resubmit.uploading": "Uploading...",
    "resubmit.uploadBothFiles": "Please upload both files first",
    "resubmit.success":
      "Resubmission request sent successfully. Please wait for admin review.",
    "resubmit.error": "An error occurred while resubmitting",

    // Language
    "language.switch": "Switch Language",
    "language.indonesian": "ID",
    "language.english": "EN",

    // Hero Section
    "hero.subtitle": "For the Future",
    "hero.title.line1": "Sustainable Agricultural Business Development",
    "hero.title.line2": "Financing Made Easy",
    "hero.description":
      "The perfect solution for those who want to achieve profits while providing positive impact for the environment and society. Through a simple and transparent investment system, you can support local farmers to improve their harvest yields.",
    "hero.cta": "Start Now",
    "hero.scrollMore": "Learn More",

    // Benefits Section
    "benefits.title": "Impact and Benefits",
    "benefits.financial.title": "Financial Benefits",
    "benefits.financial.description":
      "Productive plants that provide high-value results after maturity period",
    "benefits.longterm.title": "Long-term Assets",
    "benefits.longterm.description":
      "Plant value increases with age, suitable for future savings",
    "benefits.environmental.title": "Environmental Contribution",
    "benefits.environmental.description":
      "Maintains natural balance, reduces pollution, and supports reforestation",
    "benefits.social.title": "Social Impact",
    "benefits.social.description":
      "Helps the economy of farmers and communities around agricultural locations",
    "benefits.legacy.title": "Future Legacy",
    "benefits.legacy.description":
      "Plants that can become assets and can be inherited by future generations",

    // Rules Section
    "rules.title": "Participation Guidelines!",
    "rules.package.title": "Package Financing",
    "rules.package.description":
      "Each member can join this program by purchasing a minimum of 1 package (10 trees).",
    "rules.duration.title": "Duration",
    "rules.duration.description":
      "This program is medium/long-term (5-7 years, depending on plant type)",
    "rules.profit.title": "Profit Sharing",
    "rules.profit.description":
      "Harvest results will be given after deducting other costs",
    "rules.transparency.title": "Transparency",
    "rules.transparency.description":
      "Members receive regular reports on plant growth, plant care, land conditions, and profit projections",
    "rules.risk.title": "Risk",
    "rules.risk.description":
      "Members are aware that this program depends on natural factors, maintenance, and market conditions",

    // CTA Section
    "cta.title": "Plant Today, Green the Earth, Prosper the Heart",
    "cta.description":
      "Together building a green future and contributing to environmental sustainability",
    "cta.button": "Join Now",

    // Plant Showcase Section
    "plants.title": "Your Green Journey Starts Here",
    "plants.subtitle":
      "Get to know the best plants for you, whether for initial steps or continuous contribution.",
    "plants.loading": "Loading plant data...",
    "plants.plantName": "{name} Plant",
    "plants.simulationTitle": "Installment Simulation Per 10 Trees",
    "plants.buyNow": "Buy Now",
    "plants.startingFrom": "Starting From",
    "plants.fullPayment": "Full Payment",
    "plants.perMonth": "Per Month",
    "plants.perPackage": "/Package",
    "plants.packageInfo": "10 Trees / Package",
    "plants.payDirectly": "Pay Directly",
    "plants.comingSoon": "Coming Soon",
    "plants.others": "Others",
    "plants.perYear": "Per Year",
    "plants.perFiveYears": "Per 5 Years",
    "plants.sellPrice": "Tree Selling Price",
    "plants.buyWithInstallment": "💳 Buy with Installments",
    "plants.installmentDuration": "*For {years} years planting period",
    "plants.profitTitle": "Get PROFIT Up To",
    "plants.profitPerYear": "/year",
    "plants.monthly": "Monthly",
    "plants.weekly": "Weekly",
    "plants.daily": "Daily",
    "plants.profitDisclaimer":
      "*For ± 15 years harvest period",
    "plants.processingProducts": "Processed Products from {name}:",
    "plants.chooseInvestment": "Choose Investment",
    "plants.choosePackage": "Choose Investment Package",
    "plants.noPackagesAvailable": "No investment packages available yet",
    "plants.investmentDetails": "Investment Details",
    "plants.plantType": "Plant Type:",
    "plants.duration": "Duration:",
    "plants.treeCount": "Number of Trees:",
    "plants.trees": "Trees",
    "plants.totalPrice": "Total Price:",
    "plants.estimatedReturn": "Estimated Return:",
    "plants.riskLevel": "Risk Level:",
    "plants.continuePayment": "Continue Payment",
    "plants.processing2": "Processing...",
    "plants.cancel": "Cancel",
    "plants.orderDetails": "Order Details",
    "plants.contractDetails": "Contract Details",
    "plants.contractNumber": "Contract No.:",
    "plants.packageType": "Package Type:",
    "plants.packagePrice": "Package Price:",
    "plants.paymentType": "Payment Type:",
    "plants.paymentTypeFull": "Full Payment",
    "plants.referralCode": "Referral Code (Optional)",
    "plants.enterReferralCode": "Enter Referral Code:",
    "plants.referralCodeFormat":
      "Referral code must be 6 characters of capital letters and numbers",
    "plants.confirmationTitle": "Order Confirmation",
    "plants.confirmationMessage":
      'By pressing "Continue", the contract will be created and you will be directed to the contract signing page.',
    "plants.back": "Back",
    "plants.continue": "Continue",
    "plants.creatingContract": "Creating Contract...",
    "plants.contractCreated": "Contract Successfully Created!",
    "plants.contractCreatedMessage":
      "Contract {contractNumber} has been created. You will be directed to sign the contract.",
    "plants.contractError": "Contract Error",
    "plants.contractErrorMessage":
      "An error occurred while creating the contract.",
    "plants.invalidReferralCode": "Invalid Referral Code",
    "plants.invalidReferralCodeMessage":
      "Referral code must be 6 characters of capital letters and numbers",
    "plants.contractCreationError": "Failed to Create Contract",
    "plants.contractCreationErrorMessage":
      "Failed to create contract. Please try again.",
    "plants.verificationRequired": "Verification Required",
    "plants.verificationRequiredMessage":
      "Your account must be verified before you can make a purchase.",
    // Additional plants page texts
    "plants.myPlantsTitle": "My Plants",
    "plants.manageSubtitle": "Manage and monitor your plants",
    "plants.empty.title": "No Plants Yet",
    "plants.empty.description":
      "Start purchasing your package today and contribute to a more sustainable future.",
    "plants.empty.cta": "Get Started",
    "plants.summary": "Plant Summary",
    "plants.infoTitle": "Plant Information",
    "plants.recentHistory": "Recent History",
    "plants.fullHistory": "Full History",
    "plants.financialActivity": "Recent Financial Activity",
    "plants.downloadPdf": "Download PDF",
    "plants.locked": "LOCKED",
    "plants.location": "Location:",
    "plants.blockKav": "Block / Kav:",
    "plants.income": "Income:",
    "plants.operationalCosts": "Operational Costs:",
    "plants.nextPayment": "Next Payment:",
    "media.imageLoadError": "Image cannot be loaded",
    "media.noMedia": "No media",
    "media.addedBy": "Added by:",
    "media.videoNotSupported": "Your browser does not support HTML5 video.",
    "plants.moreHistory": "+{count} more history entries",
    "plants.purchaseDate": "Purchase Date",
    "plants.status.approved": "Active",
    "plants.status.pending": "Pending",
    "plants.status.cancelled": "Cancelled",
    "plants.status.active": "Active",
    "plants.status.completed": "Completed",
    "plants.plant": "Plant",
    "plants.plantInfo": "Plant Information",
    "plants.disabled": "DISABLED",
    "plants.installmentNumber": "Installment #",
    "plants.dueDate": "Due date",
    "plants.contractRejectedPermanent": "Contract Permanently Rejected",
    "plants.maxAttemptsReached":
      "Maximum contract attempts reached ({maxAttempts}x)",
    "plants.paymentDisabled": "Payment and plant access disabled",
    "plants.contractNeedsReview": "Contract Needs Review",
    "plants.contractAttempts": "Contract attempts",
    "plants.contactAdmin": "Please contact admin for assistance",
    "plants.contractNeedsResubmission": "Contract Needs Resubmission",
    "plants.visitPaymentPage": "Visit payment page to resubmit contract",
    "plants.plantAllocationDisabled":
      "Plant allocation disabled - Contract permanently rejected",
    "plants.plantWillBeAllocated":
      "Plant will be allocated after payment is confirmed",
    "plants.plantDetails": "Plant Details",
    "plants.completeHistory": "Full History",
    "plants.recentFinancialActivity": "Recent Financial Activity",

    // Review Section
    "reviews.title": "Investor Reviews",
    "reviews.subtitle":
      "What our investors say about their investment experience with us",
    "reviews.videoError": "Video testimonial cannot be played",
    "reviews.featuredTestimonial": "Featured Testimonial",
    "reviews.investorPhoto": "Investor Photo",
    "reviews.stars": "{rating}/5 Stars",
    "reviews.ratingTitle": "Our Rating",
    "reviews.ratingsCount": "{count} ratings",
    "reviews.shareExperience": "Share Your Experience",
    "reviews.satisfactionRating": "Satisfaction Rating",
    "reviews.starsCount": "{rating} out of 5 stars",
    "reviews.nameLabel": "Name *",
    "reviews.namePlaceholder": "Enter Name",
    "reviews.cityLabel": "City *",
    "reviews.cityPlaceholder": "Select City",
    "reviews.emailLabel": "Email (not published) *",
    "reviews.emailPlaceholder": "Enter Email",
    "reviews.descriptionLabel": "Description *",
    "reviews.descriptionPlaceholder": "Enter Your Experience",
    "reviews.charactersCount": "{count}/500 characters",
    "reviews.uploadPhoto": "Upload Photo",
    "reviews.browseFile": "Browse File",
    "reviews.maxSize": "Max 5MB",
    "reviews.uploading": "Uploading...",
    "reviews.submitButton": "📝 Submit",
    "reviews.submitting": "Submitting...",
    "reviews.fileTooLarge": "File Too Large",
    "reviews.fileTooLargeMessage":
      "Maximum file size is 5MB. Please select a smaller file.",
    "reviews.unsupportedFormat": "Unsupported File Format",
    "reviews.unsupportedFormatMessage":
      "Only JPEG, PNG, and WebP files are allowed.",
    "reviews.uploadFailed": "Upload Failed",
    "reviews.uploadFailedMessage": "Failed to upload photo. Please try again.",
    "reviews.reviewSuccess": "Review Successfully Submitted!",
    "reviews.reviewSuccessMessage":
      "Admin will review your submission before publishing.",
    "reviews.reviewFailed": "Failed to Submit Review",
    "reviews.reviewFailedMessage": "Failed to submit review. Please try again.",
    "reviews.cities.jakarta": "Jakarta",
    "reviews.cities.bandung": "Bandung",
    "reviews.cities.surabaya": "Surabaya",
    "reviews.cities.yogyakarta": "Yogyakarta",
    "reviews.cities.semarang": "Semarang",
    "reviews.cities.medan": "Medan",
    "reviews.cities.makassar": "Makassar",
    "reviews.cities.palembang": "Palembang",
    "reviews.cities.other": "Other",

    // About Section
    "about.title": "About Us",
    "about.companyName": "Koperasi Bintang Merah Sejahtera (BAHTERA)",
    "about.description1":
      "Koperasi Bintang Merah Sejahtera (BAHTERA) is a certified cooperative legal entity founded on the spirit of mutual cooperation and family principles. We are present as an inclusive, professional and sustainable economic empowerment platform.",
    "about.description2":
      "As an effort to preserve the environment that aligns with improving community welfare, we initiated a reforestation program based on multi-commodity plants in forest areas. This program is also in line with government programs where one of the main focuses is energy self-sufficiency (Bioethanol), food security and land conservation. In addition, increasing forest productivity and optimizing the economic potential of the region through sustainable agroforestry approaches is also our goal.",
    "about.managementTitle": "Management",
    "about.roles.chairman": "Cooperative Chairman",
    "about.roles.secretary": "Secretary",
    "about.roles.treasurer": "Treasurer",
    "about.roles.director": "Director",
    "about.vision.title": "Vision",
    "about.vision.content":
      "Strong and Independent Cooperative for a Sustainable Future",
    "about.mission.title": "Mission",
    "about.mission.content":
      "• Member empowerment and sustainable management\n• Improving welfare and environment\n• Partnerships & business networks\n• Strengthening member economic capacity",

    // FAQ Section
    "faq.title": "Frequently Asked Questions",
    "faq.questions.howItWorks.question": "How Does It Work?",
    "faq.questions.howItWorks.answer":
      "Our system works through an easily accessible digital platform. You can choose plant types, determine the number of packages, and monitor your plant development in real-time through the provided dashboard.",
    "faq.questions.fundSafety.question":
      "How Safe Are My Funds After Application?",
    "faq.questions.fundSafety.answer":
      "Your funds will be managed transparently and securely through our system that has been integrated with high-level security standards. Each fund will be allocated to projects that have gone through a strict selection process, and you will receive regular reports on fund usage and project development. In addition, we use secure and trusted digital banking systems. We are committed to maintaining your trust by ensuring every operation follows strict audit procedures according to your plant package purchase objectives.",
    "faq.questions.longTermGuarantee.question":
      "Is This Agriculture Guaranteed for the Long Term?",
    "faq.questions.longTermGuarantee.answer":
      "Yes, our agricultural packages are designed for the long term with sustainability guarantees. We work with experienced farmers and use modern technology to ensure optimal productivity throughout the package purchase period.",
    "faq.questions.purchaseProcess.question":
      "How is the Sustainable Agriculture Package Purchase Process?",
    "faq.questions.purchaseProcess.answer":
      "The package purchase process begins with account registration, plant package selection, payment, and then regular monitoring. We provide transparent reports on plant development, harvest estimates, and profit projections that you will receive.",

    // Footer Section
    "footer.company.name": "Koperasi Bintang Merah Sejahtera",
    "footer.company.abbreviation": "(BAHTERA)",
    "footer.company.description":
      "The perfect solution for those who want to achieve profits while providing positive impact for the environment and society through sustainable agriculture.",
    "footer.navigation.title": "Navigation",
    "footer.navigation.home": "Home",
    "footer.navigation.program": "Program",
    "footer.navigation.aboutUs": "About Us",
    "footer.navigation.products": "Products",
    "footer.navigation.faq": "FAQ",
    "footer.contact.title": "Contact Us",
    "footer.contact.address":
      "Bintaro Business Center Jl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330",
    "footer.contact.phone": "+62 81118893679",
    "footer.contact.email": "bintangmerahsejahtera@gmail.com",
    "footer.copyright":
      "© 2024 Koperasi Bintang Merah Sejahtera (BAHTERA). All rights reserved.",
    "footer.links.privacy": "Privacy Policy",
    "footer.links.terms": "Terms of Service",
    "footer.links.conditions": "Terms & Conditions",

    // WhatsApp Icon
    "whatsapp.ariaLabel": "Chat on WhatsApp",
    "whatsapp.altText": "WhatsApp Icon",

    // Payments Page
    "payments.status.pending": "Not Paid",
    "payments.status.submitted": "Pending Review",
    "payments.status.approved": "Approved",
    "payments.status.completed": "Completed",
    "payments.status.rejected": "Rejected",
    "payments.status.overdue": "Overdue",
    "payments.status.notCreated": "Not Available",
    "payments.billingPeriod.monthly": "Monthly",
    "payments.billingPeriod.quarterly": "Quarterly",
    "payments.billingPeriod.yearly": "Yearly",
    "payments.errors.paymentFailed": "Failed",
    "payments.errors.paymentFailedMessage": "Failed to create payment",
    "payments.errors.general": "Error",
    "payments.errors.generalMessage":
      "An error occurred while creating payment",
    "payments.errors.contractDownloadFailed": "Failed to download contract",
    "payments.errors.contractDataFailed": "Failed to fetch contract data",
    "payments.errors.contractDownloadError":
      "An error occurred while downloading the contract",
    "payments.errors.contractNotAvailable": "Contract data not available",
    "payments.errors.pdfGenerationFailed": "Failed to generate contract PDF",
    "payments.errors.paymentProcessError":
      "An error occurred while processing payment. Please try again.",
    "payments.errors.uploadImageFailed": "Failed to Upload Image",
    "payments.form.contractInfo": "Contract Information",
    "payments.form.product": "Product:",
    "payments.form.contractId": "Contract ID:",

    "payments.form.type": "Type:",
    "payments.form.typeInstallment": "Installment",
    "payments.form.typeFullPayment": "Full Payment",
    "payments.form.resubmissionStatus": "Resubmission Status",
    "payments.form.attempt": "Attempt:",
    "payments.form.lastRejectionReason": "Last rejection reason:",
    "payments.signature.instructions":
      "Create your signature in the provided area|Make sure the signature is clear and matches your identity|Same signature as previous submission is recommended|Contract will be reviewed again by admin after submission",
    "signature.drawSignature": "Draw Signature",
    "signature.uploadImage": "Upload Signature",
    "signature.drawInstructions": "Draw your signature in the area above",
    "signature.helperCanvas":
      "This image will be saved and used to create your signature",
    "payments.ui.referralCodeUsed": "Used for this payment",
    "signature.clear": "Clear",
    "payments.ui.adminNote": "Admin Note:",
    "payments.ui.rejectionReason": "Rejection Reason:",
    "payments.rejection.proofUnclear": "Proof is Unclear, Please Re-upload Valid/Correct Payment Proof",
    "payments.rejection.amountMismatch": "Transfer Amount Does Not Match the Billed Amount",
    "payments.rejection.invalidProof": "Payment Proof is Invalid or Cannot be Verified",
    "payments.rejection.fundsNotRecorded": "Funds Not Yet Recorded in Bank System During Verification Process",
    "payments.ui.viewAll": "View All ({count} more)",
    "payments.ui.viewLess": "View Less",
    "payments.pdf.name": "Name",
    "payments.pdf.birthPlace": "Place/Date of Birth",
    "payments.pdf.email": "Email",
    "payments.pdf.contact": "Contact Number",
    "payments.pdf.job": "Job",
    "payments.pdf.address": "Address",
    "payments.stats.totalPackages": "Total Packages",
    "payments.stats.paymentValue": "Payment Value",
    "payments.stats.paid": "Paid",
    "payments.stats.overdue": "Overdue",
    "payments.stats.upcoming": "Upcoming",
    "payments.portfolio.title": "Portfolio Overview",
    "payments.cards.totalPackage": "Total Package:",
    "payments.cards.created": "• Created:",
    "payments.cards.paymentStatus": "Payment Status",
    "payments.cards.contractPendingApproval": "Contract Pending Admin Approval",
    "payments.cards.canMakePayment": "You can make payment now",
    "payments.cards.referralCodeRegistered": "Registered Referral Code",
    "payments.cards.totalPayment": "Total Payment",
    "payments.cards.dueDate": "Due date:",
    "payments.cards.paymentCompleted": "Payment Completed",
    "payments.cards.fullPayment": "Full Payment",
    "payments.cards.contractId": "Contract ID:",
    "payments.contract.download": "Download Contract",
    "payments.contract.rejectedByAdmin": "Rejected by Admin",
    "payments.contract.rejectedByAdminMessage": "{current} of {max} rejected",
    "payments.contract.resubmit": "Resubmit Contract",
    "payments.retry.resubmissionStatus": "Resubmission Status:",
    "payments.retry.attempts": "Attempt:",
    "payments.retry.lastRejectionReason": "Last rejection reason:",
    "payments.retry.adminNotes": "Admin notes:",
    "payments.retry.submitting": "Submitting...",
    "payments.retry.instruction1":
      "Please re-upload your ID card photo and selfie photo.",
    "payments.retry.instruction2":
      "Our admin team will review your data again after submission.",
    "payments.retry.instruction3":
      "Please wait for admin approval before resubmitting.",
    "payments.retry.instruction4":
      "Once approved, you can resubmit the contract.",
    "payments.retry.signatureLabel": "Signature:",
    "payments.retry.cancel": "Cancel",
    "payments.retry.instructionsTitle": "Resubmission Instructions",
    "payments.retry.submit": "Submit Resubmission",
    "payments.retry.uploading": "Uploading...",
    "payments.retry.of": "of",
    "payments.empty.noPayments": "No package payments yet",
    "payments.empty.startPurchase": "Start purchasing now!",
    "payments.empty.viewPackages": "View Plant Packages",
    "payments.success.title": "Success!",
    "payments.success.contractResubmitted":
      "Contract successfully resubmitted and pending admin review",
    "payments.buttons.payNow": "Pay Now",
    "payments.buttons.selectPaymentMethod": "Select Payment Method",
    "payments.buttons.uploadProof": "Upload Payment Proof",
    "payments.buttons.changeProof": "Change Payment Proof",
    "payments.buttons.uploading": "Uploading...",
    "payments.proof.noProof": "No proof yet",
    "payments.proof.rejected": "Rejected:",
    "payments.proof.approved": "Approved",
    "payments.proof.pendingVerification": "Pending Verification",
    "payments.proof.paymentApproved": "✓ Payment has been approved",
    "payments.proof.uploadTitle": "Upload Payment Proof #{number}",
    "payments.proof.upload": "Upload",
    "payments.progress.title": "Payment Progress",
    "payments.filters.all": "All",
    "payments.filters.active": "Active",
    "payments.filters.overdue": "Overdue",
    "payments.filters.completed": "Completed",
    "payments.filters.installment": "Installment",
    "payments.filters.fullPayment": "Full Payment",
    "payments.installments.scheduleTitle":
      "Installment Schedule ({count} installments)",
    "payments.installments.installmentNumber": "Installment #",
    "payments.approval.contractApproved": "Contract Approved by Admin",
    "payments.approval.approvedOn": "Approved on:",
    "payments.willBeDetermined": "Will be determined",
    "payments.contract.notSigned": "Contract Not Signed",
    "payments.contract.notSignedMessage":
      "Please sign the contract before making payment",
    "payments.contract.signHere": "Sign Contract",

    // Profile Page
    "profile.title": "Profile Information",
    "profile.loading": "Loading profile...",
    "profile.userId": "User ID",
    "profile.changeProfilePhoto": "Change Profile Photo",
    "profile.uploading": "Uploading...",
    "profile.generateKartuAnggota": "Generate Member Card",
    "profile.kartuNotAvailable": "Card not available",
    "profile.accountMustBeVerified":
      "Your account must be verified by admin before you can generate a member card.",
    "profile.personalInfo": "Personal Information",
    "profile.fullName": "Full Name",
    "profile.email": "Email",
    "profile.phoneNumber": "Phone Number",
    "profile.dateOfBirth": "Date of Birth",
    "profile.nik": "NIK",
    "profile.ktpAddress": "ID Card Address",
    "profile.fullAddress": "Full Address",
    "profile.village": "Village/Sub-district",
    "profile.city": "City/Regency",
    "profile.province": "Province",
    "profile.postalCode": "Postal Code",
    "profile.domisiliAddress": "Residence Address",
    "profile.occupation": "Occupation",
    "profile.verificationStatus": "Verification Status",
    "profile.verified": "Verified",
    "profile.pendingReview": "Pending Review",
    "profile.notVerified": "Not Verified",
    "profile.security": "Security",
    "profile.changePassword": "Change Password",
    "profile.cancel": "Cancel",
    "profile.currentPassword": "Current Password",
    "profile.enterCurrentPassword": "Enter your current password",
    "profile.newPassword": "New Password",
    "profile.enterNewPassword": "Enter your new password",
    "profile.passwordRequirements": "Password must contain:",
    "profile.minCharacters": "Minimum 8 characters",
    "profile.lowercase": "Lowercase letters (a-z)",
    "profile.uppercase": "Uppercase letters (A-Z)",
    "profile.numbers": "Numbers (0-9)",
    "profile.specialCharacters": "Special characters (@$!%*?&)",
    "profile.confirmNewPassword": "Confirm New Password",
    "profile.confirmPasswordPlaceholder": "Confirm your new password",
    "profile.updatePassword": "Update Password",
    "profile.updating": "Updating...",
    "profile.password": "Password",
    "profile.hiddenForSecurity": "Hidden for security",
    "profile.requestSent": "• Request Sent",
    "profile.enterFullName": "Enter full name",
    "profile.reasonForChange": "Reason for change (optional)",
    "profile.enterEmail": "Enter email address",
    "profile.reasonForEmailChange": "Reason for email change (optional)",
    "profile.enterPhoneNumber": "Enter phone number",
    "profile.notProvided": "Not provided",
    "profile.errorFileTooLarge": "File size must be less than 5MB",
    "profile.errorInvalidImage": "Please select a valid image file",

    // Cicilan Modal
    "cicilan.title": "Installment {plantName}",
    "cicilan.choosePackage": "Choose Investment Package",
    "cicilan.noPackagesAvailable": "No investment packages available yet",
    "cicilan.packageDetails": "Package Details",
    "cicilan.selectedPackage": "Selected Package:",
    "cicilan.treeCount": "Number of Trees:",
    "cicilan.trees": "Trees",
    "cicilan.totalInvestment": "Total Investment:",
    "cicilan.estimatedReturn": "Estimated Return:",
    "cicilan.chooseInstallmentPeriod": "Choose Installment Period",
    "cicilan.timesPayment": "payments",
    "cicilan.perInstallment": "per installment",
    "cicilan.howItWorks": "How Installments Work",
    "cicilan.step1": "Create and sign the investment contract first",
    "cicilan.step2": "Wait for admin approval for your contract",
    "cicilan.step3": "Once approved, you can start installment payments",
    "cicilan.step4": "Upload payment proof for each installment period",
    "cicilan.step5": "Investment starts after first payment is approved",
    "cicilan.cancel": "Cancel",
    "cicilan.createContract": "Create Contract",
    "cicilan.processing": "Processing...",
    "cicilan.orderDetails": "Order Details",
    "cicilan.contractDetails": "Contract Details",
    "cicilan.contractNumber": "Contract No.:",
    "cicilan.packageType": "Package Type:",
    "cicilan.packagePrice": "Package Price:",
    "cicilan.paymentType": "Payment Type:",
    "cicilan.installmentPer": "Installment per {period}:",
    "cicilan.referralCode": "Referral Code (Optional)",
    "cicilan.enterReferralCode": "Enter Referral Code:",
    "cicilan.referralCodeFormat":
      "Referral code must be 6 characters of capital letters and numbers",
    "cicilan.orderConfirmation": "Order Confirmation",
    "cicilan.orderConfirmationMessage":
      'By pressing "Continue", the contract will be created and you will be directed to the contract signing page.',
    "cicilan.back": "Back",
    "cicilan.continue": "Continue",
    "cicilan.creatingContract": "Creating Contract...",
    "cicilan.invalidReferralCode": "Invalid Referral Code",
    "cicilan.invalidReferralCodeMessage":
      "Referral code must be 6 characters of capital letters and numbers",
    "cicilan.contractCreated": "Contract Successfully Created!",
    "cicilan.contractCreatedMessage":
      "Contract {contractNumber} has been created. You will be directed to sign the contract.",
    "cicilan.contractError": "Failed to Create Contract",
    "cicilan.error": "Error",
    "cicilan.errorCreatingContract":
      "An error occurred while creating the contract",
    "cicilan.errorPreparingContract":
      "An error occurred while preparing the contract",

    // General
    loading: "Loading...",
    close: "Close",
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("id");

  useEffect(() => {
    const saved = localStorage.getItem("preferred-language") as Language;
    if (saved && (saved === "id" || saved === "en")) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("preferred-language", lang);
  };

  const t = (key: string, params?: Record<string, string>) => {
    let translation =
      translations[language][
        key as keyof (typeof translations)[typeof language]
      ] || key;

    // Replace parameters in translation
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{${param}}`, value);
      });
    }

    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
