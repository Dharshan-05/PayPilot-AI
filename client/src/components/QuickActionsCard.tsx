import React from 'react';
import { Maximize2, Send, UserPlus, Wallet, Gift } from 'lucide-react';
import type { RoutePath } from '../data/dashboard';
import { FourPointStar } from './BrandIcons';

export interface QuickActionsCardProps {
  onNavigate: (route: RoutePath) => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ onNavigate }) => (
  <div className="w-full h-full min-h-[212px] rounded-[20px] bg-[#f8f2e9] border border-[#e5ded3] p-[15px] min-[1440px]:p-[20px] 2xl:p-[22px] flex flex-col justify-between">
    <div className="flex items-center justify-between px-[2px]">
      <div className="flex items-center gap-[7px]">
        <FourPointStar size={16} className="text-[#22211f]" />
        <h2 className="text-[13.5px] xl:text-[15px] 2xl:text-[16.5px] font-semibold text-[#1c1b19]">Quick Actions</h2>
      </div>
      <button
        type="button"
        onClick={() => onNavigate('/send-money')}
        aria-label="Expand Quick Actions"
        className="text-[#78736c] hover:text-[#1c1b19] p-1 rounded-md transition-colors cursor-pointer"
      >
        <Maximize2 className="w-[12.5px] h-[12.5px] 2xl:w-[14px] 2xl:h-[14px]" />
      </button>
    </div>

    <div className="grid grid-cols-2 grid-rows-2 gap-[9px] xl:gap-[11px] 2xl:gap-[12px] flex-1 mt-[10px] xl:mt-[12px]">
      <button
        type="button"
        onClick={() => onNavigate('/send-money')}
        className="rounded-[14px] bg-[#faf5ec] hover:bg-[#f2ebe0] border border-[#e6dfd4] flex flex-col items-center justify-center p-[8px] xl:p-[10px] transition-colors group cursor-pointer"
      >
        <Send
          className="w-[17px] h-[17px] xl:w-[19px] xl:h-[19px] 2xl:w-[21px] 2xl:h-[21px] text-[#22211f] stroke-[1.7] mb-[5px] -rotate-12"
          aria-hidden="true"
        />
        <span className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] font-medium text-[#2b2927] leading-[1.2] text-center">
          Send
          <br />
          Money
        </span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('/request-money')}
        className="rounded-[14px] bg-[#faf5ec] hover:bg-[#f2ebe0] border border-[#e6dfd4] flex flex-col items-center justify-center p-[8px] xl:p-[10px] transition-colors group cursor-pointer"
      >
        <UserPlus
          className="w-[17px] h-[17px] xl:w-[19px] xl:h-[19px] 2xl:w-[21px] 2xl:h-[21px] text-[#22211f] stroke-[1.7] mb-[5px]"
          aria-hidden="true"
        />
        <span className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] font-medium text-[#2b2927] leading-[1.2] text-center">
          Request
          <br />
          Money
        </span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('/add-money')}
        className="rounded-[14px] bg-[#faf5ec] hover:bg-[#f2ebe0] border border-[#e6dfd4] flex flex-col items-center justify-center p-[8px] xl:p-[10px] transition-colors group cursor-pointer"
      >
        <Wallet
          className="w-[17px] h-[17px] xl:w-[19px] xl:h-[19px] 2xl:w-[21px] 2xl:h-[21px] text-[#22211f] stroke-[1.7] mb-[5px]"
          aria-hidden="true"
        />
        <span className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] font-medium text-[#2b2927] leading-[1.2] text-center">
          Add
          <br />
          Money
        </span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('/rewards')}
        className="rounded-[14px] bg-[#faf5ec] hover:bg-[#f2ebe0] border border-[#e6dfd4] flex flex-col items-center justify-center p-[8px] xl:p-[10px] transition-colors group cursor-pointer"
      >
        <Gift
          className="w-[17px] h-[17px] xl:w-[19px] xl:h-[19px] 2xl:w-[21px] 2xl:h-[21px] text-[#22211f] stroke-[1.7] mb-[5px]"
          aria-hidden="true"
        />
        <span className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] font-medium text-[#2b2927] leading-[1.2] text-center">
          Get
          <br />
          Rewards
        </span>
      </button>
    </div>
  </div>
);

export default QuickActionsCard;
