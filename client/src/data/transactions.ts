export type TransactionCategory =
  | 'Purchase'
  | 'Money Received'
  | 'Money Sent'
  | 'Subscription'
  | 'Deposit'
  | 'Food & Dining'
  | 'Travel';

export type TransactionType =
  | 'Card Payment'
  | 'Peer Transfer'
  | 'Auto-Renewal'
  | 'Direct Deposit'
  | 'Express Checkout';

export type TransactionStatus = 'Completed' | 'Pending' | 'Refunded' | 'Failed';

export type PaymentMethodName =
  | 'PayPal Balance'
  | 'Chase Checking ••4821'
  | 'Visa Signature ••9014';

export interface TransactionItem {
  id: string;
  txCode: string;
  merchant: string;
  counterpartyEmail: string;
  date: string;
  time: string;
  category: TransactionCategory;
  type: TransactionType;
  status: TransactionStatus;
  paymentMethod: PaymentMethodName;
  amount: string;
  numericAmount: number;
  fee: string;
  isPositive: boolean;
  brand: 'apple' | 'paypal' | 'steam' | 'netflix';
  description: string;
  receiptItems?: { label: string; price: string }[];
  paypalOrderId?: string;
  paypalCaptureId?: string;
  internalReference?: string;
  sourceOrigin?: 'backend' | 'demo';
}

export interface MoneyRequestItem {
  id: string;
  person: string;
  email: string;
  amount: string;
  numericAmount: number;
  currency: string;
  dueDate: string;
  note: string;
  status: 'Pending' | 'Paid' | 'Expired' | 'Cancelled';
  createdAt: string;
}

