import { describe, it, expect, beforeEach } from "vitest";
import { PayPalService } from "../src/server/paypal/service";
import { PayPalHttpClient } from "../src/server/paypal/client";
import { PayPalWebhookHandler } from "../src/server/paypal/webhooks";
import { dbRepository } from "../src/server/db/repository";
import { PayPalWebhookHeaders } from "../src/server/paypal/types";

describe("Phase 2 — Idempotency & Concurrency Safety", () => {
  let service: PayPalService;
  let client: PayPalHttpClient;
  let webhookHandler: PayPalWebhookHandler;

  const validHeaders: PayPalWebhookHeaders = {
    transmissionId: "trans_idemp_1",
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

  it("should return identical order on duplicate creation requests (create idempotency)", async () => {
    const internalRef = `ORD-IDEMP-CREATE-${Date.now()}`;

    const order1 = await service.createOrder({
      internalReference: internalRef,
      amount: 49.99,
      currency: "USD",
      description: "First attempt",
    });

    const order2 = await service.createOrder({
      internalReference: internalRef,
      amount: 49.99,
      currency: "USD",
      description: "Second attempt (duplicate)",
    });

    expect(order1.id).toBe(order2.id);
    expect(order1.internalReference).toBe(order2.internalReference);
    expect(order1.amount.value).toBe(order2.amount.value);
  });

  it("should handle duplicate capture calls gracefully without duplicate charges (capture idempotency)", async () => {
    const internalRef = `ORD-IDEMP-CAP-${Date.now()}`;
    const order = await service.createOrder({
      internalReference: internalRef,
      amount: 80.0,
      currency: "USD",
    });

    const capture1 = await service.captureOrder(order.id);
    const capture2 = await service.captureOrder(order.id);

    expect(capture1.status).toBe("COMPLETED");
    expect(capture2.status).toBe("COMPLETED");
    expect(capture1.captureId).toBe(capture2.captureId);
  });

  it("should resolve concurrent capture attempts safely", async () => {
    const internalRef = `ORD-CONCUR-CAP-${Date.now()}`;
    const order = await service.createOrder({
      internalReference: internalRef,
      amount: 120.0,
      currency: "USD",
    });

    // Run two capture requests concurrently
    const [resA, resB] = await Promise.all([
      service.captureOrder(order.id),
      service.captureOrder(order.id),
    ]);

    expect(resA.status).toBe("COMPLETED");
    expect(resB.status).toBe("COMPLETED");
    expect(resA.captureId).toBe(resB.captureId);
  });

  it("should detect duplicate webhook events and prevent duplicate side effects", async () => {
    const eventId = `WH-IDEMP-EVT-${Date.now()}`;
    const orderId = `ORD-WH-TEST-${Date.now()}`;

    // Create order first
    await service.createOrder({
      internalReference: `REF-${Date.now()}`,
      amount: 25.0,
      currency: "USD",
    });

    const eventPayload = {
      id: eventId,
      event_type: "CHECKOUT.ORDER.APPROVED",
      resource: { id: orderId },
    };

    // First arrival
    const firstDelivery = await webhookHandler.processEvent(
      validHeaders,
      JSON.stringify(eventPayload)
    );
    expect(firstDelivery.status).toBe("PROCESSED");

    // Second duplicate arrival
    const secondDelivery = await webhookHandler.processEvent(
      validHeaders,
      JSON.stringify(eventPayload)
    );
    expect(secondDelivery.success).toBe(true);
    expect(secondDelivery.status).toBe("DUPLICATE");
    expect(secondDelivery.message).toBe("Event already processed");
  });
});
