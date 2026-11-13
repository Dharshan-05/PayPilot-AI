import { EnrichedProduct, StockStatus } from "./attributes";
import { Logger } from "../../observability/logger";

const log = new Logger("ProductIntelligence:Ranking");

export interface RankingWeights {
  relevance: number;
  featureMatch: number;
  budget: number;
  useCase: number;
  availability: number;
  preference: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  relevance: 0.25,
  featureMatch: 0.25,
  budget: 0.20,
  useCase: 0.15,
  availability: 0.10,
  preference: 0.05,
};

export type BudgetFit =
  | "UNDER_BUDGET"
  | "WITHIN_BUDGET"
  | "SLIGHTLY_OVER_BUDGET"
  | "SIGNIFICANTLY_OVER_BUDGET";

export type RecommendationBadge =
  | "BEST MATCH"
  | "BEST VALUE"
  | "BUDGET OPTION"
  | "PREMIUM OPTION";

export interface RankingCriteria {
  query?: string;
  category?: string;
  maxBudget?: number;
  minBudget?: number;
  currency?: string;
  requiredFeatures?: string[];
  preferredFeatures?: string[];
  useCase?: string;
  userPreferences?: string[];
  inStockOnly?: boolean;
}

export interface RecommendationEvidence {
  productId: string;
  productName: string;
  sku: string;
  badge?: RecommendationBadge;
  overallScore: number;
  scoreBreakdown: {
    relevance: number;
    featureMatch: number;
    budget: number;
    useCase: number;
    availability: number;
    preference: number;
  };
  budgetFit: BudgetFit;
  matchedConstraints: string[];
  unmatchedConstraints: string[];
  whyRecommended: string[];
  tradeoffs: string[];
  facts: {
    price: number;
    currency: string;
    inventory: number;
    stockStatus: StockStatus;
    rating: number;
    brand: string;
  };
}

export interface RankedProductResult {
  product: EnrichedProduct;
  evidence: RecommendationEvidence;
}

export class MultiFactorRankingEngine {
  private weights: RankingWeights;

