import { describe, it, expect, beforeEach } from "vitest";
import { AgentContextBuilder } from "../src/server/agent-context/context-builder";
import { AgentCapabilityRegistry } from "../src/server/agent-context/registry";
import { MockAPIContextProvider } from "../src/server/agent-context/providers/mock-provider";

describe("Phase 6 — Agent Context Builder & Budget Limits", () => {
  let registry: AgentCapabilityRegistry;
  let builder: AgentContextBuilder;

  beforeEach(() => {
    registry = new AgentCapabilityRegistry(new MockAPIContextProvider());
    builder = new AgentContextBuilder(registry);
  });

  it("should build a valid bounded context snapshot for ai_agent caller", async () => {
    const snapshot = await builder.buildContext({
      callerType: "ai_agent",
      maxTools: 5,
    });

    expect(snapshot.contextVersion).toBe("1.0.0");
    expect(snapshot.provider).toContain("apimatic");
    expect(snapshot.capabilities.length).toBeLessThanOrEqual(5);
    expect(snapshot.systemConstraints.length).toBeGreaterThan(0);
    expect(snapshot.securityDirectives.length).toBeGreaterThan(0);
    expect(snapshot.expiresAt).toBeGreaterThan(snapshot.generatedAt);

    // AI agent must NOT receive financial capture capability by default
    const capOps = snapshot.capabilities.map((c) => c.operation);
    expect(capOps).not.toContain("paypal.capturePayment");
  });

  it("should enforce maxTools budget limit and flag truncation when exceeded", async () => {
    const snapshot = await builder.buildContext({
      callerType: "ai_agent",
      maxTools: 2,
    });

    expect(snapshot.capabilities.length).toBe(2);
    expect(snapshot.budget.maxTools).toBe(2);
    expect(snapshot.budget.truncated).toBe(true);
  });

  it("should enforce maxCharacters budget limit and truncate when budget is constrained", async () => {
    // Very small character budget to force character truncation
    const snapshot = await builder.buildContext({
      callerType: "ai_agent",
      maxCharacters: 600,
    });

    expect(snapshot.budget.characterCount).toBeLessThanOrEqual(600);
    expect(snapshot.budget.truncated).toBe(true);
  });

  it("should include standard security directives and system constraints in snapshot", async () => {
    const snapshot = await builder.buildContext({
      callerType: "ai_agent",
    });

    const directivesStr = snapshot.securityDirectives.join(" ");
    expect(directivesStr).toContain("prompt-injection");
    expect(directivesStr).toContain("PayPal Checkout button");

    const constraintsStr = snapshot.systemConstraints.join(" ");
    expect(constraintsStr).toContain("server-authoritative");
    expect(constraintsStr).toContain("no authorization or mechanism to capture payments");
  });

  it("should guarantee zero credential leakage in serialized context snapshot", async () => {
    const snapshot = await builder.buildContext({
      callerType: "ai_agent",
    });

    const serialized = JSON.stringify(snapshot);

    // Verify absence of sensitive tokens, secrets, passwords
    expect(serialized).not.toContain("PAYPAL_CLIENT_SECRET");
    expect(serialized).not.toContain("APIMATIC_API_KEY");
    expect(serialized).not.toContain("secret_key");
    expect(serialized).not.toContain("bearer ");
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("password");
  });
});
