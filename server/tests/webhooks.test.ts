import { describe, it, expect, beforeEach } from "vitest";
import { PayPalWebhookHandler } from "../src/server/paypal/webhooks";
import { PayPalHttpClient } from "../src/server/paypal/client";
import { dbRepository } from "../src/server/db/repository";
import { PayPalWebhookHeaders } from "../src/server/paypal/types";

describe("Webhook Foundation & Deduplication", () => {
  let handler: PayPalWebhookHandler;
  let client: PayPalHttpClient;

  const validHeaders: PayPalWebhookHeaders = {
    transmissionId: "trans_12345",
    transmissionTime: new Date().toISOString(),
    certUrl: "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123",
    authAlgo: "SHA256withRSA",
    transmissionSig: "valid_signature_string",
  };

  beforeEach(() => {
    client = new PayPalHttpClient({
      environment: "sandbox",
      clientId: "mock_client_id",
      clientSecret: "mock_client_secret",
      webhookId: "sandbox_webhook_id_placeholder",
    });
    client.setMockMode(true);
    handler = new PayPalWebhookHandler(client, dbRepository);
  });

  it("should reject webhook when headers are missing", async () => {
    const emptyHeaders: PayPalWebhookHeaders = {
      transmissionId: "",
      transmissionTime: "",
      certUrl: "",
      authAlgo: "",
      transmissionSig: "",
    };

    const payload = {
      id: `WH-TEST-MISSING-HEADERS-${Date.now()}`,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
    };

    const result = await handler.processEvent(emptyHeaders, JSON.stringify(payload));

    expect(result.success).toBe(false);
    expect(result.status).toBe("INVALID_SIGNATURE");
  });

  it("should process valid webhook event and persist record in DB", async () => {
    const eventId = `WH-EVT-${Date.now()}`;
    const payload = {
      id: eventId,
      event_type: "CHECKOUT.ORDER.APPROVED",
      resource_type: "checkout-order",
      resource: {
        id: `ORD-MOCK-${Date.now()}`,
      },
    };

    const result = await handler.processEvent(validHeaders, JSON.stringify(payload));

    expect(result.success).toBe(true);
    expect(result.status).toBe("PROCESSED");
    expect(result.eventId).toBe(eventId);

    // Verify DB entry
    const dbRecord = await dbRepository.getWebhookEventByEventId(eventId);
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.signatureVerified).toBe(true);
    expect(dbRecord?.processingStatus).toBe("PROCESSED");
  });

  it("should detect duplicate webhook events and avoid reprocessing", async () => {
    const eventId = `WH-DUP-${Date.now()}`;
    const payload = {
      id: eventId,
      event_type: "CHECKOUT.ORDER.APPROVED",
      resource: { id: "ORD-123" },
    };

    // First attempt -> PROCESSED
    const firstResult = await handler.processEvent(validHeaders, JSON.stringify(payload));
    expect(firstResult.status).toBe("PROCESSED");

    // Second attempt with same eventId -> DUPLICATE
    const secondResult = await handler.processEvent(validHeaders, JSON.stringify(payload));
    expect(secondResult.success).toBe(true);
    expect(secondResult.status).toBe("DUPLICATE");
    expect(secondResult.message).toBe("Event already processed");
  });

  it("should gracefully handle unsupported or unhandled event types", async () => {
    const eventId = `WH-UNHANDLED-${Date.now()}`;
    const payload = {
      id: eventId,
      event_type: "CUSTOMER.DISPUTE.CREATED",
      resource: { dispute_id: "DSP-1" },
    };

    const result = await handler.processEvent(validHeaders, JSON.stringify(payload));

    expect(result.success).toBe(true);
    expect(result.status).toBe("IGNORED");
  });
});
