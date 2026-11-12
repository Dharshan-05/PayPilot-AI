import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as handleContext } from "../src/app/api/agent/context/route";
import { GET as handleCapabilities } from "../src/app/api/agent/capabilities/route";
import { GET as handleCapabilityDetail } from "../src/app/api/agent/capabilities/[capabilityId]/route";
import { POST as handleValidate } from "../src/app/api/agent/tools/validate/route";
import { POST as handleExecute } from "../src/app/api/agent/tools/execute/route";
import { GET as handleHealth } from "../src/app/api/agent/context/health/route";

describe("Phase 6 — Agent Context & Tool Execution API Routes", () => {
  it("should serve agent context snapshot via GET /api/agent/context", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/context?callerType=ai_agent&maxTools=4");
    const res = await handleContext(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.contextVersion).toBe("1.0.0");
    expect(body.data.capabilities.length).toBeLessThanOrEqual(4);
    expect(body.data.systemConstraints).toBeInstanceOf(Array);
  });

  it("should list registered capabilities via GET /api/agent/capabilities", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/capabilities?riskLevel=READ_ONLY");
    const res = await handleCapabilities(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.capabilities).toBeInstanceOf(Array);
    expect(body.data.capabilities.every((c: any) => c.riskLevel === "READ_ONLY")).toBe(true);
  });

  it("should get specific capability detail via GET /api/agent/capabilities/[capabilityId]", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/capabilities/products.search");
    const res = await handleCapabilityDetail(req, {
      params: Promise.resolve({ capabilityId: "products.search" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("products.search");
    expect(body.data.operation).toBe("products.search");
  });

  it("should return 404 for unknown capability via GET /api/agent/capabilities/[capabilityId]", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/capabilities/cap_unknown_123");
    const res = await handleCapabilityDetail(req, {
      params: Promise.resolve({ capabilityId: "cap_unknown_123" }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("should validate tool intent via POST /api/agent/tools/validate", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/tools/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolId: "products.search",
        operation: "products.search",
        arguments: { query: "mechanical keyboard" },
        callerType: "ai_agent",
      }),
    });
    const res = await handleValidate(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.valid).toBe(true);
    expect(body.data.policyAuthorized).toBe(true);
  });

  it("should execute allowed tool via POST /api/agent/tools/execute", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/tools/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolId: "products.search",
        operation: "products.search",
        arguments: { query: "keyboard" },
        callerType: "ai_agent",
      }),
    });
    const res = await handleExecute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.success).toBe(true);
    expect(body.data.operation).toBe("products.search");
  });

  it("should reject AI agent financial capture via POST /api/agent/tools/execute with 403", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/tools/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolId: "paypal.capturePayment",
        operation: "paypal.capturePayment",
        arguments: { orderId: "ORD-FORBIDDEN-001" },
        callerType: "ai_agent",
      }),
    });
    const res = await handleExecute(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("FORBIDDEN_OPERATION");
  });

  it("should report agent context health via GET /api/agent/context/health", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/context/health");
    const res = await handleHealth(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("healthy");
    expect(body.data.capabilitiesRegistered).toBe(9);
  });
});
