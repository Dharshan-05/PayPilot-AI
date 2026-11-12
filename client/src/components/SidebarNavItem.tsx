import React, { useEffect, useRef } from 'react';
import type { NavItem, RoutePath } from '../data/dashboard';
import { NavIcon } from './BrandIcons';

export interface SidebarNavItemProps {
  item: NavItem;
  isActive: boolean;
  navigate: (route: RoutePath) => void;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  item,
  isActive,
  navigate,
}) => {
  const itemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isActive]);

  return (
    <button
      ref={itemRef}
      id={item.id}
      type="button"
      aria-current={isActive ? 'page' : undefined}
      onClick={() => navigate(item.route)}
      className={`group w-full flex items-center gap-[9px] px-[10px] xl:px-[12px] h-[32px] xl:h-[34px] 2xl:h-[36px] rounded-full text-[11px] xl:text-[12px] 2xl:text-[12.5px] transition-all shrink-0 cursor-pointer ${
        isActive
          ? 'bg-[#efe6dd] text-[#181715] font-semibold shadow-xs'
          : 'text-[#c6c1b9] hover:text-[#ffffff] hover:bg-white/5 font-medium'
      }`}
    >
      <NavIcon id={item.id} active={isActive} />
      <span className="whitespace-nowrap leading-none truncate">{item.label}</span>
    </button>
  );
};

export default SidebarNavItem;
