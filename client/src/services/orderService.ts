import type { PaymentMethodName, TransactionItem, TransactionStatus } from '../data/transactions';
import { apiClient, type RequestOptions } from './apiClient';
import type {
  BackendOrderRecord,
  BackendPayPalCaptureResponse,
  BackendPayPalOrderResponse,
} from './types';

function mapOrderStatus(status: string): TransactionStatus {
  switch (status.toUpperCase()) {
    case 'CAPTURED':
    case 'COMPLETED':
      return 'Completed';
    case 'REFUNDED':
      return 'Refunded';
    case 'FAILED':
    case 'CANCELLED':
      return 'Failed';
    default:
      return 'Pending';
  }
}

function formatBackendDateParts(iso: string): { date: string; time: string } {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) {
    return { date: 'Nov 11, 2026', time: 'Just now' };
  }
  const date = dt.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const time = dt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date, time };
}

export function mapBackendOrderToTransaction(
  order: BackendOrderRecord,
  preferredMethod: PaymentMethodName = 'PayPal Balance'
): TransactionItem {
  const { date, time } = formatBackendDateParts(order.createdAt);
  const absAmount = Math.abs(Number(order.amount) || 0);
  const productName = order.proposal?.product?.name;
  const merchantLabel = productName
    ? `PayPal Checkout • ${productName}`
    : order.description || `PayPal Order ${order.internalReference}`;

  const receiptItems = order.proposal?.product
    ? [
        {
          label: `${order.proposal.product.name} × ${order.proposal.quantity}`,
          price: `$${order.proposal.totalAmount.toFixed(2)}`,
        },
      ]
    : [{ label: merchantLabel, price: `$${absAmount.toFixed(2)}` }];

  return {
    id: order.paypalOrderId || order.id,
    txCode: order.paypalCaptureId || order.paypalOrderId || order.internalReference,
    merchant: merchantLabel,
    counterpartyEmail: order.customerEmail || 'merchant@sandbox.paypal.com',
    date,
    time,
    category: order.proposal ? 'Purchase' : 'Money Sent',
    type: order.proposal ? 'Express Checkout' : 'Peer Transfer',
    status: mapOrderStatus(order.status),
    paymentMethod: preferredMethod,
    amount: `- $${absAmount.toFixed(2)}`,
    numericAmount: -absAmount,
    fee: '$0.00',
    isPositive: false,
    brand: 'paypal',
    description:
      order.description ||
      `PayPal Sandbox Order (${order.internalReference}) — Status: ${order.status}`,
    receiptItems,
    paypalOrderId: order.paypalOrderId || undefined,
    paypalCaptureId: order.paypalCaptureId || undefined,
    internalReference: order.internalReference,
    sourceOrigin: 'backend',
  };
}

export const orderService = {
  async listOrders(limit: number = 25, options?: RequestOptions): Promise<TransactionItem[]> {
    const { data } = await apiClient.get<BackendOrderRecord[]>(
      `/api/orders?limit=${limit}`,
      options
    );
    return data.map((o) => mapBackendOrderToTransaction(o));
  },

  async createOrder(
    params: {
      amount: number;
      currency?: string;
      description?: string;
      customerEmail?: string;
      internalReference?: string;
    },
    options?: RequestOptions
  ): Promise<BackendPayPalOrderResponse> {
    const { data } = await apiClient.post<BackendPayPalOrderResponse>(
      '/api/orders',
      {
        amount: params.amount,
        currency: params.currency || 'USD',
        description: params.description,
        ...(params.customerEmail ? { customerEmail: params.customerEmail } : {}),
        ...(params.internalReference ? { internalReference: params.internalReference } : {}),
      },
      options
    );
    return data;
  },

  async getOrder(orderId: string, options?: RequestOptions): Promise<BackendOrderRecord> {
    const { data } = await apiClient.get<BackendOrderRecord>(
      `/api/orders/${encodeURIComponent(orderId)}`,
      options
    );
    return data;
  },

  async captureOrder(
    orderId: string,
    options?: RequestOptions
  ): Promise<BackendPayPalCaptureResponse> {
    const { data } = await apiClient.post<BackendPayPalCaptureResponse>(
      `/api/orders/${encodeURIComponent(orderId)}/capture`,
      {},
      options
    );
    return data;
  },
};
