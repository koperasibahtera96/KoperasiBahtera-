"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface AlertProps {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  isOpen: boolean;
  onClose: () => void;
  duration?: number; // Auto close after duration (ms)
}

export function Alert({
  type,
  title,
  message,
  isOpen,
  onClose,
  duration = 3000,
}: AlertProps) {
  console.log("🔔 Alert component rendered:", { type, title, message, isOpen });

  useEffect(() => {
    console.log("🔔 Alert useEffect triggered:", { isOpen, duration });
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        console.log("🔔 Alert auto-closing after timeout");
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "ℹ️";
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case "success":
        return "border-green-500 bg-green-50 text-green-800";
      case "error":
        return "border-red-500 bg-red-50 text-red-800";
      case "warning":
        return "border-yellow-500 bg-yellow-50 text-yellow-800";
      case "info":
        return "border-blue-500 bg-blue-50 text-blue-800";
      default:
        return "border-gray-500 bg-gray-50 text-gray-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-in zoom-in duration-200">
        {/* Header */}
        <div className={`p-6 border-l-4 ${getColorClasses()} rounded-t-2xl`}>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{getIcon()}</div>
            <div>
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="text-sm opacity-80 mt-1">{message}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// Confirmation Modal Component
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "danger" | "warning" | "info";
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Ya",
  cancelText = "Batal",
  onConfirm,
  onCancel,
  type = "warning",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getColorClasses = () => {
    switch (type) {
      case "danger":
        return {
          border: "border-red-500",
          bg: "bg-red-50",
          text: "text-red-800",
          confirmButton: "bg-red-500 hover:bg-red-600 text-white",
        };
      case "warning":
        return {
          border: "border-yellow-500",
          bg: "bg-yellow-50",
          text: "text-yellow-800",
          confirmButton: "bg-yellow-500 hover:bg-yellow-600 text-white",
        };
      case "info":
        return {
          border: "border-blue-500",
          bg: "bg-blue-50",
          text: "text-blue-800",
          confirmButton: "bg-blue-500 hover:bg-blue-600 text-white",
        };
      default:
        return {
          border: "border-yellow-500",
          bg: "bg-yellow-50",
          text: "text-yellow-800",
          confirmButton: "bg-yellow-500 hover:bg-yellow-600 text-white",
        };
    }
  };

  const colors = getColorClasses();
  const icon = type === "danger" ? "⚠️" : type === "warning" ? "⚠️" : "ℹ️";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-in zoom-in duration-200">
        {/* Header */}
        <div
          className={`p-6 border-l-4 ${colors.border} ${colors.bg} rounded-t-2xl`}
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">{icon}</div>
            <div>
              <h3 className={`text-xl font-bold ${colors.text}`}>{title}</h3>
              <p className={`text-sm opacity-80 mt-1 ${colors.text}`}>
                {message}
              </p>
            </div>
          </div>
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
              className={`flex-1 ${colors.confirmButton} font-semibold py-3 px-4 rounded-lg transition-colors duration-200`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using alerts
export function useAlert() {
  const [alerts, setAlerts] = useState<
    Array<{
      type: "success" | "error" | "warning" | "info";
      title: string;
      message: string;
      id: number;
    }>
  >([]);

  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showAlert = useCallback(
    (
      type: "success" | "error" | "warning" | "info",
      title: string,
      message: string
    ) => {
      console.log("🚨 showAlert called with:", { type, title, message });
      console.trace("Call stack:");

      const newId = Date.now();
      const newAlert = {
        type,
        title,
        message,
        id: newId,
      };

      setAlerts((prev) => [...prev, newAlert]);

      // Auto remove after 3 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== newId));
      }, 3000);
    },
    []
  );

  const hideAlert = (id: number) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const showSuccess = useCallback(
    (title: string, message: string = "") => {
      showAlert("success", title, message);
    },
    [showAlert]
  );

  const showError = useCallback(
    (title: string, message: string = "") => {
      showAlert("error", title, message);
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (title: string, message: string = "") => {
      showAlert("warning", title, message);
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (title: string, message: string = "") => {
      showAlert("info", title, message);
    },
    [showAlert]
  );

  const showConfirmation = useCallback(
    (
      title: string,
      message: string,
      options: {
        confirmText?: string;
        cancelText?: string;
        type?: "danger" | "warning" | "info";
      } = {}
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmation({
          isOpen: true,
          title,
          message,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          type: options.type,
          onConfirm: () => {
            setConfirmation((prev) => ({ ...prev, isOpen: false }));
            resolve(true);
          },
          onCancel: () => {
            setConfirmation((prev) => ({ ...prev, isOpen: false }));
            resolve(false);
          },
        });
      });
    },
    []
  );

  return {
    alerts,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirmation,
    AlertComponent: useMemo(() => {
      return function AlertContainer() {
        return (
          <>
            {alerts.map((alert, index) => {
              console.log(`🎨 Rendering alert ${index}:`, alert);
              return (
                <Alert
                  key={alert.id}
                  type={alert.type}
                  title={alert.title}
                  message={alert.message}
                  isOpen={true}
                  onClose={() => hideAlert(alert.id)}
                />
              );
            })}
            <ConfirmationModal
              isOpen={confirmation.isOpen}
              title={confirmation.title}
              message={confirmation.message}
              confirmText={confirmation.confirmText}
              cancelText={confirmation.cancelText}
              type={confirmation.type}
              onConfirm={confirmation.onConfirm}
              onCancel={confirmation.onCancel}
            />
          </>
        );
      };
    }, [alerts, confirmation]),
  };
}
