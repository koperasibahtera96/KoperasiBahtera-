'use client';

import { useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  confirmVariant = 'danger',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getConfirmButtonClasses = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'primary':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      default:
        return 'bg-red-600 hover:bg-red-700 text-white';
    }
  };

  const getIcon = () => {
    switch (confirmVariant) {
      case 'danger':
        return '🗑️';
      case 'warning':
        return '⚠️';
      case 'primary':
        return '✅';
      default:
        return '❓';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 text-center">
          <div className="text-4xl mb-4">{getIcon()}</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 font-semibold py-3 px-4 rounded-lg transition-colors duration-200 ${getConfirmButtonClasses()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using confirmation dialogs
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'primary' | 'warning';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: undefined
  });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      confirmVariant?: 'danger' | 'primary' | 'warning';
    }
  ) => {
    setDialog({
      isOpen: true,
      title,
      message,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      confirmVariant: options?.confirmVariant || 'danger',
      onConfirm
    });
  };

  const hideDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false, onConfirm: undefined }));
  };

  const handleConfirm = () => {
    if (dialog.onConfirm) {
      dialog.onConfirm();
    }
    hideDialog();
  };

  const showDeleteConfirm = (itemName: string, onConfirm: () => void) => {
    showConfirm(
      'Konfirmasi Hapus',
      `Apakah Anda yakin ingin menghapus "${itemName}"? Data ini tidak dapat dikembalikan.`,
      onConfirm,
      { confirmText: 'Ya, Hapus', confirmVariant: 'danger' }
    );
  };

  return {
    showConfirm,
    showDeleteConfirm,
    hideDialog,
    ConfirmComponent: () => (
      <ConfirmDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        confirmVariant={dialog.confirmVariant}
        onConfirm={handleConfirm}
        onCancel={hideDialog}
      />
    )
  };
}