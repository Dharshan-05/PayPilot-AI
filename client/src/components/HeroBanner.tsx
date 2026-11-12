import React from 'react';
import { Info, ArrowUp, ArrowRight } from 'lucide-react';
import { ASSETS } from '../assets/images';
import { HERO_SLIDES, type RoutePath } from '../data/dashboard';

export interface HeroBannerProps {
  heroSlide: number;
  onSelectSlide: (idx: number) => void;
  balanceNumber: number;
  onOpenBalanceInfo: () => void;
  onNavigate: (route: RoutePath) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  heroSlide,
  onSelectSlide,
  balanceNumber,
  onOpenBalanceInfo,
  onNavigate,
}) => {
  const currentHero = HERO_SLIDES[heroSlide] || HERO_SLIDES[0];

  return (
    <div className="relative w-full h-full min-h-[212px] rounded-[20px] border border-[#e3dcd1] bg-gradient-to-b from-[#f4eee4] via-[#eae2d6] to-[#e7dfd3] overflow-hidden shadow-2xs flex">
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <img
          src={ASSETS.heroBg}
          alt="PayPal Hero Cat Skyline"
          className="w-full h-full object-cover object-right md:object-right lg:object-contain lg:object-right select-none pointer-events-none"
        />
      </div>
      <div
        aria-hidden="true"
        className="lg:hidden absolute inset-y-0 left-0 w-[75%] bg-gradient-to-r from-[#ede6dc]/95 via-[#ede6dc]/80 to-transparent pointer-events-none"
      />

      <div className="relative z-10 w-full pl-[20px] sm:pl-[24px] lg:pl-[28px] 2xl:pl-[34px] pr-[16px] py-[16px] min-[1440px]:py-[22px] 2xl:py-[28px] flex flex-col justify-between max-w-[460px] xl:max-w-[540px] 2xl:max-w-[600px]">
        <div>
          <h1 className="text-[20px] sm:text-[22px] xl:text-[26px] 2xl:text-[30px] font-bold text-[#181715] tracking-[-0.02em] leading-[1.18]">
            {currentHero.greeting}
          </h1>
          <p className="text-[11.5px] sm:text-[12px] xl:text-[13.5px] 2xl:text-[14.5px] text-[#6a665f] mt-[3px] font-normal">
            {currentHero.subtitle}
          </p>
        </div>

        <div className="mt-[6px]">
          <div className="flex items-center gap-[6px]">
            <span className="text-[11.5px] xl:text-[12.5px] 2xl:text-[13.5px] text-[#6a665f] font-medium">
              {currentHero.balanceLabel}
            </span>
            <button
              type="button"
              onClick={onOpenBalanceInfo}
              aria-label="PayPal Balance Information"
              className="text-[#78736c] hover:text-[#181715] transition-colors cursor-pointer"
            >
              <Info className="w-[12.5px] h-[12.5px] 2xl:w-[14px] 2xl:h-[14px]" />
            </button>
          </div>

          <div className="text-[31px] sm:text-[35px] xl:text-[42px] 2xl:text-[48px] font-extrabold text-[#161514] tracking-[-0.03em] leading-[1.06] mt-[2px]">
            ${balanceNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="flex items-center gap-[14px] sm:gap-[22px] pt-[2px] flex-wrap">
          <div className="flex items-center gap-[4px] text-[11.5px] xl:text-[12.5px] 2xl:text-[13.5px]">
            <span className="text-[#2b7a43] font-semibold flex items-center gap-[2px]">
              <ArrowUp className="w-[11px] h-[11px] stroke-[2.4]" aria-hidden="true" />
              {currentHero.change}
            </span>
            <span className="text-[#6a665f]">{currentHero.changePeriod}</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/send-money')}
            className="h-[40px] xl:h-[44px] 2xl:h-[46px] px-[21px] xl:px-[24px] 2xl:px-[26px] rounded-full bg-[#1b1b19] hover:bg-[#2c2c29] text-[#f7f2e8] text-[12.5px] xl:text-[13.5px] 2xl:text-[14px] font-semibold flex items-center gap-[7px] shadow-xs transition-all cursor-pointer"
          >
            <span>{currentHero.ctaLabel}</span>
            <ArrowRight className="w-[14px] h-[14px]" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-[9px] left-[66%] -translate-x-1/2 z-10 flex items-center gap-[6px]">
        {HERO_SLIDES.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectSlide(idx)}
            aria-label={`Slide ${idx + 1}`}
            aria-pressed={heroSlide === idx}
            className={`rounded-full transition-colors cursor-pointer ${
              heroSlide === idx
                ? 'w-[7px] h-[7px] bg-[#1b1b19]'
                : 'w-[6.5px] h-[6.5px] bg-[#f7f2e8]/80 border border-[#78736c] hover:bg-[#d5cfc4]'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBanner;
