import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';
import { type ProductPick } from '../data/products';

export interface AiShoppingCardProps {
  promptLabel: string;
  products: ProductPick[];
  onSelectProduct: (prod: ProductPick) => void;
  onNavigate: (route: RoutePath) => void;
}

export const AiShoppingCard: React.FC<AiShoppingCardProps> = ({
  promptLabel,
  products,
  onSelectProduct,
  onNavigate,
}) => (
  <div className="w-full h-full min-h-[176px] rounded-[20px] bg-[#f4eee4] border border-[#e5ded3] p-[14px] min-[1440px]:p-[18px] 2xl:p-[22px] flex flex-col justify-between relative overflow-hidden">
    <div className="flex items-center justify-between relative z-10">
      <div className="flex items-center gap-[6px]">
        <Sparkles className="w-[14px] h-[14px] xl:w-[16px] xl:h-[16px] text-[#2b2927]" aria-hidden="true" />
        <h2 className="text-[13.5px] xl:text-[15px] 2xl:text-[16.5px] font-semibold text-[#1c1b19] tracking-[-0.01em]">
          AI Shopping Assistant
        </h2>
      </div>
      <button
        type="button"
        onClick={() => onNavigate('/shopping-assistant')}
        className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] font-medium text-[#3a3835] hover:text-[#181715] flex items-center gap-[4px] transition-colors cursor-pointer"
      >
        <span>Try it now</span>
        <ArrowRight className="w-[11px] h-[11px]" aria-hidden="true" />
      </button>
    </div>

    <img
      src={ASSETS.aiCat}
      alt="AI Shopping Cat"
      className="absolute left-[2px] bottom-0 w-[124px] h-[98px] sm:w-[155px] sm:h-[123px] lg:w-[124px] lg:h-[98px] min-[1400px]:w-[155px] min-[1400px]:h-[123px] 2xl:w-[186px] 2xl:h-[147px] min-[1920px]:w-[248px] min-[1920px]:h-[196px] object-contain object-left-bottom select-none pointer-events-none"
    />

    <div className="relative z-10 ml-[118px] sm:ml-[148px] lg:ml-[118px] min-[1400px]:ml-[148px] 2xl:ml-[180px] min-[1920px]:ml-[224px] flex flex-col justify-end flex-1 mt-[6px]">
      <div className="self-end mb-[5px] max-w-full">
        <button
          type="button"
          onClick={() => onNavigate('/shopping-assistant')}
          className="px-[11px] py-[3.5px] 2xl:px-[13px] 2xl:py-[4.5px] rounded-full bg-[#efe8dc] hover:bg-[#e6dfd2] border border-[#dfd8cc] text-[9.5px] xl:text-[10.5px] 2xl:text-[11px] text-[#3a3835] font-medium transition-colors cursor-pointer truncate max-w-full"
        >
          {promptLabel}
        </button>
      </div>

      <div className="rounded-[12px] bg-[#faf5ec] border border-[#e6dfd4] p-[7px] xl:p-[10px] 2xl:p-[12px]">
        <div className="flex items-center gap-[5px] mb-[5px] xl:mb-[7px]">
          <span
            className="w-[11px] h-[11px] 2xl:w-[13px] 2xl:h-[13px] rounded-full bg-[#003087] text-white text-[7px] font-bold flex items-center justify-center italic shrink-0"
            aria-hidden="true"
          >
            P
          </span>
          <span className="text-[9.5px] xl:text-[10.5px] 2xl:text-[11.5px] font-medium text-[#2b2927] truncate">
            Here are top picks for you!
          </span>
        </div>

        <div className="grid grid-cols-3 gap-[6px] xl:gap-[8px]">
          {products.slice(0, 3).map((prod) => (
            <button
              key={prod.id}
              id={prod.id}
              type="button"
              onClick={() => {
                onSelectProduct(prod);
                onNavigate('/shopping-assistant');
              }}
              title={`${prod.name} (${prod.price})`}
              aria-label={`${prod.name} (${prod.price})`}
              className="h-[50px] min-[1440px]:h-[60px] 2xl:h-[68px] min-[1920px]:h-[76px] rounded-[8px] bg-[#f5efe6] hover:bg-[#ebe4d8] border border-[#e4ddd2] p-[3px] flex items-center justify-center overflow-hidden transition-colors cursor-pointer"
            >
              <img
                src={prod.image}
                alt={prod.name}
                className="w-[48px] h-[42px] min-[1440px]:w-[60px] min-[1440px]:h-[51px] 2xl:w-[68px] 2xl:h-[58px] min-[1920px]:w-[80px] min-[1920px]:h-[68px] object-contain"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default AiShoppingCard;
