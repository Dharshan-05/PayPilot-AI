import React, { useState } from 'react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';
import type { PointsHistoryItem, RewardOffer } from '../data/rewards';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { Badge } from '../components/Badge';
import { Tabs } from '../components/Tabs';

export interface RewardsPageProps {
  rewardPoints: number;
  rewardOffers: RewardOffer[];
  pointsHistory: PointsHistoryItem[];
  onRedeemPoints: (ptsCost: number, cashVal: number, title: string) => void;
  onNavigate: (route: RoutePath) => void;
}

export const RewardsPage: React.FC<RewardsPageProps> = ({
  rewardPoints,
  rewardOffers,
  pointsHistory,
  onRedeemPoints,
  onNavigate,
}) => {
  const [rewardCatTab, setRewardCatTab] = useState('All');

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="PayPal Rewards"
        subtitle="Redeem your Silver level points for instant cashback, travel credits, and gift vouchers."
        onBack={() => onNavigate('/')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[14px] mb-[14px]">
        <div className="rounded-[20px] bg-[#faf5ec] border border-[#e5ded3] p-[22px] relative overflow-hidden flex flex-col justify-between min-h-[195px]">
          <div className="relative z-10 sm:pr-[240px] lg:pr-[264px] space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="dark">Level 2 · Silver</Badge>
              <Badge variant="success">2x Tech &amp; Dining Points Active</Badge>
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#6a665f]">Current Points Balance</div>
              <div className="text-[36px] font-extrabold text-[#181715] tracking-[-0.03em] leading-none mt-1">
                {rewardPoints.toLocaleString('en-US')}{' '}
                <span className="text-[14px] font-semibold text-[#2b7a43]">
                  (${(rewardPoints / 100).toFixed(2)} Cash Value)
                </span>
              </div>
            </div>

            <div className="pt-1">
              <div className="flex justify-between text-[10.5px] font-medium text-[#5c5954] mb-1">
                <span>Progress to Level 3 · Gold (3,000 pts)</span>
                <span className="font-bold text-[#181715]">
                  {Math.min(100, Math.round((rewardPoints / 3000) * 100))}% (
                  {Math.max(0, 3000 - rewardPoints)} pts to go)
                </span>
              </div>
              <div className="w-full h-[8px] rounded-full bg-[#e8e1d5] overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, (rewardPoints / 3000) * 100)}%` }}
                  className="h-full rounded-full bg-[#222220] transition-all duration-300"
                />
              </div>
            </div>
          </div>
          <img
            src={ASSETS.rewardsArt}
            alt="PayPal Rewards Cat"
            className="sm:absolute sm:right-0 sm:bottom-0 mx-auto mt-3 sm:mt-0 w-[172px] h-[174px] sm:w-[215px] sm:h-[218px] lg:w-[258px] lg:h-[261px] object-contain object-right-bottom pointer-events-none select-none"
          />
        </div>

        <Card className="p-[18px] flex flex-col justify-between">
          <div>
            <h3 className="text-[13.5px] font-semibold text-[#181715] mb-2.5">
              Points History &amp; Activity
            </h3>
            <div className="space-y-2">
              {pointsHistory.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-[12px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#181715] truncate">{item.title}</div>
                    <div className="text-[9.5px] text-[#78736c]">
                      {item.date} • {item.category}
                    </div>
                  </div>
                  <span
                    className={`text-[11.5px] font-bold whitespace-nowrap ${
                      item.isPositive ? 'text-[#2b7a43]' : 'text-[#181715]'
                    }`}
                  >
                    {item.pointsDelta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-[18px] flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-[14px] font-semibold text-[#181715]">
              Available &amp; Redeemable Rewards
            </h3>
            <Tabs
              tabs={['All', 'Shopping', 'Food', 'Travel', 'Entertainment', 'Cashback']}
              activeTab={rewardCatTab}
              onChange={setRewardCatTab}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[12px]">
            {rewardOffers
              .filter((r) => rewardCatTab === 'All' || r.category === rewardCatTab)
              .map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 rounded-[16px] bg-[#f4efe5] border border-[#e5ded3] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant="default">{offer.category}</Badge>
                      <Badge variant="success">{offer.badgeText}</Badge>
                    </div>
                    <h4 className="text-[13px] font-bold text-[#181715]">{offer.title}</h4>
                    <p className="text-[10.5px] text-[#6a665f] mt-1 leading-relaxed">
                      {offer.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#e5ded3] flex items-center justify-between">
                    <div>
                      <div className="text-[14px] font-extrabold text-[#181715]">
                        {offer.pointsCost.toLocaleString()} pts
                      </div>
                      <div className="text-[9.5px] text-[#2b7a43] font-semibold">
                        Value: {offer.cashValue}
                      </div>
                    </div>
                    <PrimaryButton
                      disabled={rewardPoints < offer.pointsCost}
                      onClick={() =>
                        onRedeemPoints(
                          offer.pointsCost,
                          parseFloat(offer.cashValue.replace('$', '')) || 5,
                          offer.title
                        )
                      }
                      className="h-[32px] px-4 text-[11px]"
                    >
                      Redeem
                    </PrimaryButton>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RewardsPage;
