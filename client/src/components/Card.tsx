import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, id, className = '', onClick }) => (
  <div
    id={id}
    onClick={onClick}
    className={`rounded-[20px] bg-[#faf5ec] border border-[#e5ded3] p-[18px] shadow-2xs ${
      onClick ? 'cursor-pointer hover:border-[#d5cec2] transition-colors' : ''
    } ${className}`}
  >
    {children}
  </div>
);

export default Card;
