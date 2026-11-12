import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 bg-[#222220] text-[#f7f2e8] px-4 py-2.5 rounded-full text-[12px] font-medium shadow-lg flex items-center gap-2 border border-[#3a3936]"
    >
      <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
};

export default Toast;
