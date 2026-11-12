import { describe, it, expect, beforeAll } from "vitest";
import { catalogService } from "../src/server/commerce/catalog";

describe("Phase 3 — Product Catalog & Grounded Search", () => {
  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
  });

  it("should retrieve seeded catalog items with valid fields and availability", async () => {
    const products = await catalogService.searchProducts({ limit: 10 });

    expect(products.length).toBeGreaterThan(0);
    const keyboard = products.find((p) => p.sku === "PROD-KB-001");
    expect(keyboard).toBeDefined();
    expect(keyboard?.name).toContain("Logitech MX Mechanical");
    expect(keyboard?.price).toBe(79.99);
    expect(keyboard?.currency).toBe("USD");
    expect(keyboard?.isAvailable).toBe(true);
  });

  it("should filter products strictly by category", async () => {
    const keyboards = await catalogService.searchProducts({ category: "keyboards" });
    expect(keyboards.length).toBeGreaterThan(0);
    for (const kb of keyboards) {
      expect(kb.category).toBe("keyboards");
    }
  });

  it("should filter products by price boundary (budget constraint)", async () => {
    const under80 = await catalogService.searchProducts({ maxPrice: 80.0, category: "keyboards" });
    expect(under80.length).toBeGreaterThan(0);
    for (const item of under80) {
      expect(item.price).toBeLessThanOrEqual(80.0);
    }
  });

  it("should filter out out-of-stock items when inStockOnly is true", async () => {
    const inStock = await catalogService.searchProducts({ inStockOnly: true });
    for (const item of inStock) {
      expect(item.isAvailable).toBe(true);
      expect(item.inventory).toBeGreaterThan(0);
    }

    const oos = inStock.find((p) => p.sku === "PROD-OOS-001");
    expect(oos).toBeUndefined();
  });

  it("should perform keyword search matching name and description", async () => {
    const results = await catalogService.searchProducts({ query: "noise-canceling" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].category).toBe("audio");
  });
});
