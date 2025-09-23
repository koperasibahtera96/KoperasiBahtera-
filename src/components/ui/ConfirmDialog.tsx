"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Trash2, AlertTriangle, Check } from "lucide-react";

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
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!isOpen) return null;

  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  const getConfirmButtonClasses = () => {
    switch (confirmVariant) {
      case "danger":
        return getThemeClasses("bg-red-600 hover:bg-red-700 text-white", "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]");
      case "primary":
        return getThemeClasses("bg-emerald-600 hover:bg-emerald-700 text-white", "!bg-gradient-to-r !from-[#B5EAD7] !to-[#E6FFF0] !text-[#4c1d1d]");
      case "warning":
        return getThemeClasses("bg-yellow-600 hover:bg-yellow-700 text-white", "!bg-gradient-to-r !from-[#C7CEEA] !to-[#EAF0FF] !text-[#4c1d1d]");
      default:
        return getThemeClasses("bg-red-600 hover:bg-red-700 text-white", "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d]");
    }
  };

  const getIcon = () => {
    switch (confirmVariant) {
      case "danger":
        return <Trash2 className={getThemeClasses("w-10 h-10", "text-[#4c1d1d]")} />;
      case "warning":
        return <AlertTriangle className={getThemeClasses("w-10 h-10", "text-[#4c1d1d]")} />;
      case "primary":
        return <Check className={getThemeClasses("w-10 h-10", "text-[#4c1d1d]")} />;
      default:
        return <div className="w-10 h-10" />;
    }
  };

  return (
    <div className={getThemeClasses("fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]", "") }>
      <div className={getThemeClasses("bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full transform animate-in zoom-in duration-200 border border-gray-200 dark:border-gray-700", "!bg-white/95 !border-[#FFC1CC]/30") }>
        {/* Header */}
        <div className={getThemeClasses("p-6 text-center border-b border-gray-200 dark:border-gray-700", "!bg-white/95 !border-b !border-[#FFC1CC]/30") }>
          <div className="mb-4">{getIcon()}</div>
          <h3 className={getThemeClasses("text-xl font-bold mb-2 text-gray-900 dark:text-white", "!text-[#4c1d1d]")}>{title}</h3>
          <p className={getThemeClasses("text-gray-600 dark:text-gray-300 leading-relaxed", "!text-[#6b7280]")}>{message}</p>
        </div>

        {/* Actions */}
        <div className={getThemeClasses("p-6 bg-gray-50 dark:bg-gray-900/60 rounded-b-2xl border-t border-gray-100 dark:border-gray-800", "!bg-white/95") }>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className={getThemeClasses("flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 font-semibold py-3 px-4 rounded-lg transition-colors duration-200", "!bg-white/80 !text-[#4c1d1d] !border-[#FFC1CC]/30")}
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