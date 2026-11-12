import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { RoutePath } from '../data/dashboard';
import type { TransactionItem } from '../data/transactions';
import { TransactionAvatar } from './BrandIcons';

export interface RecentTransactionsCardProps {
  transactions: TransactionItem[];
  searchQuery: string;
  onNavigate: (route: RoutePath, entityId?: string) => void;
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions,
  searchQuery,
  onNavigate,
}) => (
  <div className="w-full h-full min-h-[222px] rounded-[20px] bg-[#fbf6ed] border border-[#e5ded3] p-[15px] min-[1440px]:p-[20px] 2xl:p-[24px] flex flex-col justify-between">
    <div className="flex items-center justify-between mb-[6px]">
      <h2 className="text-[14px] xl:text-[15.5px] 2xl:text-[17px] font-semibold text-[#1c1b19] tracking-[-0.01em]">
        Recent Transactions
      </h2>
      <button
        type="button"
        onClick={() => onNavigate('/transactions')}
        className="text-[11px] xl:text-[12px] 2xl:text-[12.5px] font-medium text-[#3a3835] hover:text-[#181715] flex items-center gap-[4px] transition-colors cursor-pointer"
      >
        <span>View All</span>
        <ArrowRight className="w-[11px] h-[11px]" aria-hidden="true" />
      </button>
    </div>

    <div className="flex-1 flex flex-col justify-evenly divide-y divide-[#efe9de]">
      {transactions.length === 0 ? (
        <div className="py-8 text-center text-[11px] text-[#78736c]">
          No transactions match "{searchQuery}"
        </div>
      ) : (
        transactions.map((tx) => (
          <button
            key={tx.id}
            id={tx.id}
            type="button"
            onClick={() => onNavigate('/transactions/:id', tx.id)}
            className="w-full text-left py-[5.5px] xl:py-[7px] first:pt-[2px] last:pb-[2px] flex items-center justify-between gap-[10px] cursor-pointer hover:bg-[#f4eee3]/60 rounded-[8px] px-[2px] transition-colors"
          >
            <div className="flex items-center gap-[10px] xl:gap-[12px] min-w-0">
              <TransactionAvatar brand={tx.brand} />
              <div className="min-w-0">
                <div className="text-[11.5px] xl:text-[12.5px] 2xl:text-[13.5px] font-semibold text-[#1c1b19] truncate leading-tight">
                  {tx.merchant}
                </div>
                <div className="text-[9.5px] xl:text-[10.5px] 2xl:text-[11px] text-[#857f77] truncate mt-[1.5px] leading-tight">
                  {tx.date} • {tx.category}
                </div>
              </div>
            </div>
            <div
              className={`text-[12px] xl:text-[13px] 2xl:text-[14px] font-semibold whitespace-nowrap ${
                tx.isPositive ? 'text-[#2b7a43]' : 'text-[#1c1b19]'
              }`}
            >
              {tx.amount}
            </div>
          </button>
        ))
      )}
    </div>
  </div>
);

export default RecentTransactionsCard;
