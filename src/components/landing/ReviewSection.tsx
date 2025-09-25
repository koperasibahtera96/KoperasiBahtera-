'use client';

import { motion, LazyMotion, domAnimation } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAlert } from '@/components/ui/Alert';

interface Review {
  _id: string;
  name: string;
  city: string;
  description: string;
  photoUrl?: string;
  videoUrl?: string;
  rating: number;
  createdAt: string;
}

const ReviewSection = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [featuredReview, setFeaturedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [screenType, setScreenType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    setIsClient(true);
    const checkScreen = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenType('mobile'); // 1 card vertically
      } else if (width >= 768 && width < 1280) {
        setScreenType('tablet'); // 2 cards for iPad sizes
      } else {
        setScreenType('desktop'); // 3 cards for desktop
      }
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    email: '',
    description: '',
    photoUrl: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const { showSuccess, showError, AlertComponent } = useAlert();

  // Hardcoded rating data
  const ratingData = {
    averageRating: 4.5,
    totalReviews: 2808,
    breakdown: {
      5: 2800,
      4: 8,
      3: 0,
      2: 0,
      1: 0
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchFeaturedReview();
  }, []);

  const fetchFeaturedReview = async () => {
    try {
      setFeaturedLoading(true);
      const response = await fetch('/api/reviews/featured');
      if (response.ok) {
        const result = await response.json();
        setFeaturedReview(result.data);
      }
    } catch (error) {
      console.error('Error fetching featured review:', error);
    } finally {
      setFeaturedLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reviews');
      if (response.ok) {
        const result = await response.json();
        setReviews(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showError('File Terlalu Besar', 'Ukuran file maksimal 5MB. Silakan pilih file yang lebih kecil.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('Format File Tidak Didukung', 'Hanya file JPEG, PNG, dan WebP yang diperbolehkan.');
      return;
    }

    setSelectedFile(file);
    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('photo', file);

      const response = await fetch('/api/reviews/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (response.ok) {
        const result = await response.json();
        setFormData(prev => ({ ...prev, photoUrl: result.data.url }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('Gagal Upload', 'Gagal mengupload foto. Silakan coba lagi.');
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          rating: selectedRating
        }),
      });

      if (response.ok) {
        showSuccess('Review Berhasil Dikirim!', 'Admin akan meninjau review Anda sebelum dipublikasikan.');
        setFormData({ name: '', city: '', email: '', description: '', photoUrl: '' });
        setSelectedFile(null);
        setSelectedRating(5);
        setHoverRating(0);
      } else {
        const error = await response.json();
        showError('Gagal Mengirim Review', error.error || 'Terjadi kesalahan saat mengirim review');
      }
    } catch (error) {
      console.error('Submit error:', error);
      showError('Gagal Mengirim Review', 'Gagal mengirim review. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-base md:text-lg lg:text-xl ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  const renderInteractiveStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        className={`text-2xl transition-colors duration-200 hover:scale-110 ${
          i < (hoverRating || selectedRating) ? 'text-yellow-400' : 'text-gray-300'
        }`}
        onClick={() => setSelectedRating(i + 1)}
        onMouseEnter={() => setHoverRating(i + 1)}
        onMouseLeave={() => setHoverRating(0)}
      >
        ★
      </button>
    ));
  };

  const renderRatingBar = (stars: number, count: number) => {
    const percentage = ratingData.totalReviews > 0 ? (count / ratingData.totalReviews) * 100 : 0;

    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-3 text-center">{stars}★</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="w-8 text-center text-gray-600">{count}</span>
      </div>
    );
  };

  return (
    <LazyMotion features={domAnimation}>
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[#F8FAF9] to-[#E8F5E8]">
        <div className="max-w-screen mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#324D3E] mb-4 md:mb-5 font-[family-name:var(--font-poppins)]">
            Review Investor
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-[#889063] max-w-4xl mx-auto">
            Apa kata para investor tentang pengalaman investasi mereka bersama kami
          </p>
        </motion.div>

        {/* Featured Testimonial Section */}
        {featuredReview && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-16 max-w-5xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/95 backdrop-blur-lg rounded-3xl p-8 md:p-12 shadow-2xl border border-[#324D3E]/10 relative overflow-hidden"
            >
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#E8B86D]/20 to-[#B8860B]/20 rounded-full transform translate-x-16 -translate-y-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#324D3E]/20 to-[#4C3D19]/20 rounded-full transform -translate-x-12 translate-y-12"></div>

              <div className="relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                  {/* Photo/Video Section */}
                  <div className="flex-shrink-0">
                    <div className="bg-gradient-to-r from-[#E8B86D] to-[#B8860B] p-2 rounded-2xl shadow-lg">
                      <div className="bg-white p-3 rounded-xl">
                        {featuredReview.videoUrl ? (
                          <div className="relative w-72 h-72 bg-gray-100 rounded-xl overflow-hidden">
                            <video
                              src={featuredReview.videoUrl}
                              controls
                              className="w-full h-full object-cover"
                              poster={featuredReview.photoUrl || undefined}
                            >
                              Video testimonial tidak dapat diputar
                            </video>
                          </div>
                        ) : featuredReview.photoUrl ? (
                          <div className="relative w-72 h-72 bg-gray-100 rounded-xl overflow-hidden">
                            <Image
                              src={featuredReview.photoUrl}
                              alt={`${featuredReview.name}'s testimonial photo`}
                              fill
                              className="object-cover"
                              sizes="288px"
                              quality={95}
                              priority
                            />
                          </div>
                        ) : (
                          <div className="w-72 h-72 bg-gray-100 rounded-xl flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-20 h-20 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-white font-bold text-3xl">
                                  {featuredReview.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <p className="text-gray-500 text-base">Featured Testimonial</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Testimonial Content */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="mb-6">
                      <h3 className="text-3xl md:text-4xl font-bold text-[#324D3E] mb-2 font-[family-name:var(--font-poppins)]">
                        {featuredReview.name}
                      </h3>
                      <p className="text-xl text-[#889063] font-medium">{featuredReview.city}</p>
                    </div>

                    <div className="flex justify-center lg:justify-start items-center gap-2 mb-6">
                      <div className="flex">
                        {renderStars(featuredReview.rating)}
                      </div>
                      <span className="text-lg font-semibold text-[#324D3E] ml-2">
                        {featuredReview.rating}/5 Bintang
                      </span>
                    </div>

                    <blockquote className="text-xl md:text-2xl leading-relaxed text-[#324D3E] font-medium italic">
                      &quot;{featuredReview.description}&quot;
                    </blockquote>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Reviews Grid - Above Header */}
        <div className="mb-12">
          {loading ? (
            <div className={`grid gap-4 sm:gap-8 md:gap-12 ${
              screenType === 'mobile' ? 'grid-cols-1 max-w-md' : 
              screenType === 'tablet' ? 'grid-cols-2 max-w-4xl' : 
              'grid-cols-3 max-w-7xl'
            } mx-auto`}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`grid gap-6 md:gap-12 ${
                screenType === 'mobile' ? 'grid-cols-1 max-w-md' : 
                screenType === 'tablet' ? 'grid-cols-2 max-w-4xl' : 
                'grid-cols-3 max-w-7xl'
              } mx-auto`}
            >
              {reviews.slice(0, isClient ? (
                screenType === 'mobile' ? 3 : 
                screenType === 'tablet' ? 2 : 
                3
              ) : 3).map((review, index) => (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-[#324D3E]/10 hover:shadow-xl transition-all duration-300"
                >
                  {/* Photo Frame with placeholder image */}
                  <div className="bg-gradient-to-r from-[#E8B86D] to-[#B8860B] p-1 rounded-xl mb-4">
                    <div className="bg-white p-2 rounded-lg">
                      {review.photoUrl ? (
                        <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={review.photoUrl}
                            alt={`${review.name}'s photo`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 33vw"
                            quality={90}
                            priority={index < 3}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-white font-bold text-2xl">
                                {review.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-500 text-sm">Investor Photo</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Card */}
                  <div className="bg-[#324D3E] text-white p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-2">
                        <h3 className="font-semibold text-base md:text-lg truncate">{review.name}</h3>
                        <p className="text-[#B8D4A8] text-sm">{review.city}</p>
                      </div>
                      <div className="flex flex-shrink-0">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    <p className="text-[#E8F5E8] text-sm leading-relaxed">
                      &quot;{review.description}&quot;
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            // Placeholder cards when no reviews
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`grid gap-6 md:gap-12 ${
                screenType === 'mobile' ? 'grid-cols-1 max-w-md' : 
                screenType === 'tablet' ? 'grid-cols-2 max-w-4xl' : 
                'grid-cols-3 max-w-7xl'
              } mx-auto`}
            >
              {[
                { name: "Timothy Krysiek", city: "Jakarta", rating: 4, description: "Awalnya Saya Ragu Untuk Mencoba Investasi Ini. Tapi Setelah Bergabung Beberapa Saat Dan Merasakan Keuntungan Yang Stabil, Saya Terima Rutin Setiap Bulan Sangat Membantu Sebagai Tambahan Pemasukan. Yang Saya Suka, Sistemnya Jelas Dan Transparan. Sehingga Saya Tidak Merasa Khawatir Soal Pengelolaan Investasi ini Memberikan Keuntungan Finansial Yang Stabil." },
                { name: "Timothy Krysiek", city: "Jakarta", rating: 5, description: "Awalnya Saya Ragu Untuk Mencoba Investasi Ini. Tapi Setelah Bergabung Beberapa Saat Dan Merasakan Keuntungan Yang Stabil, Saya Terima Rutin Setiap Bulan Sangat Membantu Sebagai Tambahan Pemasukan. Yang Saya Suka, Sistemnya Jelas Dan Transparan. Sehingga Saya Tidak Merasa Khawatir Soal Pengelolaan Investasi ini Memberikan Keuntungan Finansial Yang Stabil." },
                { name: "Timothy Krysiek", city: "Jakarta", rating: 4, description: "Awalnya Saya Ragu Untuk Mencoba Investasi Ini. Tapi Setelah Bergabung Beberapa Saat Dan Merasakan Keuntungan Yang Stabil, Saya Terima Rutin Setiap Bulan Sangat Membantu Sebagai Tambahan Pemasukan. Yang Saya Suka, Sistemnya Jelas Dan Transparan. Sehingga Saya Tidak Merasa Khawatir Soal Pengelolaan Investasi ini Memberikan Keuntungan Finansial Yang Stabil." }
              ].slice(0, isClient ? (
                screenType === 'mobile' ? 3 : 
                screenType === 'tablet' ? 2 : 
                3
              ) : 3).map((placeholder, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-[#324D3E]/10 hover:shadow-xl transition-all duration-300"
                >
                  {/* Photo Frame with placeholder image */}
                  <div className="bg-gradient-to-r from-[#E8B86D] to-[#B8860B] p-1 rounded-xl mb-4">
                    <div className="bg-white p-2 rounded-lg">
                      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-white font-bold text-2xl">
                              {placeholder.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-500 text-sm">Investor Photo</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review Card */}
                  <div className="bg-[#324D3E] text-white p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{placeholder.name}</h3>
                        <p className="text-[#B8D4A8] text-sm">{placeholder.city}</p>
                      </div>
                      <div className="flex">
                        {renderStars(placeholder.rating)}
                      </div>
                    </div>
                    <p className="text-[#E8F5E8] text-sm leading-relaxed">
                      &quot;{placeholder.description}&quot;
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Single Container with Rating and Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-4 lg:p-6"
        >
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-0 lg:divide-x lg:divide-[#324D3E]/20">
            {/* Rating Summary - Smaller Width */}
            <div className="lg:pr-8 lg:w-80 lg:flex-shrink-0">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#324D3E] mb-4 md:mb-6 font-[family-name:var(--font-poppins)]">
                Rating Kami
              </h3>

              {/* Overall Rating */}
              <div className="text-center mb-6">
                <div className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#324D3E] mb-2">
                  {ratingData.averageRating}<span className="text-base md:text-lg lg:text-xl text-gray-500">/5</span>
                </div>
                <div className="flex justify-center mb-2">
                  {renderStars(ratingData.averageRating)}
                </div>
                <p className="text-[#889063] text-sm lg:text-base">
                  {ratingData.totalReviews.toLocaleString('id-ID')} rating
                </p>
              </div>

              {/* Rating Breakdown */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <motion.div
                    key={stars}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: (5 - stars) * 0.1 }}
                  >
                    {renderRatingBar(stars, ratingData.breakdown[stars as keyof typeof ratingData.breakdown])}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Review Form - Expanded */}
            <div className="lg:pl-8 flex-1">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#324D3E] mb-4 md:mb-6 font-[family-name:var(--font-poppins)]">
                Bagikan Pengalaman Anda
              </h3>

              <motion.form onSubmit={handleSubmit}>
                {/* Form Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative">
                  {/* Left Column - Rating, Name and City - Larger Width */}
                  <div className="md:col-span-1 lg:col-span-2 space-y-4">
                    {/* Rating Stars (Display Only) */}
                    <div>
                      <label className="block text-sm font-medium text-[#324D3E] mb-2">
                        Rating Kepuasan
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {renderInteractiveStars()}
                        </div>
                        <span className="text-sm text-gray-600 ml-2">
                          {selectedRating} dari 5 bintang
                        </span>
                      </div>
                    </div>
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-[#324D3E] mb-2">
                        Nama *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-[#324D3E]/20 rounded-xl p-3 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 transition-all duration-300"
                        placeholder="Masukkan Nama"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-medium text-[#324D3E] mb-2">
                        Kota *
                      </label>
                      <select
                        required
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full border border-[#324D3E]/20 rounded-xl p-3 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 transition-all duration-300"
                      >
                        <option value="">Pilih Kota</option>
                        <option value="Jakarta">Jakarta</option>
                        <option value="Bandung">Bandung</option>
                        <option value="Surabaya">Surabaya</option>
                        <option value="Yogyakarta">Yogyakarta</option>
                        <option value="Semarang">Semarang</option>
                        <option value="Medan">Medan</option>
                        <option value="Makassar">Makassar</option>
                        <option value="Palembang">Palembang</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>

                  {/* Middle Column - Email and Description - Aligned with Rating */}
                  <div className="md:col-span-1 lg:col-span-2 space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-[#324D3E] mb-2">
                        Email (tidak di publikasikan) *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full border border-[#324D3E]/20 rounded-xl p-3 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 transition-all duration-300"
                        placeholder="Masukkan Email"
                      />
                    </div>

                    {/* Description - Stretched to match bottom */}
                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm font-medium text-[#324D3E] mb-2">
                        Deskripsi *
                      </label>
                      <div className="flex-1 flex flex-col">
                        <textarea
                          required
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full border border-[#324D3E]/20 rounded-xl p-3 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 transition-all duration-300 resize-none flex-1"
                          placeholder="Masukkan Pengalaman Anda"
                          maxLength={500}
                          style={{ minHeight: '120px' }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.description.length}/500 karakter
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Photo Upload and Submit Button */}
                  <div className="md:col-span-2 lg:col-span-1 flex flex-col">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-[#324D3E] mb-2">
                        Upload Foto
                      </label>
                      <div className="relative border-2 border-dashed border-[#324D3E]/20 rounded-xl p-4 text-center hover:border-[#324D3E]/40 transition-colors cursor-pointer flex flex-col justify-center h-[158px]">
                        {selectedFile ? (
                          <div className="space-y-2">
                            <div className="w-10 h-10 mx-auto bg-[#324D3E] rounded-xl flex items-center justify-center">
                              <span className="text-white text-sm">📁</span>
                            </div>
                            <p className="text-xs text-[#324D3E] font-medium truncate px-1">{selectedFile.name}</p>
                            {uploading && <p className="text-xs text-blue-600">Mengupload...</p>}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-10 h-10 mx-auto bg-[#889063] rounded-xl flex items-center justify-center">
                              <Image
                                src="/landing/icon-upload-review.webp"
                                alt="Upload"
                                width={20}
                                height={20}
                                className="opacity-80"
                                loading="lazy"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-[#889063] font-medium">Browse File</p>
                              <p className="text-xs text-gray-400">Max 5MB</p>
                            </div>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={uploading}
                        />
                      </div>
                    </div>

                    {/* Submit Button - Bottom Right */}
                    <div className="flex justify-end mt-4">
                      <button
                        type="submit"
                        disabled={submitting || uploading}
                        className="px-6 py-2.5 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium disabled:opacity-50 text-sm"
                      >
                        {submitting ? 'Mengirim...' : '📝 Kirim'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.form>
            </div>
          </div>
        </motion.div>
        </div>
        <AlertComponent />
      </section>
    </LazyMotion>
  );
};

export default ReviewSection;