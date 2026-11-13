import { PayPalConfig, PayPalTokenResponse } from "./types";
import { PayPalApiError, normalizePayPalError } from "./errors";
import { hasValidPayPalCredentials } from "../config/env";
import { Logger } from "../observability/logger";

const log = new Logger("PayPalHttpClient");

export interface PayPalRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, any>;
  headers?: Record<string, string>;
  timeoutMs?: number;
  idempotencyKey?: string;
  requestId?: string;
}

const globalForMockAmounts = globalThis as unknown as {
  __paypalMockOrderAmounts?: Map<string, { value: string; currency_code: string }>;
};
const sharedMockOrderAmounts =
  globalForMockAmounts.__paypalMockOrderAmounts ||
  (globalForMockAmounts.__paypalMockOrderAmounts = new Map<
    string,
    { value: string; currency_code: string }
  >());

export class PayPalHttpClient {
  private config: PayPalConfig;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private isMockMode: boolean = false;
  private mockIdempotencyCache: Map<string, any> = new Map();
  private mockOrderAmounts: Map<string, { value: string; currency_code: string }> =
    sharedMockOrderAmounts;

  constructor(config: PayPalConfig) {
    this.config = config;
    const requestedProvider = (config.provider || process.env.PAYPAL_PROVIDER || "auto").toLowerCase();
    const hasCredentials = hasValidPayPalCredentials(config.clientId, config.clientSecret);

    if (process.env.PAYPAL_MOCK_CLIENT === "true" || requestedProvider === "mock") {
      this.isMockMode = true;
    } else if (requestedProvider === "paypal") {
      this.isMockMode = false;
    } else {
      // "auto": use real PayPal Sandbox whenever non-placeholder credentials are present
      this.isMockMode = !hasCredentials;
    }
  }

  public getBaseUrl(): string {
    return this.config.environment === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  }

  public getEnvironment(): string {
    return this.config.environment;
  }

  public getProviderMode(): "mock" | "sandbox" | "live" {
    return this.isMockMode ? "mock" : this.config.environment;
  }

  public isUsingMockFallback(): boolean {
    return this.isMockMode;
  }

  public setMockMode(enabled: boolean): void {
    this.isMockMode = enabled;
  }

  public invalidateToken(): void {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Retrieves OAuth2 Access Token using Client Credentials grant.
   * Caches token until 60 seconds before expiration.
   */
  async getAccessToken(timeoutMs: number = 10000): Promise<string> {
    if (this.isMockMode) {
      return "mock_sandbox_access_token_" + Date.now();
    }

    if (!hasValidPayPalCredentials(this.config.clientId, this.config.clientSecret)) {
      throw new PayPalApiError(
        503,
        "PAYPAL_CREDENTIALS_MISSING",
        "PayPal credentials are not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET."
      );
    }

    const now = Date.now();
    if (this.cachedToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedToken;
    }

    log.debug("Requesting fresh PayPal OAuth2 access token", {
      environment: this.config.environment,
    });
    const authString = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.getBaseUrl()}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: "grant_type=client_credentials",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new PayPalApiError(
          response.status,
          errorData.error || "AUTHENTICATION_FAILURE",
          "Failed to authenticate with PayPal Sandbox.",
          errorData.error_description || "Invalid client credentials"
        );
      }

