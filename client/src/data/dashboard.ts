export const DESIGN_TOKENS = {
  background: '#f7f2e8',
  surface: '#faf5ec',
  surfaceSecondary: '#f3ede2',
  sidebarBg: '#222220',
  sidebarCardBg: '#2b2b29',
  activePillBg: '#efe6dd',
  textPrimary: '#1c1b19',
  textSecondary: '#6a665f',
  textMuted: '#857f77',
  border: '#e5ded3',
  borderStrong: '#dfd8cd',
  accent: '#1b1b19',
  success: '#2b7a43',
  successSoft: '#d6e3c7',
  warning: '#b4690e',
  warningSoft: '#f6e6c9',
  danger: '#c93b2b',
  dangerSoft: '#f5d8d4',
} as const;

export type RoutePath =
  | '/'
  | '/send-money'
  | '/request-money'
  | '/add-money'
  | '/ai-shopping'
  | '/shopping-assistant'
  | '/discovery'
  | '/product/:id'
  | '/checkout'
  | '/transactions'
  | '/transactions/:id'
  | '/transaction/'
  | '/rewards'
  | '/fraudguard'
  | '/agents'
  | '/analytics'
  | '/settings'
  | '/profile'
  | '/notifications'
  | '/help';

export type NavItemId =
  | 'home'
  | 'send'
  | 'request'
  | 'add'
  | 'ai-shopping'
  | 'discovery'
  | 'product-details'
  | 'checkout'
  | 'transactions'
  | 'transaction-details'
  | 'rewards'
  | 'fraudguard'
  | 'agents'
  | 'analytics'
  | 'settings';

export interface NavItem {
  id: NavItemId;
  label: string;
  route: RoutePath;
}

export interface HeroSlide {
  id: number;
  greeting: string;
  subtitle: string;
  balanceLabel: string;
  balance: string;
  change: string;
  changePeriod: string;
  ctaLabel: string;
}

export interface HelpQaEntry {
  title: string;
  answer: string;
  steps: string[];
  relatedRoute: RoutePath;
  relatedLabel: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', route: '/' },
  { id: 'send', label: 'Send Money', route: '/send-money' },
  { id: 'request', label: 'Request Money', route: '/request-money' },
  { id: 'add', label: 'Add Money', route: '/add-money' },
  { id: 'ai-shopping', label: 'AI Shopping', route: '/ai-shopping' },
  { id: 'discovery', label: 'Product Discovery', route: '/discovery' },
  { id: 'product-details', label: 'Product Details', route: '/product/:id' },
  { id: 'checkout', label: 'Checkout', route: '/checkout' },
  { id: 'transactions', label: 'Transactions', route: '/transactions' },
  { id: 'transaction-details', label: 'Transaction Details', route: '/transactions/:id' },
  { id: 'rewards', label: 'Rewards', route: '/rewards' },
  { id: 'fraudguard', label: 'FraudGuard', route: '/fraudguard' },
  { id: 'agents', label: 'AI Agents', route: '/agents' },
  { id: 'analytics', label: 'Analytics', route: '/analytics' },
  { id: 'settings', label: 'Settings', route: '/settings' },
];

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 0,
    greeting: 'Good Evening, Dharshan!',
    subtitle: 'Move money. Shop smarter. Live better.',
    balanceLabel: 'PayPal Balance',
    balance: '$1,248.75',
    change: '+12.5%',
    changePeriod: 'vs last month',
    ctaLabel: 'Send Money',
  },
  {
    id: 1,
    greeting: 'Good Evening, Dharshan!',
    subtitle: 'Earn 3% cashback on tech & gaming purchases this week.',
    balanceLabel: 'PayPal Balance',
    balance: '$1,248.75',
    change: '+12.5%',
    changePeriod: 'vs last month',
    ctaLabel: 'Send Money',
  },
  {
    id: 2,
    greeting: 'Good Evening, Dharshan!',
    subtitle: 'Zero fees on international transfers to 120+ countries.',
    balanceLabel: 'PayPal Balance',
    balance: '$1,248.75',
    change: '+12.5%',
    changePeriod: 'vs last month',
    ctaLabel: 'Send Money',
  },
];

export const HELP_QA_DATA: Record<string, HelpQaEntry> = {
  'Why was my payment declined?': {
    title: 'Understanding Declined Payments',
    answer:
      'Payments are typically declined when a linked bank or card issuer flags an unfamiliar merchant, insufficient balance, or an outdated billing zip code. FraudGuard AI also pauses transactions if a merchant risk score exceeds safety thresholds.',
    steps: [
      'Check FraudGuard Security to see if an automated safety hold was triggered.',
      'Verify your PayPal Balance ($1,248.75) or confirm your Visa Signature ••9014 expiration date in Settings → Payments.',
      'Retry the checkout using PayPal Balance for instant verification.',
    ],
    relatedRoute: '/fraudguard',
    relatedLabel: 'Open FraudGuard Security',
  },
  'How do I send money?': {
    title: 'Sending Money with PayPal',
    answer:
      'You can send money instantly to anyone using their name, @handle, email address, or mobile number. Transfers funded by your PayPal Balance or linked Chase Checking account are free to friends and family within the US.',
    steps: [
      'Go to Send Money from the left sidebar or Quick Actions.',
      'Select a contact (like Sarah K. or Alex Rivera) or enter an email/phone number.',
      'Enter the amount, pick your currency and funding source, and confirm in one click.',
    ],
    relatedRoute: '/send-money',
    relatedLabel: 'Go to Send Money',
  },
  'How can I protect my account?': {
    title: '24/7 Account & AI Security Protection',
    answer:
      'Your account is actively protected by FraudGuard AI (current score: 98/100) and your autonomous Security Agent. Enabling Passkey biometric login and two-factor authentication keeps unauthorized devices out.',
    steps: [
      'Review active device sessions and 2FA settings in Settings → Security.',
      'Inspect real-time login and merchant verification logs in FraudGuard.',
      'Configure custom spending alert thresholds inside Your Agents.',
    ],
    relatedRoute: '/fraudguard',
    relatedLabel: 'Review Security Score',
  },
  'Where is my refund?': {
    title: 'Tracking Your Refund Status',
    answer:
      'Refunds to your PayPal Balance process immediately once issued by the merchant (for example, your $29.99 Steam refund on Oct 29 completed in seconds). Refunds to linked cards take 2–5 business days.',
    steps: [
      'Open Transactions and filter by Status → Refunded.',
      'Click View Details on any transaction to inspect its timestamped receipt and Transaction ID.',
      'Use Report Problem on the Transaction Details screen if a merchant refund is overdue.',
    ],
    relatedRoute: '/transactions',
    relatedLabel: 'View Transactions',
  },
  'How do rewards work?': {
    title: 'Earning & Redeeming PayPal Rewards',
    answer:
      'As a Level 2 · Silver member with 2,450 points ($24.50 value), you earn 2x–6x points on eligible purchases and AI Shopping Assistant deals. Every 100 points equals $1.00 in instant cashback.',
    steps: [
      'Shop verified deals in AI Shopping Assistant to earn up to 6% bonus points.',
      'Open PayPal Rewards to redeem 500+ points for instant PayPal Balance cashback or gift credits.',
      'Earn 550 more points to unlock Level 3 · Gold (3,000 pts) with 3x base multipliers.',
    ],
    relatedRoute: '/rewards',
    relatedLabel: 'Explore PayPal Rewards',
  },
};
