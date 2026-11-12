import { describe, it, expect, beforeAll } from "vitest";
import { productComparisonEngine } from "../src/server/commerce/intelligence/comparison";
import { catalogService } from "../src/server/commerce/catalog";

describe("Phase 4 — Product Comparison Engine & Hallucination Defense", () => {
  let prod1Id: string;
  let prod2Id: string;

  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    const p1 = await catalogService.getProductBySku("PROD-KB-001");
    const p2 = await catalogService.getProductBySku("PROD-KB-002");
    prod1Id = p1!.id;
    prod2Id = p2!.id;
  });

  it("should generate a side-by-side comparison matrix with advantages and trade-offs", async () => {
    const result = await productComparisonEngine.compareProducts([prod1Id, prod2Id]);

    expect(result.productIds).toContain(prod1Id);
    expect(result.productIds).toContain(prod2Id);
    expect(result.products.length).toBe(2);

    // Verify comparison rows
    expect(result.comparisonRows.length).toBeGreaterThanOrEqual(4);
    const priceRow = result.comparisonRows.find((r) => r.attribute === "Price");
    expect(priceRow).toBeDefined();
    expect(priceRow?.values[prod1Id]).toContain("79.99");
    expect(priceRow?.values[prod2Id]).toContain("69.99");

    // Advantages
    expect(result.advantages[prod2Id]).toContain("Best price ($10.00 cheaper than Logitech MX Mechanical Wireless Keyboard)");

    // Tradeoffs & Summary
    expect(result.tradeoffs.length).toBeGreaterThan(0);
    expect(result.summary).toContain("Side-by-side comparison of 2 options");
  });

  it("should reject comparison when fewer than 2 products are provided", async () => {
    await expect(
      productComparisonEngine.compareProducts([prod1Id])
    ).rejects.toThrow("Product comparison requires at least 2 valid product IDs");
  });

  it("should reject comparison when a non-existent product ID is requested (Hallucination Defense)", async () => {
    const fakeId = "non-existent-hallucinated-id-12345";
    await expect(
      productComparisonEngine.compareProducts([prod1Id, fakeId])
    ).rejects.toThrow(/does not exist in catalog/);
  });
});
