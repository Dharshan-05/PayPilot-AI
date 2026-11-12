import React, { useEffect, useRef } from 'react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

export interface DropdownProps<T extends string> {
  open: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  menuWidthClass?: string;
}

export function Dropdown<T extends string>({
  open,
  onClose,
  trigger,
  children,
  align = 'right',
  menuWidthClass = 'w-[180px]',
}: DropdownProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={containerRef} className="relative">
      {trigger}
      {open && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 ${menuWidthClass} rounded-[14px] bg-[#faf5ec] border border-[#dfd8cd] shadow-lg py-1 z-50`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
