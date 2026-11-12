import { describe, it, expect, beforeEach } from "vitest";
import { PayPalService } from "../src/server/paypal/service";
import { PayPalHttpClient } from "../src/server/paypal/client";
import { PayPalApiError } from "../src/server/paypal/errors";
import { dbRepository } from "../src/server/db/repository";

describe("PayPal Foundation & Service", () => {
  let service: PayPalService;
  let client: PayPalHttpClient;

  beforeEach(() => {
    client = new PayPalHttpClient({
      environment: "sandbox",
      clientId: "mock_client_id",
      clientSecret: "mock_client_secret",
      webhookId: "mock_webhook_id",
    });
    client.setMockMode(true);
    service = new PayPalService(client, dbRepository);
  });

  it("should configure client for PayPal Sandbox environment", () => {
    expect(client.getEnvironment()).toBe("sandbox");
    expect(client.getBaseUrl()).toBe("https://api-m.sandbox.paypal.com");
    expect(client.isUsingMockFallback()).toBe(true);
  });

  it("should create an order successfully with valid parameters", async () => {
    const internalRef = `ORD-TEST-${Date.now()}`;
    const result = await service.createOrder({
      internalReference: internalRef,
      amount: 49.99,
      currency: "USD",
      description: "Test Pro Subscription",
      customerEmail: "tester@example.com",
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe("CREATED");
    expect(result.intent).toBe("CAPTURE");
    expect(result.amount.value).toBe("49.99");
    expect(result.amount.currencyCode).toBe("USD");
    expect(result.internalReference).toBe(internalRef);

    // Verify order was persisted in DB
    const saved = await dbRepository.getOrderByInternalRef(internalRef);
    expect(saved).not.toBeNull();
    expect(saved?.paypalOrderId).toBe(result.id);
  });

  it("should reject order with negative or zero amount", async () => {
    await expect(
      service.createOrder({
        internalReference: "INVALID-AMOUNT-1",
        amount: -10,
        currency: "USD",
      })
    ).rejects.toThrow("Payment amount must be a positive number.");
  });

  it("should reject order exceeding maximum transaction limit ($1000 default)", async () => {
    await expect(
      service.createOrder({
        internalReference: "EXCESSIVE-AMOUNT",
        amount: 5000,
        currency: "USD",
      })
    ).rejects.toThrow(/exceeds the maximum authorized limit/);
  });

  it("should reject order with unsupported currency", async () => {
    await expect(
      service.createOrder({
        internalReference: "UNSUPPORTED-CURR",
        amount: 25.0,
        currency: "XYZ",
      })
    ).rejects.toThrow(/Currency 'XYZ' is not supported/);
  });

  it("should capture an approved order and update database status", async () => {
    const internalRef = `ORD-CAPTURE-${Date.now()}`;
    const order = await service.createOrder({
      internalReference: internalRef,
      amount: 75.0,
      currency: "USD",
      description: "Item to Capture",
    });

    const captureResult = await service.captureOrder(order.id);

    expect(captureResult.captureId).toBeDefined();
    expect(captureResult.status).toBe("COMPLETED");
    expect(captureResult.orderId).toBe(order.id);

    // Verify status updated in DB
    const updated = await dbRepository.getOrderByPaypalId(order.id);
    expect(updated?.status).toBe("CAPTURED");
    expect(updated?.paypalCaptureId).toBe(captureResult.captureId);
  });

  it("should return existing capture on duplicate capture attempt (idempotency)", async () => {
    const internalRef = `ORD-IDEMP-${Date.now()}`;
    const order = await service.createOrder({
      internalReference: internalRef,
      amount: 15.0,
      currency: "USD",
    });

    const firstCapture = await service.captureOrder(order.id);
    const secondCapture = await service.captureOrder(order.id);

    expect(secondCapture.captureId).toBe(firstCapture.captureId);
    expect(secondCapture.status).toBe("COMPLETED");
  });
});
