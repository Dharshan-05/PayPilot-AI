import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { NAV_ITEMS, type NavItemId, type RoutePath } from '../data/dashboard';
import { PayPalWordmark } from './BrandIcons';
import { SidebarNav } from './SidebarNav';
import { StaticCatImage } from './StaticCatImage';
import { NeedHelpCard } from './NeedHelpCard';

export interface SidebarProps {
  activeNav: NavItemId;
  currentRoute: RoutePath;
  onNavigate: (route: RoutePath) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  currentRoute,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}) => {
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const sidebarInner = (
    <>
      <div className="pt-[18px] pb-[14px] px-[18px] shrink-0 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            onNavigate('/');
            onCloseMobile();
          }}
          aria-label="PayPal Home"
          className="cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#efe6dd] rounded-md"
        >
          <PayPalWordmark />
        </button>
        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-1 rounded-full text-[#c6c1b9] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <SidebarNav
        items={NAV_ITEMS}
        activeNav={activeNav}
        onSelect={(route) => {
          onNavigate(route);
          onCloseMobile();
        }}
      />

      <div className="flex flex-col shrink-0 mt-1">
        <StaticCatImage />
        <NeedHelpCard
          active={currentRoute === '/help'}
          onClick={() => {
            onNavigate('/help');
            onCloseMobile();
          }}
        />
        <div className="pb-[11px] pt-[2px] text-center shrink-0">
          <p className="text-[7.5px] text-[#858078] tracking-[0.01em]">
            PayPal · Secure. Smart. Together.
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex w-full h-[calc(100vh-20px)] 2xl:h-[calc(100vh-32px)] min-h-[640px] max-h-[1044px] bg-[#222220] rounded-[24px] flex-col justify-between shrink-0 relative overflow-hidden shadow-sm sticky top-2.5 2xl:top-4">
        {sidebarInner}
      </aside>

      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="fixed inset-0 z-50 bg-black/45 flex lg:hidden"
          onClick={onCloseMobile}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="w-[220px] h-[calc(100vh-20px)] my-[10px] ml-[10px] bg-[#222220] rounded-[24px] flex flex-col justify-between overflow-hidden shadow-xl"
          >
            {sidebarInner}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
