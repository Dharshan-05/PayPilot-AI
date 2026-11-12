import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ArrowUp } from 'lucide-react';
import { ASSETS } from '../assets/images';
import { SPENDING_BY_PERIOD, type SpendingPeriod } from '../data/analytics';
import type { RoutePath } from '../data/dashboard';

export interface SpendingOverviewCardProps {
  spendingPeriod: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  onNavigate: (route: RoutePath) => void;
}

export const SpendingOverviewCard: React.FC<SpendingOverviewCardProps> = ({
  spendingPeriod,
  onChangePeriod,
  onNavigate,
}) => {
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!periodMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPeriodMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPeriodMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [periodMenuOpen]);

  const currentSpending = SPENDING_BY_PERIOD[spendingPeriod];

  return (
    <div className="w-full h-full min-h-[222px] rounded-[20px] bg-[#f9f4e9] border border-[#e5ded3] p-[16px] min-[1440px]:p-[20px] 2xl:p-[24px] flex flex-col justify-between relative">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <button
          type="button"
          onClick={() => onNavigate('/analytics')}
          className="text-[12px] min-[1180px]:text-[13px] xl:text-[14px] 2xl:text-[16px] font-semibold text-[#1c1b19] tracking-[-0.01em] cursor-pointer hover:underline text-left truncate min-w-0"
        >
          Your Spending Overview
        </button>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPeriodMenuOpen((o) => !o)}
            aria-expanded={periodMenuOpen}
            aria-haspopup="listbox"
            className="h-[25px] xl:h-[28px] 2xl:h-[30px] px-[10px] xl:px-[12px] rounded-full bg-[#f5efe4] hover:bg-[#ece5d8] border border-[#dfd8cd] text-[10px] xl:text-[11px] font-medium text-[#2b2927] flex items-center gap-[4px] transition-colors cursor-pointer"
          >
            <span>{spendingPeriod}</span>
            <ChevronDown className="w-[11px] h-[11px] text-[#6a665f]" aria-hidden="true" />
          </button>

          {periodMenuOpen && (
            <div
              role="listbox"
              aria-label="Spending period"
              className="absolute right-0 mt-1 w-[110px] rounded-[12px] bg-[#faf5ec] border border-[#dfd8cd] shadow-md py-1 z-30"
            >
              {(['This Month', 'Last Month', 'This Year'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  role="option"
                  aria-selected={spendingPeriod === period}
                  onClick={() => {
                    onChangePeriod(period);
                    setPeriodMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-[10.5px] hover:bg-[#efe8dc] cursor-pointer ${
                    spendingPeriod === period ? 'font-semibold text-[#181715]' : 'text-[#5c5954]'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between mt-[4px]">
        <div>
          <div className="text-[21px] xl:text-[25px] 2xl:text-[28px] font-bold text-[#181715] tracking-[-0.02em] leading-tight">
            {currentSpending.total}
          </div>
          <div className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12px] text-[#78736c] mt-[1px]">Total Spent</div>
        </div>
        <div className="text-[11px] xl:text-[12px] 2xl:text-[12.5px] font-semibold text-[#2b7a43] flex items-center gap-[2px] mt-[4px]">
          <ArrowUp className="w-[10.5px] h-[10.5px] stroke-[2.3]" aria-hidden="true" />
          <span>{currentSpending.change}</span>
        </div>
      </div>

      <div className="mt-auto pt-[10px] min-[1440px]:pt-[14px] flex-1 flex flex-col justify-end min-h-0">
        <div className="flex-1 min-h-[92px] min-[1440px]:min-h-[104px] max-h-[172px] grid grid-cols-7 items-end px-[2px] xl:px-[8px] gap-[6px] xl:gap-[10px] 2xl:gap-[14px]">
          {currentSpending.days.map((d) => {
            const totalUnits = 84;
            const capPct = Math.round((d.capHeight / totalUnits) * 100);
            const darkPct = Math.round((d.darkHeight / totalUnits) * 100);
            return (
              <button
                key={d.day}
                type="button"
                onMouseEnter={() => setHoveredBar(d.day)}
                onMouseLeave={() => setHoveredBar(null)}
                onFocus={() => setHoveredBar(d.day)}
                onBlur={() => setHoveredBar(null)}
                onClick={() => onNavigate('/analytics')}
                aria-label={`${d.day}: $${d.spent.toFixed(0)} spent`}
                className="flex flex-col items-center justify-end w-full min-w-0 h-full relative group cursor-pointer focus:outline-none"
              >
                {hoveredBar === d.day && (
                  <div className="absolute -top-[24px] left-1/2 -translate-x-1/2 bg-[#222220] text-[#f7f2e8] text-[9.5px] font-medium px-[6px] py-[2px] rounded-[6px] whitespace-nowrap z-20 shadow-xs">
                    ${d.spent.toFixed(0)}
                  </div>
                )}

                {d.hasCat && (
                  <div className="w-full h-[34px] xl:h-[48px] 2xl:h-[58px] -mb-[10px] z-10 relative pointer-events-none select-none flex items-end justify-center shrink-0 overflow-visible">
                    <img
                      src={ASSETS.spendingCat}
                      alt="Cat peeking over Sunday bar"
                      className="w-[54px] h-[34px] xl:w-[81px] xl:h-[51px] 2xl:w-[108px] 2xl:h-[68px] max-w-none -ml-[4px] object-contain object-bottom"
                    />
                  </div>
                )}

                <div className="w-[20px] xl:w-[26px] 2xl:w-[34px] flex-1 flex flex-col items-center justify-end mx-auto max-w-full">
                  {d.capHeight > 0 && (
                    <div
                      style={{ height: `${capPct}%` }}
                      className="w-full bg-[#ece6dd] rounded-t-[4px]"
                    />
                  )}
                  <div
                    style={{
                      height: `${darkPct}%`,
                      backgroundColor: d.darkColor,
                    }}
                    className={`w-full transition-opacity duration-200 ${
                      d.capHeight === 0 ? 'rounded-t-[4px]' : ''
                    } rounded-b-[2px] group-hover:opacity-90`}
                  />
                </div>

                <span className="text-[10px] xl:text-[11px] 2xl:text-[12px] text-[#6a665f] mt-[7px] font-medium leading-none shrink-0">
                  {d.day}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SpendingOverviewCard;
