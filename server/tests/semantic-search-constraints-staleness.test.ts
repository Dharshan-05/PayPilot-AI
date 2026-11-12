import { describe, it, expect, beforeAll } from "vitest";
import { catalogService } from "../src/server/commerce/catalog";
import { searchManager } from "../src/server/commerce/search/manager";
import { mockSearchProvider } from "../src/server/commerce/search/mock-provider";
import { prisma } from "../src/server/db/client";

describe("Phase 5 — Constraints & Authoritative Database Revalidation (Staleness Protection)", () => {
  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    await searchManager.reindexAll();
  });

  it("should enforce structured category and budget constraints on hybrid search", async () => {
    const res = await searchManager.searchAndRank({
      query: "wireless mechanical",
      category: "keyboards",
      maxPrice: 75.0,
      currency: "USD",
      inStockOnly: true,
      mode: "hybrid",
      limit: 5,
    });

    expect(res.rankedResults.length).toBeGreaterThan(0);
    for (const r of res.rankedResults) {
      expect(r.product.category).toBe("keyboards");
      expect(r.product.price).toBeLessThanOrEqual(75.0);
      expect(r.product.inventory).toBeGreaterThan(0);
    }
  });

  it("should reject and exclude stale index documents that do not exist in the authoritative database", async () => {
    // 1. Manually inject a ghost/hallucinated document into the search provider
    const ghostId = "ghost-product-uuid-99999";
    await mockSearchProvider.indexProduct({
      id: ghostId,
      sku: "PROD-GHOST-001",
      name: "Stale Ghost Product",
      description: "This item exists only in the search index, not in SQLite Prisma DB",
      category: "keyboards",
      price: 19.99,
      currency: "USD",
      inventory: 100,
      isAvailable: true,
      metadata: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Perform search that matches the ghost product
    const res = await searchManager.searchAndRank({
      query: "Stale Ghost Product",
      mode: "keyword",
      limit: 10,
    });

    // 3. The search provider raw hits may have found it, but searchAndRank authoritative revalidation MUST filter it out!
    const foundGhostInRanked = res.rankedResults.some((r) => r.product.id === ghostId);
    expect(foundGhostInRanked).toBe(false);

    // Clean up
    await mockSearchProvider.deleteProduct(ghostId);
  });

  it("should guarantee that authoritative database prices override any stale or manipulated prices in search documents", async () => {
    // 1. Get real product from SQLite
    const realProduct = await catalogService.getProductBySku("PROD-KB-001");
    expect(realProduct).not.toBeNull();
    const authoritativePrice = realProduct!.price; // e.g. 79.99

    // 2. Manually mutate the document in the search index with a fake stale price ($1.00)
    await mockSearchProvider.indexProduct({
      ...realProduct!,
      price: 1.0, // Stale/tampered price
    });

    // 3. Search for this product through SearchManager
    const res = await searchManager.searchAndRank({
      query: "Logitech MX Mechanical",
      mode: "hybrid",
      limit: 5,
    });

    const matchedProduct = res.rankedResults.find((r) => r.product.id === realProduct!.id);
    expect(matchedProduct).toBeDefined();

    // 4. Critical Invariant: The returned product price MUST be the authoritative database price ($79.99), NOT $1.00!
    expect(matchedProduct!.product.price).toBe(authoritativePrice);
    expect(matchedProduct!.product.price).not.toBe(1.0);

    // Restore index
    await searchManager.reindexAll();
  });

  it("should filter out items that have 0 inventory in the database even if the search document claims in-stock", async () => {
    const products = await catalogService.searchProducts({ inStockOnly: false });
    const target = products[0];

    // Temporarily set inventory to 0 in SQLite
    await prisma.product.update({
      where: { id: target.id },
      data: { inventory: 0, isAvailable: false },
    });

    try {
      const res = await searchManager.searchAndRank({
        query: target.name,
        inStockOnly: true,
        mode: "hybrid",
      });

      // Target should be filtered out by authoritative database check
      const foundTarget = res.rankedResults.some((r) => r.product.id === target.id);
      expect(foundTarget).toBe(false);
    } finally {
      // Restore inventory
      await prisma.product.update({
        where: { id: target.id },
        data: { inventory: target.inventory, isAvailable: true },
      });
      await searchManager.reindexAll();
    }
  });
});
