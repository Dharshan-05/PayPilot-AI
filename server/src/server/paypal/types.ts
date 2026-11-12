export type PayPalEnvironment = "sandbox" | "live";
export type PayPalProviderMode = "auto" | "paypal" | "mock";

export interface PayPalConfig {
  environment: PayPalEnvironment;
  provider?: PayPalProviderMode;
  clientId: string;
  clientSecret: string;
  webhookId?: string;
}

export interface PayPalTokenResponse {
  scope: string;
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number;
  nonce: string;
}

export interface CreateOrderParams {
  internalReference: string;
  amount: number;
  currency: string;
  description?: string;
  customerEmail?: string;
  returnUrl?: string;
  cancelUrl?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitAmount: number;
  }>;
}

export interface PayPalOrderResponse {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  intent: "CAPTURE";
  internalReference: string;
  amount: {
    value: string;
    currencyCode: string;
  };
  approvalLink?: string;
  createdAt: string;
}

export interface PayPalCaptureResponse {
  captureId: string;
  orderId: string;
  status: "COMPLETED" | "DECLINED" | "PARTIALLY_REFUNDED" | "PENDING" | "REFUNDED" | "FAILED";
  amount: {
    value: string;
    currencyCode: string;
  };
  sellerProtection?: {
    status: string;
  };
  payer?: {
    emailAddress?: string;
    payerId?: string;
    name?: string;
  };
  createTime: string;
  updateTime: string;
}

export interface PayPalWebhookHeaders {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
}

export interface PayPalVerifyWebhookPayload {
  auth_algo: string;
  cert_url: string;
  transmission_id: string;
  transmission_sig: string;
  transmission_time: string;
  webhook_id: string;
  webhook_event: Record<string, any>;
}

export interface PayPalWebhookEvent {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  event_type: string;
  summary: string;
  resource: Record<string, any>;
  links: Array<{ href: string; rel: string; method: string }>;
}
