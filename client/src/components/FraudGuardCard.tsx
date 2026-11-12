import React from 'react';
import { ShieldCheck, Check, ArrowRight } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';

export interface FraudGuardCardProps {
  onNavigate: (route: RoutePath) => void;
}

export const FraudGuardCard: React.FC<FraudGuardCardProps> = ({ onNavigate }) => (
  <div className="w-full h-full min-h-[176px] rounded-[20px] bg-[#f7f2e9] border border-[#e5ded3] p-[14px] min-[1440px]:p-[18px] 2xl:p-[22px] flex flex-col justify-between relative overflow-hidden">
    <img
      src={ASSETS.fraudguardSkyline}
      alt=""
      className="absolute right-0 bottom-0 w-[68px] h-[90px] sm:w-[85px] sm:h-[113px] xl:w-[102px] xl:h-[135px] min-[1920px]:w-[136px] min-[1920px]:h-[180px] object-contain object-right-bottom select-none pointer-events-none"
    />

    <div className="flex items-center justify-between relative z-10">
      <div className="flex items-center gap-[7px]">
        <ShieldCheck className="w-[16px] h-[16px] xl:w-[18px] xl:h-[18px] text-[#22211f] stroke-[1.8]" aria-hidden="true" />
        <h2 className="text-[13.5px] xl:text-[15px] 2xl:text-[16.5px] font-semibold text-[#1c1b19] tracking-[-0.01em]">
          FraudGuard Security
        </h2>
      </div>
      <span className="px-[10px] py-[2.5px] xl:px-[12px] xl:py-[3px] rounded-full bg-[#d6e3c7] text-[#2c5e3b] text-[10px] xl:text-[11px] font-semibold shrink-0">
        All Safe
      </span>
    </div>

    <div className="relative z-10 flex items-center gap-[14px] xl:gap-[18px] my-auto pl-[4px] xl:pl-[6px]">
      <div className="w-[56px] h-[56px] xl:w-[64px] xl:h-[64px] 2xl:w-[72px] 2xl:h-[72px] rounded-full bg-[#e2e9d3] flex items-center justify-center shrink-0">
        <div className="w-[34px] h-[34px] xl:w-[40px] xl:h-[40px] 2xl:w-[44px] 2xl:h-[44px] rounded-full bg-[#2e8b46] flex items-center justify-center text-white shadow-2xs">
          <Check className="w-[19px] h-[19px] 2xl:w-[22px] 2xl:h-[22px] stroke-[2.8]" aria-hidden="true" />
        </div>
      </div>

      <div className="flex flex-col items-start min-w-0">
        <div className="text-[12.5px] xl:text-[14px] 2xl:text-[15.5px] font-semibold text-[#1c1b19] leading-snug">
          Your account is secure
        </div>
        <p className="text-[10px] xl:text-[11.5px] 2xl:text-[12.5px] text-[#6a665f] mt-[3px] leading-[1.35] max-w-[185px] xl:max-w-[230px] 2xl:max-w-[270px]">
          AI monitoring is active 24/7 to protect you.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/fraudguard')}
          className="mt-[10px] xl:mt-[12px] h-[29px] xl:h-[33px] 2xl:h-[36px] px-[14px] xl:px-[16px] rounded-full bg-[#f5efe5] hover:bg-[#ebe3d6] border border-[#dcd4c8] text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] font-medium text-[#2b2927] flex items-center gap-[5px] transition-colors cursor-pointer"
        >
          <span>View Details</span>
          <ArrowRight className="w-[11px] h-[11px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
);

export default FraudGuardCard;
