import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';
import type { UserProfile } from '../data/users';
import { Badge } from './Badge';

export interface UserMenuProps {
  userProfile: UserProfile;
  unreadNotifCount: number;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNavigate: (route: RoutePath) => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  userProfile,
  unreadNotifCount,
  open,
  onToggle,
  onClose,
  onNavigate,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${userProfile.name}`}
        className="flex items-center gap-[10px] py-[2px] pl-[2px] pr-[6px] rounded-full hover:bg-[#ede6da] transition-colors cursor-pointer"
      >
        <div className="w-[38px] h-[38px] rounded-full overflow-hidden border border-[#b8b1a6] bg-[#ede6dc] shrink-0">
          <img
            src={ASSETS.avatarCat}
            alt={`${userProfile.name} Avatar`}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-[12px] font-medium text-[#2b2927] hidden sm:inline">
          {userProfile.name}
        </span>
        <ChevronDown className="w-[13px] h-[13px] text-[#5c5954]" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[210px] rounded-[16px] bg-[#faf5ec] border border-[#dfd8cd] shadow-lg py-2 z-50"
        >
          <div className="px-3.5 py-2 border-b border-[#efe9de]">
            <div className="text-[12px] font-bold text-[#181715]">{userProfile.name}</div>
            <div className="text-[10px] text-[#78736c]">{userProfile.email}</div>
            <div className="mt-1">
              <Badge variant="default">{userProfile.tier}</Badge>
            </div>
          </div>
          <div className="py-1">
            {[
              { label: 'My Profile', route: '/profile' as RoutePath },
              { label: 'Account Settings', route: '/settings' as RoutePath },
              { label: 'AI Shopping Assistant', route: '/shopping-assistant' as RoutePath },
              { label: `Notifications (${unreadNotifCount})`, route: '/notifications' as RoutePath },
              { label: 'Help & PayPal AI', route: '/help' as RoutePath },
            ].map((item) => (
              <button
                key={item.route}
                type="button"
                role="menuitem"
                onClick={() => {
                  onNavigate(item.route);
                  onClose();
                }}
                className="w-full px-3.5 py-1.5 text-left text-[11.5px] text-[#2b2927] hover:bg-[#efe8dc] flex items-center justify-between cursor-pointer"
              >
                <span>{item.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#8c867e]" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
