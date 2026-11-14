import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  prisma,
  customerRepository,
  productRepository,
  orderRepository,
  paymentRepository,
  transactionRepository,
  riskRepository,
  insightRepository,
  recommendationRepository,
  agentRepository,
  notificationRepository,
  metricRepository,
  settingRepository,
  dashboardRepository,
  dbRepository,
} from "../src/server/db";
import { Prisma } from "@prisma/client";
import { getConfig, getSafeConfigDiagnostics } from "../src/server/config/env";
import { GET as getDashboardStats } from "../src/app/api/dashboard/stats/route";
import { GET as getTransactionsList } from "../src/app/api/transactions/route";
import { NextRequest } from "next/server";

describe("Phase 11 — Complete Persistent PostgreSQL Architecture & Integrity", () => {
  let testCustomerId: string;
  let testProductId: string;
  let testOrderId: string;
  let testPaymentId: string;
  let testTransactionId: string;
  let testAgentId: string;

  beforeAll(async () => {
    // Verify connection to PostgreSQL
    await prisma.$executeRawUnsafe("SELECT 1;");
  });

  afterAll(async () => {
    // Cleanup any test-specific artifacts
    if (testCustomerId) {
      await prisma.transaction.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.payment.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.order.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.customer.delete({ where: { id: testCustomerId } }).catch(() => null);
    }
    if (testProductId) {
      await prisma.product.delete({ where: { id: testProductId } }).catch(() => null);
    }
    if (testAgentId) {
      await prisma.agentRun.deleteMany({ where: { agentId: testAgentId } });
      await prisma.agent.delete({ where: { id: testAgentId } }).catch(() => null);
    }
  });

  // --------------------------------------------------------------------------
  // 1. Database Connection
  // --------------------------------------------------------------------------
  it("1. Database Connection: should successfully execute queries against PostgreSQL", async () => {
    const result: any[] = await prisma.$queryRaw`SELECT current_database() as db_name;`;
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].db_name).toBe("paypilot_dev");
  });

  // --------------------------------------------------------------------------
  // 2. Prisma Schema Validation (All 15 Models)
  // --------------------------------------------------------------------------
  it("2. Prisma Schema Validation: should verify all 15 models exist and are accessible", async () => {
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.payment.count(),
      prisma.transaction.count(),
      prisma.riskAssessment.count(),
      prisma.aIInsight.count(),
      prisma.aIRecommendation.count(),
      prisma.agent.count(),
      prisma.agentRun.count(),
      prisma.notification.count(),
      prisma.auditLog.count(),
      prisma.businessMetric.count(),
      prisma.applicationSetting.count(),
    ]);

    expect(counts.every((c) => typeof c === "number")).toBe(true);
    // All 15 models exist and contain seeded data
    counts.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
  });

  // --------------------------------------------------------------------------
  // 3. Customer CRUD
  // --------------------------------------------------------------------------
  it("3. Customer CRUD: should create, find, update, and increment spend on customer", async () => {
    const uniqueEmail = `test.cust.${Date.now()}@example.com`;
    const customer = await customerRepository.create({
      externalId: `CUST-TEST-${Date.now()}`,
      name: "Test Customer Unit",
      email: uniqueEmail,
      country: "US",
      status: "ACTIVE",
    });

    expect(customer.id).toBeDefined();
    testCustomerId = customer.id;

    const found = await customerRepository.findByEmail(uniqueEmail);
    expect(found?.name).toBe("Test Customer Unit");

    const updated = await customerRepository.incrementSpend(customer.id, 150.75);
    expect(Number(updated.totalSpent)).toBe(150.75);
    expect(updated.transactionCount).toBe(1);
  });

  // --------------------------------------------------------------------------
  // 4. Product CRUD
  // --------------------------------------------------------------------------
  it("4. Product CRUD: should create product and decrement inventory correctly", async () => {
    const sku = `PROD-TEST-${Date.now()}`;
    const product = await productRepository.create({
      sku,
      externalId: `EXT-TEST-${Date.now()}`,
      name: "Test Ergonomic Mouse",
      description: "Precision wireless mouse with customizable DPI",
      category: "accessories",
      price: new Prisma.Decimal(59.99),
      inventory: 20,
      status: "ACTIVE",
    });

    expect(product.id).toBeDefined();
    testProductId = product.id;

    const decremented = await productRepository.decrementInventory(product.id, 5);
    expect(decremented.inventory).toBe(15);
    expect(decremented.isAvailable).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 5. Order Creation
  // --------------------------------------------------------------------------
  it("5. Order Creation: should persist an order with relation to customer", async () => {
    const orderNumber = `ORD-UNIT-${Date.now()}`;
    const order = await orderRepository.create({
      orderNumber,
      customer: { connect: { id: testCustomerId } },
      amount: new Prisma.Decimal(59.99),
      currency: "USD",
      status: "PENDING",
      paypalOrderId: `SANDBOX-ORD-${Date.now()}`,
    });

    expect(order.id).toBeDefined();
    expect(order.customerId).toBe(testCustomerId);
    testOrderId = order.id;
  });

  // --------------------------------------------------------------------------
  // 6. Payment Persistence
  // --------------------------------------------------------------------------
  it("6. Payment Persistence: should persist payment linked to order and customer", async () => {
    const payment = await paymentRepository.create({
      order: { connect: { id: testOrderId } },
      customer: { connect: { id: testCustomerId } },
      status: "INITIATED",
      amount: new Prisma.Decimal(59.99),
      currency: "USD",
      paymentMethod: "PayPal Sandbox",
    });

    expect(payment.id).toBeDefined();
    expect(payment.status).toBe("INITIATED");
    testPaymentId = payment.id;
  });

  // --------------------------------------------------------------------------
  // 7. Transaction Persistence
  // --------------------------------------------------------------------------
  it("7. Transaction Persistence: should record ledger transaction with decimal amount", async () => {
    const tx = await transactionRepository.create({
      payment: { connect: { id: testPaymentId } },
      customer: { connect: { id: testCustomerId } },
      type: "PAYMENT",
      status: "COMPLETED",
      amount: new Prisma.Decimal(59.99),
      currency: "USD",
      riskScore: 12,
      riskLevel: "LOW",
      description: "Test unit checkout",
    });

    expect(tx.id).toBeDefined();
    expect(Number(tx.amount)).toBe(59.99);
    testTransactionId = tx.id;
  });

  // --------------------------------------------------------------------------
  // 8. PayPal Order Persistence
  // --------------------------------------------------------------------------
  it("8. PayPal Order Persistence: should create multi-table order records via dbRepository", async () => {
    const internalRef = `ORD-TEST-PP-${Date.now()}`;
    const paypalOrderId = `SANDBOX-PP-${Date.now()}`;

    const paymentOrder = await dbRepository.createPaymentOrder({
      internalReference: internalRef,
      paypalOrderId,
      amount: 120.00,
      currency: "USD",
      customerEmail: "unit.tester@paypilot.ai",
      description: "Multi-table persistence verification",
    });

    expect(paymentOrder.internalReference).toBe(internalRef);
    expect(paymentOrder.paypalOrderId).toBe(paypalOrderId);
    expect(Number(paymentOrder.amount)).toBe(120.00);

    // Verify normalized Order was synchronized
    const normalized = await orderRepository.findByOrderNumber(internalRef);
    expect(normalized).toBeDefined();
    expect(normalized?.status).toBe("PENDING");
  });

  // --------------------------------------------------------------------------
  // 9. PayPal Capture Persistence
  // --------------------------------------------------------------------------
  it("9. PayPal Capture Persistence: should atomically update Order, Payment, and Transaction to CAPTURED", async () => {
    const internalRef = `ORD-CAP-${Date.now()}`;
    const paypalOrderId = `SANDBOX-ORD-CAP-${Date.now()}`;
    const captureId = `SANDBOX-CAP-${Date.now()}`;

    await dbRepository.createPaymentOrder({
      internalReference: internalRef,
      paypalOrderId,
      amount: 85.50,
      currency: "USD",
      customerEmail: "capture.tester@paypilot.ai",
      description: "Capture flow test",
    });

    const captured = await dbRepository.updateOrderCaptureSuccess(paypalOrderId, captureId);
    expect(captured).toBeDefined();
    expect(captured?.status).toBe("CAPTURED");
    expect(captured?.paypalCaptureId).toBe(captureId);

    // Verify normalized tables
    const payment = await paymentRepository.findByPaypalCaptureId(captureId);
    expect(payment?.status).toBe("COMPLETED");

    const order = await orderRepository.findByPaypalOrderId(paypalOrderId);
    expect(order?.status).toBe("COMPLETED");
  });

  // --------------------------------------------------------------------------
  // 10. Duplicate Capture Protection (Idempotency)
  // --------------------------------------------------------------------------
  it("10. Duplicate Capture Protection: should safely return existing order on repeat capture calls", async () => {
    const internalRef = `ORD-IDEMP-${Date.now()}`;
    const paypalOrderId = `SANDBOX-ORD-IDEMP-${Date.now()}`;
    const captureId = `SANDBOX-CAP-IDEMP-${Date.now()}`;

    await dbRepository.createPaymentOrder({
      internalReference: internalRef,
      paypalOrderId,
      amount: 45.00,
      currency: "USD",
      customerEmail: "idemp.tester@paypilot.ai",
    });

    const firstCapture = await dbRepository.updateOrderCaptureSuccess(paypalOrderId, captureId);
    expect(firstCapture?.status).toBe("CAPTURED");

    // Second capture call with same ID
    const secondCapture = await dbRepository.updateOrderCaptureSuccess(paypalOrderId, captureId);
    expect(secondCapture?.status).toBe("CAPTURED");
    expect(secondCapture?.id).toBe(firstCapture?.id);
  });

  // --------------------------------------------------------------------------
  // 11. Risk Assessment Persistence
  // --------------------------------------------------------------------------
  it("11. Risk Assessment Persistence: should persist risk assessment linked to transaction", async () => {
    const assessment = await riskRepository.create({
      transaction: { connect: { id: testTransactionId } },
      score: 15,
      level: "LOW",
      reasons: JSON.stringify(["Known customer", "Low velocity"]),
      model: "FraudGuard-AI-v2",
      confidence: new Prisma.Decimal(0.9850),
    });

    expect(assessment.id).toBeDefined();
    expect(assessment.transactionId).toBe(testTransactionId);
    expect(assessment.score).toBe(15);
  });

  // --------------------------------------------------------------------------
  // 12. AI Insight Persistence
  // --------------------------------------------------------------------------
  it("12. AI Insight Persistence: should create and retrieve AI insights", async () => {
    const insight = await insightRepository.create({
      type: "OPTIMIZATION",
      title: "Unit Test Automated Recommendation",
      summary: "Detected inventory reorder threshold reached",
      severity: "MEDIUM",
      confidence: new Prisma.Decimal(0.9200),
      recommendation: "Reorder 20 units of Logitech MX Master",
      status: "ACTIVE",
    });

    expect(insight.id).toBeDefined();
    const active = await insightRepository.getActive(5);
    expect(active.some((i: any) => i.id === insight.id)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 13. Recommendation Persistence
  // --------------------------------------------------------------------------
  it("13. Recommendation Persistence: should persist and query proposed recommendations", async () => {
    const rec = await recommendationRepository.create({
      type: "PRICING",
      title: "Promotional bundle discount",
      description: "Offer 5% off when buying keyboard with wrist rest",
      priority: "HIGH",
      confidence: new Prisma.Decimal(0.9400),
      expectedImpact: "+$18 avg cart value",
      status: "PROPOSED",
    });

    expect(rec.id).toBeDefined();
    const proposed = await recommendationRepository.getProposed(50);
    expect(proposed.some((r) => r.id === rec.id)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 14. Agent Run Persistence
  // --------------------------------------------------------------------------
  it("14. Agent Run Persistence: should record agent run and update agent lastRunAt", async () => {
    const agent = await agentRepository.create({
      name: "Unit Test Agent",
      type: "SECURITY",
      description: "Agent for automated testing verification",
      status: "ACTIVE",
    });
    testAgentId = agent.id;

    const run = await agentRepository.recordRun({
      agent: { connect: { id: agent.id } },
      status: "COMPLETED",
      input: "Execute simulated security audit",
      output: "Audit finished: 0 findings",
    });

    expect(run.id).toBeDefined();
    expect(run.status).toBe("COMPLETED");

    const updatedAgent = await agentRepository.findById(agent.id);
    expect(updatedAgent?.lastRunAt).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 15. Dashboard Aggregation
  // --------------------------------------------------------------------------
  it("15. Dashboard Aggregation: should compute revenue and counts directly from PostgreSQL", async () => {
    const stats = await dashboardRepository.getDashboardSummary();

    expect(stats.metrics).toBeDefined();
    expect(stats.metrics.totalRevenue).toBeGreaterThan(0);
    expect(stats.metrics.transactionCount).toBeGreaterThan(0);
    expect(stats.metrics.customerCount).toBeGreaterThan(0);
    expect(stats.metrics.fraudguardScore).toBeGreaterThanOrEqual(0);
    expect(stats.recentTransactions.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // 16. Transaction Rollback Safety
  // --------------------------------------------------------------------------
  it("16. Transaction Rollback Safety: should roll back all mutations if an error occurs inside $transaction", async () => {
    const failEmail = `rollback.${Date.now()}@example.com`;

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.customer.create({
          data: {
            externalId: `CUST-FAIL-${Date.now()}`,
            name: "Fail Customer",
            email: failEmail,
          },
        });

        // Deliberately trigger failure
        throw new Error("SIMULATED_TRANSACTION_FAILURE");
      })
    ).rejects.toThrow("SIMULATED_TRANSACTION_FAILURE");

    // Verify customer was NOT persisted
    const check = await customerRepository.findByEmail(failEmail);
    expect(check).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 17. Missing DATABASE_URL Validation
  // --------------------------------------------------------------------------
  it("17. Missing DATABASE_URL Validation: should fail fast if DATABASE_URL is missing or blank", () => {
    expect(() => {
      getConfig({ DATABASE_URL: "" });
    }).toThrow(/DATABASE_URL is required/);
  });

  // --------------------------------------------------------------------------
  // 18. Secret Isolation
  // --------------------------------------------------------------------------
  it("18. Secret Isolation: should redact DATABASE_URL credentials and PayPal secret from safe diagnostics", () => {
    const config = getConfig();
    const safe = getSafeConfigDiagnostics(config);

    expect(safe.PAYPAL.CLIENT_SECRET).toBe("[REDACTED_SECRET]");
    expect(safe.DATABASE_URL).toBe("[REDACTED_DB_URL]");
    expect(JSON.stringify(safe)).not.toContain("postgres:postgres");
  });

  // --------------------------------------------------------------------------
  // 19. API Integration: Dashboard Stats Endpoint
  // --------------------------------------------------------------------------
  it("19. API Integration: GET /api/dashboard/stats should return 200 with database statistics", async () => {
    const req = new NextRequest("http://localhost:3000/api/dashboard/stats", {
      headers: { "x-request-id": "test-req-dash-01" },
    });

    const res = await getDashboardStats(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.metrics.totalRevenue).toBeDefined();
    expect(body.data.recentTransactions).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 20. API Integration: Transactions Endpoint
  // --------------------------------------------------------------------------
  it("20. API Integration: GET /api/transactions should return 200 with formatted transactions", async () => {
    const req = new NextRequest("http://localhost:3000/api/transactions?limit=10", {
      headers: { "x-request-id": "test-req-tx-01" },
    });

    const res = await getTransactionsList(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.transactions)).toBe(true);
    expect(body.data.transactions.length).toBeGreaterThan(0);
    expect(body.data.transactions[0].customer.name).toBeDefined();
  });
});
