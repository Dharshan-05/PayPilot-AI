import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { payPalService } from "../src/server/paypal/service";
import { PayPalHttpClient } from "../src/server/paypal/client";
import { PayPalApiError } from "../src/server/paypal/errors";
import { getConfig, validatePayPalEnvironment, resetConfigCache } from "../src/server/config/env";
import { POST as handleOrdersPost, GET as handleOrdersGet } from "../src/app/api/orders/route";
import { POST as handlePaypalOrdersPost, GET as handlePaypalOrdersGet } from "../src/app/api/paypal/orders/route";
import { POST as handleCapturePost } from "../src/app/api/orders/[orderId]/capture/route";
import { POST as handlePaypalCapturePost } from "../src/app/api/paypal/orders/[orderId]/capture/route";
import { GET as handleOrderDetailGet } from "../src/app/api/orders/[orderId]/route";
import { GET as handlePaypalOrderDetailGet } from "../src/app/api/paypal/orders/[orderId]/route";
import { prisma } from "../src/server/db/client";

describe("PayPal API Integration & Security Specification (15 Verifications)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfigCache();
  });

  // 1. Missing PayPal credentials
  it("1. Missing PayPal credentials: should fail safely with clear error and zero secret exposure", async () => {
    const check = validatePayPalEnvironment({
      PAYPAL_CLIENT_ID: "sandbox_client_id_placeholder",
      PAYPAL_CLIENT_SECRET: "sandbox_client_secret_placeholder",
    } as any);

    expect(check.configured).toBe(false);
    expect(check.message).toBe("PayPal credentials are not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");

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
      expect(err.message).toBe("PayPal credentials are not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
    }
  });

  // 2. OAuth token success
  it("2. OAuth token success: should request OAuth token server-side and cache until near expiration", async () => {
    const client = new PayPalHttpClient({
      environment: "sandbox",
      provider: "paypal",
      clientId: "AStest_client_id_valid_12345",
      clientSecret: "ELtest_client_secret_valid_12345",
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "A21AA_test_token_success_abc",
        token_type: "Bearer",
        app_id: "APP-TEST",
        expires_in: 3600,
      }),
    } as any);

    const token1 = await client.getAccessToken();
    expect(token1).toBe("A21AA_test_token_success_abc");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    expect((init as any).method).toBe("POST");
    expect((init as any).headers["Authorization"]).toContain("Basic ");

    // Subsequent call should hit memory cache without re-fetching
    const token2 = await client.getAccessToken();
    expect(token2).toBe("A21AA_test_token_success_abc");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // 3. OAuth authentication failure
  it("3. OAuth authentication failure: should handle 401 invalid_client without leaking secrets", async () => {
    const secretValue = "SUPER_SECRET_PAYPAL_VALUE_XYZ";
    const client = new PayPalHttpClient({
      environment: "sandbox",
      provider: "paypal",
      clientId: "BAD_CLIENT_ID",
      clientSecret: secretValue,
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
      expect(["AUTHENTICATION_FAILURE", "invalid_client"]).toContain(err.errorCode);
      expect(err.message).not.toContain(secretValue);
    }
  });

  // 4. Create-order success
  it("4. Create-order success: should create order with server-controlled amount and return sanitized info", async () => {
    const ref = `TEST-ORD-${Date.now()}`;
    const order = await payPalService.createPayPalOrder({
      internalReference: ref,
      amount: 45.0,
      currency: "USD",
      description: "Test Purchase Order",
    });

    expect(order.id).toBeTruthy();
    expect(order.status).toBe("CREATED");
    expect(order.intent).toBe("CAPTURE");
    expect(order.internalReference).toBe(ref);
    expect(order.amount.value).toBe("45.00");
    expect(order.amount.currencyCode).toBe("USD");
    expect((order as any).clientSecret).toBeUndefined();
    expect((order as any).access_token).toBeUndefined();

    // Verify stored in DB
    const dbOrder = await prisma.paymentOrder.findUnique({
      where: { internalReference: ref },
    });
    expect(dbOrder).toBeTruthy();
    expect(Number(dbOrder?.amount)).toBe(45.0);
    expect(dbOrder?.status).toBe("CREATED");
  });

  // 5. Create-order failure
  it("5. Create-order failure: should reject invalid amounts and sanitize upstream API errors", async () => {
    // Non-positive amount
    await expect(
      payPalService.createPayPalOrder({
        internalReference: `REF-ERR-${Date.now()}`,
        amount: -10,
        currency: "USD",
      })
    ).rejects.toThrow(/positive number/i);

    // Over maximum limit
    await expect(
      payPalService.createPayPalOrder({
        internalReference: `REF-ERR-${Date.now()}`,
        amount: 2500,
        currency: "USD",
      })
    ).rejects.toThrow(/(?:maximum authorized limit|exceeds maximum allowed limit)/i);
  });

  // 6. Capture success
  it("6. Capture success: should capture created order and transition status to CAPTURED", async () => {
    const ref = `TEST-CAP-${Date.now()}`;
    const order = await payPalService.createPayPalOrder({
      internalReference: ref,
      amount: 35.0,
      currency: "USD",
      description: "Capture Success Test",
    });

    const capture = await payPalService.capturePayPalOrder(order.id);
    expect(capture.orderId).toBe(order.id);
    expect(capture.status).toBe("COMPLETED");
    expect(capture.captureId).toBeTruthy();
    expect(capture.amount.value).toBe("35.00");

    const dbOrder = await prisma.paymentOrder.findUnique({
      where: { internalReference: ref },
    });
    expect(dbOrder?.status).toBe("CAPTURED");
    expect(dbOrder?.paypalCaptureId).toBe(capture.captureId);
  });

  // 7. Capture failure
  it("7. Capture failure: should handle capture non-completed status by failing safely", async () => {
    const client = new PayPalHttpClient({
      environment: "sandbox",
      provider: "paypal",
      clientId: "AStest_client",
      clientSecret: "ELtest_secret",
    });

    vi.spyOn(client, "getAccessToken").mockResolvedValue("mock_token");
    vi.spyOn(client, "request").mockRejectedValueOnce(
      new PayPalApiError(422, "UNPROCESSABLE_ENTITY", "Payment capture was declined by processor")
    );

    const ref = `TEST-FAIL-CAP-${Date.now()}`;
    const order = await payPalService.createPayPalOrder({
      internalReference: ref,
      amount: 20.0,
      currency: "USD",
    });

    const customService = new (payPalService.constructor as any)(client);
    await expect(customService.capturePayPalOrder(order.id)).rejects.toThrow(/declined/i);
  });

  // 8. Duplicate capture handling
  it("8. Duplicate capture handling: should be idempotent and return existing capture without double-capture", async () => {
    const ref = `TEST-DUP-${Date.now()}`;
    const order = await payPalService.createPayPalOrder({
      internalReference: ref,
      amount: 55.0,
      currency: "USD",
    });

    const capture1 = await payPalService.capturePayPalOrder(order.id);
    expect(capture1.status).toBe("COMPLETED");

    // Second capture on same order ID must be idempotent
    const capture2 = await payPalService.capturePayPalOrder(order.id);
    expect(capture2.status).toBe("COMPLETED");
    expect(capture2.captureId).toBe(capture1.captureId);
  });

  // 9. Invalid order ID
  it("9. Invalid order ID: should reject invalid or non-existent order IDs with 400/404", async () => {
    await expect(payPalService.capturePayPalOrder("")).rejects.toThrowError(
      expect.objectContaining({ statusCode: 400, errorCode: "INVALID_ORDER_ID" })
    );

    await expect(payPalService.capturePayPalOrder("NON_EXISTENT_ORDER_99999")).rejects.toThrowError(
      expect.objectContaining({ statusCode: 404, errorCode: "ORDER_NOT_FOUND" })
    );
  });

  // 10. PayPal API timeout/network failure
  it("10. PayPal API timeout/network failure: should normalize timeout aborts into 504 PAYPAL_TIMEOUT", async () => {
    const client = new PayPalHttpClient({
      environment: "sandbox",
      provider: "paypal",
      clientId: "AStest_client",
      clientSecret: "ELtest_secret",
    });

    vi.spyOn(client, "getAccessToken").mockResolvedValue("mock_token");
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    await expect(
      client.request("/v2/checkout/orders", { method: "POST", timeoutMs: 100 })
    ).rejects.toThrowError(
      expect.objectContaining({ statusCode: 504, errorCode: "PAYPAL_TIMEOUT" })
    );
  });

  // 11. Frontend -> backend request flow
  it("11. Frontend -> backend request flow: should handle order creation and capture via /api/orders and /api/paypal/orders", async () => {
    // Test /api/orders
    const req1 = new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 15.0, currency: "USD", description: "Route test 1" }),
    });
    const res1 = await handleOrdersPost(req1 as any);
    expect(res1.status).toBe(201);
    const json1 = await res1.json();
    expect(json1.success).toBe(true);
    expect(json1.data.id).toBeTruthy();

    // Test /api/paypal/orders (alias)
    const req2 = new Request("http://localhost:3000/api/paypal/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 25.0, currency: "USD", description: "Route test 2" }),
    });
    const res2 = await handlePaypalOrdersPost(req2 as any);
    expect(res2.status).toBe(201);
    const json2 = await res2.json();
    expect(json2.success).toBe(true);
    expect(json2.data.id).toBeTruthy();

    // Capture via /api/paypal/orders/[orderId]/capture
    const captureReq = new Request(`http://localhost:3000/api/paypal/orders/${json2.data.id}/capture`, {
      method: "POST",
    });
    const captureRes = await handlePaypalCapturePost(captureReq as any, {
      params: Promise.resolve({ orderId: json2.data.id }),
    });
    expect(captureRes.status).toBe(200);
    const captureJson = await captureRes.json();
    expect(captureJson.success).toBe(true);
    expect(captureJson.data.status).toBe("COMPLETED");

    // Lookup via /api/paypal/orders/[orderId]
    const getReq = new Request(`http://localhost:3000/api/paypal/orders/${json2.data.id}`, {
      method: "GET",
    });
    const getRes = await handlePaypalOrderDetailGet(getReq as any, {
      params: Promise.resolve({ orderId: json2.data.id }),
    });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.success).toBe(true);
    expect(getJson.data.status).toBe("CAPTURED");
  });

  // 12. Secret is never returned in API responses
  it("12. Secret is never returned in API responses: should scrub client secrets from all endpoints", async () => {
    const orderReq = new Request("http://localhost:3000/api/paypal/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 10.0 }),
    });
    const orderRes = await handlePaypalOrdersPost(orderReq as any);
    const orderText = await orderRes.text();

    expect(orderText).not.toContain("PAYPAL_CLIENT_SECRET");
    expect(orderText).not.toContain("sandbox_client_secret_placeholder");
    expect(orderText).not.toContain("clientSecret");

    const listReq = new Request("http://localhost:3000/api/paypal/orders", { method: "GET" });
    const listRes = await handlePaypalOrdersGet(listReq as any);
    const listText = await listRes.text();

    expect(listText).not.toContain("PAYPAL_CLIENT_SECRET");
    expect(listText).not.toContain("clientSecret");
  });

  // 13. OAuth token is never returned to frontend
  it("13. OAuth token is never returned to frontend: should never include access_token or Bearer in API JSON", async () => {
    const orderReq = new Request("http://localhost:3000/api/paypal/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 12.0 }),
    });
    const orderRes = await handlePaypalOrdersPost(orderReq as any);
    const orderJson = await orderRes.json();

    expect(orderJson.data?.access_token).toBeUndefined();
    expect(orderJson.data?.token).toBeUndefined();
    expect(JSON.stringify(orderJson)).not.toContain("Bearer ");
  });

  // 14. Client secret is not present in frontend bundle
  it("14. Client secret is not present in frontend bundle: should verify client dist and src are completely clean", () => {
    const distAssetsDir = path.resolve(__dirname, "../../client/dist/assets");
    if (fs.existsSync(distAssetsDir)) {
      const files = fs.readdirSync(distAssetsDir);
      for (const file of files) {
        if (file.endsWith(".js")) {
          const content = fs.readFileSync(path.join(distAssetsDir, file), "utf-8");
          expect(content).not.toContain("PAYPAL_CLIENT_SECRET");
          expect(content).not.toContain("sandbox_client_secret_placeholder");
          expect(content).not.toContain("mock_client_secret");
        }
      }
    }

    const clientSrc = path.resolve(__dirname, "../../client/src");
    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          const text = fs.readFileSync(fullPath, "utf-8");
          expect(text).not.toContain("PAYPAL_CLIENT_SECRET");
          expect(text).not.toContain("sandbox_client_secret_placeholder");
        }
      }
    };
    scanDir(clientSrc);
  });

  // 15. Environment variables are loaded correctly
  it("15. Environment variables are loaded correctly: should validate sandbox config and prevent live mode in dev", () => {
    const config = getConfig();
    expect(config.PAYPAL_ENVIRONMENT).toBe("sandbox");
    expect(["auto", "paypal", "mock"]).toContain(config.PAYPAL_PROVIDER);
    expect(config.DATABASE_URL).toBeTruthy();
    expect(config.ALLOWED_CURRENCIES).toContain("USD");
    expect(config.MAX_TRANSACTION_AMOUNT).toBe(1000.0);

    // Attempting live environment in development must throw
    expect(() => {
      getConfig({
        NODE_ENV: "development",
        PAYPAL_ENVIRONMENT: "live",
      });
    }).toThrowError(/Live PayPal environment is strictly forbidden in non-production/i);
  });
});
