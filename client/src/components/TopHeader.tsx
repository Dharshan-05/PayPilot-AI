import React from 'react';
import { Bell, Menu } from 'lucide-react';
import type { RoutePath } from '../data/dashboard';
import type { UserProfile } from '../data/users';
import { SearchBar } from './SearchBar';
import { UserMenu } from './UserMenu';

export interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: () => void;
  unreadNotifCount: number;
  currentRoute: RoutePath;
  onNavigate: (route: RoutePath) => void;
  userProfile: UserProfile;
  userMenuOpen: boolean;
  onToggleUserMenu: () => void;
  onCloseUserMenu: () => void;
  onOpenMobileSidebar: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  unreadNotifCount,
  currentRoute,
  onNavigate,
  userProfile,
  userMenuOpen,
  onToggleUserMenu,
  onCloseUserMenu,
  onOpenMobileSidebar,
}) => (
  <header className="h-[42px] 2xl:h-[46px] mb-[13px] xl:mb-[16px] flex items-center justify-between gap-3 relative z-30">
    <div className="flex items-center gap-2.5 flex-1 max-w-[560px] xl:max-w-[680px] 2xl:max-w-[780px] min-w-0">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        aria-label="Open navigation menu"
        className="lg:hidden w-[40px] h-[40px] rounded-full bg-[#222220] text-[#f7f2e8] flex items-center justify-center shrink-0 cursor-pointer"
      >
        <Menu className="w-[18px] h-[18px]" />
      </button>
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        onSubmit={onSearchSubmit}
      />
    </div>

    <div className="flex items-center gap-[18px] pr-[4px] shrink-0">
      <button
        type="button"
        onClick={() => onNavigate('/notifications')}
        aria-label="Notifications"
        className={`relative p-[6px] rounded-full transition-colors cursor-pointer ${
          currentRoute === '/notifications' ? 'bg-[#e6dfd3]' : 'hover:bg-[#ede6da]'
        }`}
      >
        <Bell className="w-[19px] h-[19px] text-[#22211f] stroke-[1.8]" aria-hidden="true" />
        {unreadNotifCount > 0 && (
          <span className="w-[6.5px] h-[6.5px] rounded-full bg-[#e54835] absolute top-[5px] right-[5px] ring-2 ring-[#f7f2e8]" />
        )}
      </button>

      <UserMenu
        userProfile={userProfile}
        unreadNotifCount={unreadNotifCount}
        open={userMenuOpen}
        onToggle={onToggleUserMenu}
        onClose={onCloseUserMenu}
        onNavigate={onNavigate}
      />
    </div>
  </header>
);

export default TopHeader;
