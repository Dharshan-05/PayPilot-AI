import React from 'react';
import type { SpendingPeriod } from '../data/analytics';
import type { RoutePath } from '../data/dashboard';
import type { ProductPick } from '../data/products';
import type { TransactionItem } from '../data/transactions';
import { HeroBanner } from '../components/HeroBanner';
import { QuickActionsCard } from '../components/QuickActionsCard';
import { SpendingOverviewCard } from '../components/SpendingOverviewCard';
import { RecentTransactionsCard } from '../components/RecentTransactionsCard';
import { RewardsCard } from '../components/RewardsCard';
import { AiShoppingCard } from '../components/AiShoppingCard';
import { FraudGuardCard } from '../components/FraudGuardCard';
import { YourAgentsCard } from '../components/YourAgentsCard';

export interface DashboardHomePageProps {
  heroSlide: number;
  onSelectHeroSlide: (idx: number) => void;
  balanceNumber: number;
  onOpenBalanceInfo: () => void;
  spendingPeriod: SpendingPeriod;
  onChangeSpendingPeriod: (period: SpendingPeriod) => void;
  recentTransactions: TransactionItem[];
  searchQuery: string;
  rewardPoints: number;
  aiPromptInput: string;
  featuredProducts: ProductPick[];
  onSelectProduct: (prod: ProductPick) => void;
  activeAgentCount: number;
  onNavigate: (route: RoutePath, entityId?: string) => void;
}

export const DashboardHomePage: React.FC<DashboardHomePageProps> = ({
  heroSlide,
  onSelectHeroSlide,
  balanceNumber,
  onOpenBalanceInfo,
  spendingPeriod,
  onChangeSpendingPeriod,
  recentTransactions,
  searchQuery,
  rewardPoints,
  aiPromptInput,
  featuredProducts,
  onSelectProduct,
  activeAgentCount,
  onNavigate,
}) => (
  <div className="flex flex-col gap-3 2xl:gap-4 w-full min-w-0">
    <section className="grid grid-cols-1 md:grid-cols-[minmax(0,2.2fr)_minmax(220px,1fr)] lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)] gap-3 2xl:gap-4 lg:min-h-[clamp(212px,28.8vh,324px)]">
      <HeroBanner
        heroSlide={heroSlide}
        onSelectSlide={onSelectHeroSlide}
        balanceNumber={balanceNumber}
        onOpenBalanceInfo={onOpenBalanceInfo}
        onNavigate={onNavigate}
      />
      <QuickActionsCard onNavigate={onNavigate} />
    </section>

    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.13fr)_minmax(0,1fr)] gap-3 2xl:gap-4 lg:min-h-[clamp(228px,31.2vh,342px)]">
      <SpendingOverviewCard
        spendingPeriod={spendingPeriod}
        onChangePeriod={onChangeSpendingPeriod}
        onNavigate={onNavigate}
      />
      <RecentTransactionsCard
        transactions={recentTransactions}
        searchQuery={searchQuery}
        onNavigate={onNavigate}
      />
      <div className="md:col-span-2 lg:col-span-1 flex">
        <RewardsCard rewardPoints={rewardPoints} onNavigate={onNavigate} />
      </div>
    </section>

    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,1.03fr)_minmax(0,1fr)] gap-3 2xl:gap-4 lg:min-h-[clamp(178px,24.6vh,268px)]">
      <AiShoppingCard
        promptLabel={aiPromptInput}
        products={featuredProducts}
        onSelectProduct={onSelectProduct}
        onNavigate={onNavigate}
      />
      <FraudGuardCard onNavigate={onNavigate} />
      <div className="md:col-span-2 lg:col-span-1 flex">
        <YourAgentsCard activeAgentCount={activeAgentCount} onNavigate={onNavigate} />
      </div>
    </section>
  </div>
);

export default DashboardHomePage;
