import { describe, it, expect, beforeAll } from "vitest";
import { commerceAgent } from "../src/server/commerce/agent";
import { catalogService } from "../src/server/commerce/catalog";
import { searchManager } from "../src/server/commerce/search/manager";
import { AgentActionPolicy } from "../src/server/commerce/policy";

describe("Phase 5 — Commerce Agent Semantic Search Integration & Payment Boundary", () => {
  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    await searchManager.reindexAll();
  });

  it("should discover products through semantic query understanding in the Commerce Agent", async () => {
    const res = await commerceAgent.processMessage({
      message: "I need a quiet typing tool for coding under $90",
      sessionId: `semantic_chat_${Date.now()}`,
      requestId: `req_sem_${Date.now()}`,
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.products.length).toBeGreaterThan(0);
    expect(res.products[0].category).toBe("keyboards");
    expect(Number(res.products[0].price)).toBeLessThanOrEqual(90);
    expect(res.evidence).toBeDefined();
    expect(res.evidence?.[0].badge).toBeDefined();
  });

  it("should create a proposal from semantic search results without executing payments (AI Proposes, Human Authorizes)", async () => {
    const res = await commerceAgent.processMessage({
      message: "Buy a wireless keyboard for coding under $85",
      sessionId: `semantic_buy_${Date.now()}`,
      requestId: `req_buy_${Date.now()}`,
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.actionRequired).toBe("CONFIRMATION_REQUIRED");
    expect(res.proposal).toBeDefined();
    expect(res.proposal?.status).toBe("PENDING_CONFIRMATION");
    expect(Number(res.proposal?.totalAmount)).toBeLessThanOrEqual(85);

    // CRITICAL SECURITY INVARIANT: Search and AI CANNOT confirm or execute payments
    const authCheck = AgentActionPolicy.authorizeAction("CONFIRM_PAYMENT", "ai_agent");
    expect(authCheck.authorized).toBe(false);
    expect(authCheck.reason).toContain("SECURITY POLICY VIOLATION");
  });

  it("should resolve natural language queries with typos and match relevant catalog items", async () => {
    const res = await commerceAgent.processMessage({
      message: "What is the price of that wireles keybord?",
      sessionId: `semantic_typo_${Date.now()}`,
      requestId: `req_typo_${Date.now()}`,
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.products.length).toBeGreaterThan(0);
    expect(res.products[0].category).toBe("keyboards");
  });
});
