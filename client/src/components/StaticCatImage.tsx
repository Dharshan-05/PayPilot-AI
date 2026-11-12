import React from 'react';
import { ASSETS } from '../assets/images';

export const StaticCatImage: React.FC = () => (
  <div className="w-full max-w-[236px] mx-auto h-[164px] lg:h-[152px] xl:h-[164px] 2xl:h-[176px] relative overflow-hidden shrink-0 pointer-events-none select-none flex items-end justify-center bg-[#222220]">
    <img
      id="sidebar-static-cat-img"
      src={ASSETS.sidebarCat}
      alt="PayPal Sleeping Cat"
      className="w-full h-full object-contain object-bottom block pointer-events-none select-none"
    />
  </div>
);

export default StaticCatImage;
