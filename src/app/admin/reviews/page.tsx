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
        <span key="flagged" className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
          🚩 Terdeteksi
        </span>
      );
    }

    if (review.isApproved) {
      badges.push(
        <span key="approved" className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
          ✅ Disetujui
        </span>
      );
    } else {
      badges.push(
        <span key="pending" className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
          ⏳ Menunggu
        </span>
      );
    }

    if (review.showOnLanding) {
      badges.push(
        <span key="landing" className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
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
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h1 className="text-3xl font-bold text-[#324D3E] mb-6">Kelola Komentar</h1>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'reviews'
                  ? 'bg-white text-[#324D3E] shadow-sm'
                  : 'text-gray-600 hover:text-[#324D3E]'
              }`}
            >
              Kelola Review
            </button>
            <button
              onClick={() => setActiveTab('filtered-words')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'filtered-words'
                  ? 'bg-white text-[#324D3E] shadow-sm'
                  : 'text-gray-600 hover:text-[#324D3E]'
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
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      reviewFilter === filter
                        ? 'bg-[#324D3E] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#324D3E]"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <motion.div
                      key={review._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedReview(selectedReview?._id === review._id ? null : review)}
                      className={`bg-gray-50 rounded-xl p-4 border-l-4 cursor-pointer hover:bg-gray-100 transition-colors ${
                        review.isFlagged ? 'border-red-500' :
                        review.isApproved ? 'border-green-500' : 'border-yellow-500'
                      } ${selectedReview?._id === review._id ? 'bg-gray-100' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-[#324D3E]">{review.name}</h3>
                          <p className="text-sm text-gray-600">{review.city} • {review.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(review)}
                          <div className="text-gray-400">
                            {selectedReview?._id === review._id ? '↑' : '↓'}
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-800 mb-3">{review.description}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-gray-600">Rating:</span>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-sm text-gray-500">({review.rating}/5)</span>
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
                        <div className="mb-3 p-2 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-800 font-medium">Kata yang terdeteksi:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {review.flaggedWords.map((word, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded"
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
                          className="border-t pt-3 mt-3 space-y-3"
                        >
                          <div className="flex flex-wrap gap-2">
                            {!review.isApproved && (
                              <button
                                onClick={() => handleReviewAction(review._id, true)}
                                disabled={processingId === review._id}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                {processingId === review._id ? 'Processing...' : 'Setujui'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReview(review._id)}
                              disabled={processingId === review._id}
                              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              {processingId === review._id ? 'Processing...' : 'Hapus'}
                            </button>
                          </div>

                          {/* Landing Page Controls - Only show for approved reviews */}
                          {review.isApproved && (
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-blue-900">Tampilkan di Landing Page</h4>
                                  <p className="text-sm text-blue-700">
                                    {review.showOnLanding
                                      ? 'Review ini ditampilkan di landing page'
                                      : 'Review ini tidak ditampilkan di landing page'
                                    }
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleLandingPageToggle(review._id, !review.showOnLanding)}
                                  disabled={processingId === review._id}
                                  className={`px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                                    review.showOnLanding
                                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  }`}
                                >
                                  {processingId === review._id ? 'Processing...' :
                                   review.showOnLanding ? 'Sembunyikan' : 'Tampilkan'}
                                </button>
                              </div>
                              {review.showOnLanding && (
                                <div className="mt-2 text-xs text-blue-600">
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
                    <div className="text-center py-8 text-gray-500">
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
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-[#324D3E] mb-3">Tambah Kata Terfilter</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Masukkan kata yang ingin difilter..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#324D3E] focus:border-transparent text-sm sm:text-base"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddFilteredWord()}
                  />
                  <button
                    onClick={handleAddFilteredWord}
                    disabled={addingWord || !newWord.trim()}
                    className="px-4 py-2 bg-[#324D3E] text-white rounded-lg hover:bg-[#4A6741] active:bg-[#2C3E2B] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium focus:ring-2 focus:ring-[#324D3E] focus:ring-offset-2 whitespace-nowrap min-w-[100px] text-sm sm:text-base"
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
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-[#324D3E]">{word.word}</span>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          word.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {word.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleWordStatus(word._id, !word.isActive)}
                        className={`px-3 py-1 text-sm rounded-lg ${
                          word.isActive
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {word.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        onClick={() => handleDeleteWord(word._id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </motion.div>
                ))}

                {filteredWords.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
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
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className={`p-6 ${confirmDialog.type === 'danger' ? 'bg-red-50' : 'bg-yellow-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`text-3xl ${confirmDialog.type === 'danger' ? 'text-red-500' : 'text-yellow-500'}`}>
                  {confirmDialog.type === 'danger' ? '🗑️' : '⚠️'}
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${confirmDialog.type === 'danger' ? 'text-red-900' : 'text-yellow-900'}`}>
                    {confirmDialog.title}
                  </h3>
                  <p className={`text-sm mt-1 ${confirmDialog.type === 'danger' ? 'text-red-700' : 'text-yellow-700'}`}>
                    {confirmDialog.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 font-medium rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-white font-medium rounded-lg transition-colors ${
                  confirmDialog.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
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