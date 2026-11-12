import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';
import type { RoutePath } from '../data/dashboard';
import type { TransactionItem } from '../data/transactions';
import { exportTransactionsCsv } from '../services/paypalService';
import { TransactionAvatar } from '../components/BrandIcons';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { SecondaryButton } from '../components/SecondaryButton';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';

export type DirectionFilter = 'All' | 'Income (+)' | 'Expense (-)';

export interface TransactionsPageProps {
  transactions: TransactionItem[];
  txSearch: string;
  onChangeTxSearch: (val: string) => void;
  onNavigate: (route: RoutePath, entityId?: string) => void;
  onToast: (msg: string) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  txSearch,
  onChangeTxSearch,
  onNavigate,
  onToast,
}) => {
  const [txDateFilter, setTxDateFilter] = useState('All Dates');
  const [txCategoryFilter, setTxCategoryFilter] = useState('All Categories');
  const [txStatusFilter, setTxStatusFilter] = useState('All Statuses');
  const [txMethodFilter, setTxMethodFilter] = useState('All Methods');
  const [txDirectionFilter, setTxDirectionFilter] = useState<DirectionFilter>('All');
  const [txPage, setTxPage] = useState(1);

  const filtered = transactions.filter((tx) => {
    const q = txSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      tx.merchant.toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q) ||
      tx.txCode.toLowerCase().includes(q);
    const matchesCat = txCategoryFilter === 'All Categories' || tx.category === txCategoryFilter;
    const matchesStatus = txStatusFilter === 'All Statuses' || tx.status === txStatusFilter;
    const matchesMethod = txMethodFilter === 'All Methods' || tx.paymentMethod === txMethodFilter;
    const matchesDir =
      txDirectionFilter === 'All' ||
      (txDirectionFilter === 'Income (+)' && tx.isPositive) ||
      (txDirectionFilter === 'Expense (-)' && !tx.isPositive);
    const matchesDate =
      txDateFilter === 'All Dates' ||
      (txDateFilter === 'This Month' && tx.date.startsWith('Nov')) ||
      (txDateFilter === 'Last Month' && tx.date.startsWith('Oct'));
    return matchesSearch && matchesCat && matchesStatus && matchesMethod && matchesDir && matchesDate;
  });

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(txPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totalIn = filtered.filter((t) => t.isPositive).reduce((acc, t) => acc + t.numericAmount, 0);
  const totalOut = filtered.filter((t) => !t.isPositive).reduce((acc, t) => acc + Math.abs(t.numericAmount), 0);

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Transactions"
        subtitle="Search, filter, and inspect your complete PayPal activity."
        onBack={() => onNavigate('/')}
        rightSlot={
          <SecondaryButton
            onClick={() => {
              exportTransactionsCsv(filtered);
              onToast(`Exported ${filtered.length} transactions to CSV`);
            }}
            className="h-[34px] text-[11px]"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </SecondaryButton>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px] mb-[12px]">
        <StatCard label="Total Activity" value={`${filtered.length} Transactions`} subtitle="Matching current filters" />
        <StatCard label="Money In (Income)" value={`+$${totalIn.toFixed(2)}`} change="+14.2%" isPositive />
        <StatCard label="Money Out (Spent)" value={`-$${totalOut.toFixed(2)}`} change="+8.1%" isPositive={false} />
        <StatCard
          label="Net Cashflow"
          value={`${totalIn - totalOut >= 0 ? '+' : '-'}$${Math.abs(totalIn - totalOut).toFixed(2)}`}
          subtitle="PayPal Balance & Linked Cards"
        />
      </div>

      <Card className="p-[18px] flex-1 flex flex-col justify-between">
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2 pb-3.5 border-b border-[#efe9de]">
            <div className="relative lg:col-span-2">
              <Search className="w-3.5 h-3.5 text-[#78736c] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => {
                  onChangeTxSearch(e.target.value);
                  setTxPage(1);
                }}
                aria-label="Search transactions"
                placeholder="Search merchant, person, or ID..."
                className="w-full h-[34px] pl-8 pr-3 rounded-full bg-[#f4efe5] border border-[#dfd8cd] text-[11px]"
              />
            </div>

            <select
              value={txDateFilter}
              onChange={(e) => {
                setTxDateFilter(e.target.value);
                setTxPage(1);
              }}
              aria-label="Date filter"
              className="h-[34px] px-3 rounded-full bg-[#f4efe5] border border-[#dfd8cd] text-[11px] font-medium"
            >
              <option>All Dates</option>
              <option>This Month</option>
              <option>Last Month</option>
            </select>

            <select
              value={txCategoryFilter}
              onChange={(e) => {
                setTxCategoryFilter(e.target.value);
                setTxPage(1);
              }}
              aria-label="Category filter"
              className="h-[34px] px-3 rounded-full bg-[#f4efe5] border border-[#dfd8cd] text-[11px] font-medium"
            >
              <option>All Categories</option>
              <option>Purchase</option>
              <option>Money Received</option>
              <option>Money Sent</option>
              <option>Subscription</option>
              <option>Deposit</option>
              <option>Food &amp; Dining</option>
              <option>Travel</option>
            </select>

            <select
              value={txStatusFilter}
              onChange={(e) => {
                setTxStatusFilter(e.target.value);
                setTxPage(1);
              }}
              aria-label="Status filter"
              className="h-[34px] px-3 rounded-full bg-[#f4efe5] border border-[#dfd8cd] text-[11px] font-medium"
            >
              <option>All Statuses</option>
              <option>Completed</option>
              <option>Pending</option>
              <option>Refunded</option>
              <option>Failed</option>
            </select>

            <select
              value={txMethodFilter}
              onChange={(e) => {
                setTxMethodFilter(e.target.value);
                setTxPage(1);
              }}
              aria-label="Payment method filter"
              className="h-[34px] px-3 rounded-full bg-[#f4efe5] border border-[#dfd8cd] text-[11px] font-medium"
            >
              <option>All Methods</option>
              <option>PayPal Balance</option>
              <option>Chase Checking ••4821</option>
              <option>Visa Signature ••9014</option>
            </select>

            <select
              value={txDirectionFilter}
              onChange={(e) => {
                setTxDirectionFilter(e.target.value as DirectionFilter);
                setTxPage(1);
              }}
              aria-label="Income or expense filter"
              className="h-[34px] px-3 rounded-full bg-[#f4efe5] border border-[#dfd8cd] text-[11px] font-medium"
            >
              <option value="All">All (In &amp; Out)</option>
              <option value="Income (+)">Income (+)</option>
              <option value="Expense (-)">Expense (-)</option>
            </select>
          </div>

          {paginated.length === 0 ? (
            <EmptyState
              title="No matching transactions"
              description="Try clearing one of your active filters or searching a different merchant name."
              actionLabel="Reset Filters"
              onAction={() => {
                onChangeTxSearch('');
                setTxDateFilter('All Dates');
                setTxCategoryFilter('All Categories');
                setTxStatusFilter('All Statuses');
                setTxMethodFilter('All Methods');
                setTxDirectionFilter('All');
                setTxPage(1);
              }}
            />
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e8e1d6] text-[10.5px] font-semibold text-[#78736c]">
                    <th className="py-2.5 px-2">Date</th>
                    <th className="py-2.5 px-2">Merchant / Person</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2">Type / Method</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2 text-right">Amount</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efe9de] text-[11.5px]">
                  {paginated.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => onNavigate('/transactions/:id', tx.id)}
                      className="hover:bg-[#f4eee3]/70 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-2 whitespace-nowrap text-[11px] text-[#6a665f]">
                        <div>{tx.date}</div>
                        <div className="text-[9.5px] text-[#8c867e]">{tx.time}</div>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2.5">
                          <TransactionAvatar brand={tx.brand} />
                          <div>
                            <div className="font-semibold text-[#181715]">{tx.merchant}</div>
                            <div className="text-[9.5px] text-[#857f77]">{tx.txCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-[#3a3835]">{tx.category}</td>
                      <td className="py-2.5 px-2 text-[10.5px] text-[#6a665f]">
                        <div>{tx.type}</div>
                        <div className="text-[9.5px] text-[#8c867e]">{tx.paymentMethod}</div>
                      </td>
                      <td className="py-2.5 px-2">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td
                        className={`py-2.5 px-2 text-right font-bold whitespace-nowrap ${
                          tx.isPositive ? 'text-[#2b7a43]' : 'text-[#181715]'
                        }`}
                      >
                        {tx.amount}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('/transactions/:id', tx.id);
                          }}
                          className="px-2.5 py-1 rounded-full bg-[#f4efe5] hover:bg-[#e8e0d2] border border-[#dcd4c8] text-[10px] font-semibold text-[#181715] cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filtered.length}
          onPageChange={(p) => setTxPage(p)}
        />
      </Card>
    </div>
  );
};

export default TransactionsPage;
