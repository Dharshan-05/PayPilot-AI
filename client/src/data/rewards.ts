export interface RewardOffer {
  id: string;
  title: string;
  merchant: string;
  category: 'Shopping' | 'Food' | 'Travel' | 'Entertainment' | 'Cashback';
  pointsCost: number;
  cashValue: string;
  badgeText: string;
  description: string;
}

export interface PointsHistoryItem {
  id: string;
  title: string;
  date: string;
  category: string;
  pointsDelta: string;
  isPositive: boolean;
}

export const INITIAL_REWARD_OFFERS: RewardOffer[] = [
  { id: 'rw-1', title: '$5.00 Instant PayPal Cashback', merchant: 'PayPal Balance', category: 'Cashback', pointsCost: 500, cashValue: '$5.00', badgeText: 'Most Popular', description: 'Transfer 500 points directly into your spendable PayPal Balance immediately.' },
  { id: 'rw-2', title: '$10.00 Apple Store Gift Credit', merchant: 'Apple Store', category: 'Shopping', pointsCost: 950, cashValue: '$10.00', badgeText: '5% Bonus Value', description: 'Apply directly at checkout on Apple.com or the Apple Store app.' },
  { id: 'rw-3', title: '$15.00 DoorDash & Dining Voucher', merchant: 'DoorDash', category: 'Food', pointsCost: 1350, cashValue: '$15.00', badgeText: '10% Point Saver', description: 'Valid on any restaurant delivery or pickup order paid with PayPal.' },
  { id: 'rw-4', title: '$25.00 Airbnb Travel Credit', merchant: 'Airbnb', category: 'Travel', pointsCost: 2200, cashValue: '$25.00', badgeText: 'Silver Exclusive', description: 'Save on weekend stays and experiences worldwide with zero blackout dates.' },
  { id: 'rw-5', title: '$10.00 Steam Wallet Code', merchant: 'Steam', category: 'Entertainment', pointsCost: 900, cashValue: '$10.00', badgeText: 'Gamer Pick', description: 'Instant digital code applied to your linked Steam account.' },
  { id: 'rw-6', title: '$20.00 Cashback Deposit', merchant: 'PayPal Balance', category: 'Cashback', pointsCost: 2000, cashValue: '$20.00', badgeText: 'Direct Cash', description: 'Redeem 2,000 points for $20.00 added straight to your balance.' },
];

export const INITIAL_POINTS_HISTORY: PointsHistoryItem[] = [
  { id: 'ph-1', title: 'Apple Store Checkout (2x Silver Tech Multiplier)', date: 'Nov 11, 2026', category: 'Shopping', pointsDelta: '+258 pts', isPositive: true },
  { id: 'ph-2', title: 'Steam Digital Purchase (3x Gaming Boost)', date: 'Nov 09, 2026', category: 'Entertainment', pointsDelta: '+180 pts', isPositive: true },
  { id: 'ph-3', title: 'Level 2 Silver Monthly Streak Bonus', date: 'Nov 01, 2026', category: 'Bonus', pointsDelta: '+250 pts', isPositive: true },
  { id: 'ph-4', title: 'Redeemed $5.00 PayPal Cashback', date: 'Oct 27, 2026', category: 'Cashback', pointsDelta: '-500 pts', isPositive: false },
];
