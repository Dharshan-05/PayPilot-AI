import React, { useState } from 'react';
import { ASSETS } from '../assets/images';
import { ANALYTICS_BY_TIMEFRAME, type AnalyticsTimeframe } from '../data/analytics';
import type { RoutePath } from '../data/dashboard';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { Tabs } from '../components/Tabs';

export interface AnalyticsPageProps {
  onNavigate: (route: RoutePath) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onNavigate }) => {
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<AnalyticsTimeframe>('30 Days');

  const snap = ANALYTICS_BY_TIMEFRAME[analyticsTimeframe];
  const maxTrend = Math.max(...snap.trendSeries.map((d) => Math.max(d.spending, d.income)), 1);
  const maxComp = Math.max(...snap.monthlyComparison.map((d) => Math.max(d.current, d.previous)), 1);

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Analytics"
        subtitle="Understand your money better."
        onBack={() => onNavigate('/')}
        rightSlot={
          <Tabs
            tabs={['7 Days', '30 Days', '3 Months', '6 Months', '1 Year']}
            activeTab={analyticsTimeframe}
            onChange={(t) => setAnalyticsTimeframe(t as AnalyticsTimeframe)}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px] mb-[12px]">
        <StatCard label="Total Spending" value={snap.totalSpending} change={snap.spendingChange} isPositive={false} />
        <StatCard label="Income" value={snap.income} change={snap.incomeChange} isPositive />
        <StatCard label="Net Savings" value={snap.savings} subtitle={snap.savingsRate} isPositive />
        <StatCard label="Average Transaction" value={snap.avgTransaction} subtitle={`Across ${snap.txCount} transactions`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[12px] flex-1">
        <Card className="p-[18px] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="text-[14px] font-semibold text-[#181715]">
                Income vs. Spending Trend ({analyticsTimeframe})
              </h3>
              <p className="text-[10.5px] text-[#78736c]">
                Side-by-side cashflow comparison across your selected period
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#2e8b46] inline-block" aria-hidden="true" /> Income
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#222220] inline-block" aria-hidden="true" /> Spending
              </span>
            </div>
          </div>

          <div className="h-[150px] flex items-end justify-between gap-3 pt-6 px-2">
            {snap.trendSeries.map((pt, idx) => {
              const spH = Math.max(8, Math.round((pt.spending / maxTrend) * 105));
              const inH = Math.max(6, Math.round((pt.income / maxTrend) * 105));
              return (
                <div key={pt.label} className="flex-1 flex flex-col items-center">
                  <div className="flex items-end gap-1.5 h-[112px]">
                    <div
                      style={{ height: `${inH}px` }}
                      title={`Income: $${pt.income}`}
                      className="w-[14px] rounded-t-[4px] bg-[#2e8b46]/85 hover:bg-[#2e8b46] transition-all"
                    />
                    <div className="flex flex-col items-center relative">
                      {idx === snap.trendSeries.length - 1 && (
                        <img
                          src={ASSETS.spendingCat}
                          alt=""
                          className="w-[54px] h-[34px] sm:w-[81px] sm:h-[51px] max-w-none -mb-[5px] object-contain pointer-events-none"
                        />
                      )}
                      <div
                        style={{ height: `${spH}px` }}
                        title={`Spending: $${pt.spending}`}
                        className="w-[14px] rounded-t-[4px] bg-[#222220] hover:opacity-85 transition-all"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-[#6a665f] mt-2 font-medium">{pt.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-[18px] flex flex-col justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-[#181715]">Category Breakdown</h3>
            <p className="text-[10.5px] text-[#78736c] mb-3">
              Where your money went during {analyticsTimeframe}
            </p>

            <div className="space-y-2.5">
              {snap.categories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-[#181715]">{cat.name}</span>
                    <span className="text-[#6a665f]">
                      <strong className="text-[#181715]">${cat.amount.toLocaleString()}</strong> ({cat.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-[8px] rounded-full bg-[#ece5d9] overflow-hidden">
                    <div
                      style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-[18px] flex flex-col justify-between lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-[14px] font-semibold text-[#181715]">
                Period-over-Period Spending Comparison
              </h3>
              <p className="text-[10.5px] text-[#78736c]">
                Current period vs. previous benchmark
              </p>
            </div>
            <Badge variant="default">Insights Agent Verified</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {snap.monthlyComparison.slice(0, 4).map((m) => {
              const diffPct = Math.round(((m.current - m.previous) / m.previous) * 100);
              return (
                <div
                  key={m.month}
                  className="p-3 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#181715]">{m.month}</span>
                    <span
                      className={`text-[10px] font-semibold ${
                        diffPct <= 0 ? 'text-[#2b7a43]' : 'text-[#78736c]'
                      }`}
                    >
                      {diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`}
                    </span>
                  </div>
                  <div className="text-[17px] font-extrabold text-[#181715] mt-1">
                    ${m.current.toLocaleString()}
                  </div>
                  <div className="text-[9.5px] text-[#78736c]">
                    Prior period: ${m.previous.toLocaleString()}
                  </div>
                  <div className="w-full h-[5px] rounded-full bg-[#e4ddd2] mt-2 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.round((m.current / maxComp) * 100))}%` }}
                      className="h-full bg-[#222220] rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
