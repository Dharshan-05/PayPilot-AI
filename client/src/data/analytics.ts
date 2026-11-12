export type AnalyticsTimeframe = '7 Days' | '30 Days' | '3 Months' | '6 Months' | '1 Year';
export type SpendingPeriod = 'This Month' | 'Last Month' | 'This Year';

export interface AnalyticsSnapshot {
  totalSpending: string;
  spendingChange: string;
  income: string;
  incomeChange: string;
  savings: string;
  savingsRate: string;
  avgTransaction: string;
  txCount: number;
  trendSeries: { label: string; spending: number; income: number }[];
  categories: {
    name: 'Shopping' | 'Food' | 'Bills' | 'Travel' | 'Entertainment' | 'Other';
    amount: number;
    percent: number;
    color: string;
  }[];
  monthlyComparison: { month: string; current: number; previous: number }[];
}

export interface SpendingDay {
  day: string;
  spent: number;
  darkHeight: number;
  capHeight: number;
  darkColor: string;
  hasCat?: boolean;
}

export const ANALYTICS_BY_TIMEFRAME: Record<AnalyticsTimeframe, AnalyticsSnapshot> = {
  '7 Days': {
    totalSpending: '$354.08',
    spendingChange: '-4.2% vs prior 7d',
    income: '$670.00',
    incomeChange: '+18.0% vs prior 7d',
    savings: '$315.92',
    savingsRate: '47.1% saved',
    avgTransaction: '$59.01',
    txCount: 6,
    trendSeries: [
      { label: 'Mon', spending: 38, income: 0 },
      { label: 'Tue', spending: 52, income: 250 },
      { label: 'Wed', spending: 28, income: 0 },
      { label: 'Thu', spending: 85, income: 0 },
      { label: 'Fri', spending: 42, income: 420 },
      { label: 'Sat', spending: 64, income: 0 },
      { label: 'Sun', spending: 45, income: 0 },
    ],
    categories: [
      { name: 'Shopping', amount: 148.5, percent: 42, color: '#1e1e1c' },
      { name: 'Entertainment', amount: 75.98, percent: 21, color: '#46433e' },
      { name: 'Food', amount: 64.2, percent: 18, color: '#76716b' },
      { name: 'Travel', amount: 28.4, percent: 8, color: '#2b7a43' },
      { name: 'Bills', amount: 22.0, percent: 6, color: '#9c958b' },
      { name: 'Other', amount: 15.0, percent: 5, color: '#c4bdb2' },
    ],
    monthlyComparison: [
      { month: 'Week 1', current: 290, previous: 310 },
      { month: 'Week 2', current: 354, previous: 370 },
    ],
  },
  '30 Days': {
    totalSpending: '$1,248.75',
    spendingChange: '+12.8% vs last month',
    income: '$2,450.00',
    incomeChange: '+15.4% vs last month',
    savings: '$1,201.25',
    savingsRate: '49.0% saved',
    avgTransaction: '$68.40',
    txCount: 18,
    trendSeries: [
      { label: 'Mon', spending: 115, income: 220 },
      { label: 'Tue', spending: 162, income: 450 },
      { label: 'Wed', spending: 120, income: 180 },
      { label: 'Thu', spending: 245, income: 520 },
      { label: 'Fri', spending: 138, income: 390 },
      { label: 'Sat', spending: 196, income: 310 },
      { label: 'Sun', spending: 272.75, income: 380 },
    ],
    categories: [
      { name: 'Shopping', amount: 512.0, percent: 41, color: '#1e1e1c' },
      { name: 'Food', amount: 249.75, percent: 20, color: '#46433e' },
      { name: 'Bills', amount: 187.3, percent: 15, color: '#76716b' },
      { name: 'Travel', amount: 137.35, percent: 11, color: '#2b7a43' },
      { name: 'Entertainment', amount: 112.4, percent: 9, color: '#9c958b' },
      { name: 'Other', amount: 49.95, percent: 4, color: '#c4bdb2' },
    ],
    monthlyComparison: [
      { month: 'Aug', current: 1040, previous: 980 },
      { month: 'Sep', current: 1180, previous: 1090 },
      { month: 'Oct', current: 1106, previous: 1150 },
      { month: 'Nov', current: 1248, previous: 1106 },
    ],
  },
  '3 Months': {
    totalSpending: '$3,535.15',
    spendingChange: '+8.4% QoQ',
    income: '$7,120.00',
    incomeChange: '+14.2% QoQ',
    savings: '$3,584.85',
    savingsRate: '50.3% saved',
    avgTransaction: '$72.14',
    txCount: 49,
    trendSeries: [
      { label: 'Sep', spending: 1180, income: 2290 },
      { label: 'Oct', spending: 1106, income: 2380 },
      { label: 'Nov', spending: 1249, income: 2450 },
    ],
    categories: [
      { name: 'Shopping', amount: 1378, percent: 39, color: '#1e1e1c' },
      { name: 'Food', amount: 742, percent: 21, color: '#46433e' },
      { name: 'Bills', amount: 565, percent: 16, color: '#76716b' },
      { name: 'Travel', amount: 424, percent: 12, color: '#2b7a43' },
      { name: 'Entertainment', amount: 283, percent: 8, color: '#9c958b' },
      { name: 'Other', amount: 143, percent: 4, color: '#c4bdb2' },
    ],
    monthlyComparison: [
      { month: 'Sep', current: 1180, previous: 1090 },
      { month: 'Oct', current: 1106, previous: 1150 },
      { month: 'Nov', current: 1249, previous: 1106 },
    ],
  },
  '6 Months': {
    totalSpending: '$6,890.40',
    spendingChange: '+6.1% vs H1',
    income: '$14,200.00',
    incomeChange: '+11.8% vs H1',
    savings: '$7,309.60',
    savingsRate: '51.5% saved',
    avgTransaction: '$70.31',
    txCount: 98,
    trendSeries: [
      { label: 'Jun', spending: 1090, income: 2250 },
      { label: 'Jul', spending: 1145, income: 2310 },
      { label: 'Aug', spending: 1120, income: 2420 },
      { label: 'Sep', spending: 1180, income: 2290 },
      { label: 'Oct', spending: 1106, income: 2380 },
      { label: 'Nov', spending: 1249, income: 2550 },
    ],
    categories: [
      { name: 'Shopping', amount: 2687, percent: 39, color: '#1e1e1c' },
      { name: 'Food', amount: 1378, percent: 20, color: '#46433e' },
      { name: 'Bills', amount: 1102, percent: 16, color: '#76716b' },
      { name: 'Travel', amount: 895, percent: 13, color: '#2b7a43' },
      { name: 'Entertainment', amount: 551, percent: 8, color: '#9c958b' },
      { name: 'Other', amount: 277, percent: 4, color: '#c4bdb2' },
    ],
    monthlyComparison: [
      { month: 'Jun', current: 1090, previous: 1020 },
      { month: 'Jul', current: 1145, previous: 1080 },
      { month: 'Aug', current: 1120, previous: 1095 },
      { month: 'Sep', current: 1180, previous: 1090 },
      { month: 'Oct', current: 1106, previous: 1150 },
      { month: 'Nov', current: 1249, previous: 1106 },
    ],
  },
  '1 Year': {
    totalSpending: '$14,820.50',
    spendingChange: '+18.2% YoY',
    income: '$29,400.00',
    incomeChange: '+22.4% YoY',
    savings: '$14,579.50',
    savingsRate: '49.6% saved',
    avgTransaction: '$74.85',
    txCount: 198,
    trendSeries: [
      { label: 'Q1', spending: 3420, income: 6950 },
      { label: 'Q2', spending: 3680, income: 7250 },
      { label: 'Q3', spending: 3810, income: 7520 },
      { label: 'Q4', spending: 3910.5, income: 7680 },
    ],
    categories: [
      { name: 'Shopping', amount: 5928, percent: 40, color: '#1e1e1c' },
      { name: 'Food', amount: 2964, percent: 20, color: '#46433e' },
      { name: 'Bills', amount: 2223, percent: 15, color: '#76716b' },
      { name: 'Travel', amount: 1926, percent: 13, color: '#2b7a43' },
      { name: 'Entertainment', amount: 1185, percent: 8, color: '#9c958b' },
      { name: 'Other', amount: 594.5, percent: 4, color: '#c4bdb2' },
    ],
    monthlyComparison: [
      { month: 'Q1', current: 3420, previous: 2980 },
      { month: 'Q2', current: 3680, previous: 3190 },
      { month: 'Q3', current: 3810, previous: 3340 },
      { month: 'Q4', current: 3910, previous: 3490 },
    ],
  },
};

