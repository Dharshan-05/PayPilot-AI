import { describe, it, expect } from "vitest";
import { dbRepository } from "../src/server/db/repository";
import { prisma } from "../src/server/db/client";

describe("Database Foundation & Models", () => {
  it("should create or find user records by email", async () => {
    const email = `testuser_${Date.now()}@example.com`;
    const user = await dbRepository.findOrCreateUser(email, "Test User");

    expect(user.id).toBeDefined();
    expect(user.email).toBe(email);
    expect(user.name).toBe("Test User");

    // Re-retrieval
    const userAgain = await dbRepository.getUserById(user.id);
    expect(userAgain?.email).toBe(email);
  });

  it("should keep internal order reference cleanly separated from PayPal ID", async () => {
    const internalRef = `ORD-INTERNAL-${Date.now()}`;
    const paypalId = `5O190127TN364715T-${Date.now()}`;

    const order = await dbRepository.createPaymentOrder({
      internalReference: internalRef,
      paypalOrderId: paypalId,
      amount: 99.0,
      currency: "USD",
      customerEmail: "customer@example.com",
    });

    expect(order.internalReference).toBe(internalRef);
    expect(order.paypalOrderId).toBe(paypalId);
    expect(order.id).not.toBe(internalRef);
    expect(order.id).not.toBe(paypalId);

    // Look up by internal reference
    const byInternal = await dbRepository.getOrderByInternalRef(internalRef);
    expect(byInternal?.id).toBe(order.id);

    // Look up by PayPal ID
    const byPaypal = await dbRepository.getOrderByPaypalId(paypalId);
    expect(byPaypal?.id).toBe(order.id);
  });

  it("should record AI audit logs and retrieve recent entries", async () => {
    const reqId = `req_db_audit_${Date.now()}`;
    await dbRepository.recordAiAuditLog({
      requestId: reqId,
      operation: "SAFETY_AUDIT",
      provider: "mock",
      model: "mock-v1",
      status: "SUCCESS",
      latencyMs: 12,
      promptSummary: "Test prompt summary",
      responseSummary: "Test response summary",
    });

    const logs = await dbRepository.getRecentAuditLogs(10);
    const found = logs.find((l) => l.requestId === reqId);
    expect(found).toBeDefined();
    expect(found?.operation).toBe("SAFETY_AUDIT");
  });

  it("should enforce uniqueness on WebhookEvent eventId", async () => {
    const eventId = `WH-UNIQUE-${Date.now()}`;
    await dbRepository.recordWebhookEvent({
      eventId,
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      processingStatus: "RECEIVED",
      signatureVerified: true,
    });

    // Attempting to insert duplicate eventId directly via Prisma throws unique constraint error
    await expect(
      prisma.webhookEvent.create({
        data: {
          eventId,
          eventType: "PAYMENT.CAPTURE.COMPLETED",
          processingStatus: "RECEIVED",
          signatureVerified: true,
        },
      })
    ).rejects.toThrow();
  });
});
