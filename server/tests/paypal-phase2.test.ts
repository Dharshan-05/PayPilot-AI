import { describe, it, expect, beforeEach } from "vitest";
import { PayPalService } from "../src/server/paypal/service";
import { PayPalHttpClient } from "../src/server/paypal/client";
import { PayPalWebhookHandler } from "../src/server/paypal/webhooks";
import { dbRepository } from "../src/server/db/repository";
import { PayPalWebhookHeaders } from "../src/server/paypal/types";

describe("Phase 2 — Advanced PayPal Lifecycle & Error Boundaries", () => {
  let service: PayPalService;
  let client: PayPalHttpClient;
  let webhookHandler: PayPalWebhookHandler;

  const validHeaders: PayPalWebhookHeaders = {
    transmissionId: "trans_phase2_1",
    transmissionTime: new Date().toISOString(),
    certUrl: "https://api.sandbox.paypal.com/cert",
    authAlgo: "SHA256withRSA",
    transmissionSig: "valid_sig",
  };

  beforeEach(() => {
    client = new PayPalHttpClient({
      environment: "sandbox",
      clientId: "mock_client_id",
      clientSecret: "mock_client_secret",
      webhookId: "sandbox_webhook_id_placeholder",
    });
    client.setMockMode(true);
    service = new PayPalService(client, dbRepository);
    webhookHandler = new PayPalWebhookHandler(client, dbRepository);
  });

  it("should transition order to REFUNDED when PAYMENT.CAPTURE.REFUNDED webhook is received", async () => {
    const internalRef = `ORD-REFUND-${Date.now()}`;
    const order = await service.createOrder({
      internalReference: internalRef,
      amount: 60.0,
      currency: "USD",
    });

    // Capture the order first (CREATED -> CAPTURED)
    await service.captureOrder(order.id);

    // Ingest PAYMENT.CAPTURE.REFUNDED webhook
    const refundEventId = `WH-REFUND-${Date.now()}`;
    const refundPayload = {
      id: refundEventId,
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: `REFUND-${Date.now()}`,
        custom_id: order.id,
      },
    };

    const webhookResult = await webhookHandler.processEvent(
      validHeaders,
      JSON.stringify(refundPayload)
    );

    expect(webhookResult.success).toBe(true);
    expect(webhookResult.status).toBe("PROCESSED");

    // Verify order state in DB transitioned to REFUNDED
    const updated = await dbRepository.getOrderByPaypalId(order.id);
    expect(updated?.status).toBe("REFUNDED");
  });

  it("should transition order to FAILED when PAYMENT.CAPTURE.DENIED webhook is received", async () => {
    const internalRef = `ORD-DENIED-${Date.now()}`;
    const order = await service.createOrder({
      internalReference: internalRef,
      amount: 45.0,
      currency: "USD",
    });

    const deniedEventId = `WH-DENIED-${Date.now()}`;
    const deniedPayload = {
      id: deniedEventId,
      event_type: "PAYMENT.CAPTURE.DENIED",
      resource: {
        id: `CAP-DENIED-${Date.now()}`,
        custom_id: order.id,
      },
    };

    const webhookResult = await webhookHandler.processEvent(
      validHeaders,
      JSON.stringify(deniedPayload)
    );

    expect(webhookResult.success).toBe(true);
    expect(webhookResult.status).toBe("PROCESSED");

    const updated = await dbRepository.getOrderByPaypalId(order.id);
    expect(updated?.status).toBe("FAILED");
  });

  it("should reject capture of nonexistent PayPal order with 404 ORDER_NOT_FOUND", async () => {
    await expect(
      service.captureOrder("NONEXISTENT_PAYPAL_ORDER_ID_999")
    ).rejects.toThrow(/does not exist/);
  });

  it("should reject invalid order ID queries in getOrder", async () => {
    await expect(service.getOrder("")).rejects.toThrow(/PayPal Order ID is required/);
    await expect(service.getOrder("   ")).rejects.toThrow(/PayPal Order ID is required/);
  });

  it("should prevent backwards state transitions from CAPTURED to CREATED in DatabaseRepository", async () => {
    const internalRef = `ORD-PREVENT-BACKWARDS-${Date.now()}`;
    const order = await service.createOrder({
      internalReference: internalRef,
      amount: 30.0,
      currency: "USD",
    });

    await service.captureOrder(order.id);

    // Attempt illegal transition backwards to CREATED
    const attempt = await dbRepository.updateOrderStatus(order.id, "CREATED");
    expect(attempt?.status).toBe("CAPTURED"); // Preserved in CAPTURED state!
  });

  it("should ensure no PayPal secrets are exposed in order or capture responses", async () => {
    const internalRef = `ORD-SECRETS-CHECK-${Date.now()}`;
    const order = await service.createOrder({
      internalReference: internalRef,
      amount: 19.99,
      currency: "USD",
    });

    const orderStr = JSON.stringify(order);
    expect(orderStr).not.toContain("clientSecret");
    expect(orderStr).not.toContain("mock_client_secret");
    expect(orderStr).not.toContain("access_token");

    const capture = await service.captureOrder(order.id);
    const captureStr = JSON.stringify(capture);
    expect(captureStr).not.toContain("clientSecret");
    expect(captureStr).not.toContain("mock_client_secret");
    expect(captureStr).not.toContain("access_token");
  });
});
