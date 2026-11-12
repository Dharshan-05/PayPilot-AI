import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  children,
  side = 'right',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Drawer'}
      className={`fixed inset-0 z-50 bg-black/40 flex ${
        side === 'left' ? 'justify-start' : 'justify-end'
      }`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] h-full bg-[#faf5ec] border-l border-[#dfd8cd] p-5 shadow-xl flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e8e1d6]">
            <h3 className="text-[15px] font-bold text-[#181715]">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="p-1 rounded-full text-[#6a665f] hover:text-[#181715] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default Drawer;