export const INITIAL_TRANSACTIONS: TransactionItem[] = [
  {
    id: 'tx-1',
    txCode: 'PP-2026-1111-8941',
    merchant: 'Apple Store',
    counterpartyEmail: 'billing@apple.com',
    date: 'Nov 11, 2026',
    time: '04:18 PM',
    category: 'Purchase',
    type: 'Express Checkout',
    status: 'Completed',
    paymentMethod: 'PayPal Balance',
    amount: '- $129.00',
    numericAmount: -129.0,
    fee: '$0.00',
    isPositive: false,
    brand: 'apple',
    description: 'Apple Pencil Pro & USB-C Charge Cable (2m) — Online Order #W9481024',
    receiptItems: [
      { label: 'Apple Pencil Pro', price: '$110.00' },
      { label: 'USB-C Charge Cable (2 m)', price: '$19.00' },
    ],
  },
  {
    id: 'tx-2',
    txCode: 'PP-2026-1110-7320',
    merchant: 'Received from Sarah K.',
    counterpartyEmail: 'sarah.k@designstudio.io',
    date: 'Nov 10, 2026',
    time: '01:42 PM',
    category: 'Money Received',
    type: 'Peer Transfer',
    status: 'Completed',
    paymentMethod: 'PayPal Balance',
    amount: '+ $250.00',
    numericAmount: 250.0,
    fee: '$0.00',
    isPositive: true,
    brand: 'paypal',
    description: 'Shared studio equipment split & dinner reimbursement',
    receiptItems: [{ label: 'Peer-to-Peer Transfer (Friends & Family)', price: '+$250.00' }],
  },
  {
    id: 'tx-3',
    txCode: 'PP-2026-1109-6104',
    merchant: 'Steam',
    counterpartyEmail: 'noreply@steampowered.com',
    date: 'Nov 09, 2026',
    time: '09:15 PM',
    category: 'Purchase',
    type: 'Express Checkout',
    status: 'Completed',
    paymentMethod: 'PayPal Balance',
    amount: '- $59.99',
    numericAmount: -59.99,
    fee: '$0.00',
    isPositive: false,
    brand: 'steam',
    description: 'Elden Ring: Shadow of the Erdtree Deluxe Bundle (Digital License)',
    receiptItems: [{ label: 'Digital Game License', price: '$59.99' }],
  },
  {
    id: 'tx-4',
    txCode: 'PP-2026-1108-5092',
    merchant: 'Netflix',
    counterpartyEmail: 'info@account.netflix.com',
    date: 'Nov 08, 2026',
    time: '08:00 AM',
    category: 'Subscription',
    type: 'Auto-Renewal',
    status: 'Completed',
    paymentMethod: 'Visa Signature ••9014',
    amount: '- $15.99',
    numericAmount: -15.99,
    fee: '$0.00',
    isPositive: false,
    brand: 'netflix',
    description: 'Netflix Standard 1080p Monthly Membership (Nov 08 – Dec 08, 2026)',
    receiptItems: [{ label: 'Netflix Standard Plan (Monthly)', price: '$15.99' }],
  },
  {
    id: 'tx-5',
    txCode: 'PP-2026-1106-4418',
    merchant: 'Amazon Marketplace',
    counterpartyEmail: 'payments@amazon.com',
    date: 'Nov 06, 2026',
    time: '03:27 PM',
    category: 'Purchase',
    type: 'Card Payment',
    status: 'Completed',
    paymentMethod: 'Chase Checking ••4821',
    amount: '- $84.50',
    numericAmount: -84.5,
    fee: '$0.00',
    isPositive: false,
    brand: 'paypal',
    description: 'Keychron K2 Wireless Mechanical Keyboard & Desk Mat',
    receiptItems: [
      { label: 'Keychron K2 Mechanical Keyboard', price: '$69.50' },
      { label: 'Wool Felt Desk Pad', price: '$15.00' },
    ],
  },
  {
    id: 'tx-6',
    txCode: 'PP-2026-1105-3910',
    merchant: 'Spotify Premium',
    counterpartyEmail: 'receipts@spotify.com',
    date: 'Nov 05, 2026',
    time: '07:12 AM',
    category: 'Subscription',
    type: 'Auto-Renewal',
    status: 'Completed',
    paymentMethod: 'PayPal Balance',
    amount: '- $11.99',
    numericAmount: -11.99,
    fee: '$0.00',
    isPositive: false,
    brand: 'paypal',
    description: 'Spotify Individual Monthly Subscription + Audiobooks Access',
  },
  {
    id: 'tx-7',
    txCode: 'PP-2026-1104-2890',
    merchant: 'Uber Trip',
    counterpartyEmail: 'receipts@uber.com',
    date: 'Nov 04, 2026',
    time: '06:45 PM',
    category: 'Travel',
    type: 'Express Checkout',
    status: 'Completed',
    paymentMethod: 'PayPal Balance',
    amount: '- $28.40',
    numericAmount: -28.4,
    fee: '$0.00',
    isPositive: false,
    brand: 'paypal',
    description: 'UberX Ride from Santana Row to San Jose Diridon Station',
  },
  {
    id: 'tx-8',
    txCode: 'PP-2026-1102-1944',
    merchant: 'Received from Alex Rivera',
    counterpartyEmail: 'alex.rivera@stanford.edu',
    date: 'Nov 02, 2026',
    time: '11:20 AM',
    category: 'Money Received',
    type: 'Peer Transfer',
    status: 'Completed',
    paymentMethod: 'PayPal Balance',
    amount: '+ $420.00',
    numericAmount: 420.0,
    fee: '$0.00',
    isPositive: true,
    brand: 'paypal',
    description: 'UI Engineering Sprint Consultation Milestone',
  },
  {
    id: 'tx-9',
    txCode: 'PP-2026-1101-1102',
    merchant: 'Whole Foods Market',
    counterpartyEmail: 'pos@wholefoods.com',
    date: 'Nov 01, 2026',
    time: '05:09 PM',
    category: 'Food & Dining',
    type: 'Card Payment',
    status: 'Pending',
    paymentMethod: 'Visa Signature ••9014',
    amount: '- $64.20',
    numericAmount: -64.2,
    fee: '$0.00',
    isPositive: false,
    brand: 'apple',
    description: 'In-store QR Code Grocery Checkout #409',
  },
  {
    id: 'tx-10',
    txCode: 'PP-2026-1029-0841',
    merchant: 'Steam Refund • Cyberpunk DLC',
    counterpartyEmail: 'noreply@steampowered.com',
    date: 'Oct 29, 2026',
    time: '02:50 PM',
    category: 'Purchase',
    type: 'Express Checkout',
    status: 'Refunded',
    paymentMethod: 'PayPal Balance',
    amount: '+ $29.99',
    numericAmount: 29.99,
    fee: '$0.00',
    isPositive: true,
    brand: 'steam',
    description: 'Full automated refund credited back to PayPal Balance',
  },
];

export const INITIAL_MONEY_REQUESTS: MoneyRequestItem[] = [
  { id: 'req-1', person: 'Maya Lin', email: 'maya.lin@stripe-alumni.org', amount: '$85.00', numericAmount: 85, currency: 'USD', dueDate: 'Nov 18, 2026', note: 'Figma team annual seat split', status: 'Pending', createdAt: 'Nov 10, 2026' },
  { id: 'req-2', person: 'Sarah K.', email: 'sarah.k@designstudio.io', amount: '$250.00', numericAmount: 250, currency: 'USD', dueDate: 'Nov 10, 2026', note: 'Shared studio equipment split', status: 'Paid', createdAt: 'Nov 08, 2026' },
  { id: 'req-3', person: 'Liam O’Connor', email: 'liam.oc@fintech.co', amount: '$45.00', numericAmount: 45, currency: 'USD', dueDate: 'Nov 01, 2026', note: 'Concert tickets deposit', status: 'Expired', createdAt: 'Oct 24, 2026' },
  { id: 'req-4', person: 'Priya Nair', email: 'priya.nair@cloudlabs.ai', amount: '$120.00', numericAmount: 120, currency: 'USD', dueDate: 'Oct 28, 2026', note: 'Hackathon catering share', status: 'Cancelled', createdAt: 'Oct 20, 2026' },
];
