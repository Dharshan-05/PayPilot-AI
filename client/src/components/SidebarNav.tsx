import React from 'react';
import type { NavItem, NavItemId, RoutePath } from '../data/dashboard';
import { SidebarNavItem } from './SidebarNavItem';

export interface SidebarNavProps {
  items: NavItem[];
  activeNav: NavItemId;
  onSelect: (route: RoutePath) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ items, activeNav, onSelect }) => (
  <div className="relative flex-1 min-h-0 flex flex-col">
    <nav
      aria-label="Main Navigation"
      className="sidebar-nav px-[9px] flex-1 min-h-0 flex flex-col gap-[2px] pb-3 overflow-y-auto overflow-x-hidden"
    >
      {items.map((item) => (
        <SidebarNavItem
          key={item.id}
          item={item}
          isActive={activeNav === item.id}
          navigate={onSelect}
        />
      ))}
    </nav>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#222220] to-transparent"
    />
  </div>
);

export default SidebarNav;
