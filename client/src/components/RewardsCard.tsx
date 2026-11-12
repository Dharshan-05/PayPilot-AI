import React from 'react';
import { Info, ArrowRight } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';

export interface RewardsCardProps {
  rewardPoints: number;
  onNavigate: (route: RoutePath) => void;
}

export const RewardsCard: React.FC<RewardsCardProps> = ({ rewardPoints, onNavigate }) => (
  <div className="w-full h-full min-h-[222px] rounded-[20px] bg-[#faf5ec] border border-[#e5ded3] p-[15px] min-[1440px]:p-[20px] 2xl:p-[24px] flex flex-col justify-between relative overflow-hidden">
    <img
      src={ASSETS.rewardsArt}
      alt="PayPal Rewards Cat with Gift"
      className="absolute right-0 bottom-0 w-[172px] h-[174px] sm:w-[215px] sm:h-[218px] lg:w-[152px] lg:h-[154px] xl:w-[215px] xl:h-[218px] 2xl:w-[258px] 2xl:h-[261px] min-[1920px]:w-[326px] min-[1920px]:h-[330px] object-contain object-right-bottom select-none pointer-events-none"
    />

    <div className="relative z-10 flex flex-col h-full justify-between max-w-[185px] xl:max-w-[220px] 2xl:max-w-[260px]">
      <div>
        <div className="flex items-center gap-[6px]">
          <span className="w-[15px] h-[15px] 2xl:w-[17px] 2xl:h-[17px] rounded-full bg-[#edd0c4] flex items-center justify-center shrink-0">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="#a85544" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>
          <h2 className="text-[14px] xl:text-[15.5px] 2xl:text-[17px] font-semibold text-[#1c1b19] tracking-[-0.01em] whitespace-nowrap">
            PayPal Rewards
          </h2>
        </div>
        <div className="flex items-center gap-[4px] text-[10px] xl:text-[11px] 2xl:text-[12px] text-[#6a665f] mt-[3px]">
          <span>Level 2 • Silver</span>
          <Info className="w-[10.5px] h-[10.5px] text-[#8c867e]" aria-hidden="true" />
        </div>
      </div>

      <div className="my-auto pt-[6px]">
        <div className="text-[27px] xl:text-[32px] 2xl:text-[38px] font-bold text-[#181715] tracking-[-0.02em] leading-none">
          {rewardPoints.toLocaleString('en-US')}
        </div>
        <div className="text-[10.5px] xl:text-[12px] 2xl:text-[13px] text-[#6a665f] mt-[4px]">Points</div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => onNavigate('/rewards')}
          className="h-[34px] xl:h-[38px] 2xl:h-[40px] px-[15px] xl:px-[18px] rounded-full bg-[#222220] hover:bg-[#333330] text-[#f7f2e8] text-[11px] xl:text-[12px] 2xl:text-[12.5px] font-medium flex items-center gap-[6px] transition-colors cursor-pointer shadow-2xs"
        >
          <span>Redeem Rewards</span>
          <ArrowRight className="w-[12px] h-[12px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
);

export default RewardsCard;
