export type AgentRole = 'Shopping' | 'Security' | 'Insights' | 'Custom';
export type AgentStatus = 'Active' | 'Paused' | 'Needs Attention';

export interface AgentItem {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  status: AgentStatus;
  lastAction: string;
  tasksCompleted: number;
  savingsOrImpact: string;
  rules: string[];
}

export const INITIAL_AGENTS: AgentItem[] = [
  {
    id: 'ag-1',
    name: 'Shopping Agent',
    role: 'Shopping',
    description: 'Automatically tracks price drops, applies best PayPal cashback offers, and compares tech & everyday deals under your budget.',
    status: 'Active',
    lastAction: 'Found 3 top-rated laptops under $900 with +3% PayPal Cashback',
    tasksCompleted: 42,
    savingsOrImpact: '$184.50 saved',
    rules: [
      'Alert me when wishlisted electronics drop by 10%+',
      'Auto-apply highest PayPal Rewards multiplier at checkout',
      'Cap automated deal recommendations at $1,000 max budget',
    ],
  },
  {
    id: 'ag-2',
    name: 'Security Agent',
    role: 'Security',
    description: 'Monitors logins, device fingerprints, and merchant risk scores 24/7 in tandem with FraudGuard AI.',
    status: 'Active',
    lastAction: 'Verified 14 recent sign-ins & blocked 1 unrecognized IP attempt',
    tasksCompleted: 128,
    savingsOrImpact: '98/100 Security Score',
    rules: [
      'Require biometric passkey for transfers above $500',
      'Block unfamiliar international merchant charges automatically',
      'Scan recurring subscriptions for unexpected price hikes',
    ],
  },
  {
    id: 'ag-3',
    name: 'Insights Agent',
    role: 'Insights',
    description: 'Analyzes weekly spending patterns, forecasts monthly cashflow, and spots duplicate subscriptions.',
    status: 'Active',
    lastAction: 'Calculated +12.5% monthly balance growth & weekend spend spike',
    tasksCompleted: 67,
    savingsOrImpact: '+12.5% MoM net flow',
    rules: [
      'Send Sunday evening spending summary with category breakdown',
      'Highlight recurring subscriptions unused for 30+ days',
      'Recommend optimal transfer timing to maximize Silver points',
    ],
  },
];
