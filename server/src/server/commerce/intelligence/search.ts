import { catalogService, ProductSearchParams } from "../catalog";
import { ProductEnricher } from "./attributes";
import { MultiFactorRankingEngine, multiFactorRankingEngine, RankedProductResult, RankingCriteria } from "./ranking";
import { searchManager } from "../search/manager";
import { SearchMode, SearchProviderType } from "../search/types";
import { sanitizeString } from "../../security/sanitizer";
import { Logger } from "../../observability/logger";

const log = new Logger("ProductIntelligence:Search");

export type ProductSortOption = "relevance" | "price_asc" | "price_desc" | "availability";

export interface IntelligentSearchOptions {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  useCase?: string;
  features?: string[];
  userPreferences?: string[];
  inStockOnly?: boolean;
  sort?: ProductSortOption;
  mode?: SearchMode;
  page?: number;
  limit?: number;
}

export interface IntelligentSearchResponse {
  results: RankedProductResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  queryMetadata: {
    normalizedQuery: string;
    extractedCategory?: string;
    extractedBudget?: number;
    extractedUseCase?: string;
    appliedFeatures: string[];
    searchMode?: SearchMode;
    searchProvider?: SearchProviderType;
    latencyMs?: number;
  };
}

export class IntelligentSearchEngine {
  private rankingEngine: MultiFactorRankingEngine;

  constructor(rankingEngine?: MultiFactorRankingEngine) {
    this.rankingEngine = rankingEngine || multiFactorRankingEngine;
  }

  /**
   * Normalizes raw natural language queries and extracts structured search constraints.
   */
  public normalizeQuery(rawQuery: string): {
    cleanQuery: string;
    category?: string;
    budget?: number;
    useCase?: string;
    features: string[];
  } {
    const clean = sanitizeString(rawQuery, 200).toLowerCase().trim();
    let category: string | undefined = undefined;
    let budget: number | undefined = undefined;
    let useCase: string | undefined = undefined;
    const features: string[] = [];

    // Category extraction with typos & synonyms
    if (clean.includes("keyboard") || clean.includes("keybord") || clean.includes("keeb")) category = "keyboards";
    else if (clean.includes("headphone") || clean.includes("headfone") || clean.includes("audio") || clean.includes("earphone") || clean.includes("earbuds") || clean.includes("headset")) category = "audio";
    else if (clean.includes("mouse") || clean.includes("mice") || clean.includes("trackball") || clean.includes("pointer")) category = "mice";
    else if (clean.includes("monitor") || clean.includes("moniter") || clean.includes("screen") || clean.includes("display")) category = "monitors";
    else if (clean.includes("cloud") || clean.includes("developer") || clean.includes("software")) category = "software";

    // Feature extraction & synonym expansion
    if (clean.includes("wireless") || clean.includes("bluetooth") || clean.includes("cordless")) {
      features.push("wireless");
    }
    if (clean.includes("mechanical")) features.push("mechanical");
    if (clean.includes("noise-canceling") || clean.includes("noise-cancelling") || clean.includes("anc")) {
      features.push("noise-cancelling");
    }
    if (clean.includes("4k") || clean.includes("uhd")) features.push("4k-uhd");
    if (clean.includes("quiet") || clean.includes("silent")) features.push("quiet-clicks");

    // Use Case extraction
    if (clean.includes("for coding") || clean.includes("programming") || clean.includes("developer")) {
      useCase = "coding";
    } else if (clean.includes("for gaming") || clean.includes("gamer")) {
      useCase = "gaming";
    } else if (clean.includes("for office") || clean.includes("work") || clean.includes("typing")) {
      useCase = "office";
    } else if (clean.includes("for travel") || clean.includes("commute")) {
      useCase = "travel";
    }

    // Budget extraction: "under $80", "budget 100", "below 70", "$50"
    const budgetMatch = clean.match(/(?:under|below|budget|max|up to|less than)\s*\$?\s*(\d+(?:\.\d{1,2})?)|\$(\d+(?:\.\d{1,2})?)/i);
    if (budgetMatch) {
      const valStr = budgetMatch[1] || budgetMatch[2];
      if (valStr) {
        const parsed = parseFloat(valStr);
        if (parsed > 0 && parsed < 100000) {
          budget = parsed;
        }
      }
    }

    return {
      cleanQuery: clean,
      category,
      budget,
      useCase,
      features,
    };
  }

  /**
   * Performs multi-factor retrieval and deterministic ranking with pagination.
   */
  async search(options: IntelligentSearchOptions = {}): Promise<IntelligentSearchResponse> {
    const rawQuery = options.query || "";
    const normalized = this.normalizeQuery(rawQuery);

    const category = options.category || normalized.category;
    const rawMax = options.maxPrice !== undefined ? options.maxPrice : normalized.budget;
    const maxBudget = rawMax !== undefined && Number.isFinite(rawMax) ? rawMax : undefined;
    const minBudget = options.minPrice !== undefined && Number.isFinite(options.minPrice) ? options.minPrice : undefined;
    const useCase = options.useCase || normalized.useCase;
    const features = Array.from(new Set([...(options.features || []), ...normalized.features]));

    const page = typeof options.page === "number" && Number.isFinite(options.page) ? Math.max(1, Math.floor(options.page)) : 1;
    const limit = typeof options.limit === "number" && Number.isFinite(options.limit) ? Math.min(50, Math.max(1, Math.floor(options.limit))) : 10;

    // Execute through Semantic/Hybrid Search Manager with DB Revalidation
    const searchResult = await searchManager.searchAndRank({
      query: rawQuery,
      category,
      minPrice: minBudget,
      maxPrice: maxBudget,
      currency: options.currency || "USD",
      useCase,
      features,
      preferences: options.userPreferences,
      inStockOnly: options.inStockOnly !== false,
      mode: options.mode || "hybrid",
      limit: 100, // Fetch candidates for accurate multi-factor ranking
    });

    let ranked = [...searchResult.rankedResults];

    // Apply Sort Override if specified
    const sort = options.sort || "relevance";
    if (sort === "price_asc") {
      ranked.sort((a, b) => a.product.price - b.product.price);
    } else if (sort === "price_desc") {
      ranked.sort((a, b) => b.product.price - a.product.price);
    } else if (sort === "availability") {
      ranked.sort((a, b) => b.product.inventory - a.product.inventory);
    }

    // Pagination
    const total = ranked.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedResults = ranked.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      queryMetadata: {
        normalizedQuery: normalized.cleanQuery,
        extractedCategory: category,
        extractedBudget: maxBudget,
        extractedUseCase: useCase,
        appliedFeatures: features,
        searchMode: searchResult.searchMode,
        searchProvider: searchResult.provider,
        latencyMs: searchResult.latencyMs,
      },
    };
  }
}

export const intelligentSearchEngine = new IntelligentSearchEngine();