      const data = (await response.json()) as PayPalTokenResponse;
      if (!data?.access_token) {
        throw new PayPalApiError(
          502,
          "INVALID_TOKEN_RESPONSE",
          "PayPal authentication endpoint returned an invalid token payload."
        );
      }
      this.cachedToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      return this.cachedToken;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        throw new PayPalApiError(
          504,
          "PAYPAL_TIMEOUT",
          `PayPal authentication timed out after ${timeoutMs}ms.`
        );
      }
      log.error("Failed to retrieve PayPal access token", {
        environment: this.config.environment,
        code: err?.errorCode || err?.code || "OAUTH_ERROR",
      });
      throw normalizePayPalError(err);
    }
  }

  /**
   * Performs an authenticated HTTP request to PayPal API with error normalization,
   * timeout handling, idempotency header, and controlled retry policy.
   */
  async request<T>(
    endpoint: string,
    options: PayPalRequestOptions = {}
  ): Promise<T> {
    const {
      method = "GET",
      body,
      headers = {},
      timeoutMs = 15000,
      idempotencyKey,
      requestId,
    } = options;

    if (this.isMockMode) {
      return this.handleMockRequest<T>(endpoint, method, body, idempotencyKey);
    }

    // Attach PayPal-Request-Id header for idempotent operations
    const requestHeaders: Record<string, string> = { ...headers };
    if (idempotencyKey) {
      requestHeaders["PayPal-Request-Id"] = idempotencyKey;
    }
    if (requestId) {
      requestHeaders["PayPal-Client-Metadata-Id"] = requestId;
    }

    // Execute with retry logic for transient/auth errors
    let attempt = 0;
    const maxAttempts = idempotencyKey || method === "GET" ? 2 : 1;

    while (attempt < maxAttempts) {
      attempt++;
      const token = await this.getAccessToken();
      const url = `${this.getBaseUrl()}${endpoint}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        log.debug("Executing PayPal API request", { method, endpoint, attempt });
        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            ...requestHeaders,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // If 401 Unauthorized, token might have expired on server side; invalidate and retry once
        if (response.status === 401 && attempt < maxAttempts) {
          log.warn("Received 401 Unauthorized from PayPal; refreshing token and retrying");
          this.invalidateToken();
          continue;
        }

        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");
        const responseData = isJson ? await response.json() : await response.text();

        if (!response.ok) {
          // If server error (5xx) and request is idempotent, retry once
          if (response.status >= 500 && attempt < maxAttempts) {
            log.warn("Received 5xx from PayPal; retrying idempotent request", {
              status: response.status,
            });
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }

          throw new PayPalApiError(
            response.status,
            responseData?.name || "PAYPAL_API_ERROR",
            responseData?.message || "PayPal API operation failed",
            JSON.stringify(responseData),
            responseData?.details
          );
        }

        return responseData as T;
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (err.name === "AbortError") {
          throw new PayPalApiError(
            504,
            "PAYPAL_TIMEOUT",
            `PayPal API request timed out after ${timeoutMs}ms.`
          );
        }

        // Network failure on idempotent request: retry once
        if (attempt < maxAttempts && (err.code === "ECONNRESET" || err.code === "ETIMEDOUT")) {
          log.warn("Transient network error connecting to PayPal; retrying", { error: err.message });
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        throw normalizePayPalError(err);
      }
    }

    throw new PayPalApiError(
      500,
      "PAYPAL_RETRY_EXHAUSTED",
      "PayPal API request failed after retry attempts."
    );
  }

  /**
   * Deterministic mock handler for offline development and test suites.
   */
  private handleMockRequest<T>(
    endpoint: string,
    method: string,
    body?: Record<string, any>,
    idempotencyKey?: string
  ): T {
    log.info("[MOCK PAYPAL] Simulating request", { method, endpoint, idempotencyKey });

    if (idempotencyKey && this.mockIdempotencyCache.has(idempotencyKey)) {
      log.info("[MOCK PAYPAL] Returning cached response for idempotencyKey", { idempotencyKey });
      return this.mockIdempotencyCache.get(idempotencyKey) as T;
    }

    let response: any = {};

    // Mock Order Creation: POST /v2/checkout/orders
    if (endpoint === "/v2/checkout/orders" && method === "POST") {
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      const orderId = `MOCK-ORDER-${Date.now().toString(36).toUpperCase()}-${rand}`;
      const amount = body?.purchase_units?.[0]?.amount || {
        value: "100.00",
        currency_code: "USD",
      };
      this.mockOrderAmounts.set(orderId, amount);
      response = {
        id: orderId,
        status: "CREATED",
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: body?.purchase_units?.[0]?.reference_id || "default",
            amount,
          },
        ],
        links: [
          {
            href: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
            rel: "approve",
            method: "GET",
          },
          {
            href: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`,
            rel: "self",
            method: "GET",
          },
        ],
        create_time: new Date().toISOString(),
      };
    }

    // Mock Order Capture: POST /v2/checkout/orders/{id}/capture
    else if (endpoint.startsWith("/v2/checkout/orders/") && endpoint.endsWith("/capture")) {
      const parts = endpoint.split("/");
      const orderId = parts[parts.length - 2];
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      const captureId = `MOCK-CAP-${Date.now().toString(36).toUpperCase()}-${rand}`;
      const capturedAmount = this.mockOrderAmounts.get(orderId) || {
        value: "100.00",
        currency_code: "USD",
      };
      response = {
        id: orderId,
        status: "COMPLETED",
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: captureId,
                  status: "COMPLETED",
                  amount: capturedAmount,
                  create_time: new Date().toISOString(),
                  update_time: new Date().toISOString(),
                },
              ],
            },
          },
        ],
        payer: {
          email_address: "buyer@sandbox.example.com",
          payer_id: "SANDBOX_PAYER_123",
          name: { given_name: "Sandbox", surname: "Buyer" },
        },
      };
    }

    // Mock Order Lookup: GET /v2/checkout/orders/{id}
    else if (endpoint.startsWith("/v2/checkout/orders/") && method === "GET") {
      const parts = endpoint.split("/");
      const orderId = parts[parts.length - 1];
      const amount = this.mockOrderAmounts.get(orderId) || {
        value: "100.00",
        currency_code: "USD",
      };
      response = {
        id: orderId,
        status: "CREATED",
        intent: "CAPTURE",
        purchase_units: [{ amount }],
        create_time: new Date().toISOString(),
      };
    }

    // Mock Webhook Verification: POST /v1/notifications/verify-webhook-signature
    else if (endpoint === "/v1/notifications/verify-webhook-signature") {
      const isValid = body?.transmission_sig !== "invalid_signature";
      response = {
        verification_status: isValid ? "SUCCESS" : "FAILURE",
      };
    }

    // Mock Capture Details Lookup: GET /v2/payments/captures/{id}
    else if (endpoint.startsWith("/v2/payments/captures/") && method === "GET") {
      const parts = endpoint.split("/");
      const captureId = parts[parts.length - 1];
      response = {
        id: captureId,
        status: "COMPLETED",
        amount: {
          value: "100.00",
          currency_code: "USD",
        },
        final_capture: true,
        create_time: new Date().toISOString(),
        update_time: new Date().toISOString(),
      };
    }

    if (idempotencyKey) {
      this.mockIdempotencyCache.set(idempotencyKey, response);
    }

    return response as T;
  }
}
