import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as handleAgentChat } from "../src/app/api/agent/chat/route";
import { GET as handleGetProposal } from "../src/app/api/commerce/proposals/[proposalId]/route";
import { POST as handleConfirmProposal } from "../src/app/api/commerce/proposals/[proposalId]/confirm/route";
import { POST as handleCaptureOrder } from "../src/app/api/orders/[orderId]/capture/route";
import { POST as handlePayPalWebhook } from "../src/app/api/webhooks/paypal/route";
import { GET as handleGetProducts } from "../src/app/api/products/route";

describe("Phase 3 — End-to-End AI Commerce Flow", () => {
  it("should complete full conversational commerce lifecycle: Chat -> Intent -> Recommendation -> Proposal -> Confirmation -> PayPal Sandbox -> Capture -> Status Inquiry", async () => {
    const sessionId = `e2e_session_${Date.now()}`;

    // -------------------------------------------------------------
    // Step 1: User Asks Agent for Product Under Budget
    // -------------------------------------------------------------
    const chatReq1 = new NextRequest("http://localhost:3000/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "I need a wireless keyboard under $80",
        sessionId,
      }),
    });

    const chatRes1 = await handleAgentChat(chatReq1);
    const chatBody1 = await chatRes1.json();

    expect(chatRes1.status).toBe(200);
    expect(chatBody1.success).toBe(true);
    expect(chatBody1.data.status).toBe("SUCCESS");
    expect(chatBody1.data.intent.intent).toBe("PURCHASE");
    expect(chatBody1.data.products.length).toBeGreaterThan(0);
    expect(chatBody1.data.proposal).toBeDefined();
    expect(chatBody1.data.actionRequired).toBe("CONFIRMATION_REQUIRED");

    const proposalId = chatBody1.data.proposal.id;
    const proposalNumber = chatBody1.data.proposal.proposalNumber;
    expect(chatBody1.data.proposal.totalAmount).toBeLessThanOrEqual(80.0);
    expect(chatBody1.data.proposal.totalAmount).toBeGreaterThan(0);

    // -------------------------------------------------------------
    // Step 2: Query Proposal Details via API
    // -------------------------------------------------------------
    const getPropReq = new NextRequest(`http://localhost:3000/api/commerce/proposals/${proposalId}`);
    const getPropRes = await handleGetProposal(getPropReq, {
      params: Promise.resolve({ proposalId }),
    });
    const getPropBody = await getPropRes.json();

    expect(getPropRes.status).toBe(200);
    expect(getPropBody.data.status).toBe("PENDING_CONFIRMATION");
    expect(getPropBody.data.isExpired).toBe(false);

    // -------------------------------------------------------------
    // Step 3: Security Boundary Test - AI cannot confirm payment
    // -------------------------------------------------------------
    const aiConfirmReq = new NextRequest(
      `http://localhost:3000/api/commerce/proposals/${proposalId}/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caller: "ai_agent", userConfirmed: true }),
      }
    );

    const aiConfirmRes = await handleConfirmProposal(aiConfirmReq, {
      params: Promise.resolve({ proposalId }),
    });
    expect(aiConfirmRes.status).toBe(403);

    // -------------------------------------------------------------
    // Step 4: Human User Explicit Confirmation Gate
    // -------------------------------------------------------------
    const confirmReq = new NextRequest(
      `http://localhost:3000/api/commerce/proposals/${proposalId}/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caller: "human_user", userConfirmed: true }),
      }
    );

    const confirmRes = await handleConfirmProposal(confirmReq, {
      params: Promise.resolve({ proposalId }),
    });
    const confirmBody = await confirmRes.json();

    expect(confirmRes.status).toBe(200);
    expect(confirmBody.success).toBe(true);
    expect(confirmBody.data.proposal.status).toBe("CONFIRMED");
    expect(confirmBody.data.paypalOrderId).toBeDefined();
    expect(confirmBody.data.paypalApprovalUrl).toBeDefined();
    expect(confirmBody.data.internalReference).toBe(`ORD-PROP-${proposalNumber}`);

    const paypalOrderId = confirmBody.data.paypalOrderId;
    const internalReference = confirmBody.data.internalReference;

    // -------------------------------------------------------------
    // Step 5: Capture Payment via PayPal Rails
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
    expect(captureBody.data.status).toBe("COMPLETED");

    // -------------------------------------------------------------
    // Step 6: Post-Capture Webhook Notification
    // -------------------------------------------------------------
    const webhookReq = new NextRequest("http://localhost:3000/api/webhooks/paypal", {
      method: "POST",
      headers: {
        "paypal-transmission-id": `wh_trans_${Date.now()}`,
        "paypal-transmission-time": new Date().toISOString(),
        "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "valid_mock_sig",
      },
      body: JSON.stringify({
        id: `WH-COMMERCE-${Date.now()}`,
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: `CAP-COMMERCE-${Date.now()}`,
          custom_id: paypalOrderId,
        },
      }),
    });
    const webhookRes = await handlePayPalWebhook(webhookReq);
    expect(webhookRes.status).toBe(200);

    // -------------------------------------------------------------
    // Step 7: Multi-turn Chat - Ask Agent About Order Status
    // -------------------------------------------------------------
    const chatReq2 = new NextRequest("http://localhost:3000/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `What is the status of my order ${internalReference}?`,
        sessionId,
      }),
    });

    const chatRes2 = await handleAgentChat(chatReq2);
    const chatBody2 = await chatRes2.json();

    expect(chatRes2.status).toBe(200);
    expect(chatBody2.data.intent.intent).toBe("ORDER_STATUS");
    expect(chatBody2.data.message).toContain("CAPTURED");
  });

  it("should serve product catalog queries via GET /api/products", async () => {
    const req = new NextRequest("http://localhost:3000/api/products?category=audio&limit=5");
    const res = await handleGetProducts(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    for (const p of body.data) {
      expect(p.category).toBe("audio");
    }
  });
});
