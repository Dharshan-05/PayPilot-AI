import React from 'react';

export interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  onClick,
  type = 'button',
  disabled,
  className = '',
}) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={`h-[38px] px-[18px] rounded-full bg-[#f5efe5] hover:bg-[#ebe3d6] disabled:opacity-50 border border-[#dcd4c8] text-[#2b2927] text-[12px] font-medium inline-flex items-center justify-center gap-[6px] transition-colors cursor-pointer ${className}`}
  >
    {children}
  </button>
);

export default SecondaryButton;
