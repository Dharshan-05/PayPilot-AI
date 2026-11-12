import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'dark';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const styles: Record<BadgeVariant, string> = {
    default: 'bg-[#efe8dc] text-[#3a3835] border border-[#dfd8cc]',
    success: 'bg-[#d6e3c7] text-[#2c5e3b]',
    warning: 'bg-[#f6e6c9] text-[#8a4f08]',
    danger: 'bg-[#f5d8d4] text-[#9e2a1c]',
    dark: 'bg-[#222220] text-[#f7f2e8]',
  };
  return (
    <span
      className={`px-[10px] py-[2.5px] rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${styles[variant]}`}
    >
      {children}
    </span>
  );
};

export default Badge;
