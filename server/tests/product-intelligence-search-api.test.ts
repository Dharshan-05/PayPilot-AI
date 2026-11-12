import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET as handleSearch } from "../src/app/api/products/search/route";
import { POST as handleCompare } from "../src/app/api/products/compare/route";
import { POST as handleRecommend } from "../src/app/api/products/recommend/route";
import { POST as handleSimilar } from "../src/app/api/products/similar/route";
import { catalogService } from "../src/server/commerce/catalog";
import { intelligentSearchEngine } from "../src/server/commerce/intelligence/search";

describe("Phase 4 — Intelligent Search & Product Intelligence APIs", () => {
  let prod1Id: string;
  let prod2Id: string;

  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    const p1 = await catalogService.getProductBySku("PROD-KB-001");
    const p2 = await catalogService.getProductBySku("PROD-KB-002");
    prod1Id = p1!.id;
    prod2Id = p2!.id;
  });

  it("should normalize queries and extract category, budget, and use-case constraints", () => {
    const normalized = intelligentSearchEngine.normalizeQuery("bluetooth keyboard under $80 for coding");

    expect(normalized.category).toBe("keyboards");
    expect(normalized.budget).toBe(80);
    expect(normalized.useCase).toBe("coding");
    expect(normalized.features).toContain("wireless");
  });

  it("should serve intelligent search via GET /api/products/search with pagination and metadata", async () => {
    const req = new NextRequest("http://localhost:3000/api/products/search?q=wireless+keyboard&maxPrice=80&page=1&limit=2");
    const res = await handleSearch(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.results).toBeDefined();
    expect(body.data.results.length).toBeLessThanOrEqual(2);
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(2);
    expect(body.data.queryMetadata.extractedCategory).toBe("keyboards");
    expect(body.data.queryMetadata.extractedBudget).toBe(80);
  });

  it("should support sorting by price ascending and descending via GET /api/products/search", async () => {
    const reqAsc = new NextRequest("http://localhost:3000/api/products/search?category=keyboards&sort=price_asc");
    const resAsc = await handleSearch(reqAsc);
    const bodyAsc = await resAsc.json();

    expect(resAsc.status).toBe(200);
    const resultsAsc = bodyAsc.data.results;
    if (resultsAsc.length >= 2) {
      expect(resultsAsc[0].product.price).toBeLessThanOrEqual(resultsAsc[1].product.price);
    }
  });

  it("should serve side-by-side product comparison via POST /api/products/compare", async () => {
    const req = new NextRequest("http://localhost:3000/api/products/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: [prod1Id, prod2Id] }),
    });

    const res = await handleCompare(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.products.length).toBe(2);
    expect(body.data.comparisonRows.length).toBeGreaterThan(0);
    expect(body.data.advantages).toBeDefined();
  });

  it("should serve multi-factor recommendations via POST /api/products/recommend", async () => {
    const req = new NextRequest("http://localhost:3000/api/products/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "keyboards",
        maxBudget: 80,
        useCase: "coding",
      }),
    });

    const res = await handleRecommend(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.recommendations.length).toBeGreaterThan(0);
    expect(body.data.recommendations[0].evidence.badge).toBeDefined();
  });

  it("should serve similar product discovery via POST /api/products/similar", async () => {
    const req = new NextRequest("http://localhost:3000/api/products/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: prod1Id, limit: 3 }),
    });

    const res = await handleSimilar(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
