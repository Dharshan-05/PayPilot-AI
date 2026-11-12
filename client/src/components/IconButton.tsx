import React from 'react';

export interface IconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  active?: boolean;
  className?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  onClick,
  label,
  active = false,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`relative p-[6px] rounded-full transition-colors cursor-pointer ${
      active ? 'bg-[#e6dfd3]' : 'hover:bg-[#ede6da]'
    } ${className}`}
  >
    {children}
  </button>
);

export default IconButton;
