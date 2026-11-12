import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface NeedHelpCardProps {
  active: boolean;
  onClick: () => void;
}

export const NeedHelpCard: React.FC<NeedHelpCardProps> = ({ active, onClick }) => (
  <div className="px-[10px] pt-[10px] pb-[8px] shrink-0">
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-[52px] 2xl:h-[58px] rounded-[14px] border px-[12px] xl:px-[14px] flex items-center justify-between text-left transition-colors cursor-pointer ${
        active
          ? 'bg-[#383734] border-[#52504b]'
          : 'bg-[#2b2b29] hover:bg-[#333330] border-[#3a3936]'
      }`}
    >
      <div>
        <div className="text-[11px] 2xl:text-[12px] font-semibold text-[#e6e1d8] leading-tight">
          Need Help?
        </div>
        <div className="text-[9.5px] 2xl:text-[10.5px] text-[#9c978f] mt-[2px] leading-tight">
          Ask PayPal AI
        </div>
      </div>
      <ArrowRight className="w-[13px] h-[13px] text-[#d6d1c9] shrink-0" aria-hidden="true" />
    </button>
  </div>
);

export default NeedHelpCard;