export const SPENDING_BY_PERIOD: Record<
  SpendingPeriod,
  { total: string; change: string; days: SpendingDay[] }
> = {
  'This Month': {
    total: '$1,248.75',
    change: '+12.8%',
    days: [
      { day: 'Mon', spent: 115, darkHeight: 28, capHeight: 16, darkColor: '#76716b' },
      { day: 'Tue', spent: 162, darkHeight: 38, capHeight: 16, darkColor: '#7e7973' },
      { day: 'Wed', spent: 120, darkHeight: 28, capHeight: 19, darkColor: '#1e1e1c' },
      { day: 'Thu', spent: 245, darkHeight: 50, capHeight: 16, darkColor: '#1e1e1c' },
      { day: 'Fri', spent: 138, darkHeight: 31, capHeight: 16, darkColor: '#706c65' },
      { day: 'Sat', spent: 196, darkHeight: 52, capHeight: 14, darkColor: '#373734' },
      { day: 'Sun', spent: 272.75, darkHeight: 64, capHeight: 0, darkColor: '#2c2b29', hasCat: true },
    ],
  },
  'Last Month': {
    total: '$1,106.40',
    change: '+6.4%',
    days: [
      { day: 'Mon', spent: 98, darkHeight: 24, capHeight: 14, darkColor: '#76716b' },
      { day: 'Tue', spent: 140, darkHeight: 33, capHeight: 15, darkColor: '#7e7973' },
      { day: 'Wed', spent: 165, darkHeight: 37, capHeight: 15, darkColor: '#1e1e1c' },
      { day: 'Thu', spent: 190, darkHeight: 42, capHeight: 14, darkColor: '#1e1e1c' },
      { day: 'Fri', spent: 125, darkHeight: 29, capHeight: 15, darkColor: '#706c65' },
      { day: 'Sat', spent: 178, darkHeight: 39, capHeight: 15, darkColor: '#6f6a64' },
      { day: 'Sun', spent: 210.4, darkHeight: 54, capHeight: 0, darkColor: '#2c2b29', hasCat: true },
    ],
  },
  'This Year': {
    total: '$14,820.50',
    change: '+18.2%',
    days: [
      { day: 'Mon', spent: 1620, darkHeight: 34, capHeight: 14, darkColor: '#76716b' },
      { day: 'Tue', spent: 1950, darkHeight: 42, capHeight: 14, darkColor: '#7e7973' },
      { day: 'Wed', spent: 1740, darkHeight: 36, capHeight: 16, darkColor: '#1e1e1c' },
      { day: 'Thu', spent: 2680, darkHeight: 54, capHeight: 14, darkColor: '#1e1e1c' },
      { day: 'Fri', spent: 1890, darkHeight: 38, capHeight: 14, darkColor: '#706c65' },
      { day: 'Sat', spent: 2210, darkHeight: 46, capHeight: 14, darkColor: '#6f6a64' },
      { day: 'Sun', spent: 2730.5, darkHeight: 64, capHeight: 0, darkColor: '#2c2b29', hasCat: true },
    ],
  },
};
