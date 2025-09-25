'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAlert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Flag, CheckCircle, Clock, Star, Save, Sparkles, Paperclip } from 'lucide-react';

interface Review {
  _id: string;
  name: string;
  city: string;
  email: string;
  description: string;
  photoUrl?: string;
  videoUrl?: string;
  rating: number;
  isApproved: boolean;
  isFlagged: boolean;
  flaggedWords?: string[];
  showOnLanding: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FilteredWord {
  _id: string;
  word: string;
  isActive: boolean;
  createdAt: string;
}

export default function ReviewManagementPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredWords, setFilteredWords] = useState<FilteredWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [activeTab, setActiveTab] = useState<'reviews' | 'filtered-words'>('reviews');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved' | 'flagged'>('pending');
  const [newWord, setNewWord] = useState('');
  const [addingWord, setAddingWord] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingFeatured, setCreatingFeatured] = useState(false);
  const [featuredFormData, setFeaturedFormData] = useState({
    name: '',
    city: '',
    email: '',
    description: '',
    rating: 5,
    mediaUrl: '',
    mediaType: '' // 'photo' or 'video'
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });
  const { showSuccess, showError, AlertComponent } = useAlert();

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const status = reviewFilter === 'pending' ? 'pending' : reviewFilter === 'approved' ? 'approved' : 'all';
      const response = await fetch(`/api/admin/reviews?status=${status}&limit=50`);
      if (response.ok) {
        const result = await response.json();
        let reviewsData = result.data.reviews;

        if (reviewFilter === 'flagged') {
          reviewsData = reviewsData.filter((review: Review) => review.isFlagged);
        }

        setReviews(reviewsData);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredWords = async () => {
    try {
      const response = await fetch('/api/admin/filtered-words?limit=100');
      if (response.ok) {
        const result = await response.json();
        setFilteredWords(result.data.filteredWords);
      }
    } catch (error) {
      console.error('Error fetching filtered words:', error);
    }
  };

  useEffect(() => {
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewFilter]);

  useEffect(() => {
    if (activeTab === 'filtered-words') {
      fetchFilteredWords();
    }
  }, [activeTab]);

  const handleReviewAction = async (reviewId: string, isApproved: boolean) => {
    try {
      setProcessingId(reviewId);
      const response = await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewId, isApproved }),
      });

      if (response.ok) {
        await fetchReviews();
        setSelectedReview(null);
      } else {
        const result = await response.json();
        showError('Gagal Update Review', result.error || 'Gagal mengupdate review');
      }
    } catch (error) {
      console.error('Error updating review:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleLandingPageToggle = async (reviewId: string, showOnLanding: boolean) => {
    try {
      setProcessingId(reviewId);
      const response = await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewId, showOnLanding }),
      });

      if (response.ok) {
        await fetchReviews();
      } else {
        const result = await response.json();
        showError('Gagal Update Landing Page', result.error || 'Gagal mengupdate tampilan landing page');
      }
    } catch (error) {
      console.error('Error updating landing page display:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleFeaturedToggle = async (reviewId: string, isFeatured: boolean) => {
    try {
      setProcessingId(reviewId);
      const response = await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewId, isFeatured }),
      });

      if (response.ok) {
        await fetchReviews();
        showSuccess('Update Berhasil', `Review ${isFeatured ? 'dijadikan' : 'dihapus dari'} testimoni unggulan`);
      } else {
        const result = await response.json();
        showError('Gagal Update Featured', result.error || 'Gagal mengupdate status testimoni unggulan');
      }
    } catch (error) {
      console.error('Error updating featured status:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Review',
      message: 'Apakah Anda yakin ingin menghapus review ini? Tindakan ini tidak dapat dibatalkan.',
      type: 'danger',
      onConfirm: () => performDeleteReview(reviewId)
    });
  };

  const performDeleteReview = async (reviewId: string) => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });

    try {
      setProcessingId(reviewId);
      const response = await fetch(`/api/admin/reviews?id=${reviewId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess('Review Dihapus', 'Review berhasil dihapus dari sistem');
        await fetchReviews();
        setSelectedReview(null);
      } else {
        showError('Gagal Hapus Review', 'Gagal menghapus review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      showError('Gagal Hapus Review', 'Terjadi kesalahan saat menghapus review');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddFilteredWord = async () => {
    if (!newWord.trim()) return;

    try {
      setAddingWord(true);
      const response = await fetch('/api/admin/filtered-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: newWord.trim() }),
      });

      if (response.ok) {
        showSuccess('Kata Terfilter Ditambahkan', `Kata "${newWord.trim()}" berhasil ditambahkan ke daftar filter`);
        setNewWord('');
        await fetchFilteredWords();
      } else {
        const result = await response.json();
        showError('Gagal Tambah Kata', result.error || 'Gagal menambahkan kata terfilter');
      }
    } catch (error) {
      console.error('Error adding filtered word:', error);
      showError('Gagal Tambah Kata', 'Terjadi kesalahan saat menambahkan kata terfilter');
    } finally {
      setAddingWord(false);
    }
  };

  const handleToggleWordStatus = async (wordId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/filtered-words', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wordId, isActive }),
      });

      if (response.ok) {
        showSuccess('Status Diupdate', `Kata berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
        await fetchFilteredWords();
      } else {
        showError('Gagal Update Status', 'Gagal mengupdate status kata terfilter');
      }
    } catch (error) {
      console.error('Error updating word status:', error);
      showError('Gagal Update Status', 'Terjadi kesalahan saat mengupdate status');
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Kata Terfilter',
      message: 'Apakah Anda yakin ingin menghapus kata terfilter ini? Tindakan ini tidak dapat dibatalkan.',
      type: 'danger',
      onConfirm: () => performDeleteWord(wordId)
    });
  };

  const performDeleteWord = async (wordId: string) => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });

    try {
      const response = await fetch(`/api/admin/filtered-words?id=${wordId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess('Kata Dihapus', 'Kata terfilter berhasil dihapus dari sistem');
        await fetchFilteredWords();
      } else {
        showError('Gagal Hapus Kata', 'Gagal menghapus kata terfilter');
      }
    } catch (error) {
      console.error('Error deleting filtered word:', error);
      showError('Gagal Hapus Kata', 'Terjadi kesalahan saat menghapus kata terfilter');
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine if it's photo or video
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      showError('Format File Tidak Didukung', 'Hanya file gambar (JPG, PNG, WebP) dan video (MP4, WebM, OGG) yang diperbolehkan');
      return;
    }

    // Check file size based on type
    const maxSize = isVideo ? 15 * 1024 * 1024 : 5 * 1024 * 1024; // 15MB for video, 5MB for image
    if (file.size > maxSize) {
      showError('File Terlalu Besar', `Ukuran ${isVideo ? 'video' : 'foto'} maksimal ${isVideo ? '15MB' : '5MB'}`);
      return;
    }

    // Validate file types
    if (isImage) {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedImageTypes.includes(file.type)) {
        showError('Format File Tidak Didukung', 'Hanya file JPEG, PNG, dan WebP yang diperbolehkan untuk foto');
        return;
      }
    } else if (isVideo) {
      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      if (!allowedVideoTypes.includes(file.type)) {
        showError('Format File Tidak Didukung', 'Hanya file MP4, WebM, dan OGG yang diperbolehkan untuk video');
        return;
      }
    }

    setUploadingMedia(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append(isVideo ? 'video' : 'photo', file);

      const endpoint = isVideo ? '/api/reviews/upload-video' : '/api/reviews/upload';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: uploadFormData,
      });

      if (response.ok) {
        const result = await response.json();
        setFeaturedFormData(prev => ({
          ...prev,
          mediaUrl: result.data.url,
          mediaType: isVideo ? 'video' : 'photo'
        }));
        showSuccess(`${isVideo ? 'Video' : 'Foto'} Berhasil Diupload`, `${isVideo ? 'Video' : 'Foto'} testimonial berhasil diupload`);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Media upload error:', error);
      showError(`Gagal Upload ${isVideo ? 'Video' : 'Foto'}`, `Gagal mengupload ${isVideo ? 'video' : 'foto'}. Silakan coba lagi`);
    } finally {
      setUploadingMedia(false);
      // Clear the input to prevent issues with file processing
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleCreateTestimonial = async (isFeatured: boolean) => {
    if (!featuredFormData.name || !featuredFormData.city || !featuredFormData.email || !featuredFormData.description) {
      showError('Form Tidak Lengkap', 'Nama, kota, email, dan deskripsi wajib diisi');
      return;
    }

    setCreatingFeatured(true);

    try {
      // Prepare data based on media type
      const submitData = {
        name: featuredFormData.name,
        city: featuredFormData.city,
        email: featuredFormData.email,
        description: featuredFormData.description,
        rating: featuredFormData.rating,
        photoUrl: featuredFormData.mediaType === 'photo' ? featuredFormData.mediaUrl : '',
        videoUrl: featuredFormData.mediaType === 'video' ? featuredFormData.mediaUrl : '',
        isFeatured
      };

      const response = await fetch('/api/admin/reviews/testimonial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        // Close modal first
        setShowCreateModal(false);

        // Clear form data
        setFeaturedFormData({
          name: '',
          city: '',
          email: '',
          description: '',
          rating: 5,
          mediaUrl: '',
          mediaType: ''
        });

        // Refresh reviews
        await fetchReviews();

        // Show success message after modal is closed
        const actionText = isFeatured ? 'Testimoni Unggulan' : 'Draft Testimoni';
        const statusText = isFeatured ? 'dibuat dan ditampilkan di landing page' : 'disimpan sebagai draft';
        setTimeout(() => {
          showSuccess(`${actionText} Berhasil`, `${actionText} berhasil ${statusText}`);
        }, 100);
      } else {
        const result = await response.json();
        showError('Gagal Membuat Testimoni', result.error || 'Gagal membuat testimoni');
      }
    } catch (error) {
      console.error('Error creating testimonial:', error);
      showError('Gagal Membuat Testimoni', 'Terjadi kesalahan saat membuat testimoni');
    } finally {
      setCreatingFeatured(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-sm ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
        <Star className="w-4 h-4 inline-block" />
      </span>
    ));
  };

  const getStatusBadge = (review: Review) => {
    const badges = [];

    if (review.isFlagged) {
      badges.push(
        <span key="flagged" className={getThemeClasses("px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-full transition-colors duration-300", "!bg-[#FFC1CC] !text-[#4c1d1d]") }>
          <Flag className="inline-block w-3 h-3 mr-1" /> Terdeteksi
        </span>
      );
    }

    if (review.isApproved) {
      badges.push(
        <span key="approved" className={getThemeClasses("px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full transition-colors duration-300", "!bg-[#B5EAD7] !text-[#4c1d1d]") }>
          <CheckCircle className="inline-block w-3 h-3 mr-1" /> Disetujui
        </span>
      );
    } else {
      badges.push(
        <span key="pending" className={getThemeClasses("px-2 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-full transition-colors duration-300", "!bg-[#C7CEEA] !text-[#4c1d1d]") }>
          <Clock className="inline-block w-3 h-3 mr-1" /> Menunggu
        </span>
      );
    }

    if (review.showOnLanding) {
      badges.push(
        <span key="landing" className={getThemeClasses("px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full transition-colors duration-300", "!bg-[#FFE4E8] !text-[#4c1d1d]") }>
          <Star className="inline-block w-3 h-3 mr-1" /> Landing Page
        </span>
      );
    }

    if (review.isFeatured) {
      badges.push(
        <span key="featured" className={getThemeClasses("px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 rounded-full transition-colors duration-300", "!bg-[#E8D5FF] !text-[#4c1d1d]") }>
          ⭐ Testimoni Unggulan
        </span>
      );
    }

    return <div className="flex flex-wrap gap-1">{badges}</div>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 p-6 transition-colors duration-300"
        >
          <h1 className="text-3xl font-bold text-[#324D3E] dark:text-white mb-6 font-[family-name:var(--font-poppins)] transition-colors duration-300">Kelola Komentar</h1>

          {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-6 transition-colors duration-300">
            <button
              onClick={() => setActiveTab('reviews')}
              className={getThemeClasses(
                `flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300 font-[family-name:var(--font-poppins)] ${
                  activeTab === 'reviews'
                    ? 'bg-white dark:bg-gray-600 text-[#324D3E] dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-[#324D3E] dark:hover:text-white'
                }`,
                activeTab === 'reviews' ? '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d] !shadow-sm' : ''
              )}
            >
              Kelola Review
            </button>
            <button
              onClick={() => setActiveTab('filtered-words')}
              className={getThemeClasses(
                `flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300 font-[family-name:var(--font-poppins)] ${
                  activeTab === 'filtered-words'
                    ? 'bg-white dark:bg-gray-600 text-[#324D3E] dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-[#324D3E] dark:hover:text-white'
                }`,
                activeTab === 'filtered-words' ? '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d] !shadow-sm' : ''
              )}
            >
              Kata Terfilter
            </button>
          </div>

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Filter Reviews and Create Button */}
              <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'pending', 'approved', 'flagged'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setReviewFilter(filter)}
                      className={getThemeClasses(
                        `px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-300 font-[family-name:var(--font-poppins)] ${
                          reviewFilter === filter
                            ? 'bg-[#324D3E] dark:bg-[#4C3D19] text-white'
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                        }`,
                        reviewFilter === filter ? '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]' : ''
                      )}
                    >
                      {filter === 'all' ? 'Semua' :
                       filter === 'pending' ? 'Menunggu' :
                       filter === 'approved' ? 'Disetujui' : 'Terdeteksi'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className={getThemeClasses(
                    'px-4 py-2 bg-[#324D3E] dark:bg-[#4C3D19] text-white rounded-lg hover:bg-[#4A6741] dark:hover:bg-[#889063] active:bg-[#2C3E2B] transition-all duration-300 font-medium font-[family-name:var(--font-poppins)] focus:ring-2 focus:ring-[#324D3E] focus:ring-offset-2 flex items-center gap-2',
                    '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]'
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  Buat Testimoni Unggulan
                </button>
              </div>

              {/* Reviews List */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#324D3E] dark:border-white"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <motion.div
                      key={review._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedReview(selectedReview?._id === review._id ? null : review)}
                      className={`bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border-l-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-300 ${
                        review.isFlagged ? 'border-red-500' :
                        review.isApproved ? 'border-green-500' : 'border-yellow-500'
                      } ${selectedReview?._id === review._id ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-[#324D3E] dark:text-white transition-colors duration-300 font-[family-name:var(--font-poppins)]">{review.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">{review.city} • {review.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(review)}
                          <div className="text-gray-400 dark:text-gray-500 transition-colors duration-300">
                            {selectedReview?._id === review._id ? '↑' : '↓'}
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-800 dark:text-gray-200 mb-3 transition-colors duration-300">{review.description}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">Rating:</span>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">({review.rating}/5)</span>
                      </div>

                      {review.photoUrl && (
                        <div className="mb-3">
                          <Image
                            src={review.photoUrl}
                            alt="Review photo"
                            width={100}
                            height={100}
                            className="rounded-lg object-cover"
                          />
                        </div>
                      )}

                      {review.isFlagged && review.flaggedWords && review.flaggedWords.length > 0 && (
                        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors duration-300">
                          <p className="text-sm text-red-800 dark:text-red-300 font-medium transition-colors duration-300">Kata yang terdeteksi:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {review.flaggedWords.map((word, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded transition-colors duration-300"
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedReview?._id === review._id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3 space-y-3 transition-colors duration-300"
                        >
                          <div className="flex flex-wrap gap-2">
                            {!review.isApproved && (
                              <button
                                onClick={() => handleReviewAction(review._id, true)}
                                disabled={processingId === review._id}
                                className={getThemeClasses(
                                  'px-4 py-2 bg-green-600 dark:bg-green-700 text-white text-sm rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 transition-all duration-300 font-[family-name:var(--font-poppins)]',
                                  '!bg-gradient-to-r !from-[#B5EAD7] !to-[#E6FFF0] !text-[#4c1d1d]'
                                )}
                              >
                                {processingId === review._id ? 'Processing...' : 'Setujui'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReview(review._id)}
                              disabled={processingId === review._id}
                              className={getThemeClasses(
                                'px-4 py-2 bg-red-600 dark:bg-red-700 text-white text-sm rounded-lg hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 transition-all duration-300 font-[family-name:var(--font-poppins)]',
                                '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFE4E8] !text-[#4c1d1d]'
                              )}
                            >
                              {processingId === review._id ? 'Processing...' : 'Hapus'}
                            </button>
                          </div>

                          {/* Landing Page and Featured Controls - Only show for approved reviews */}
                          {review.isApproved && (
                            <div className="space-y-3">
                              {/* Landing Page Controls - Only show if NOT featured */}
                              {!review.isFeatured && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800 transition-colors duration-300">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-medium text-blue-900 dark:text-blue-300 transition-colors duration-300 font-[family-name:var(--font-poppins)]">Tampilkan di Landing Page</h4>
                                      <p className="text-sm text-blue-700 dark:text-blue-400 transition-colors duration-300">
                                        {review.showOnLanding
                                          ? 'Review ini ditampilkan di review investor biasa'
                                          : 'Review ini tidak ditampilkan di landing page'
                                        }
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleLandingPageToggle(review._id, !review.showOnLanding)}
                                      disabled={processingId === review._id}
                                      className={getThemeClasses(
                                        `px-4 py-2 text-sm rounded-lg transition-all duration-300 disabled:opacity-50 font-[family-name:var(--font-poppins)] ${
                                          review.showOnLanding
                                            ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800'
                                            : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700'
                                        }`,
                                        '!bg-gradient-to-r !from-[#C7CEEA] !to-[#EAF0FF] !text-[#4c1d1d]'
                                      )}
                                    >
                                      {processingId === review._id ? 'Processing...' :
                                       review.showOnLanding ? 'Sembunyikan' : 'Tampilkan'}
                                    </button>
                                  </div>
                                  {review.showOnLanding && (
                                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 transition-colors duration-300">
                                      ⭐ Review ini akan muncul di grid review investor biasa
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Featured Testimonial Controls */}
                              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800 transition-colors duration-300">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-purple-900 dark:text-purple-300 transition-colors duration-300 font-[family-name:var(--font-poppins)]">Testimoni Unggulan</h4>
                                    <p className="text-sm text-purple-700 dark:text-purple-400 transition-colors duration-300">
                                      {review.isFeatured
                                        ? 'Review ini dijadikan testimoni unggulan di atas section review'
                                        : 'Jadikan review ini sebagai testimoni unggulan yang ditampilkan secara menonjol'
                                      }
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleFeaturedToggle(review._id, !review.isFeatured)}
                                    disabled={processingId === review._id}
                                    className={getThemeClasses(
                                      `px-4 py-2 text-sm rounded-lg transition-all duration-300 disabled:opacity-50 font-[family-name:var(--font-poppins)] ${
                                        review.isFeatured
                                          ? 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-800'
                                          : 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-700'
                                      }`,
                                      '!bg-gradient-to-r !from-[#E8D5FF] !to-[#F3E8FF] !text-[#4c1d1d]'
                                    )}
                                  >
                                    {processingId === review._id ? 'Processing...' :
                                     review.isFeatured ? 'Batalkan' : 'Jadikan Unggulan'}
                                  </button>
                                </div>
                                {review.isFeatured && (
                                  <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 transition-colors duration-300">
                                    🌟 Testimoni ini akan ditampilkan secara menonjol di atas review investor lainnya
                                  </div>
                                )}
                              </div>

                              {/* Info message for featured reviews */}
                              {review.isFeatured && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800 transition-colors duration-300">
                                  <p className="text-sm text-amber-800 dark:text-amber-300 transition-colors duration-300">
                                    ℹ️ Testimoni unggulan otomatis ditampilkan di landing page muncul di paling atas review investor.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  ))}

                  {reviews.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 transition-colors duration-300">
                      Tidak ada review ditemukan
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Filtered Words Tab */}
          {activeTab === 'filtered-words' && (
            <div className="space-y-6">
              {/* Add New Word */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 transition-colors duration-300">
                <h3 className="font-semibold text-[#324D3E] dark:text-white mb-3 font-[family-name:var(--font-poppins)] transition-colors duration-300">Tambah Kata Terfilter</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Masukkan kata yang ingin difilter..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[#324D3E] focus:border-transparent text-sm sm:text-base transition-all duration-300"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddFilteredWord()}
                  />
                  <button
                    onClick={handleAddFilteredWord}
                    disabled={addingWord || !newWord.trim()}
                    className={getThemeClasses(
                      'px-4 py-2 bg-[#324D3E] dark:bg-[#4C3D19] text-white rounded-lg hover:bg-[#4A6741] dark:hover:bg-[#889063] active:bg-[#2C3E2B] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium font-[family-name:var(--font-poppins)] focus:ring-2 focus:ring-[#324D3E] focus:ring-offset-2 whitespace-nowrap min-w-[100px] text-sm sm:text-base',
                      '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]'
                    )}
                  >
                    {addingWord ? 'Menambah...' : 'Tambah'}
                  </button>
                </div>
              </div>

              {/* Filtered Words List */}
              <div className="space-y-2">
                {filteredWords.map((word) => (
                  <motion.div
                    key={word._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">{word.word}</span>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors duration-300 ${
                          word.isActive
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {word.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleWordStatus(word._id, !word.isActive)}
                        className={`px-3 py-1 text-sm rounded-lg transition-all duration-300 font-[family-name:var(--font-poppins)] ${
                          word.isActive
                            ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            : 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-800'
                        }`}
                      >
                        {word.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        onClick={() => handleDeleteWord(word._id)}
                        className={getThemeClasses(
                          'px-3 py-1 text-sm bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-all duration-300 font-[family-name:var(--font-poppins)]',
                          '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFE4E8] !text-[#4c1d1d]'
                        )}
                      >
                        Hapus
                      </button>
                    </div>
                  </motion.div>
                ))}

                {filteredWords.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 transition-colors duration-300">
                    Belum ada kata terfilter
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
      <div className="fixed top-0 left-0 right-0 z-[10001] pointer-events-none">
        <div className="pointer-events-auto">
          <AlertComponent />
        </div>
      </div>

      {/* Create Featured Testimonial Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999] overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={getThemeClasses(
              "bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300 relative z-[10000]",
              "!bg-gradient-to-br !from-[#FFF0F3]/95 !to-[#FFE4E8]/95 dark:!from-gray-800/95 dark:!to-gray-700/95"
            )}
          >
            {/* Header */}
            <div className={getThemeClasses(
              "p-6 bg-gradient-to-r from-[#324D3E]/5 to-[#4C3D19]/5 dark:from-[#324D3E]/10 dark:to-[#4C3D19]/10 border-b border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300",
              "!bg-gradient-to-r !from-[#FFC1CC]/20 !to-[#FFDEE9]/20 dark:!from-[#FFC1CC]/10 dark:!to-[#FFDEE9]/10"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-[#324D3E] dark:text-white">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#324D3E] dark:text-white font-[family-name:var(--font-poppins)] transition-colors duration-300">
                      Buat Testimoni Unggulan
                    </h3>
                    <p className="text-sm text-[#889063] dark:text-gray-300 mt-1 transition-colors duration-300">
                      Testimoni ini akan ditampilkan secara menonjol di landing page
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl transition-colors duration-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form - Modal-optimized layout */}
            <div className="p-6 space-y-6">
              {/* Basic Information Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-2 transition-colors duration-300">
                    Nama *
                  </label>
                  <input
                    type="text"
                    required
                    value={featuredFormData.name}
                    onChange={(e) => setFeaturedFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl p-3 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 transition-all duration-300"
                    placeholder="Masukkan Nama"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-2 transition-colors duration-300">
                    Kota *
                  </label>
                  <select
                    required
                    value={featuredFormData.city}
                    onChange={(e) => setFeaturedFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl p-3 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 transition-all duration-300"
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

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-2 transition-colors duration-300">
                    Email (tidak di publikasikan) *
                  </label>
                  <input
                    type="email"
                    required
                    value={featuredFormData.email}
                    onChange={(e) => setFeaturedFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl p-3 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 transition-all duration-300"
                    placeholder="Masukkan Email"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-2 transition-colors duration-300">
                  Rating Kepuasan
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`text-2xl transition-colors duration-200 hover:scale-110 ${
                          i < featuredFormData.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        onClick={() => setFeaturedFormData(prev => ({ ...prev, rating: i + 1 }))}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-2 transition-colors duration-300">
                    {featuredFormData.rating} dari 5 bintang
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-300 mb-2 transition-colors duration-300">
                  Deskripsi *
                </label>
                <textarea
                  required
                  value={featuredFormData.description}
                  onChange={(e) => setFeaturedFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-[#324D3E]/20 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl p-3 focus:border-[#324D3E] focus:ring-2 focus:ring-[#324D3E]/20 transition-all duration-300 resize-none"
                  placeholder="Masukkan Pengalaman Anda"
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-300">
                  {featuredFormData.description.length}/500 karakter
                </p>
              </div>

              {/* Media Upload */}
              <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-2 transition-colors duration-300">
                  Upload Media <span className={getThemeClasses("text-[#889063] font-semibold", "!text-[#FF6B9D]")}>(Foto atau Video)</span>
                </label>
                <div className={getThemeClasses(
                  "relative border-2 border-dashed border-[#324D3E]/20 dark:border-gray-600 rounded-xl p-6 text-center hover:border-[#324D3E]/40 dark:hover:border-gray-500 transition-colors cursor-pointer bg-gray-50/50 dark:bg-gray-700/50",
                  "!border-[#FFC1CC]/40 !bg-[#FFF0F3]/30 dark:!bg-gray-700/50 hover:!border-[#FF6B9D]/60"
                )}>
                  {featuredFormData.mediaUrl ? (
                    <div className="space-y-3">
                      <div className={getThemeClasses(
                        "w-16 h-16 mx-auto bg-[#324D3E] dark:bg-[#4C3D19] rounded-xl flex items-center justify-center",
                        "!bg-gradient-to-r !from-[#FF6B9D] !to-[#FFC1CC]"
                      )}>
                        {featuredFormData.mediaType === 'video' ? (
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 12l-4-3v6l4-3z"/>
                            <path d="M17 2H7a5 5 0 00-5 5v10a5 5 0 005 5h10a5 5 0 005-5V7a5 5 0 00-5-5zm3 15a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h10a3 3 0 013 3v10z"/>
                          </svg>
                        ) : (
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                            <path d="M14 2v6h6"/>
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-[#324D3E] dark:text-white font-medium transition-colors duration-300">
                        {featuredFormData.mediaType === 'video' ? 'Video' : 'Foto'} berhasil diupload
                      </p>
                      {uploadingMedia && <p className="text-sm text-blue-600 dark:text-blue-400">Mengupload...</p>}
                      <button
                        type="button"
                        onClick={() => setFeaturedFormData(prev => ({ ...prev, mediaUrl: '', mediaType: '' }))}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors duration-300"
                      >
                        Ganti {featuredFormData.mediaType === 'video' ? 'video' : 'foto'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className={getThemeClasses(
                        "w-16 h-16 mx-auto bg-[#889063] dark:bg-gray-600 rounded-xl flex items-center justify-center",
                        "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9]"
                      )}>
                        <Paperclip className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-[#889063] dark:text-gray-300 font-medium transition-colors duration-300">
                          {uploadingMedia ? 'Mengupload...' : 'Browse File Media'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
                          Foto: Max 5MB (JPG, PNG, WebP)<br />
                          Video: Max 15MB, 30 detik (MP4, WebM, OGG)
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingMedia}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className={getThemeClasses(
                "flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300",
                "!border-t-[#FFC1CC]/30"
              )}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 font-medium font-[family-name:var(--font-poppins)] rounded-lg transition-all duration-300"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateTestimonial(false)}
                  disabled={creatingFeatured || uploadingMedia}
                  className={getThemeClasses(
                    'flex-1 px-4 py-3 bg-gray-500 dark:bg-gray-600 text-white hover:bg-gray-600 dark:hover:bg-gray-500 font-medium font-[family-name:var(--font-poppins)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2',
                    '!bg-gradient-to-r !from-[#4A90A4] !to-[#5BA3B8] !text-white hover:!from-[#3E7A8C] hover:!to-[#4A8FA3]'
                  )}
                >
                  {creatingFeatured ? (
                    'Menyimpan...'
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Draft
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateTestimonial(true)}
                  disabled={creatingFeatured || uploadingMedia}
                  className={getThemeClasses(
                    'flex-1 px-4 py-3 bg-[#324D3E] dark:bg-[#4C3D19] text-white hover:bg-[#4A6741] dark:hover:bg-[#889063] font-medium font-[family-name:var(--font-poppins)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 focus:ring-2 focus:ring-[#324D3E] focus:ring-offset-2 flex items-center justify-center gap-2',
                    '!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d] hover:!from-[#FF9FB8] hover:!to-[#FFC9DC]'
                  )}
                >
                  {creatingFeatured ? (
                    'Mempublikasi...'
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Buat & Jadikan Unggulan
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-300"
          >
            {/* Header */}
            <div className={`p-6 ${confirmDialog.type === 'danger' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'} border-b border-gray-200 dark:border-gray-700 transition-colors duration-300`}>
              <div className="flex items-center gap-3">
                <div className={`text-3xl ${confirmDialog.type === 'danger' ? 'text-red-500 dark:text-red-400' : 'text-yellow-500 dark:text-yellow-400'}`}>
                  {confirmDialog.type === 'danger' ? '🗑️' : '⚠️'}
                </div>
                <div>
                  <h3 className={`text-xl font-bold font-[family-name:var(--font-poppins)] transition-colors duration-300 ${confirmDialog.type === 'danger' ? 'text-red-900 dark:text-red-300' : 'text-yellow-900 dark:text-yellow-300'}`}>
                    {confirmDialog.title}
                  </h3>
                  <p className={`text-sm mt-1 transition-colors duration-300 ${confirmDialog.type === 'danger' ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                    {confirmDialog.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700 flex gap-3 justify-end transition-colors duration-300">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 font-medium font-[family-name:var(--font-poppins)] rounded-lg transition-all duration-300"
              >
                Batal
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-white font-medium font-[family-name:var(--font-poppins)] rounded-lg transition-all duration-300 ${
                  confirmDialog.type === 'danger'
                    ? 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800'
                    : 'bg-yellow-600 dark:bg-yellow-700 hover:bg-yellow-700 dark:hover:bg-yellow-800'
                }`}
              >
                {confirmDialog.type === 'danger' ? 'Ya, Hapus' : 'Ya, Lanjutkan'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}