
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';

interface LegalModalProps {
  triggerText: string;
  title: string;
  children: React.ReactNode;
}

export const LegalModal: React.FC<LegalModalProps> = ({ triggerText, title, children }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-[#324D3E] hover:text-[#4C3D19] hover:underline font-medium">
          {triggerText}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-1 pr-6">
          {children}
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button
              type="button"
              className="bg-gradient-to-r from-[#364D32] to-[#889063] text-white px-8 py-3 rounded-full font-semibold hover:from-[#889063] hover:to-[#364D32] transition-all duration-300 shadow-lg font-[family-name:var(--font-poppins)]"
            >
              Tutup
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
