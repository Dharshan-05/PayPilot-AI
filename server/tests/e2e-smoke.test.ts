import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as handleAiIntent } from "../src/app/api/ai/intent/route";
import { POST as handleCreateOrder } from "../src/app/api/orders/route";
import { POST as handleCaptureOrder } from "../src/app/api/orders/[orderId]/capture/route";
import { GET as handleGetOrder } from "../src/app/api/orders/[orderId]/route";
import { GET as handleGetAudit } from "../src/app/api/audit/ai/route";
import { GET as handleHealthCheck } from "../src/app/api/health/route";
import { POST as handlePayPalWebhook } from "../src/app/api/webhooks/paypal/route";
import { dbRepository } from "../src/server/db/repository";

describe("E2E Foundation Smoke Test", () => {
  it("should pass health check with database connected and safe diagnostics", async () => {
    const req = new NextRequest("http://localhost:3000/api/health");
    const res = await handleHealthCheck(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("healthy");
    expect(body.data.database).toBe("connected");
    expect(body.data.diagnostics.PAYPAL.CLIENT_SECRET).toBe("[REDACTED_SECRET]");
  });

  it("should execute full autonomous intent-to-payment lifecycle", async () => {
    // -------------------------------------------------------------
    // 1. AI Intent Analysis & Governance
    // -------------------------------------------------------------
    const aiReq = new NextRequest("http://localhost:3000/api/ai/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "I want to purchase the Developer Pro license",
      }),
    });

    const aiRes = await handleAiIntent(aiReq);
    const aiBody = await aiRes.json();

    expect(aiRes.status).toBe(200);
    expect(aiBody.success).toBe(true);
    expect(aiBody.data.authorizedAction).toBe("prepare_order");
    expect(aiBody.data.validation.isValid).toBe(true);

    const proposedAmount = aiBody.data.validation.sanitizedParameters.amount;
    const proposedCurrency = aiBody.data.validation.sanitizedParameters.currency;
    expect(proposedAmount).toBe(49.99);
    expect(proposedCurrency).toBe("USD");

    // -------------------------------------------------------------
    // 2. Order Creation via PayPal Abstraction
    // -------------------------------------------------------------
    const orderReq = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: proposedAmount,
        currency: proposedCurrency,
        description: "Developer Pro License - AI Initiated",
        customerEmail: "buyer@sandbox.example.com",
      }),
    });

    const orderRes = await handleCreateOrder(orderReq);
    const orderBody = await orderRes.json();

    expect(orderRes.status).toBe(201);
    expect(orderBody.success).toBe(true);
    expect(orderBody.data.id).toBeDefined();
    expect(orderBody.data.status).toBe("CREATED");
    expect(orderBody.data.amount.value).toBe("49.99");
    expect(orderBody.data.internalReference).toMatch(/^ORD-/);

    const paypalOrderId = orderBody.data.id;

    // Verify order in database
    const savedOrder = await dbRepository.getOrderByPaypalId(paypalOrderId);
    expect(savedOrder).not.toBeNull();
    expect(savedOrder?.status).toBe("CREATED");

    // -------------------------------------------------------------
    // 3. Order Capture (Approval & Settlement)
    // -------------------------------------------------------------
    const captureReq = new NextRequest(
      `http://localhost:3000/api/orders/${paypalOrderId}/capture`,
      { method: "POST" }
    );

    const captureRes = await handleCaptureOrder(captureReq, {
      params: Promise.resolve({ orderId: paypalOrderId }),
    });
    const captureBody = await captureRes.json();

    expect(captureRes.status).toBe(200);
    expect(captureBody.success).toBe(true);
    expect(captureBody.data.status).toBe("COMPLETED");
    expect(captureBody.data.captureId).toBeDefined();
    expect(captureBody.data.orderId).toBe(paypalOrderId);

    // -------------------------------------------------------------
    // 4. Verify Database Persistence of Capture
    // -------------------------------------------------------------
    const capturedOrderInDb = await dbRepository.getOrderByPaypalId(paypalOrderId);
    expect(capturedOrderInDb?.status).toBe("CAPTURED");
    expect(capturedOrderInDb?.paypalCaptureId).toBe(captureBody.data.captureId);

    // -------------------------------------------------------------
    // 5. Query Order via API Route
    // -------------------------------------------------------------
    const getOrderReq = new NextRequest(
      `http://localhost:3000/api/orders/${paypalOrderId}`
    );
    const getOrderRes = await handleGetOrder(getOrderReq, {
      params: Promise.resolve({ orderId: paypalOrderId }),
    });
    const getOrderBody = await getOrderRes.json();

    expect(getOrderRes.status).toBe(200);
    expect(getOrderBody.data.status).toBe("CAPTURED");
    expect(getOrderBody.data.paypalOrderId).toBe(paypalOrderId);

    // -------------------------------------------------------------
    // 6. Verify AI Audit Trail Record via Audit API
    // -------------------------------------------------------------
    const auditReq = new NextRequest("http://localhost:3000/api/audit/ai?limit=10");
    const auditRes = await handleGetAudit(auditReq);
    const auditBody = await auditRes.json();

    expect(auditRes.status).toBe(200);
    expect(auditBody.success).toBe(true);
    expect(Array.isArray(auditBody.data)).toBe(true);
    expect(auditBody.data.length).toBeGreaterThan(0);

    // Check that no secret keys leaked in audit payload
    const auditString = JSON.stringify(auditBody);
    expect(auditString).not.toContain("client_secret");
    expect(auditString).not.toContain("mock_key_for_local_testing");

    // -------------------------------------------------------------
    // 7. Test PayPal Webhook Route End-to-End
    // -------------------------------------------------------------
    const webhookReq = new NextRequest("http://localhost:3000/api/webhooks/paypal", {
      method: "POST",
      headers: {
        "paypal-transmission-id": "trans_smoke_123",
        "paypal-transmission-time": new Date().toISOString(),
        "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "smoke_signature",
      },
      body: JSON.stringify({
        id: `WH-SMOKE-${Date.now()}`,
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: `CAP-SMOKE-${Date.now()}`,
          custom_id: paypalOrderId,
        },
      }),
    });

    const webhookRes = await handlePayPalWebhook(webhookReq);
    const webhookBody = await webhookRes.json();

    expect(webhookRes.status).toBe(200);
    expect(webhookBody.success).toBe(true);
    expect(webhookBody.data.status).toBe("PROCESSED");
  });
});
