import { describe, it, expect, beforeAll } from "vitest";
import { commerceAgent } from "../src/server/commerce/agent";
import { proposalService } from "../src/server/commerce/proposal";
import { payPalService } from "../src/server/paypal/service";
import { payPalWebhookHandler } from "../src/server/paypal/webhooks";
import { PayPalWebhookHeaders } from "../src/server/paypal/types";
import { catalogService } from "../src/server/commerce/catalog";
import { prisma } from "../src/server/db/client";

describe("Phase 7 — End-to-End Agentic Commerce Workflow", () => {
  const sessionId = `e2e_session_${Date.now()}`;
  let proposalId: string;
  let paypalOrderId: string;
  let internalReference: string;

  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
  });

  it("Step 1: User requests product discovery with constraints -> Agent returns ranked products with explainable evidence", async () => {
    const res = await commerceAgent.processMessage({
      sessionId,
      message: "I need a quiet wireless keyboard for programming under $100",
      requestId: `req_e2e_1_${Date.now()}`,
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.products.length).toBeGreaterThan(0);
    expect(res.evidence).toBeDefined();
    expect(res.evidence!.length).toBeGreaterThan(0);
    expect(res.products.every((p) => p.category === "keyboards")).toBe(true);
    expect(res.products.every((p) => Number(p.price) <= 100)).toBe(true);
    expect(res.message).toContain("Logitech MX Mechanical Wireless Keyboard");
  });

  it("Step 2: User requests relative comparison ('Compare the best two') -> Agent resolves top 2 items from memory and compares side-by-side", async () => {
    const res = await commerceAgent.processMessage({
      sessionId,
      message: "Compare the best two",
      requestId: `req_e2e_2_${Date.now()}`,
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.products.length).toBe(2);
    expect(res.comparison).toBeDefined();
    expect(res.comparison?.comparisonRows.length).toBeGreaterThan(0);
    expect(res.message).toContain("side-by-side comparison");
  });

  it("Step 3: User asks use-case question ('Which one is better for programming?') -> Agent evaluates suitability and recommends best match", async () => {
    const res = await commerceAgent.processMessage({
      sessionId,
      message: "Which one is better for programming?",
      requestId: `req_e2e_3_${Date.now()}`,
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.products.length).toBe(1);
    expect(res.message).toContain("programming");
  });

  it("Step 4: User selects relative option ('I'll take the first one') -> Agent creates non-binding CommerceProposal with locked price and inventory", async () => {
    const res = await commerceAgent.processMessage({
      sessionId,
      message: "I'll take the first one",
      requestId: `req_e2e_4_${Date.now()}`,
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.proposal).toBeDefined();
    expect(res.proposal?.status).toBe("PENDING_CONFIRMATION");
    expect(res.actionRequired).toBe("CONFIRMATION_REQUIRED");
    expect(res.message).toContain("proposal (#PROP-");

    proposalId = res.proposal!.id;
  });

  it("Step 5: User queries pricing ('Show me the final price') -> Agent reads authoritative proposal and displays itemized total", async () => {
    const res = await commerceAgent.processMessage({
      sessionId,
      message: "Show me the final price",
      requestId: `req_e2e_5_${Date.now()}`,
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.proposal).toBeDefined();
    expect(res.proposal?.id).toBe(proposalId);
    expect(res.message).toContain("authoritative price breakdown");
    expect(res.message).toContain(`$${res.proposal?.totalAmount.toFixed(2)}`);
  });

  it("Step 6: User says 'Yes, buy it' -> Agent guides user to mandatory human PayPal checkout button", async () => {
    const res = await commerceAgent.processMessage({
      sessionId,
      message: "Yes, buy it",
      requestId: `req_e2e_6_${Date.now()}`,
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.proposal?.id).toBe(proposalId);
    expect(res.actionRequired).toBe("CONFIRMATION_REQUIRED");
    expect(res.message).toContain("Authorize with PayPal");
    expect(res.message).toContain("human confirmation is strictly required");
  });

  it("Step 7: Explicit Human Confirmation -> Server validates price/inventory and creates PayPal Sandbox Order", async () => {
    const confirmResult = await proposalService.confirmProposal(proposalId, "human_user");

    expect(confirmResult.proposal.status).toBe("CONFIRMED");
    expect(confirmResult.paypalOrderId).toMatch(/^MOCK-ORDER-|^[A-Z0-9]{17}$/);
    expect(confirmResult.internalReference).toContain("ORD-PROP-");
    expect(confirmResult.paypalApprovalUrl).toBeDefined();

    paypalOrderId = confirmResult.paypalOrderId;
    internalReference = confirmResult.internalReference;
  });

  it("Step 8: Server executes Capture of approved PayPal payment -> transitions order state to CAPTURED and decrements inventory", async () => {
    const initialProduct = await prisma.product.findFirst({
      where: { proposals: { some: { id: proposalId } } },
    });
    const initialInventory = initialProduct!.inventory;

    const captureRes = await payPalService.captureOrder(paypalOrderId);

    expect(captureRes.status).toBe("COMPLETED");
    expect(captureRes.captureId).toBeDefined();

    // Verify order in DB
    const dbOrder = await prisma.paymentOrder.findUnique({
      where: { paypalOrderId },
    });
    expect(dbOrder?.status).toBe("CAPTURED");

    // Verify proposal in DB transitioned to COMPLETED
    const dbProposal = await prisma.commerceProposal.findUnique({
      where: { id: proposalId },
    });
    expect(dbProposal?.status).toBe("COMPLETED");

    // Verify product inventory was decremented
    const updatedProduct = await prisma.product.findUnique({
      where: { id: initialProduct!.id },
    });
    expect(updatedProduct?.inventory).toBe(initialInventory - dbProposal!.quantity);
  });

  it("Step 9: Webhook delivery -> Verified and deduplicated idempotently", async () => {
    const webhookPayload = {
      id: `WH-E2E-${Date.now()}`,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource_type: "capture",
      resource: {
        id: `CAP-E2E-${Date.now()}`,
        status: "COMPLETED",
        custom_id: paypalOrderId,
        amount: { value: "79.99", currency_code: "USD" },
      },
    };

    const webhookHeaders: PayPalWebhookHeaders = {
      transmissionId: `trans_${Date.now()}`,
      transmissionTime: new Date().toISOString(),
      certUrl: "https://api.sandbox.paypal.com/v1/cert",
      authAlgo: "SHA256withRSA",
      transmissionSig: "mock_sig_valid",
    };

    const result = await payPalWebhookHandler.processEvent(webhookHeaders, webhookPayload);
    expect(result.success).toBe(true);

    // Duplicate webhook
    const duplicateResult = await payPalWebhookHandler.processEvent(webhookHeaders, webhookPayload);
    expect(duplicateResult.status).toBe("DUPLICATE");
  });

  it("Step 10: User asks 'What is the status of my order?' -> Agent reports authoritative CAPTURED order status from DB", async () => {
    const res = await commerceAgent.processMessage({
      sessionId,
      message: `What is the status of my order ${internalReference}?`,
      requestId: `req_e2e_10_${Date.now()}`,
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.message).toContain("CAPTURED");
    expect(res.message).toContain(internalReference);
  });
});
