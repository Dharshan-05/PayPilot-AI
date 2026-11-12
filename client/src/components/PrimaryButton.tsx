import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
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
    className={`h-[38px] px-[20px] rounded-full bg-[#1b1b19] hover:bg-[#2c2c29] disabled:opacity-50 text-[#f7f2e8] text-[12px] font-semibold inline-flex items-center justify-center gap-[7px] transition-all cursor-pointer shadow-2xs ${className}`}
  >
    {children}
  </button>
);

export default PrimaryButton;
