import { describe, it, expect, beforeAll } from "vitest";
import { intelligentSearchEngine } from "../src/server/commerce/intelligence/search";
import { proposalService } from "../src/server/commerce/proposal";
import { payPalService } from "../src/server/paypal/service";
import { catalogService } from "../src/server/commerce/catalog";
import { prisma } from "../src/server/db/client";

describe("Phase 7 — Concurrency Safety & Parallel Commerce Operations", () => {
  let availableProduct: any;

  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    availableProduct = await prisma.product.findFirst({ where: { isAvailable: true, inventory: { gte: 50 } } });
  });

  it("should handle 20 concurrent product search queries without performance degradation or errors", async () => {
    const searchQueries = [
      "wireless keyboard",
      "noise cancelling headphones",
      "ergonomic mouse",
      "mechanical keyboard",
      "4k monitor",
      "quiet keyboard",
      "developer pro",
      "travel headphones",
      "bluetooth mouse",
      "wireless mechanical keyboard",
    ];

    const tasks = Array.from({ length: 20 }, async (_, idx) => {
      const q = searchQueries[idx % searchQueries.length];
      return intelligentSearchEngine.search({
        query: q,
        inStockOnly: true,
        limit: 3,
      });
    });

    const start = Date.now();
    const results = await Promise.all(tasks);
    const duration = Date.now() - start;

    expect(results.length).toBe(20);
    expect(results.every((r) => r.results.length > 0)).toBe(true);
    expect(duration).toBeLessThan(4000); // Concurrency latency check
  });

  it("should handle 20 concurrent proposal creations generating distinct authoritative proposals", async () => {
    const tasks = Array.from({ length: 20 }, async (_, idx) => {
      return proposalService.createProposal({
        productId: availableProduct.id,
        quantity: 1,
        conversationId: `sess_concurrent_${idx}_${Date.now()}`,
      });
    });

    const proposals = await Promise.all(tasks);

    expect(proposals.length).toBe(20);
    expect(proposals.every((p) => p.status === "PENDING_CONFIRMATION")).toBe(true);

    const proposalNumbers = proposals.map((p) => p.proposalNumber);
    const uniqueNumbers = new Set(proposalNumbers);
    expect(uniqueNumbers.size).toBe(20);
  });

  it("should handle simultaneous confirmation and capture attempts on same proposal idempotently", async () => {
    const proposal = await proposalService.createProposal({
      productId: availableProduct.id,
      quantity: 1,
    });

    // Run 5 parallel confirmations on the exact same proposal
    const confirmationTasks = Array.from({ length: 5 }, () =>
      proposalService.confirmProposal(proposal.id, "human_user")
    );

    const confirmResults = await Promise.all(confirmationTasks);

    expect(confirmResults.length).toBe(5);
    // Every concurrent confirmation must resolve to the identical PayPal order ID
    const paypalOrderIds = confirmResults.map((r) => r.paypalOrderId);
    const uniqueOrderIds = new Set(paypalOrderIds);
    expect(uniqueOrderIds.size).toBe(1);

    // Run 3 parallel captures on the created PayPal order
    const singleOrderId = confirmResults[0].paypalOrderId;
    const captureTasks = Array.from({ length: 3 }, () =>
      payPalService.captureOrder(singleOrderId)
    );

    const captureResults = await Promise.all(captureTasks);

    expect(captureResults.length).toBe(3);
    const captureIds = captureResults.map((c) => c.captureId);
    const uniqueCaptureIds = new Set(captureIds);
    expect(uniqueCaptureIds.size).toBe(1);

    // Verify order in DB is in CAPTURED status
    const dbOrder = await prisma.paymentOrder.findUnique({
      where: { paypalOrderId: singleOrderId },
    });
    expect(dbOrder?.status).toBe("CAPTURED");
  });
});
