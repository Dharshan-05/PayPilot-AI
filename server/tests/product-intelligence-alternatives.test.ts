import { describe, it, expect, beforeAll } from "vitest";
import { productAlternativesEngine } from "../src/server/commerce/intelligence/alternatives";
import { catalogService } from "../src/server/commerce/catalog";

describe("Phase 4 — Product Alternatives & Similar Products Engine", () => {
  let oosProductId: string;
  let inStockKeyboardId: string;

  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    const oos = await catalogService.getProductBySku("PROD-OOS-001");
    const inStock = await catalogService.getProductBySku("PROD-KB-001");
    oosProductId = oos!.id;
    inStockKeyboardId = inStock!.id;
  });

  it("should automatically find in-stock substitutes when a requested product is out of stock", async () => {
    const res = await productAlternativesEngine.findAlternatives(oosProductId, {
      reason: "OUT_OF_STOCK",
    });

    expect(res.targetProduct.id).toBe(oosProductId);
    expect(res.targetProduct.stockStatus).toBe("OUT_OF_STOCK");
    expect(res.alternatives.length).toBeGreaterThan(0);

    // All returned alternatives must be in stock
    for (const alt of res.alternatives) {
      expect(alt.product.stockStatus).not.toBe("OUT_OF_STOCK");
      expect(alt.product.id).not.toBe(oosProductId);
      expect(alt.product.category).toBe("keyboards");
    }
  });

  it("should discover similar products based on category and feature alignment", async () => {
    const similar = await productAlternativesEngine.findSimilarProducts(inStockKeyboardId, {
      inStockOnly: true,
      limit: 3,
    });

    expect(similar.length).toBeGreaterThan(0);
    for (const item of similar) {
      expect(item.product.id).not.toBe(inStockKeyboardId);
      expect(item.product.category).toBe("keyboards");
      expect(item.evidence.scoreBreakdown).toBeDefined();
    }
  });
});
