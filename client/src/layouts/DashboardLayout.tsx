import React from 'react';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen w-full bg-[#f7f2e8] text-[#1c1b19]">
    {children}
  </div>
);

export default DashboardLayout;
