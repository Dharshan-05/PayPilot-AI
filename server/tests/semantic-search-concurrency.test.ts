import { describe, it, expect, beforeAll } from "vitest";
import { catalogService } from "../src/server/commerce/catalog";
import { searchManager } from "../src/server/commerce/search/manager";
import { mockSearchProvider } from "../src/server/commerce/search/mock-provider";

describe("Phase 5 — Semantic Search: Concurrency & Latency Performance Benchmarks", () => {
  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    await searchManager.reindexAll();
  });

  it("should handle 20 concurrent search requests deterministically without race conditions", async () => {
    const queries = [
      "quiet keyboard for coding",
      "wireless headphones with noise cancelling",
      "ergonomic mouse for office",
      "4k monitor for productivity",
      "developer tools and software",
      "bluetooth mechanical keeb",
      "soundcore audio headphones",
      "keychron mechanical keyboard",
      "logitech wireless mouse",
      "high resolution display screen",
    ];

    // Create 20 concurrent search promises
    const searchPromises = Array.from({ length: 20 }, (_, idx) => {
      const q = queries[idx % queries.length];
      return searchManager.searchAndRank({
        query: q,
        mode: "hybrid",
        limit: 5,
      });
    });

    const results = await Promise.all(searchPromises);

    expect(results.length).toBe(20);
    for (const r of results) {
      expect(r.rankedResults.length).toBeGreaterThan(0);
      expect(r.total).toBeGreaterThan(0);
      expect(r.fallbackUsed).toBe(false);
    }
  });

  it("should allow concurrent product updates while searches are executing", async () => {
    const products = await catalogService.searchProducts({ inStockOnly: false });
    const sample = products[0];

    const concurrentOperations = [
      searchManager.searchAndRank({ query: "keyboard", mode: "hybrid", limit: 5 }),
      mockSearchProvider.updateProduct(sample),
      searchManager.searchAndRank({ query: "headphones", mode: "hybrid", limit: 5 }),
      mockSearchProvider.indexProduct(sample),
      searchManager.searchAndRank({ query: "mouse", mode: "hybrid", limit: 5 }),
    ];

    const opsResults = await Promise.all(concurrentOperations);
    expect(opsResults.length).toBe(5);
  });

  it("should satisfy strict latency performance budgets for keyword search (< 100ms)", async () => {
    // Warm-up
    await searchManager.searchAndRank({ query: "keyboard", mode: "keyword", limit: 5 });

    const start = performance.now();
    const res = await searchManager.searchAndRank({
      query: "mechanical keyboard",
      mode: "keyword",
      limit: 5,
    });
    const duration = performance.now() - start;

    expect(res.rankedResults.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });

  it("should satisfy strict latency performance budgets for semantic search (< 200ms)", async () => {
    // Warm-up
    await searchManager.searchAndRank({ query: "quiet typing", mode: "semantic", limit: 5 });

    const start = performance.now();
    const res = await searchManager.searchAndRank({
      query: "quiet typing tool for programming",
      mode: "semantic",
      limit: 5,
    });
    const duration = performance.now() - start;

    expect(res.rankedResults.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(200);
  });

  it("should satisfy strict latency performance budgets for hybrid search (< 300ms)", async () => {
    // Warm-up
    await searchManager.searchAndRank({ query: "wireless headphones", mode: "hybrid", limit: 5 });

    const start = performance.now();
    const res = await searchManager.searchAndRank({
      query: "wireles headfone with anc for travel",
      mode: "hybrid",
      limit: 5,
    });
    const duration = performance.now() - start;

    expect(res.rankedResults.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(300);
  });
});
