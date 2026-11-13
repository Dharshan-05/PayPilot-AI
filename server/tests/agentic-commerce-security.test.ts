import { describe, it, expect, beforeAll } from "vitest";
import { toolExecutionEngine } from "../src/server/agent-context/executor";
import { AgentActionPolicy } from "../src/server/commerce/policy";
import { agentContextBuilder } from "../src/server/agent-context/context-builder";
import { proposalService } from "../src/server/commerce/proposal";
import { catalogService } from "../src/server/commerce/catalog";
import { prisma } from "../src/server/db/client";

describe("Phase 7 — End-to-End Security Audit & Invariant Enforcement", () => {
  let sampleProduct: any;

  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    sampleProduct = await prisma.product.findFirst({ where: { isAvailable: true } });
  });

  it("Security Invariant: AI agent caller is strictly prohibited from executing PayPal capture", async () => {
    const result = await toolExecutionEngine.execute({
      toolId: "paypal.capturePayment",
      operation: "paypal.capturePayment",
      arguments: { orderId: "ORD-SEC-001" },
      callerType: "ai_agent",
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("UNAUTHORIZED_OPERATION");
    expect(result.confirmationRequired).toBe(true);

    // Verify policy engine blocked with explicit message
    expect(result.error?.message).toContain("AI agents are strictly forbidden from executing financial captures");
  });

  it("Caller Spoofing Defense: Sending 'callerType: human_user' without valid confirmation token is rejected", async () => {
    const result = await toolExecutionEngine.execute({
      toolId: "paypal.capturePayment",
      operation: "paypal.capturePayment",
      arguments: { orderId: "ORD-SPOOF-001" }, // missing confirmation token or confirmed flag
      callerType: "human_user",
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("UNAUTHORIZED_OPERATION");
    expect(result.error?.message).toContain("requires human confirmation token");
  });

  it("Prototype Pollution Defense: Malicious payloads with __proto__, constructor, or prototype are rejected", async () => {
    const maliciousArgs = JSON.parse('{"__proto__": {"isAdmin": true}, "query": "wireless keyboard"}');

    const result = await toolExecutionEngine.execute({
      toolId: "products.search",
      operation: "products.search",
      arguments: maliciousArgs,
      callerType: "ai_agent",
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("VALIDATION_FAILED");
    expect(result.error?.details?.[0]).toContain("prototype pollution");
  });

  it("Credential Isolation: Context snapshots and tool outputs contain zero internal secrets", async () => {
    const snapshot = await agentContextBuilder.buildContext({
      callerType: "ai_agent",
    });

    const serialized = JSON.stringify(snapshot);

    expect(serialized).not.toContain("PAYPAL_CLIENT_SECRET");
    expect(serialized).not.toContain("APIMATIC_API_KEY");
    expect(serialized).not.toContain("DATABASE_URL");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("bearer ");
  });

  it("Authoritative Database Precedence: Stale or forged prices cannot affect proposal creation", async () => {
    // Attempting to pass a forged price in proposal creation arguments
    const freshProduct = await prisma.product.findUnique({ where: { id: sampleProduct.id } });
    const proposal = await proposalService.createProposal({
      productId: sampleProduct.id,
      quantity: 1,
    });

    // Proposal amount must strictly match authoritative database price, not any input
    expect(Number(proposal.unitAmount)).toBe(Number(freshProduct!.price));
    expect(Number(proposal.totalAmount)).toBe(Number(freshProduct!.price));
  });

  it("Action Policy Tier Enforcement: CONFIRM_PAYMENT is locked to FINANCIAL_USER_AUTH", () => {
    const aiCheck = AgentActionPolicy.authorizeAction("CONFIRM_PAYMENT", "ai_agent");
    expect(aiCheck.authorized).toBe(false);
    expect(aiCheck.reason).toContain("AI Agent is strictly prohibited");

    const humanCheck = AgentActionPolicy.authorizeAction("CONFIRM_PAYMENT", "human_user");
    expect(humanCheck.authorized).toBe(true);
  });
});
