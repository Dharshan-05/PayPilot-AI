import React from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import type { NavItemId, RoutePath } from '../data/dashboard';
import type { UserProfile } from '../data/users';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { Toast } from './Toast';

export interface AppLayoutProps {
  activeNav: NavItemId;
  currentRoute: RoutePath;
  onNavigate: (route: RoutePath) => void;
  mobileSidebarOpen: boolean;
  onOpenMobileSidebar: () => void;
  onCloseMobileSidebar: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  unreadNotifCount: number;
  userProfile: UserProfile;
  userMenuOpen: boolean;
  onToggleUserMenu: () => void;
  onCloseUserMenu: () => void;
  toastMessage: string | null;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeNav,
  currentRoute,
  onNavigate,
  mobileSidebarOpen,
  onOpenMobileSidebar,
  onCloseMobileSidebar,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  unreadNotifCount,
  userProfile,
  userMenuOpen,
  onToggleUserMenu,
  onCloseUserMenu,
  toastMessage,
  children,
}) => (
  <DashboardLayout>
    <div className="pp-root w-full max-w-none min-w-0 min-h-screen px-3 sm:px-5 lg:px-5 xl:px-7 py-2.5 2xl:py-4 flex flex-col lg:grid lg:grid-cols-[204px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[236px_minmax(0,1fr)] gap-4 xl:gap-5 relative">
      <Sidebar
        activeNav={activeNav}
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={onCloseMobileSidebar}
      />
      <main className="flex-1 flex flex-col min-w-0 w-full">
        <TopHeader
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onSearchSubmit={onSearchSubmit}
          unreadNotifCount={unreadNotifCount}
          currentRoute={currentRoute}
          onNavigate={onNavigate}
          userProfile={userProfile}
          userMenuOpen={userMenuOpen}
          onToggleUserMenu={onToggleUserMenu}
          onCloseUserMenu={onCloseUserMenu}
          onOpenMobileSidebar={onOpenMobileSidebar}
        />
        {children}
      </main>
      <Toast message={toastMessage} />
    </div>
  </DashboardLayout>
);

export default AppLayout;
