import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search anything... (products, people, transactions)',
  ariaLabel = 'Search anything',
  className = '',
}) => (
  <div className={`relative w-full max-w-full h-[40px] 2xl:h-[44px] ${className}`}>
    <Search
      className="w-[15px] h-[15px] text-[#57534e] absolute left-[15px] top-1/2 -translate-y-1/2 pointer-events-none"
      aria-hidden="true"
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onSubmit) {
          onSubmit();
        }
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-full h-full pl-[40px] pr-[30px] rounded-full bg-[#f8f3ea] border border-[#e3dcd2] text-[11.5px] xl:text-[12.5px] 2xl:text-[13px] text-[#2b2927] placeholder-[#8c867e] focus:outline-none focus:border-[#bab2a6] transition-colors"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#8c867e] hover:text-[#2b2927] cursor-pointer"
      >
        <X className="w-[13px] h-[13px]" />
      </button>
    )}
  </div>
);

export default SearchBar;
