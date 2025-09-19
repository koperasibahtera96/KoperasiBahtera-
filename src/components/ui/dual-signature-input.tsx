import React, { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Upload, Edit3, Trash2, FileImage } from 'lucide-react';

// Dynamically import SignatureCanvas to avoid SSR issues
const SignatureCanvas = dynamic(() => import("react-signature-canvas"), {
  ssr: false,
}) as React.ComponentType<any>;

interface DualSignatureInputProps {
  onSignatureChange: (signatureData: string | null) => void;
  clearTrigger?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
}

export const DualSignatureInput: React.FC<DualSignatureInputProps> = ({
  onSignatureChange,
  clearTrigger = false,
  disabled = false,
  className = "",
  label = "Tanda Tangan Digital",
  required = false
}) => {
  const [signatureMode, setSignatureMode] = useState<'canvas' | 'upload'>('canvas');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const sigCanvas = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Handle canvas signature changes
  const handleCanvasChange = useCallback(() => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signatureData = sigCanvas.current.toDataURL();
      onSignatureChange(signatureData);
    } else {
      onSignatureChange(null);
    }
  }, [onSignatureChange]);

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setUploadedFileName(file.name);
      onSignatureChange(result);
    };
    reader.readAsDataURL(file);
  };

  // Clear signatures
  const clearSignature = () => {
    if (signatureMode === 'canvas' && sigCanvas.current) {
      sigCanvas.current.clear();
    } else if (signatureMode === 'upload') {
      setUploadedImage(null);
      setUploadedFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    onSignatureChange(null);
  };

  // Handle mode switch
  const switchMode = (mode: 'canvas' | 'upload') => {
    // Clear current signature when switching
    clearSignature();
    setSignatureMode(mode);
  };

  // Handle canvas resizing and positioning fix
  React.useEffect(() => {
    const resizeCanvas = () => {
      if (sigCanvas.current && canvasContainerRef.current && signatureMode === 'canvas') {
        const container = canvasContainerRef.current;
        const canvas = sigCanvas.current.getCanvas();

        // Get the actual container dimensions
        const containerWidth = container.offsetWidth;
        const containerHeight = 200; // Fixed height

        // Set canvas internal resolution
        canvas.width = containerWidth * 2; // 2x for retina displays
        canvas.height = containerHeight * 2;

        // Scale canvas back down using CSS
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';

        // Scale the drawing context to match
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        // Clear and reset
        sigCanvas.current.clear();
      }
    };

    // Initial resize
    setTimeout(resizeCanvas, 100);

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [signatureMode]);

  // Clear when external trigger changes
  React.useEffect(() => {
    if (clearTrigger) {
      clearSignature();
    }
  }, [clearTrigger]);

  const hasSignature = signatureMode === 'canvas'
    ? sigCanvas.current && !sigCanvas.current.isEmpty()
    : uploadedImage !== null;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#324D3E] mb-3 font-poppins">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Mode Selection */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => switchMode('canvas')}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            signatureMode === 'canvas'
              ? 'bg-[#324D3E] text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Edit3 size={16} />
          Gambar Tanda Tangan
        </button>
        <button
          type="button"
          onClick={() => switchMode('upload')}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            signatureMode === 'upload'
              ? 'bg-[#324D3E] text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Upload size={16} />
          Upload Gambar
        </button>
      </div>

      {/* Signature Input Area */}
      <div className="border-2 border-[#324D3E]/20 rounded-2xl p-4 bg-white">
        {signatureMode === 'canvas' ? (
          // Canvas Mode
          <div>
            <div
              ref={canvasContainerRef}
              className="border border-gray-300 rounded-xl overflow-hidden bg-white"
              style={{ width: '100%', height: '200px' }}
            >
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: "signature-canvas",
                  style: {
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    touchAction: 'none',
                  }
                }}
                backgroundColor="white"
                onEnd={handleCanvasChange}
                disabled={disabled}
              />
            </div>
            <div className="text-center mt-3">
              <p className="text-sm text-gray-500 font-poppins">
                Gambar tanda tangan Anda di area di atas
              </p>
            </div>
          </div>
        ) : (
          // Upload Mode
          <div>
            {uploadedImage ? (
              // Show uploaded image
              <div className="text-center">
                <div className="relative inline-block">
                  <img
                    src={uploadedImage}
                    alt="Uploaded signature"
                    className="max-w-full max-h-48 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="mt-3">
                  <p className="text-sm text-gray-600 font-poppins">
                    <FileImage size={16} className="inline mr-1" />
                    {uploadedFileName}
                  </p>
                  <p className="text-xs text-green-600 font-poppins mt-1">
                    ✓ Gambar tanda tangan berhasil diupload
                  </p>
                </div>
              </div>
            ) : (
              // Show upload interface
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={disabled}
                />
                <div
                  onClick={() => !disabled && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-colors ${
                    disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer hover:border-[#324D3E] hover:bg-gray-50'
                  }`}
                >
                  <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-poppins font-medium mb-2">
                    Klik untuk upload gambar tanda tangan
                  </p>
                  <p className="text-sm text-gray-500 font-poppins">
                    Mendukung PNG, JPG, JPEG (Max 5MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end mt-3 gap-2">
          {hasSignature && (
            <button
              type="button"
              onClick={clearSignature}
              disabled={disabled}
              className={`flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-800 font-poppins transition-colors ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <Trash2 size={14} />
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* Helper Text */}
      <div className="mt-2">
        <p className="text-xs text-gray-500 font-poppins">
          {signatureMode === 'canvas'
            ? 'Gunakan mouse atau touch untuk menggambar tanda tangan Anda'
            : 'Upload gambar tanda tangan yang sudah ada (foto tanda tangan di kertas, dll)'
          }
        </p>
      </div>
    </div>
  );
};