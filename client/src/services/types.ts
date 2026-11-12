export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId?: string;
  public readonly details?: unknown;
  public readonly isNetworkError: boolean;
  public readonly isTimeout: boolean;

  constructor(params: {
    message: string;
    status: number;
    code: string;
    requestId?: string;
    details?: unknown;
    isNetworkError?: boolean;
    isTimeout?: boolean;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId;
    this.details = params.details;
    this.isNetworkError = Boolean(params.isNetworkError);
    this.isTimeout = Boolean(params.isTimeout);
  }
}

export interface BackendProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  inventory: number;
  isAvailable: boolean;
  metadata?: string | null;
  createdAt?: string;
  updatedAt?: string;
  attributes?: {
    brand?: string;
    model?: string;
    category?: string;
    features?: string[];
    useCases?: string[];
    rating?: number;
    reviewCount?: number;
    warranty?: string;
    custom?: Record<string, unknown>;
  };
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  qualityScore?: number;
}

export interface BackendRankedProduct extends BackendProduct {
  overallScore?: number;
  badge?: string;
  whyRecommended?: string[];
  tradeoffs?: string[];
}

export interface BackendSearchEntry {
  product: BackendProduct;
  evidence?: {
    overallScore?: number;
    badge?: string;
    whyRecommended?: string[];
    tradeoffs?: string[];
  };
}

export interface BackendSearchResponse {
  results: Array<BackendSearchEntry | BackendRankedProduct>;
  totalCount?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  queryMetadata?: {
    appliedFilters?: Record<string, unknown>;
    provider?: string;
    searchProvider?: string;
    mode?: string;
    searchMode?: string;
    latencyMs?: number;
  };
}

export interface BackendProposal {
  id: string;
  proposalNumber: string;
  productId: string;
  product?: BackendProduct;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  currency: string;
  status:
    | 'DRAFT'
    | 'PENDING_CONFIRMATION'
    | 'CONFIRMED'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'FAILED';
  expiresAt: string;
  confirmedAt?: string | null;
  paymentOrderId?: string | null;
  metadata?: string | null;
  userId?: string | null;
  conversationId?: string | null;
  createdAt: string;
  updatedAt?: string;
  isExpired?: boolean;
}

export interface BackendConfirmProposalResult {
  proposal: BackendProposal;
  paypalOrderId: string;
  paypalApprovalUrl?: string;
  internalReference: string;
}

export interface BackendPayPalOrderResponse {
  id: string;
  status: string;
  intent: string;
  internalReference: string;
  amount: {
    value: string;
    currencyCode: string;
  };
  approvalLink?: string;
  createdAt: string;
}

export interface BackendPayPalCaptureResponse {
  orderId: string;
  captureId: string;
  status: string;
  internalReference: string;
  amount: {
    value: string;
    currencyCode: string;
  };
  capturedAt: string;
  isIdempotentReplay?: boolean;
}

export interface BackendOrderRecord {
  id: string;
  internalReference: string;
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  amount: number;
  currency: string;
  status: string;
  customerEmail?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  proposal?: {
    id: string;
    proposalNumber: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    status: string;
    product?: {
      id: string;
      sku: string;
      name: string;
      category: string;
      price: number;
      currency: string;
    } | null;
  } | null;
}

export interface BackendAgentChatResponse {
  message: string;
  intent?: {
    intent: string;
    category?: string;
    productQuery?: string;
    quantity?: number;
    budget?: { amount: number; currency: string };
    confidence?: number;
    proposedAction?: string;
    reasoningSummary?: string;
    warnings?: string[];
  };
  products?: BackendProduct[];
  proposal?: BackendProposal | null;
  actionRequired?: string;
  status: string;
  requestId: string;
  isMock?: boolean;
  evidence?: Array<{
    productId: string;
    productName: string;
    sku: string;
    overallScore: number;
    badge?: string;
    whyRecommended?: string[];
    tradeoffs?: string[];
  }>;
}

export interface BackendIntentResponse {
  requestId: string;
  intent?: string;
  authorizedAction?: string;
  policyDecision?: {
    allowed: boolean;
    reason?: string;
    violations?: string[];
  };
  aiResponse?: {
    summary?: string;
    suggestedAction?: string;
  };
  validation?: {
    isValid?: boolean;
    sanitizedParameters?: {
      amount?: number;
      currency?: string;
      description?: string;
    };
  };
}

export interface BackendAgentCapability {
  id: string;
  name: string;
  operation: string;
  description: string;
  category: string;
  riskLevel: string;
  allowedCallerTypes: string[];
  requiresConfirmation?: boolean;
  requiresHumanConfirmation?: boolean;
  enabled: boolean;
}

export interface BackendAuditLog {
  id: string;
  requestId: string;
  operation: string;
  provider: string;
  model: string;
  status: string;
  latencyMs?: number | null;
  promptSummary?: string | null;
  responseSummary?: string | null;
  createdAt: string;
}

export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  database: string;
  search?: {
    provider: string;
    status: string;
    documentCount?: number;
    latencyMs?: number;
  };
  agentContext?: {
    provider: string;
    status: string;
    capabilityCount?: number;
    details?: {
      mode?: string;
      message?: string;
    };
  };
  diagnostics?: {
    NODE_ENV: string;
    PAYPAL?: {
      ENVIRONMENT: string;
      WEBHOOK_ID_CONFIGURED: boolean;
    };
    AI?: {
      PROVIDER: string;
      MODEL: string;
    };
    BUSINESS_RULES?: {
      MAX_TRANSACTION_AMOUNT: number;
      ALLOWED_CURRENCIES: string[];
    };
  };
}
