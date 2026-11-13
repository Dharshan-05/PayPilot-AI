import { describe, it, expect } from "vitest";
import {
  MultiFactorRankingEngine,
  RankingCriteria,
} from "../src/server/commerce/intelligence/ranking";
import { ProductEnricher, EnrichedProduct } from "../src/server/commerce/intelligence/attributes";
import { Product, Prisma } from "@prisma/client";

describe("Phase 4 — Multi-Factor Ranking Engine & Evidence Grounding", () => {
  const engine = new MultiFactorRankingEngine();

  const mockProducts: EnrichedProduct[] = [
    ProductEnricher.enrich({
      id: "prod-kb-1",
      sku: "SKU-KB-1",
      externalId: null,
      status: "ACTIVE",
      name: "Logitech MX Mechanical Keyboard",
      description: "Wireless mechanical keyboard with quiet tactile switches for coding.",
      category: "keyboards",
      price: new Prisma.Decimal(79.99),
      currency: "USD",
      inventory: 30,
      isAvailable: true,
      metadata: JSON.stringify({ brand: "Logitech", rating: 4.8 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    ProductEnricher.enrich({
      id: "prod-kb-2",
      sku: "SKU-KB-2",
      externalId: null,
      status: "ACTIVE",
      name: "Keychron K2 Keyboard",
      description: "Compact wireless mechanical keyboard.",
      category: "keyboards",
      price: new Prisma.Decimal(69.99),
      currency: "USD",
      inventory: 20,
      isAvailable: true,
      metadata: JSON.stringify({ brand: "Keychron", rating: 4.6 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    ProductEnricher.enrich({
      id: "prod-kb-3",
      sku: "SKU-KB-3",
      externalId: null,
      status: "ACTIVE",
      name: "Custom Boutique Ergonomic Keyboard",
      description: "High-end split ergonomic mechanical keyboard.",
      category: "keyboards",
      price: new Prisma.Decimal(199.99),
      currency: "USD",
      inventory: 5,
      isAvailable: true,
      metadata: JSON.stringify({ brand: "Boutique", rating: 4.9 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];

  it("should rank products accurately based on budget, use-case, and feature fit", () => {
    const criteria: RankingCriteria = {
      query: "wireless mechanical keyboard",
      category: "keyboards",
      maxBudget: 80.0,
      useCase: "coding",
      requiredFeatures: ["wireless", "mechanical"],
      inStockOnly: true,
    };

    const ranked = engine.rank(mockProducts, criteria);

    expect(ranked.length).toBe(3);
    // Logitech MX Mechanical matches coding use-case and is within budget
    expect(ranked[0].product.name).toContain("Logitech MX Mechanical");
    expect(ranked[0].evidence.badge).toBe("BEST MATCH");
    expect(ranked[0].evidence.budgetFit).toBe("WITHIN_BUDGET");

    // Keychron K2 is cheaper and should receive the BUDGET OPTION badge
    const budgetPick = ranked.find((r) => r.product.id === "prod-kb-2");
    expect(budgetPick?.evidence.badge).toBe("BUDGET OPTION");
    expect(budgetPick?.evidence.budgetFit).toBe("UNDER_BUDGET");

    // The $199.99 keyboard significantly exceeds the $80 budget
    const expensivePick = ranked.find((r) => r.product.id === "prod-kb-3");
    expect(expensivePick?.evidence.budgetFit).toBe("SIGNIFICANTLY_OVER_BUDGET");
    expect(expensivePick?.evidence.tradeoffs.length).toBeGreaterThan(0);
  });

  it("should generate grounded evidence with score breakdown and factual constraints", () => {
    const criteria: RankingCriteria = {
      category: "keyboards",
      maxBudget: 80.0,
      useCase: "coding",
      requiredFeatures: ["wireless"],
    };

    const ranked = engine.rank(mockProducts, criteria);
    const top = ranked[0];

    expect(top.evidence.scoreBreakdown).toBeDefined();
    expect(top.evidence.scoreBreakdown.relevance).toBeGreaterThan(0);
    expect(top.evidence.scoreBreakdown.featureMatch).toBeGreaterThan(0);
    expect(top.evidence.scoreBreakdown.budget).toBeGreaterThan(0);
    expect(top.evidence.facts.price).toBe(79.99);
    expect(top.evidence.facts.currency).toBe("USD");
    expect(top.evidence.whyRecommended.length).toBeGreaterThan(0);
  });

  it("should guarantee deterministic ranking results across multiple identical executions", () => {
    const criteria: RankingCriteria = {
      query: "keyboard",
      category: "keyboards",
      maxBudget: 80.0,
    };

    const run1 = engine.rank(mockProducts, criteria);
    const run2 = engine.rank(mockProducts, criteria);

    expect(run1.length).toBe(run2.length);
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].product.id).toBe(run2[i].product.id);
      expect(run1[i].evidence.overallScore).toBe(run2[i].evidence.overallScore);
      expect(run1[i].evidence.badge).toBe(run2[i].evidence.badge);
    }
  });
});
