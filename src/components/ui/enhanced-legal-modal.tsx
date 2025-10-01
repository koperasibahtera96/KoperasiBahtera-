import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

interface EnhancedLegalModalProps {
  triggerText: string;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  triggerElement?: React.ReactNode;
}

export const EnhancedLegalModal: React.FC<EnhancedLegalModalProps> = ({
  triggerText,
  title,
  children,
  onConfirm,
  triggerElement,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [_scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!contentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const scrollableHeight = scrollHeight - clientHeight;

    if (scrollableHeight <= 0) {
      // Content is not scrollable, user has "seen" everything
      setHasScrolledToEnd(true);
      setScrollProgress(100);
      return;
    }

    const progress = Math.min((scrollTop / scrollableHeight) * 100, 100);
    setScrollProgress(progress);

    // Consider scrolled to end when user reaches 95% (to account for scroll precision)
    if (progress >= 95) {
      setHasScrolledToEnd(true);
    }
  };

  const handleConfirm = () => {
    if (hasScrolledToEnd) {
      onConfirm();
      setIsOpen(false);
    }
  };

  // Reset scroll state when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToEnd(false);
      setScrollProgress(0);

      // Check if content is scrollable after it renders
      setTimeout(() => {
        if (contentRef.current) {
          const { scrollHeight, clientHeight } = contentRef.current;
          if (scrollHeight <= clientHeight) {
            // Content is not scrollable, mark as complete
            setHasScrolledToEnd(true);
            setScrollProgress(100);
          }
        }
      }, 100);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerElement || (
          <button
            className="font-medium transition-colors text-[#324D3E] hover:text-[#4C3D19] hover:underline"
            onClick={() => setIsOpen(true)}
          >
            {triggerText}
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader className="relative z-10">
          <DialogTitle className="text-2xl font-bold text-gray-800">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div
          ref={contentRef}
          className="flex-grow overflow-y-auto p-1 pr-6 relative"
          onScroll={handleScroll}
        >
          {/* Background Logo - Sticky and Centered */}
          <div className="sticky top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-10 h-0 w-full z-0">
            <Image
              width={64}
              height={64}
              src="/images/koperasi-logo-kartu-anggota.png"
              alt="Koperasi Logo"
              className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[32rem] lg:h-[32rem] object-contain"
            />
          </div>
          <div className="relative z-10">{children}</div>
        </div>
        <DialogFooter className="mt-4 flex gap-2 relative z-10">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="border-2 border-gray-300 text-gray-700 px-6 py-2 rounded-full font-semibold hover:bg-gray-50 transition-all duration-300"
            >
              Batal
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!hasScrolledToEnd}
            className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg font-[family-name:var(--font-poppins)] ${
              hasScrolledToEnd
                ? "bg-gradient-to-r from-[#364D32] to-[#889063] text-white hover:from-[#889063] hover:to-[#364D32]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {hasScrolledToEnd ? "Saya Setuju" : "Baca Hingga Akhir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
