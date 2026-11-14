import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { dbRepository } from "../src/server/db/repository";
import { catalogService } from "../src/server/commerce/catalog";
import {
  agentRepository,
  transactionRepository,
  dashboardRepository,
  orderRepository,
  riskRepository,
  metricRepository,
  notificationRepository,
} from "../src/server/db";
import { fallbackStore } from "../src/server/db/fallback-store";
import { GET as getAuditAi } from "../src/app/api/audit/ai/route";
import { GET as getProducts } from "../src/app/api/products/route";
import { GET as getDashboardStats } from "../src/app/api/dashboard/stats/route";
import { GET as getAgents } from "../src/app/api/agents/route";
import { GET as getHealth } from "../src/app/api/health/route";

describe("Database Resilience & Vercel Fallback Layer", () => {
  beforeEach(() => {
    fallbackStore.seed();
  });

  it("should serve recent AI audit logs for FraudGuard even when database is in fallback mode", async () => {
    const logs = await dbRepository.getRecentAuditLogs(6);
    expect(logs).toBeDefined();
    expect(logs.length).toBeGreaterThanOrEqual(6);

    const first = logs[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("requestId");
    expect(first).toHaveProperty("operation");
    expect(first).toHaveProperty("status");
    expect(first).toHaveProperty("promptSummary");
    expect(first).toHaveProperty("responseSummary");
  });

  it("should record AI audit logs transparently without throwing in fallback mode", async () => {
    const testId = `req_resilience_test_${Date.now()}`;
    const recorded = await dbRepository.recordAiAuditLog({
      requestId: testId,
      operation: "SAFETY_AUDIT",
      provider: "mock",
      model: "FraudGuard-v2",
      status: "SUCCESS",
      promptSummary: "Test prompt verification",
      responseSummary: "Test response passed",
    });

    expect(recorded).toBeDefined();
    expect(recorded.requestId).toBe(testId);
    expect(recorded.status).toBe("SUCCESS");

    const recent = await dbRepository.getRecentAuditLogs(50);
    const found = recent.find((r) => r.requestId === testId);
    expect(found).toBeDefined();
  });

  it("should serve product catalog queries in fallback mode", async () => {
    const products = await catalogService.searchProducts({ limit: 10 });
    expect(products).toBeDefined();
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty("sku");
    expect(products[0]).toHaveProperty("price");
  });

  it("should serve dashboard summary with all metrics in fallback mode", async () => {
    const summary = await dashboardRepository.getDashboardSummary();
    expect(summary).toBeDefined();
    expect(summary.metrics.totalRevenue).toBeGreaterThan(0);
    expect(summary.metrics.transactionCount).toBeGreaterThan(0);
    expect(summary.metrics.fraudguardScore).toBeGreaterThanOrEqual(80);
    expect(summary.recentTransactions.length).toBeGreaterThan(0);
    expect(summary.recentInsights.length).toBeGreaterThan(0);
    expect(summary.topRecommendations.length).toBeGreaterThan(0);
    expect(summary.activeAgents.length).toBeGreaterThan(0);
  });

  it("should serve agents list in fallback mode", async () => {
    const agents = await agentRepository.list();
    expect(agents).toBeDefined();
    expect(agents.length).toBeGreaterThanOrEqual(5);
    expect(agents[0]).toHaveProperty("name");
    expect(agents[0]).toHaveProperty("type");
    expect(agents[0]).toHaveProperty("status");
  });

  it("should serve transactions list and detail in fallback mode", async () => {
    const txs = await transactionRepository.list({ limit: 10 });
    expect(txs).toBeDefined();
    expect(txs.length).toBeGreaterThan(0);
    expect(txs[0]).toHaveProperty("amount");
    expect(txs[0]).toHaveProperty("riskScore");
  });

  it("should serve orders list in fallback mode", async () => {
    const orders = await orderRepository.list({ limit: 10 });
    expect(orders).toBeDefined();
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0]).toHaveProperty("orderNumber");
  });

  it("should serve risk overview in fallback mode", async () => {
    const overview = await riskRepository.getOverview();
    expect(overview).toBeDefined();
    expect(overview.totalAssessments).toBeGreaterThan(0);
    expect(overview.securityHealthScore).toBeGreaterThanOrEqual(80);
  });

  it("should serve metrics in fallback mode", async () => {
    const metrics = await metricRepository.getLatestMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.length).toBeGreaterThan(0);
  });

  it("should serve notifications in fallback mode", async () => {
    const notifications = await notificationRepository.list();
    expect(notifications).toBeDefined();
    expect(notifications.length).toBeGreaterThan(0);
  });

  it("should create payment order and find it by internal reference in fallback mode", async () => {
    const orderNumber = `ORD-RESILIENCE-${Date.now()}`;
    const created = await dbRepository.createPaymentOrder({
      internalReference: orderNumber,
      amount: 49.99,
      currency: "USD",
      customerEmail: "resilience.user@paypilot.ai",
      description: "Resilience Test Purchase",
    });

    expect(created).toBeDefined();
    expect(created.internalReference).toBe(orderNumber);
    expect(Number(created.amount)).toBe(49.99);

    const retrieved = await dbRepository.getOrderByInternalRef(orderNumber);
    expect(retrieved).toBeDefined();
    expect(retrieved?.internalReference).toBe(orderNumber);
  });

  describe("API Route Resiliency (Vercel Production Verification)", () => {
    it("GET /api/audit/ai?limit=6 should return HTTP 200 with verified audit logs (fixes FraudGuard 500)", async () => {
      const req = new NextRequest("http://localhost:3000/api/audit/ai?limit=6");
      const res = await getAuditAi(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(6);
      expect(json.data[0]).toHaveProperty("operation");
      expect(json.data[0]).toHaveProperty("status");
    });

    it("GET /api/products should return HTTP 200 with catalog items", async () => {
      const req = new NextRequest("http://localhost:3000/api/products?limit=10");
      const res = await getProducts(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it("GET /api/dashboard/stats should return HTTP 200 with computed metrics", async () => {
      const req = new NextRequest("http://localhost:3000/api/dashboard/stats");
      const res = await getDashboardStats(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.metrics).toBeDefined();
      expect(json.data.recentTransactions).toBeDefined();
    });

    it("GET /api/agents should return HTTP 200 with active autonomous agents", async () => {
      const req = new NextRequest("http://localhost:3000/api/agents");
      const res = await getAgents(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(5);
    });

    it("GET /api/health should return HTTP 200 with database status and resilience telemetry", async () => {
      const req = new NextRequest("http://localhost:3000/api/health");
      const res = await getHealth(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("healthy");
      expect(json.data.database).toBeDefined();
      expect(json.data.databaseResilience).toBeDefined();
      expect(json.data.databaseResilience.status).toBe("healthy");
    });
  });
});
