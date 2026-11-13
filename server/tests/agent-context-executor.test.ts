import { describe, it, expect } from "vitest";
import { ToolExecutionEngine } from "../src/server/agent-context/executor";
import { AgentCapabilityRegistry } from "../src/server/agent-context/registry";
import { MockAPIContextProvider } from "../src/server/agent-context/providers/mock-provider";
import { prisma } from "../src/server/db/client";

describe("Phase 6 — Tool Execution Engine & Authoritative Governance", () => {
  const registry = new AgentCapabilityRegistry(new MockAPIContextProvider());
  const executor = new ToolExecutionEngine(registry);

  it("should execute products.search and return grounded results", async () => {
    const result = await executor.execute({
      toolId: "cap_products_search",
      operation: "products.search",
      arguments: { query: "keyboard" },
      callerType: "ai_agent",
    });

    expect(result.success).toBe(true);
    expect(result.operation).toBe("products.search");
    expect(result.data).toBeDefined();
    expect(result.data.results).toBeInstanceOf(Array);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should execute products.compare on catalog items without hallucination", async () => {
    const products = await prisma.product.findMany({ take: 2 });
    expect(products.length).toBeGreaterThanOrEqual(2);

    const result = await executor.execute({
      toolId: "cap_products_compare",
      operation: "products.compare",
      arguments: { productIds: [products[0].id, products[1].id] },
      callerType: "ai_agent",
    });

    expect(result.success).toBe(true);
    expect(result.data.products.length).toBe(2);
    expect(result.data.comparisonRows.length).toBeGreaterThan(0);
  });

  it("should execute commerce.createProposal and persist proposal in database", async () => {
    const product = await prisma.product.findFirst({
      where: { isAvailable: true, inventory: { gt: 0 } },
    });
    expect(product).toBeDefined();

    const result = await executor.execute({
      toolId: "cap_commerce_create_proposal",
      operation: "commerce.createProposal",
      arguments: {
        productId: product!.id,
        quantity: 1,
      },
      callerType: "ai_agent",
      sessionId: `sess_exec_test_${Date.now()}`,
    });

    expect(result.success).toBe(true);
    expect(result.data.proposalNumber).toMatch(/^PROP-/);
    expect(Number(result.data.totalAmount)).toBe(Number(product!.price));

    // Verify persisted in DB
    const persisted = await prisma.commerceProposal.findUnique({
      where: { id: result.data.id },
    });
    expect(persisted).toBeDefined();
  });

  it("should fail execution with UNAUTHORIZED_OPERATION when ai_agent attempts payment capture", async () => {
    const result = await executor.execute({
      toolId: "cap_paypal_capture_payment",
      operation: "paypal.capturePayment",
      arguments: { orderId: "ORD-FORBIDDEN-123" },
      callerType: "ai_agent",
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("UNAUTHORIZED_OPERATION");
    expect(result.confirmationRequired).toBe(true);
  });

  it("should reject tool intents with invalid schemas or missing required arguments", async () => {
    const result = await executor.execute({
      toolId: "cap_commerce_create_proposal",
      operation: "commerce.createProposal",
      arguments: {}, // Missing required 'productId'
      callerType: "ai_agent",
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("VALIDATION_FAILED");
    expect(result.error?.details).toContain("Missing required argument: 'productId'");
  });

  it("should reject prototype pollution attempts in arguments", async () => {
    const maliciousArgs = JSON.parse('{"__proto__": {"isAdmin": true}, "query": "keyboard"}');

    const result = await executor.execute({
      toolId: "cap_products_search",
      operation: "products.search",
      arguments: maliciousArgs,
      callerType: "ai_agent",
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("VALIDATION_FAILED");
    expect(result.error?.details?.[0]).toContain("prototype pollution");
  });

  it("should record an AI audit log entry in the database upon tool execution", async () => {
    const result = await executor.execute({
      toolId: "cap_products_search",
      operation: "products.search",
      arguments: { query: "mouse" },
      callerType: "ai_agent",
    });

    expect(result.success).toBe(true);
    expect(result.auditLogId).toBeDefined();

    const logEntry = await prisma.aIAuditLog.findUnique({
      where: { id: result.auditLogId },
    });
    expect(logEntry).toBeDefined();
    expect(logEntry?.operation).toBe("tool.products.search");
    expect(logEntry?.status).toBe("SUCCESS");
  });
});
