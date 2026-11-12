import React from 'react';

export interface TabsProps {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => (
  <div className="flex items-center gap-[6px] flex-wrap" role="tablist">
    {tabs.map((tab) => {
      const active = tab === activeTab;
      return (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(tab)}
          className={`h-[31px] px-[13px] rounded-full text-[11px] transition-all cursor-pointer ${
            active
              ? 'bg-[#222220] text-[#f7f2e8] font-semibold shadow-2xs'
              : 'bg-[#f4efe5] hover:bg-[#ebe4d8] text-[#5c5954] border border-[#e3dcd1] font-medium'
          }`}
        >
          {tab}
        </button>
      );
    })}
  </div>
);

export default Tabs;
