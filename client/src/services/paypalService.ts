import type {
  PaymentMethodName,
  TransactionItem,
  MoneyRequestItem,
} from '../data/transactions';
import type { ProductPick } from '../data/products';
import { getApiBaseUrl } from './apiClient';
import { commerceService } from './commerceService';
import { orderService } from './orderService';
import type { BackendPayPalCaptureResponse, BackendProposal } from './types';

export interface ApiContractMetadata {
  mode: 'proxy' | 'live';
  baseUrl: string;
}

export function getApiMetadata(): ApiContractMetadata {
  const baseUrl = getApiBaseUrl();
  return {
    mode: baseUrl ? 'live' : 'proxy',
    baseUrl: baseUrl || '/api (proxied to Next.js backend)',
  };
}

export const paypalOrderService = {
  createOrder: orderService.createOrder,
  captureOrder: orderService.captureOrder,
  getOrder: orderService.getOrder,
  listOrders: orderService.listOrders,
};

export function buildTransactionCode(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PP-2026-1111-${rand}`;
}

export async function executePayPalTransferOrder(params: {
  recipientName: string;
  recipientEmail: string;
  amount: number;
  currency: string;
  source: PaymentMethodName;
  note?: string;
}): Promise<{ tx: TransactionItem; capture: BackendPayPalCaptureResponse }> {
  const order = await orderService.createOrder({
    amount: params.amount,
    currency: params.currency,
    description: `Transfer to ${params.recipientName}${params.note ? `: ${params.note}` : ''}`,
    customerEmail: params.recipientEmail,
  });

  const capture = await orderService.captureOrder(order.id);
  const feeAmount = params.source.includes('Visa')
    ? +(params.amount * 0.029 + 0.3).toFixed(2)
    : 0;

  const tx: TransactionItem = {
    id: order.id,
    txCode: capture.captureId || order.id,
    merchant: `Sent to ${params.recipientName}`,
    counterpartyEmail: params.recipientEmail,
    date: new Date(capture.capturedAt || Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }),
    time: new Date(capture.capturedAt || Date.now()).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    category: 'Money Sent',
    type: 'Peer Transfer',
    status: 'Completed',
    paymentMethod: params.source,
    amount: `- $${params.amount.toFixed(2)}`,
    numericAmount: -params.amount,
    fee: `$${feeAmount.toFixed(2)}`,
    isPositive: false,
    brand: 'paypal',
    description:
      params.note?.trim() ||
      `PayPal Sandbox Order (${order.internalReference}) to ${params.recipientName}`,
    paypalOrderId: order.id,
    paypalCaptureId: capture.captureId,
    internalReference: order.internalReference,
    sourceOrigin: 'backend',
    receiptItems: [
      { label: `PayPal Transfer to ${params.recipientName}`, price: `$${params.amount.toFixed(2)}` },
    ],
  };

  return { tx, capture };
}

export async function executeGovernedProductCheckout(params: {
  product: ProductPick;
  quantity: number;
  fundingLabel: PaymentMethodName | 'PayPal Pay in 4';
  existingProposalId?: string;
}): Promise<{
  proposal: BackendProposal;
  capture: BackendPayPalCaptureResponse;
  tx: TransactionItem;
}> {
  const proposal = params.existingProposalId
    ? await commerceService.getProposal(params.existingProposalId)
    : await commerceService.createProposal({
        productId: params.product.id,
        quantity: params.quantity,
      });

  const confirmed = await commerceService.confirmProposal(proposal.id);
  const capture = await orderService.captureOrder(confirmed.paypalOrderId);
  const authoritativeTotal = Number(proposal.totalAmount ?? capture.amount?.value ?? 0);

  const mappedMethod: PaymentMethodName =
    params.fundingLabel === 'Chase Checking ••4821'
      ? 'Chase Checking ••4821'
      : params.fundingLabel === 'Visa Signature ••9014'
      ? 'Visa Signature ••9014'
      : 'PayPal Balance';

  const brand = params.product.brand.toLowerCase() === 'apple' ? 'apple' : 'paypal';

  const tx: TransactionItem = {
    id: confirmed.paypalOrderId,
    txCode: capture.captureId || confirmed.paypalOrderId,
    merchant: `${params.product.brand} • ${params.product.name}`,
    counterpartyEmail: `orders@${params.product.brand.toLowerCase().replace(/\s+/g, '')}.com`,
    date: new Date(capture.capturedAt || Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }),
    time: new Date(capture.capturedAt || Date.now()).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    category: 'Purchase',
    type: 'Express Checkout',
    status: 'Completed',
    paymentMethod: mappedMethod,
    amount: `- $${authoritativeTotal.toFixed(2)}`,
    numericAmount: -authoritativeTotal,
    fee: '$0.00',
    isPositive: false,
    brand,
    description: `PayPal Governed Checkout (${confirmed.internalReference}) — ${params.fundingLabel} • Qty ${proposal.quantity}`,
    paypalOrderId: confirmed.paypalOrderId,
    paypalCaptureId: capture.captureId,
    internalReference: confirmed.internalReference,
    sourceOrigin: 'backend',
    receiptItems: [
      {
        label: `${params.product.name} × ${proposal.quantity}`,
        price: `$${authoritativeTotal.toFixed(2)}`,
      },
    ],
  };

  return { proposal: confirmed.proposal, capture, tx };
}

export function createDepositTransaction(params: {
  amount: number;
  sourceLabel: string;
  timingLabel: string;
}): TransactionItem {
  const mappedMethod: PaymentMethodName = params.sourceLabel.includes('Visa')
    ? 'Visa Signature ••9014'
    : 'Chase Checking ••4821';
  return {
    id: `tx-${Date.now()}`,
    txCode: buildTransactionCode(),
    merchant: `Added from ${params.sourceLabel}`,
    counterpartyEmail: 'ach-transfer@paypal.com',
    date: 'Nov 11, 2026',
    time: 'Just now',
    category: 'Deposit',
    type: 'Direct Deposit',
    status: 'Completed',
    paymentMethod: mappedMethod,
    amount: `+ $${params.amount.toFixed(2)}`,
    numericAmount: params.amount,
    fee: '$0.00',
    isPositive: true,
    brand: 'paypal',
    description: `Demo balance deposit via ${params.sourceLabel} (${params.timingLabel})`,
    sourceOrigin: 'demo',
  };
}

export function createMoneyRequestRecord(params: {
  person: string;
  email: string;
  amount: number;
  currency: string;
  dueDate: string;
  note: string;
}): MoneyRequestItem {
  return {
    id: `req-${Date.now()}`,
    person: params.person,
    email: params.email,
    amount: `$${params.amount.toFixed(2)}`,
    numericAmount: params.amount,
    currency: params.currency,
    dueDate: params.dueDate,
    note: params.note,
    status: 'Pending',
    createdAt: 'Nov 11, 2026',
  };
}

export function exportTransactionsCsv(rows: TransactionItem[]): void {
  const headers = ['ID', 'Code', 'Date', 'Time', 'Merchant', 'Category', 'Type', 'Method', 'Status', 'Amount'];
  const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((tx) =>
      [
        tx.id,
        tx.txCode,
        tx.date,
        tx.time,
        tx.merchant,
        tx.category,
        tx.type,
        tx.paymentMethod,
        tx.status,
        tx.amount,
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'paypal-transactions.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
