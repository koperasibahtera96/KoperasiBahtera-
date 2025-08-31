'use client';

import { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';

interface CameraSelfieProps {
  onCapture: (imageDataUrl: string) => void;
  isLoading?: boolean;
}

export interface CameraSelfieRef {
  stopCamera: () => void;
}

export const CameraSelfie = forwardRef<CameraSelfieRef, CameraSelfieProps>(({ onCapture, isLoading = false }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>('');

  const startCamera = useCallback(async () => {
    try {
      setError('');
      console.log('Starting camera...');

      if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        console.log('Getting user media...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });

        console.log('Got stream:', stream);
        streamRef.current = stream;

        // First set camera active to render the video element
        setIsCameraActive(true);

        // Then wait a bit for the component to re-render with the video element
        setTimeout(() => {
          console.log('Timeout callback - videoRef.current:', !!videoRef.current, 'streamRef.current:', !!streamRef.current);
          if (videoRef.current && streamRef.current) {
            console.log('Setting video source...');
            videoRef.current.srcObject = streamRef.current;
          } else {
            console.log('Missing elements - videoRef:', !!videoRef.current, 'streamRef:', !!streamRef.current);
          }
        }, 100);
      } else {
        throw new Error('Camera not supported in this browser');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsCameraActive(false);

      if (err.name === 'NotAllowedError') {
        setError('Akses kamera ditolak. Silakan izinkan akses kamera untuk melanjutkan verifikasi.');
      } else if (err.name === 'NotFoundError') {
        setError('Kamera tidak ditemukan. Pastikan perangkat Anda memiliki kamera.');
      } else if (err.name === 'NotSupportedError') {
        setError('Browser Anda tidak mendukung akses kamera.');
      } else {
        setError('Gagal mengakses kamera. Silakan coba lagi atau periksa pengaturan browser Anda.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Expose stopCamera function to parent component
  useImperativeHandle(ref, () => ({
    stopCamera
  }), [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);
      onCapture(imageDataUrl);
      stopCamera();
    }

    setIsCapturing(false);
  }, [onCapture, stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage('');
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (capturedImage) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center space-y-4">
          <img
            src={capturedImage}
            alt="Captured Selfie"
            className="w-48 h-48 mx-auto rounded-full border border-gray-300 shadow-sm object-cover"
          />
          <div className="flex items-center justify-center text-green-600 space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Foto berhasil diambil</span>
          </div>
          <button
            type="button"
            onClick={retakePhoto}
            disabled={isLoading}
            className="px-6 py-2 border-2 border-[#324D3E] text-[#324D3E] rounded-full font-semibold hover:bg-[#324D3E] hover:text-white transition-all duration-300 font-[family-name:var(--font-poppins)]"
          >
            Ambil Ulang
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto">
        <div className="border-2 border-red-300 rounded-lg p-6 text-center bg-red-50">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-red-800 font-medium mb-2">Tidak Dapat Mengakses Kamera</p>
              <p className="text-sm text-red-700 mb-4">{error}</p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              disabled={isLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-all duration-300 font-[family-name:var(--font-poppins)]"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isCameraActive) {
    return (
      <div className="max-w-md mx-auto">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-800 font-medium mb-2">Verifikasi Wajah dengan Kamera</p>
              <p className="text-sm text-gray-600 mb-4">
                Untuk keamanan akun Anda, silakan ambil foto selfie menggunakan kamera perangkat Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              disabled={isLoading}
              className="px-6 py-3 bg-[#324D3E] text-white rounded-full font-semibold hover:bg-[#2a4035] transition-all duration-300 font-[family-name:var(--font-poppins)]"
            >
              Buka Kamera
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-gray-900 rounded-lg overflow-hidden relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera overlay */}
        <div className="absolute inset-0 border-4 border-white/20 rounded-lg">
          <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-lg">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-40 border-2 border-white/60 rounded-full"></div>
          </div>
        </div>

        {/* Instructions overlay */}
        <div className="absolute top-4 left-4 right-4 text-center">
          <p className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            Posisikan wajah di dalam lingkaran
          </p>
        </div>

        {/* Capture button */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            type="button"
            onClick={capturePhoto}
            disabled={isCapturing || isLoading}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-all duration-200"
          >
            {isCapturing ? (
              <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <div className="w-12 h-12 bg-[#324D3E] rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
            )}
          </button>
        </div>

        {/* Cancel button */}
        <div className="absolute top-4 right-4">
          <button
            type="button"
            onClick={stopCamera}
            disabled={isCapturing || isLoading}
            className="w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Pastikan wajah Anda terlihat jelas dan berada dalam pencahayaan yang baik
        </p>
      </div>
    </div>
  );
});

CameraSelfie.displayName = 'CameraSelfie';