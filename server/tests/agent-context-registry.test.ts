import { describe, it, expect, beforeEach } from "vitest";
import { AgentCapabilityRegistry } from "../src/server/agent-context/registry";
import { MockAPIContextProvider } from "../src/server/agent-context/providers/mock-provider";
import { AgentCapability } from "../src/server/agent-context/types";

describe("Phase 6 — Agent Capability Registry & APIMatic Modeling", () => {
  let registry: AgentCapabilityRegistry;

  beforeEach(() => {
    registry = new AgentCapabilityRegistry(new MockAPIContextProvider());
  });

  it("should initialize and load all 9 APIMatic-modeled capabilities", async () => {
    await registry.initialize();
    const caps = registry.getAll();
    expect(caps.length).toBe(9);

    const operations = caps.map((c) => c.operation);
    expect(operations).toContain("products.search");
    expect(operations).toContain("products.compare");
    expect(operations).toContain("products.recommend");
    expect(operations).toContain("commerce.createProposal");
    expect(operations).toContain("commerce.getProposal");
    expect(operations).toContain("paypal.getOrder");
    expect(operations).toContain("paypal.createOrder");
    expect(operations).toContain("paypal.capturePayment");
    expect(operations).toContain("system.getHealth");
  });

  it("should filter capabilities by category accurately", async () => {
    await registry.initialize();
    const productCaps = registry.getByCategory("PRODUCT_DISCOVERY");
    expect(productCaps.length).toBe(3);
    expect(productCaps.every((c) => c.category === "PRODUCT_DISCOVERY")).toBe(true);

    const paymentCaps = registry.getByCategory("PAYPAL_PAYMENT");
    expect(paymentCaps.length).toBe(1);
    expect(paymentCaps[0].operation).toBe("paypal.capturePayment");
  });

  it("should filter capabilities by risk level accurately", async () => {
    await registry.initialize();
    const readOnlyCaps = registry.getByRiskLevel("READ_ONLY");
    expect(readOnlyCaps.length).toBeGreaterThanOrEqual(4);
    expect(readOnlyCaps.every((c) => c.readOnly)).toBe(true);

    const financialCaps = registry.getByRiskLevel("FINANCIAL");
    expect(financialCaps.length).toBe(1);
    expect(financialCaps[0].operation).toBe("paypal.capturePayment");
    expect(financialCaps[0].financialOperation).toBe(true);
  });

  it("should restrict available capabilities based on caller type", async () => {
    await registry.initialize();
    const aiCaps = registry.getAvailableForCaller("ai_agent");
    const aiOps = aiCaps.map((c) => c.operation);

    // AI agent must NOT have direct access to financial capture
    expect(aiOps).not.toContain("paypal.capturePayment");
    expect(aiOps).not.toContain("paypal.createOrder"); // server_system or human
    expect(aiOps).toContain("products.search");
    expect(aiOps).toContain("products.compare");
    expect(aiOps).toContain("commerce.createProposal");

    // Human user should have access to capture
    const humanCaps = registry.getAvailableForCaller("human_user");
    const humanOps = humanCaps.map((c) => c.operation);
    expect(humanOps).toContain("paypal.capturePayment");
  });

  it("should retrieve a capability by ID or operation name", async () => {
    await registry.initialize();
    const byId = registry.get("cap_products_search");
    expect(byId).toBeDefined();
    expect(byId?.operation).toBe("products.search");

    const byOp = registry.get("commerce.createProposal");
    expect(byOp).toBeDefined();
    expect(byOp?.id).toBe("commerce.createProposal");
  });

  it("should properly register and retrieve custom capabilities", () => {
    const customCap: AgentCapability = {
      id: "cap_custom_test",
      name: "Custom Test Tool",
      description: "Test description",
      provider: "test",
      version: "1.0.0",
      operation: "custom.testOp",
      category: "SYSTEM_DIAGNOSTIC",
      riskLevel: "READ_ONLY",
      readOnly: true,
      requiresConfirmation: false,
      financialOperation: false,
      inputSchema: { type: "object", properties: { q: { type: "string" } } },
      outputSchema: { type: "object" },
      requiredPermissions: [],
      allowedCallerTypes: ["ai_agent", "human_user"],
      timeoutMs: 3000,
      idempotencyRequired: false,
      auditRequired: true,
      enabled: true,
    };

    registry.register(customCap);
    const retrieved = registry.get("cap_custom_test");
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Custom Test Tool");
  });
});
