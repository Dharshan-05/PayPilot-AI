import type { RoutePath } from './dashboard';

export type NotificationCategory = 'Payments' | 'Security' | 'Rewards' | 'Agents';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  category: NotificationCategory;
  unread: boolean;
  targetRoute: RoutePath;
  txId?: string;
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Money Received: +$250.00 from Sarah K.',
    body: 'Sarah K. sent you $250.00 for "Shared studio equipment split". Funds are available in your PayPal Balance.',
    time: 'Yesterday, 1:42 PM',
    category: 'Payments',
    unread: true,
    targetRoute: '/transactions/:id',
    txId: 'tx-2',
  },
  {
    id: 'notif-2',
    title: 'AI Shopping Agent: Price Drop Detected',
    body: 'MacBook Air 13" M3 dropped to $849.00 (-$250) at an eligible PayPal 3% Cashback merchant.',
    time: 'Today, 11:15 AM',
    category: 'Agents',
    unread: true,
    targetRoute: '/shopping-assistant',
  },
  {
    id: 'notif-3',
    title: 'FraudGuard Security: Weekly Scan Complete',
    body: 'Your account security score is 98/100. 0 unauthorized sign-ins or suspicious transactions detected.',
    time: 'Today, 9:00 AM',
    category: 'Security',
    unread: false,
    targetRoute: '/fraudguard',
  },
  {
    id: 'notif-4',
    title: 'Reward Earned: +258 Silver Points',
    body: 'You earned 258 points from your $129.00 Apple Store purchase. You are 550 points away from Level 3 Gold.',
    time: 'Nov 11, 2026',
    category: 'Rewards',
    unread: false,
    targetRoute: '/rewards',
  },
  {
    id: 'notif-5',
    title: 'Payment Completed: -$129.00 at Apple Store',
    body: 'Express Checkout order #W9481024 was paid using your PayPal Balance.',
    time: 'Nov 11, 2026',
    category: 'Payments',
    unread: false,
    targetRoute: '/transactions/:id',
    txId: 'tx-1',
  },
  {
    id: 'notif-6',
    title: 'Security Alert: Unrecognized IP Blocked',
    body: 'FraudGuard AI automatically blocked an unrecognized sign-in attempt from Frankfurt, DE.',
    time: 'Nov 07, 2026',
    category: 'Security',
    unread: false,
    targetRoute: '/fraudguard',
  },
];
