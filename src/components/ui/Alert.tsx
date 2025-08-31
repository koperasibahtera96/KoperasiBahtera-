'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  isOpen: boolean;
  onClose: () => void;
  duration?: number; // Auto close after duration (ms)
}

export function Alert({ type, title, message, isOpen, onClose, duration = 3000 }: AlertProps) {
  console.log('🔔 Alert component rendered:', { type, title, message, isOpen });

  useEffect(() => {
    console.log('🔔 Alert useEffect triggered:', { isOpen, duration });
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        console.log('🔔 Alert auto-closing after timeout');
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'border-green-500 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-500 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-500 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-800';
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

// Hook for using alerts
export function useAlert() {
  const [alerts, setAlerts] = useState<Array<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    id: number;
  }>>([]);

  const showAlert = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    console.log('🚨 showAlert called with:', { type, title, message });
    console.trace('Call stack:');

    const newId = Date.now();
    const newAlert = {
      type,
      title,
      message,
      id: newId
    };

    setAlerts(prev => [...prev, newAlert]);

    // Auto remove after 3 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== newId));
    }, 3000);
  }, []);

  const hideAlert = (id: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const showSuccess = useCallback((title: string, message: string = '') => {
    showAlert('success', title, message);
  }, [showAlert]);

  const showError = useCallback((title: string, message: string = '') => {
    showAlert('error', title, message);
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string = '') => {
    showAlert('warning', title, message);
  }, [showAlert]);

  const showInfo = useCallback((title: string, message: string = '') => {
    showAlert('info', title, message);
  }, [showAlert]);

  return {
    alerts,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    AlertComponent: useMemo(() => {
      return function AlertContainer() {
        console.log('🎨 AlertContainer rendering with alerts:', alerts.length);
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
          </>
        );
      };
    }, [alerts])
  };
}