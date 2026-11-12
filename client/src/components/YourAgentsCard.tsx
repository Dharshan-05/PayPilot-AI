import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';

export interface YourAgentsCardProps {
  activeAgentCount: number;
  onNavigate: (route: RoutePath) => void;
}

export const YourAgentsCard: React.FC<YourAgentsCardProps> = ({
  activeAgentCount,
  onNavigate,
}) => (
  <div className="w-full h-full min-h-[176px] rounded-[20px] bg-[#f8f2e8] border border-[#e5ded3] p-[14px] min-[1440px]:p-[18px] 2xl:p-[22px] flex flex-col justify-between relative overflow-hidden">
    <img
      src={ASSETS.agentsCat}
      alt="Your Agents Cat with Headset"
      className="absolute left-[2px] bottom-0 w-[108px] h-[102px] sm:w-[144px] sm:h-[136px] lg:w-[90px] lg:h-[85px] xl:w-[144px] xl:h-[136px] 2xl:w-[180px] 2xl:h-[170px] min-[1920px]:w-[216px] min-[1920px]:h-[204px] object-contain object-left-bottom select-none pointer-events-none"
    />

    <img
      src={ASSETS.agentsSkyline}
      alt=""
      className="absolute right-0 bottom-0 w-[48px] h-[90px] sm:w-[56px] sm:h-[105px] lg:w-[48px] lg:h-[90px] xl:w-[64px] xl:h-[120px] 2xl:w-[80px] 2xl:h-[150px] min-[1920px]:w-[96px] min-[1920px]:h-[180px] object-contain object-right-bottom select-none pointer-events-none"
    />

    <div className="flex items-center justify-between relative z-10">
      <h2 className="text-[13.5px] xl:text-[15px] 2xl:text-[16.5px] font-semibold text-[#1c1b19] tracking-[-0.01em]">
        Your Agents
      </h2>
      <button
        type="button"
        onClick={() => onNavigate('/agents')}
        className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] font-medium text-[#3a3835] hover:text-[#181715] flex items-center gap-[4px] transition-colors cursor-pointer"
      >
        <span>View All</span>
        <ArrowRight className="w-[11px] h-[11px]" aria-hidden="true" />
      </button>
    </div>

    <div className="relative z-10 ml-[104px] sm:ml-[138px] lg:ml-[88px] xl:ml-[140px] 2xl:ml-[178px] min-[1920px]:ml-[212px] my-auto flex flex-col items-start pt-[6px]">
      <div className="flex items-center gap-[6px]">
        <span className="w-[7px] h-[7px] xl:w-[8px] xl:h-[8px] rounded-full bg-[#2e8b46] inline-block shrink-0" aria-hidden="true" />
        <span className="text-[12px] xl:text-[13.5px] 2xl:text-[15px] font-semibold text-[#1c1b19]">
          {activeAgentCount} Active Agents
        </span>
      </div>
      <p className="text-[10px] xl:text-[11.5px] 2xl:text-[12.5px] text-[#6a665f] mt-[3px] leading-[1.35]">
        Shopping, Security &amp;
        <br />
        Insights
      </p>
      <button
        type="button"
        onClick={() => onNavigate('/agents')}
        className="mt-[10px] xl:mt-[12px] h-[29px] xl:h-[33px] 2xl:h-[36px] px-[10px] xl:px-[15px] rounded-full bg-[#f5efe5] hover:bg-[#ebe3d6] border border-[#dcd4c8] text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] font-medium text-[#2b2927] flex items-center gap-[5px] transition-colors cursor-pointer whitespace-nowrap"
      >
        <span>Manage Agents</span>
        <ArrowRight className="w-[11px] h-[11px]" aria-hidden="true" />
      </button>
    </div>
  </div>
);

export default YourAgentsCard;
