import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  onBack?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, rightSlot, onBack }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-[14px]">
    <div className="flex items-center gap-3 min-w-0">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-[34px] h-[34px] shrink-0 rounded-full bg-[#faf5ec] hover:bg-[#efe8dc] border border-[#e3dcd2] flex items-center justify-center text-[#1c1b19] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-[15px] h-[15px]" />
        </button>
      )}
      <div className="min-w-0">
        <h1 className="text-[20px] font-bold text-[#181715] tracking-[-0.02em] leading-tight">
          {title}
        </h1>
        {subtitle && <p className="text-[11.5px] text-[#6a665f] mt-[2px]">{subtitle}</p>}
      </div>
    </div>
    {rightSlot && <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">{rightSlot}</div>}
  </div>
);

export default PageHeader;
