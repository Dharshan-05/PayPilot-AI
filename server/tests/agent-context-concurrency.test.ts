import { describe, it, expect } from "vitest";
import { toolExecutionEngine } from "../src/server/agent-context/executor";
import { agentContextBuilder } from "../src/server/agent-context/context-builder";
import { prisma } from "../src/server/db/client";

describe("Phase 6 — Agent Context & Tool Execution Concurrency", () => {
  it("should handle 20 concurrent tool executions without race conditions or state corruption", async () => {
    const product = await prisma.product.findFirst({ where: { isAvailable: true } });
    expect(product).toBeDefined();

    const tasks = Array.from({ length: 20 }, async (_, idx) => {
      if (idx % 3 === 0) {
        // Search execution
        return toolExecutionEngine.execute({
          toolId: "cap_products_search",
          operation: "products.search",
          arguments: { query: idx % 2 === 0 ? "keyboard" : "mouse" },
          callerType: "ai_agent",
        });
      } else if (idx % 3 === 1) {
        // Proposal execution
        return toolExecutionEngine.execute({
          toolId: "cap_commerce_create_proposal",
          operation: "commerce.createProposal",
          arguments: { productId: product!.id, quantity: 1 },
          callerType: "ai_agent",
          sessionId: `sess_concurrent_${idx}_${Date.now()}`,
        });
      } else {
        // System health check
        return toolExecutionEngine.execute({
          toolId: "cap_system_health",
          operation: "system.getHealth",
          arguments: {},
          callerType: "ai_agent",
        });
      }
    });

    const results = await Promise.all(tasks);

    expect(results.length).toBe(20);
    expect(results.every((r) => r.success)).toBe(true);

    // Verify proposals were distinct
    const proposals = results.filter((r) => r.operation === "commerce.createProposal");
    const proposalNumbers = proposals.map((p) => p.data.proposalNumber);
    const uniqueProposalNumbers = new Set(proposalNumbers);
    expect(uniqueProposalNumbers.size).toBe(proposals.length);
  });

  it("should handle 20 concurrent context snapshot builds safely", async () => {
    const tasks = Array.from({ length: 20 }, async (_, idx) => {
      return agentContextBuilder.buildContext({
        callerType: idx % 2 === 0 ? "ai_agent" : "human_user",
        maxTools: 6,
        maxCharacters: 3000,
      });
    });

    const snapshots = await Promise.all(tasks);

    expect(snapshots.length).toBe(20);
    expect(snapshots.every((s) => s.capabilities.length > 0)).toBe(true);
    expect(snapshots.every((s) => s.budget.characterCount > 0)).toBe(true);
  });
});
