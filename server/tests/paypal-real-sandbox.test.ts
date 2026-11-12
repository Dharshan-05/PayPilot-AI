import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PayPalHttpClient } from "../src/server/paypal/client";
import { payPalService } from "../src/server/paypal/service";
import { getConfig, hasValidPayPalCredentials } from "../src/server/config/env";
import { PayPalApiError } from "../src/server/paypal/errors";

describe("Phase 10 — PayPal Provider Mode & Real Sandbox Verification", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Credential Detection & Mode Selection", () => {
    it("should recognize placeholder credentials as invalid for live Sandbox requests", () => {
      expect(hasValidPayPalCredentials("sandbox_client_id_placeholder", "sandbox_client_secret_placeholder")).toBe(false);
      expect(hasValidPayPalCredentials("mock_client_id", "mock_client_secret")).toBe(false);
      expect(hasValidPayPalCredentials("your_paypal_sandbox_client_id_here", "your_paypal_sandbox_client_secret_here")).toBe(false);
      expect(hasValidPayPalCredentials("", "")).toBe(false);
      expect(hasValidPayPalCredentials("AQk...", "")).toBe(false);
    });

    it("should recognize valid non-placeholder Sandbox credentials", () => {
      expect(hasValidPayPalCredentials("AStestclientid1234567890", "ELtestclientsecret1234567890")).toBe(true);
    });

    it("should fallback to mock mode in 'auto' when credentials are placeholders", () => {
      const client = new PayPalHttpClient({
        environment: "sandbox",
        provider: "auto",
        clientId: "sandbox_client_id_placeholder",
        clientSecret: "sandbox_client_secret_placeholder",
      });
      expect(client.isUsingMockFallback()).toBe(true);
      expect(client.getProviderMode()).toBe("mock");
    });

    it("should select real sandbox mode in 'auto' when non-placeholder credentials exist", () => {
      const client = new PayPalHttpClient({
        environment: "sandbox",
        provider: "auto",
        clientId: "AStestclientid1234567890",
        clientSecret: "ELtestclientsecret1234567890",
      });
      expect(client.isUsingMockFallback()).toBe(false);
      expect(client.getProviderMode()).toBe("sandbox");
      expect(client.getBaseUrl()).toBe("https://api-m.sandbox.paypal.com");
    });

    it("should force mock mode when provider='mock' even if real credentials exist", () => {
      const client = new PayPalHttpClient({
        environment: "sandbox",
        provider: "mock",
        clientId: "AStestclientid1234567890",
        clientSecret: "ELtestclientsecret1234567890",
      });
      expect(client.isUsingMockFallback()).toBe(true);
      expect(client.getProviderMode()).toBe("mock");
    });

    it("should force sandbox mode when provider='paypal' even with placeholder credentials", () => {
      const client = new PayPalHttpClient({
        environment: "sandbox",
        provider: "paypal",
        clientId: "placeholder",
        clientSecret: "placeholder",
      });
      expect(client.isUsingMockFallback()).toBe(false);
      expect(client.getProviderMode()).toBe("sandbox");
    });
  });

  describe("2. Real Sandbox OAuth2 Flow & Error Handling (Non-Mock)", () => {
    it("should fail gracefully with PAYPAL_CREDENTIALS_MISSING if attempting real call with placeholders", async () => {
      const client = new PayPalHttpClient({
        environment: "sandbox",
        provider: "paypal",
        clientId: "sandbox_client_id_placeholder",
        clientSecret: "sandbox_client_secret_placeholder",
      });

      await expect(client.getAccessToken()).rejects.toThrowError(PayPalApiError);
      try {
        await client.getAccessToken();
      } catch (err: any) {
        expect(err.errorCode).toBe("PAYPAL_CREDENTIALS_MISSING");
        expect(err.statusCode).toBe(503);
      }
    });

    it("should execute real OAuth2 POST request against https://api-m.sandbox.paypal.com/v1/oauth2/token", async () => {
      const client = new PayPalHttpClient({
        environment: "sandbox",
        provider: "paypal",
        clientId: "CLIENT_ID_TEST",
        clientSecret: "CLIENT_SECRET_TEST",
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "A21AAK_real_mocked_token",
          token_type: "Bearer",
          app_id: "APP-80W284485P519543T",
          expires_in: 32400,
        }),
      } as any);

      const token = await client.getAccessToken();
      expect(token).toBe("A21AAK_real_mocked_token");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
      expect((init as any).method).toBe("POST");
      expect((init as any).headers["Authorization"]).toContain("Basic ");
      expect((init as any).body).toBe("grant_type=client_credentials");
    });

    it("should normalize PayPal 401 INVALID_CLIENT credentials failure cleanly without leaking secret", async () => {
      const client = new PayPalHttpClient({
        environment: "sandbox",
        provider: "paypal",
        clientId: "BAD_CLIENT_ID",
        clientSecret: "SUPER_SECRET_VALUE",
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: "invalid_client",
          error_description: "Client Authentication failed",
        }),
      } as any);

      try {
        await client.getAccessToken();
        expect.unreachable("Should have thrown");
      } catch (err: any) {
        expect(err).toBeInstanceOf(PayPalApiError);
        expect(err.statusCode).toBe(401);
        expect(err.message).not.toContain("SUPER_SECRET_VALUE");
      }
    });
  });

  describe("3. Real Sandbox Orders v2 Request Formatting (Non-Mock)", () => {
    it("should format Orders v2 payload and attach Bearer token + PayPal-Request-Id", async () => {
      const client = new PayPalHttpClient({
        environment: "sandbox",
        provider: "paypal",
        clientId: "CLIENT_ID_REAL",
        clientSecret: "CLIENT_SECRET_REAL",
      });

      // Mock OAuth token response
      vi.spyOn(client, "getAccessToken").mockResolvedValue("A21_SANDBOX_ACCESS_TOKEN");

      // Mock Orders API response
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({
          id: "5O190127TN364715T",
          status: "CREATED",
          intent: "CAPTURE",
          purchase_units: [{ amount: { currency_code: "USD", value: "89.99" } }],
          links: [{ href: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T", rel: "approve" }],
        }),
      } as any);

      const res = await client.request<any>("/v2/checkout/orders", {
        method: "POST",
        body: {
          intent: "CAPTURE",
          purchase_units: [{ amount: { currency_code: "USD", value: "89.99" } }],
        },
        idempotencyKey: "REQ-ORD-12345",
      });

      expect(res.id).toBe("5O190127TN364715T");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
      expect((init as any).headers["Authorization"]).toBe("Bearer A21_SANDBOX_ACCESS_TOKEN");
      expect((init as any).headers["PayPal-Request-Id"]).toBe("REQ-ORD-12345");
    });
  });
});
