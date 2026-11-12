import { Product } from "@prisma/client";
import {
  ProductSearchHit,
  ProductSearchProvider,
  ProductSearchRequest,
  ProductSearchResponse,
  SearchHealth,
  SearchMode,
  SearchProviderType,
} from "./types";
import { MockSearchProvider, mockSearchProvider } from "./mock-provider";
import { ElasticsearchProvider } from "./elastic-provider";
import { catalogService } from "../catalog";
import { ProductEnricher, EnrichedProduct } from "../intelligence/attributes";
import { MultiFactorRankingEngine, multiFactorRankingEngine, RankedProductResult, RankingCriteria } from "../intelligence/ranking";
import { getConfig } from "../../config/env";
import { Logger } from "../../observability/logger";

const log = new Logger("SemanticSearch:Manager");

export interface ValidatedSearchResult {
  rankedResults: RankedProductResult[];
  rawHits: ProductSearchHit[];
  total: number;
  searchMode: SearchMode;
  provider: SearchProviderType;
  fallbackUsed: boolean;
  latencyMs: number;
  queryAnalysis: ProductSearchResponse["queryAnalysis"];
}

export class SearchManager {
  private primaryProvider: ProductSearchProvider;
  private fallbackProvider: ProductSearchProvider;
  private rankingEngine: MultiFactorRankingEngine;
  private isCatalogIndexed = false;

  constructor(rankingEngine: MultiFactorRankingEngine = multiFactorRankingEngine) {
    this.rankingEngine = rankingEngine;
    this.fallbackProvider = mockSearchProvider;

    const config = getConfig();
    if (config.SEARCH_PROVIDER === "elastic" && config.ELASTICSEARCH_ENABLED) {
      this.primaryProvider = new ElasticsearchProvider();
    } else {
      this.primaryProvider = mockSearchProvider;
    }
  }

  /**
   * Sets the active search provider (useful for testing and runtime switching).
   */
  public setProvider(provider: ProductSearchProvider): void {
    this.primaryProvider = provider;
  }

  /**
   * Ensures authoritative catalog products are seeded in the active search provider index.
   */
  public async ensureIndexed(): Promise<void> {
    if (this.isCatalogIndexed) return;

    try {
      const products = await catalogService.searchProducts({ inStockOnly: false, limit: 100 });
      await this.primaryProvider.bulkIndex(products);
      if (this.primaryProvider !== this.fallbackProvider) {
        await this.fallbackProvider.bulkIndex(products);
      }
      this.isCatalogIndexed = true;
      log.info("Catalog products successfully indexed in search provider", {
        count: products.length,
        provider: this.primaryProvider.providerType,
      });
    } catch (err: any) {
      log.warn("Catalog indexing deferred or encountered issue", { error: err.message });
    }
  }

  /**
   * Re-indexes all authoritative catalog items from the database into the search provider.
   */
  public async reindexAll(): Promise<{ count: number; durationMs: number; provider: SearchProviderType }> {
    const start = performance.now();
    const products = await catalogService.searchProducts({ inStockOnly: false, limit: 100 });

    let count = 0;
    try {
      const res = await this.primaryProvider.reindex(products);
      count = res.count;
    } catch (err: any) {
      log.warn("Primary provider reindex failed; falling back to in-memory mock", { error: err.message });
      const res = await this.fallbackProvider.reindex(products);
      count = res.count;
    }

    this.isCatalogIndexed = true;
    return {
      count,
      durationMs: Math.round(performance.now() - start),
      provider: this.primaryProvider.providerType,
    };
  }

  /**
   * Performs hybrid/semantic search with Authoritative Database Revalidation and Product Intelligence Ranking.
   *
   * Flow:
   * 1. Query Search Provider (Elastic or Mock)
   * 2. If primary fails -> Gracefully degrade to Fallback Provider
   * 3. Authoritative Revalidation: Query Prisma SQLite DB for candidate IDs.
   *    - Exclude products deleted from DB (Stale Index Protection)
   *    - Overwrite prices/stock with authoritative DB values (Zero Financial Stale Risk)
   * 4. Multi-Factor Ranking Engine evaluates final business-aware ranking & badges.
   */
  async searchAndRank(request: ProductSearchRequest): Promise<ValidatedSearchResult> {
    const startTime = performance.now();
    await this.ensureIndexed();

    let searchResponse: ProductSearchResponse;
    let fallbackUsed = false;

    try {
      searchResponse = await this.primaryProvider.search(request);
    } catch (err: any) {
      log.warn("Primary search provider failed; degrading to fallback mock provider", {
        provider: this.primaryProvider.providerType,
        error: err.message,
      });
      fallbackUsed = true;
      searchResponse = await this.fallbackProvider.search(request);
    }

    // 2. Authoritative Database Revalidation (Rule #3 & #23)
    const candidateIds = searchResponse.hits.map((h) => h.id);
    const authoritativeCandidates: EnrichedProduct[] = [];
    const validatedHits: ProductSearchHit[] = [];

    for (const hit of searchResponse.hits) {
      const dbProduct = await catalogService.getProductById(hit.id);

      // If document exists in Elastic but NOT in SQLite database -> Exclude it (Stale Index Protection)
      if (!dbProduct) {
        log.warn("Search result rejected by authoritative database verification (stale index entry)", {
          staleId: hit.id,
        });
        continue;
      }

      // If item was marked out-of-stock in DB but inStockOnly was requested -> Filter out
      if (request.inStockOnly && (!dbProduct.isAvailable || dbProduct.inventory <= 0)) {
        continue;
      }

      // Authoritative DB product replaces any potentially stale index data
      const enriched = ProductEnricher.enrich(dbProduct);
      authoritativeCandidates.push(enriched);
      validatedHits.push(hit);
    }

    // 3. Multi-Factor Product Intelligence Ranking
    const rankingCriteria: RankingCriteria = {
      query: searchResponse.queryAnalysis.normalizedQuery,
      category: request.category || searchResponse.queryAnalysis.detectedCategory,
      maxBudget: request.maxPrice || searchResponse.queryAnalysis.detectedBudget,
      minBudget: request.minPrice,
      currency: request.currency,
      requiredFeatures: request.features,
      useCase: request.useCase,
      userPreferences: request.preferences,
      inStockOnly: request.inStockOnly !== false,
    };

    const rankedResults = this.rankingEngine.rank(authoritativeCandidates, rankingCriteria);

    return {
      rankedResults,
      rawHits: validatedHits,
      total: validatedHits.length,
      searchMode: searchResponse.searchMode,
      provider: fallbackUsed ? this.fallbackProvider.providerType : searchResponse.provider,
      fallbackUsed,
      latencyMs: Math.round(performance.now() - startTime),
      queryAnalysis: searchResponse.queryAnalysis,
    };
  }

  async healthCheck(): Promise<SearchHealth> {
    try {
      return await this.primaryProvider.healthCheck();
    } catch (err: any) {
      return {
        provider: this.primaryProvider.providerType,
        status: "degraded",
        index: "unknown",
        documentCount: 0,
        latencyMs: 0,
        details: { error: err.message, fallbackStatus: "available" },
      };
    }
  }
}

export const searchManager = new SearchManager();
