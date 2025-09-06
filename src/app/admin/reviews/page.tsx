'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAlert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface Review {
  _id: string;
  name: string;
  city: string;
  email: string;
  description: string;
  photoUrl?: string;
  rating: number;
  isApproved: boolean;
  isFlagged: boolean;
  flaggedWords?: string[];
  showOnLanding: boolean;
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredWords, setFilteredWords] = useState<FilteredWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [activeTab, setActiveTab] = useState<'reviews' | 'filtered-words'>('reviews');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved' | 'flagged'>('pending');
  const [newWord, setNewWord] = useState('');
  const [addingWord, setAddingWord] = useState(false);
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-sm ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  const getStatusBadge = (review: Review) => {
    const badges = [];

    if (review.isFlagged) {
      badges.push(
        <span key="flagged" className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-full transition-colors duration-300">
          🚩 Terdeteksi
        </span>
      );
    }

    if (review.isApproved) {
      badges.push(
        <span key="approved" className="px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full transition-colors duration-300">
          ✅ Disetujui
        </span>
      );
    } else {
      badges.push(
        <span key="pending" className="px-2 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-full transition-colors duration-300">
          ⏳ Menunggu
        </span>
      );
    }

    if (review.showOnLanding) {
      badges.push(
        <span key="landing" className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full transition-colors duration-300">
          ⭐ Landing Page
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
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300 font-[family-name:var(--font-poppins)] ${
                activeTab === 'reviews'
                  ? 'bg-white dark:bg-gray-600 text-[#324D3E] dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-[#324D3E] dark:hover:text-white'
              }`}
            >
              Kelola Review
            </button>
            <button
              onClick={() => setActiveTab('filtered-words')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300 font-[family-name:var(--font-poppins)] ${
                activeTab === 'filtered-words'
                  ? 'bg-white dark:bg-gray-600 text-[#324D3E] dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-[#324D3E] dark:hover:text-white'
              }`}
            >
              Kata Terfilter
            </button>
          </div>

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Filter Reviews */}
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'approved', 'flagged'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setReviewFilter(filter)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-300 font-[family-name:var(--font-poppins)] ${
                      reviewFilter === filter
                        ? 'bg-[#324D3E] dark:bg-[#4C3D19] text-white'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                    }`}
                  >
                    {filter === 'all' ? 'Semua' :
                     filter === 'pending' ? 'Menunggu' :
                     filter === 'approved' ? 'Disetujui' : 'Terdeteksi'}
                  </button>
                ))}
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
                                className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white text-sm rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 transition-all duration-300 font-[family-name:var(--font-poppins)]"
                              >
                                {processingId === review._id ? 'Processing...' : 'Setujui'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReview(review._id)}
                              disabled={processingId === review._id}
                              className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white text-sm rounded-lg hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 transition-all duration-300 font-[family-name:var(--font-poppins)]"
                            >
                              {processingId === review._id ? 'Processing...' : 'Hapus'}
                            </button>
                          </div>

                          {/* Landing Page Controls - Only show for approved reviews */}
                          {review.isApproved && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800 transition-colors duration-300">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-blue-900 dark:text-blue-300 transition-colors duration-300 font-[family-name:var(--font-poppins)]">Tampilkan di Landing Page</h4>
                                  <p className="text-sm text-blue-700 dark:text-blue-400 transition-colors duration-300">
                                    {review.showOnLanding
                                      ? 'Review ini ditampilkan di landing page'
                                      : 'Review ini tidak ditampilkan di landing page'
                                    }
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleLandingPageToggle(review._id, !review.showOnLanding)}
                                  disabled={processingId === review._id}
                                  className={`px-4 py-2 text-sm rounded-lg transition-all duration-300 disabled:opacity-50 font-[family-name:var(--font-poppins)] ${
                                    review.showOnLanding
                                      ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800'
                                      : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700'
                                  }`}
                                >
                                  {processingId === review._id ? 'Processing...' :
                                   review.showOnLanding ? 'Sembunyikan' : 'Tampilkan'}
                                </button>
                              </div>
                              {review.showOnLanding && (
                                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 transition-colors duration-300">
                                  ⭐ Review ini akan muncul di halaman utama website
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
                    className="px-4 py-2 bg-[#324D3E] dark:bg-[#4C3D19] text-white rounded-lg hover:bg-[#4A6741] dark:hover:bg-[#889063] active:bg-[#2C3E2B] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium font-[family-name:var(--font-poppins)] focus:ring-2 focus:ring-[#324D3E] focus:ring-offset-2 whitespace-nowrap min-w-[100px] text-sm sm:text-base"
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
                        className="px-3 py-1 text-sm bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-all duration-300 font-[family-name:var(--font-poppins)]"
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
      <AlertComponent />
      
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