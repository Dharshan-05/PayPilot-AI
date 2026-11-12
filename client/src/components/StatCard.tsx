import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  isPositive = true,
  icon,
  subtitle,
}) => (
  <Card className="p-[16px] flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-[#6a665f]">{label}</span>
      {icon && (
        <span className="w-[28px] h-[28px] rounded-full bg-[#f2ece1] border border-[#e5ded3] flex items-center justify-center text-[#22211f]">
          {icon}
        </span>
      )}
    </div>
    <div className="mt-[8px]">
      <div className="text-[22px] font-bold text-[#181715] tracking-[-0.02em] leading-tight">
        {value}
      </div>
      {(change || subtitle) && (
        <div className="flex items-center gap-1.5 mt-[4px] text-[10.5px]">
          {change && (
            <span
              className={`font-semibold flex items-center gap-0.5 ${
                isPositive ? 'text-[#2b7a43]' : 'text-[#b4690e]'
              }`}
            >
              {isPositive ? (
                <ArrowUp className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ArrowDown className="w-3 h-3" aria-hidden="true" />
              )}
              {change}
            </span>
          )}
          {subtitle && <span className="text-[#78736c]">{subtitle}</span>}
        </div>
      )}
    </div>
  </Card>
);

export default StatCard;
