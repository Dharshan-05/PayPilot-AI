import { EnrichedProduct, ProductEnricher } from "./attributes";
import { MultiFactorRankingEngine, multiFactorRankingEngine, RankedProductResult } from "./ranking";
import { catalogService } from "../catalog";
import { Logger } from "../../observability/logger";

const log = new Logger("ProductIntelligence:Alternatives");

export class ProductAlternativesEngine {
  private rankingEngine: MultiFactorRankingEngine;

  constructor(rankingEngine?: MultiFactorRankingEngine) {
    this.rankingEngine = rankingEngine || multiFactorRankingEngine;
  }

  /**
   * Finds grounded in-stock alternative substitutes when a target product is unavailable,
   * out of stock, or over the buyer's budget limit.
   */
  async findAlternatives(
    targetProductId: string,
    options: { maxBudget?: number; reason?: "OUT_OF_STOCK" | "OVER_BUDGET" | "BETTER_VALUE" } = {}
  ): Promise<{ targetProduct: EnrichedProduct; alternatives: RankedProductResult[]; reason: string }> {
    const rawTarget = await catalogService.getProductById(targetProductId);
    if (!rawTarget) {
      throw new Error(`Target product '${targetProductId}' not found.`);
    }

    const targetProduct = ProductEnricher.enrich(rawTarget);
    const reasonText =
      options.reason === "OUT_OF_STOCK" || targetProduct.stockStatus === "OUT_OF_STOCK"
        ? `Target product '${targetProduct.name}' is currently out of stock. Surfacing active substitutes.`
        : options.reason === "OVER_BUDGET" || (options.maxBudget && targetProduct.price > options.maxBudget)
        ? `Target product price of $${targetProduct.price.toFixed(2)} exceeds budget ($${options.maxBudget?.toFixed(
            2
          )}). Finding budget-friendly alternatives.`
        : `Finding top alternatives for '${targetProduct.name}'.`;

    // Query active in-stock products in the same category excluding target
    const categoryProducts = await catalogService.searchProducts({
      category: targetProduct.category,
      maxPrice: options.maxBudget || targetProduct.price * 1.25,
      inStockOnly: true,
      limit: 10,
    });

    const candidateList = categoryProducts
      .filter((p) => p.id !== targetProduct.id)
      .map((p) => ProductEnricher.enrich(p));

    // Rank candidates using target product's key features and target budget
    const rankedAlternatives = this.rankingEngine.rank(candidateList, {
      category: targetProduct.category,
      maxBudget: options.maxBudget || targetProduct.price,
      requiredFeatures: targetProduct.attributes.features.slice(0, 2),
      useCase: targetProduct.attributes.useCases[0],
      inStockOnly: true,
    });

    return {
      targetProduct,
      alternatives: rankedAlternatives.slice(0, 3),
      reason: reasonText,
    };
  }

  /**
   * Discovers similar products based on feature overlap, category, and use-case alignment.
   */
  async findSimilarProducts(
    targetProductId: string,
    options: { maxBudget?: number; inStockOnly?: boolean; limit?: number } = {}
  ): Promise<RankedProductResult[]> {
    const rawTarget = await catalogService.getProductById(targetProductId);
    if (!rawTarget) {
      throw new Error(`Target product '${targetProductId}' not found.`);
    }

    const target = ProductEnricher.enrich(rawTarget);

    const candidates = await catalogService.searchProducts({
      category: target.category,
      maxPrice: options.maxBudget,
      inStockOnly: options.inStockOnly !== false,
      limit: options.limit ? options.limit + 2 : 10,
    });

    const enriched = candidates
      .filter((c) => c.id !== target.id)
      .map((c) => ProductEnricher.enrich(c));

    const ranked = this.rankingEngine.rank(enriched, {
      category: target.category,
      maxBudget: options.maxBudget,
      requiredFeatures: target.attributes.features,
      useCase: target.attributes.useCases[0],
      inStockOnly: options.inStockOnly !== false,
    });

    return ranked.slice(0, options.limit || 4);
  }
}

export const productAlternativesEngine = new ProductAlternativesEngine();