  constructor(weights: RankingWeights = DEFAULT_RANKING_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Deterministically scores and ranks candidate products.
   */
  public rank(products: EnrichedProduct[], criteria: RankingCriteria): RankedProductResult[] {
    if (!products || products.length === 0) return [];

    const scoredList: RankedProductResult[] = products.map((product) => {
      const evidence = this.evaluateProduct(product, criteria);
      return { product, evidence };
    });

    // Sort descending by overallScore deterministically; tie-break by price ascending, then SKU ascending
    scoredList.sort((a, b) => {
      if (b.evidence.overallScore !== a.evidence.overallScore) {
        return b.evidence.overallScore - a.evidence.overallScore;
      }
      if (Number(a.product.price) !== Number(b.product.price)) {
        return Number(a.product.price) - Number(b.product.price);
      }
      return a.product.sku.localeCompare(b.product.sku);
    });

    // Assign badges dynamically based on ranking signals
    this.assignBadges(scoredList, criteria);

    return scoredList;
  }

  private evaluateProduct(product: EnrichedProduct, criteria: RankingCriteria): RecommendationEvidence {
    const matchedConstraints: string[] = [];
    const unmatchedConstraints: string[] = [];
    const whyRecommended: string[] = [];
    const tradeoffs: string[] = [];

    // 1. Relevance Score (Text matching on query and category)
    let relevanceScore = 0.5;
    if (criteria.query && criteria.query.trim()) {
      const qTokens = criteria.query.toLowerCase().split(/\s+/).filter(Boolean);
      const textToSearch = `${product.name} ${product.description} ${product.category} ${product.attributes.brand}`.toLowerCase();
      let matchedCount = 0;
      for (const token of qTokens) {
        if (textToSearch.includes(token)) matchedCount++;
      }
      relevanceScore = qTokens.length > 0 ? matchedCount / qTokens.length : 0.5;
      if (relevanceScore > 0.6) {
        matchedConstraints.push(`Matches query terms (${Math.round(relevanceScore * 100)}%)`);
      }
    } else {
      relevanceScore = 0.8;
    }

    if (criteria.category && product.category.toLowerCase().includes(criteria.category.toLowerCase())) {
      relevanceScore = Math.min(1.0, relevanceScore + 0.2);
      matchedConstraints.push(`Matches category '${criteria.category}'`);
    }

    // 2. Feature Match Score
    let featureScore = 0.8;
    const allWantedFeatures = [...(criteria.requiredFeatures || []), ...(criteria.preferredFeatures || [])];
    if (allWantedFeatures.length > 0) {
      const normalizedWanted = allWantedFeatures.map((f) => f.toLowerCase().trim());
      const prodFeatures = product.attributes.features;
      let featMatches = 0;
      for (const feat of normalizedWanted) {
        if (prodFeatures.some((pf) => pf.includes(feat) || feat.includes(pf))) {
          featMatches++;
          matchedConstraints.push(`Feature: ${feat}`);
        } else {
          unmatchedConstraints.push(`Missing: ${feat}`);
        }
      }
      featureScore = featMatches / normalizedWanted.length;
    }

    // 3. Budget Score & Fit
    let budgetScore = 1.0;
    let budgetFit: BudgetFit = "WITHIN_BUDGET";

    if (criteria.maxBudget && criteria.maxBudget > 0) {
      const budget = criteria.maxBudget;
      const price = Number(product.price);

      if (price <= budget * 0.9) {
        budgetFit = "UNDER_BUDGET";
        budgetScore = 0.95;
        matchedConstraints.push(`Well under budget ($${price.toFixed(2)} vs max $${budget.toFixed(2)})`);
        whyRecommended.push(`Saves money: priced at $${price.toFixed(2)}, comfortably under your $${budget.toFixed(2)} budget`);
      } else if (price <= budget) {
        budgetFit = "WITHIN_BUDGET";
        budgetScore = 1.0;
        matchedConstraints.push(`Within budget ($${price.toFixed(2)} <= $${budget.toFixed(2)})`);
        whyRecommended.push(`Optimal budget match: $${price.toFixed(2)} within your $${budget.toFixed(2)} limit`);
      } else if (price <= budget * 1.15) {
        budgetFit = "SLIGHTLY_OVER_BUDGET";
        budgetScore = 0.6;
        unmatchedConstraints.push(`Slightly over budget by $${(price - budget).toFixed(2)}`);
        tradeoffs.push(`Slightly exceeds budget by $${(price - budget).toFixed(2)} (+${Math.round(((price - budget) / budget) * 100)}%)`);
      } else {
        budgetFit = "SIGNIFICANTLY_OVER_BUDGET";
        budgetScore = 0.2;
        unmatchedConstraints.push(`Exceeds budget by $${(price - budget).toFixed(2)}`);
        tradeoffs.push(`Significantly exceeds budget by $${(price - budget).toFixed(2)}`);
      }
    }

    // 4. Use Case Score
    let useCaseScore = 0.7;
    if (criteria.useCase) {
      const targetUc = criteria.useCase.toLowerCase();
      if (product.attributes.useCases.some((uc) => uc.includes(targetUc) || targetUc.includes(uc))) {
        useCaseScore = 1.0;
        matchedConstraints.push(`Optimized for ${criteria.useCase}`);
        whyRecommended.push(`Engineered specifically for ${criteria.useCase}`);
      } else {
        useCaseScore = 0.4;
        unmatchedConstraints.push(`Not primarily tuned for ${criteria.useCase}`);
      }
    }

    // 5. Availability Score
    let availabilityScore = 1.0;
    if (product.stockStatus === "OUT_OF_STOCK") {
      availabilityScore = 0.0;
      unmatchedConstraints.push("Out of Stock");
      tradeoffs.push("Currently unavailable for purchase");
    } else if (product.stockStatus === "LOW_STOCK") {
      availabilityScore = 0.8;
      tradeoffs.push(`Low stock warning: Only ${product.inventory} units remaining`);
    } else {
      availabilityScore = 1.0;
      matchedConstraints.push(`In stock (${product.inventory} available)`);
    }

    // 6. User Preferences Score
    let preferenceScore = 0.5;
    if (criteria.userPreferences && criteria.userPreferences.length > 0) {
      const prefs = criteria.userPreferences.map((p) => p.toLowerCase());
      let prefMatches = 0;
      const allAttributesText = `${product.name} ${product.description} ${product.attributes.features.join(" ")}`.toLowerCase();
      for (const pref of prefs) {
        if (allAttributesText.includes(pref)) {
          prefMatches++;
          matchedConstraints.push(`Matches preference '${pref}'`);
        }
      }
      preferenceScore = prefMatches / prefs.length;
    }

    // Calculate Composite Overall Score
    const overallScore = Math.round(
      (relevanceScore * this.weights.relevance +
        featureScore * this.weights.featureMatch +
        budgetScore * this.weights.budget +
        useCaseScore * this.weights.useCase +
        availabilityScore * this.weights.availability +
        preferenceScore * this.weights.preference) *
        100
    ) / 100;

    if (product.attributes.rating >= 4.5) {
      whyRecommended.push(`Top customer rating of ${product.attributes.rating}/5 (${product.attributes.reviewCount} reviews)`);
    }

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      overallScore,
      scoreBreakdown: {
        relevance: Math.round(relevanceScore * 100) / 100,
        featureMatch: Math.round(featureScore * 100) / 100,
        budget: Math.round(budgetScore * 100) / 100,
        useCase: Math.round(useCaseScore * 100) / 100,
        availability: Math.round(availabilityScore * 100) / 100,
        preference: Math.round(preferenceScore * 100) / 100,
      },
      budgetFit,
      matchedConstraints,
      unmatchedConstraints,
      whyRecommended,
      tradeoffs,
      facts: {
        price: Number(product.price),
        currency: product.currency,
        inventory: product.inventory,
        stockStatus: product.stockStatus,
        rating: product.attributes.rating,
        brand: product.attributes.brand,
      },
    };
  }

  private assignBadges(ranked: RankedProductResult[], criteria: RankingCriteria): void {
    if (ranked.length === 0) return;

    // 1. BEST MATCH: The #1 ranked product if available and score >= 0.75
    const top = ranked[0];
    if (top.product.stockStatus !== "OUT_OF_STOCK" && top.evidence.overallScore >= 0.7) {
      top.evidence.badge = "BEST MATCH";
    }

    // 2. BUDGET OPTION: The cheapest in-stock option that is within or under budget
    const inStock = ranked.filter((r) => r.product.stockStatus !== "OUT_OF_STOCK");
    if (inStock.length > 1) {
      const cheapest = [...inStock].sort((a, b) => Number(a.product.price) - Number(b.product.price))[0];
      if (cheapest && cheapest.product.id !== top.product.id) {
        cheapest.evidence.badge = "BUDGET OPTION";
      }

      // 3. PREMIUM OPTION: Highest priced option with quality score >= 0.8
      const premium = [...inStock].sort((a, b) => Number(b.product.price) - Number(a.product.price))[0];
      if (
        premium &&
        premium.product.id !== top.product.id &&
        premium.product.id !== cheapest?.product?.id &&
        premium.product.qualityScore >= 0.8
      ) {
        premium.evidence.badge = "PREMIUM OPTION";
      }
    }
  }
}

export const multiFactorRankingEngine = new MultiFactorRankingEngine();
