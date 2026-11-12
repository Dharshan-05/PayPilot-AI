import { describe, it, expect, beforeAll } from "vitest";
import { searchManager, SearchManager } from "../src/server/commerce/search/manager";
import { mockSearchProvider } from "../src/server/commerce/search/mock-provider";
import { ProductSearchProvider, ProductSearchRequest, ProductSearchResponse, SearchHealth } from "../src/server/commerce/search/types";
import { catalogService } from "../src/server/commerce/catalog";
import { getConfig } from "../src/server/config/env";
import { NextRequest } from "next/server";
import { POST as handleReindex } from "../src/app/api/products/reindex/route";
import { GET as handleHealth } from "../src/app/api/health/route";

// Simulates a failing or crashed Elasticsearch cluster
class FailingElasticProvider implements ProductSearchProvider {
  public readonly providerType = "elastic" as const;

  async indexProduct(): Promise<void> {
    throw new Error("Connection refused: Elasticsearch cluster unreachable at http://localhost:9200");
  }
  async updateProduct(): Promise<void> {
    throw new Error("Connection refused");
  }
  async deleteProduct(): Promise<void> {
    throw new Error("Connection refused");
  }
  async bulkIndex(): Promise<number> {
    throw new Error("Connection refused");
  }
  async clearIndex(): Promise<void> {
    throw new Error("Connection refused");
  }
  async reindex(): Promise<{ count: number; durationMs: number }> {
    throw new Error("Connection refused");
  }
  async healthCheck(): Promise<SearchHealth> {
    return {
      provider: "elastic",
      status: "unhealthy",
      index: "products",
      documentCount: 0,
      latencyMs: 50,
      details: { error: "Cluster unreachable" },
    };
  }
  async search(request: ProductSearchRequest): Promise<ProductSearchResponse> {
    throw new Error("Elasticsearch query timeout: ETIMEDOUT (simulated cluster outage)");
  }
}

describe("Phase 5 — Semantic Search: Security, Injection Defense & Fallback Resilience", () => {
  beforeAll(async () => {
    await catalogService.ensureCatalogSeeded();
    await searchManager.reindexAll();
  });

  it("should never leak Elasticsearch API keys or connection credentials in search responses or diagnostics", async () => {
    const config = getConfig();
    const res = await searchManager.searchAndRank({
      query: "wireless bluetooth keyboard ELASTICSEARCH_API_KEY",
      mode: "hybrid",
      limit: 5,
    });

    const json = JSON.stringify(res);
    if (config.ELASTICSEARCH_API_KEY) {
      expect(json).not.toContain(config.ELASTICSEARCH_API_KEY);
    }
    expect(json).not.toContain(config.PAYPAL_CLIENT_SECRET);
  });

  it("should treat raw Elasticsearch DSL or script injection attempts as sanitized text without query manipulation", async () => {
    const maliciousQuery = '{"query": {"match_all": {}}, "script": "ctx._source.price = 0"}';
    const res = await searchManager.searchAndRank({
      query: maliciousQuery,
      mode: "hybrid",
      limit: 5,
    });

    // Engine must not crash or execute the DSL, and queryAnalysis safely reflects sanitized tokens
    expect(res).toBeDefined();
    expect(res.queryAnalysis.rawQuery).toBe(maliciousQuery);
    expect(res.rankedResults).toBeDefined();
  });

  it("should safely truncate oversized search queries to prevent memory or regex DOS", async () => {
    const massiveQuery = "keyboard ".repeat(500); // 4500 characters
    const res = await searchManager.searchAndRank({
      query: massiveQuery,
      mode: "hybrid",
      limit: 5,
    });

    expect(res).toBeDefined();
    expect(res.queryAnalysis.normalizedQuery.length).toBeLessThanOrEqual(200);
  });

  it("should gracefully degrade to fallback mock provider when primary search cluster fails (Resilience & Fallback)", async () => {
    const resilientManager = new SearchManager();
    // Configure failing provider simulating a live Elasticsearch network outage
    resilientManager.setProvider(new FailingElasticProvider());

    // Execute search request
    const res = await resilientManager.searchAndRank({
      query: "wireless mechanical keyboard",
      mode: "hybrid",
      limit: 5,
    });

    // Verification: Fallback provider was utilized, zero crashes, valid results returned
    expect(res.fallbackUsed).toBe(true);
    expect(res.provider).toBe("mock");
    expect(res.rankedResults.length).toBeGreaterThan(0);
    expect(res.rankedResults[0].product.name).toContain("Keyboard");
  });

  it("should report search provider health via /api/health without leaking secrets", async () => {
    const req = new NextRequest("http://localhost:3000/api/health");
    const res = await handleHealth(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.search).toBeDefined();
    expect(body.data.search.status).toBe("healthy");
    expect(body.data.search.documentCount).toBeGreaterThan(0);
    expect(body.data.diagnostics.SEARCH.API_KEY_CONFIGURED).toBeDefined();
    expect(typeof body.data.diagnostics.SEARCH.API_KEY_CONFIGURED).toBe("boolean");
    expect(JSON.stringify(body)).not.toContain("your_elastic_api_key_here");
    expect(JSON.stringify(body)).not.toContain("top_secret");
  });

  it("should execute catalog reindexing via POST /api/products/reindex", async () => {
    const req = new NextRequest("http://localhost:3000/api/products/reindex", {
      method: "POST",
    });
    const res = await handleReindex(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.count).toBeGreaterThan(0);
    expect(body.data.durationMs).toBeGreaterThanOrEqual(0);
  });
});
