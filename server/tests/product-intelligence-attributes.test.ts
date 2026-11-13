import { describe, it, expect } from "vitest";
import {
  ProductEnricher,
  ProductValidationError,
  LOW_STOCK_THRESHOLD,
} from "../src/server/commerce/intelligence/attributes";
import { Product, Prisma } from "@prisma/client";

describe("Phase 4 — Product Attributes, Enrichment & Data Quality", () => {
  const sampleProduct: Product = {
    id: "test-prod-1",
    sku: "SKU-KB-001",
    externalId: null,
    status: "ACTIVE",
    name: "Keychron K2 Mechanical Keyboard",
    description: "Wireless mechanical keyboard with tactile quiet switches and bluetooth connectivity.",
    category: "keyboards",
    price: new Prisma.Decimal(69.99),
    currency: "USD",
    inventory: 25,
    isAvailable: true,
    metadata: JSON.stringify({
      brand: "Keychron",
      model: "K2",
      batteryLife: "72 hours",
      rating: 4.8,
      reviewCount: 340,
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should extract and normalize features, connectivity, and use cases", () => {
    const enriched = ProductEnricher.enrich(sampleProduct);

    expect(enriched.attributes.brand).toBe("Keychron");
    expect(enriched.attributes.model).toBe("K2");
    expect(enriched.attributes.features).toContain("wireless");
    expect(enriched.attributes.features).toContain("mechanical");
    expect(enriched.attributes.features).toContain("bluetooth");
    expect(enriched.attributes.features).toContain("quiet-clicks");
    expect(enriched.attributes.connectivity).toContain("bluetooth");
    expect(enriched.attributes.useCases).toContain("coding");
    expect(enriched.attributes.rating).toBe(4.8);
    expect(enriched.attributes.reviewCount).toBe(340);
  });

  it("should correctly classify stock status thresholds (IN_STOCK, LOW_STOCK, OUT_OF_STOCK)", () => {
    // Normal stock
    const inStock = ProductEnricher.enrich(sampleProduct);
    expect(inStock.stockStatus).toBe("IN_STOCK");

    // Low stock
    const lowStockProd = { ...sampleProduct, inventory: 5 };
    const lowStock = ProductEnricher.enrich(lowStockProd);
    expect(lowStock.stockStatus).toBe("LOW_STOCK");

    // Out of stock via inventory
    const oosProd1 = { ...sampleProduct, inventory: 0 };
    const oos1 = ProductEnricher.enrich(oosProd1);
    expect(oos1.stockStatus).toBe("OUT_OF_STOCK");

    // Out of stock via availability flag
    const oosProd2 = { ...sampleProduct, isAvailable: false };
    const oos2 = ProductEnricher.enrich(oosProd2);
    expect(oos2.stockStatus).toBe("OUT_OF_STOCK");
  });

  it("should calculate a grounded quality score based on rating and data completeness", () => {
    const enriched = ProductEnricher.enrich(sampleProduct);
    expect(enriched.qualityScore).toBeGreaterThanOrEqual(0.7);
    expect(enriched.qualityScore).toBeLessThanOrEqual(1.0);
  });

  it("should reject invalid product data (negative price, invalid currency, negative inventory)", () => {
    expect(() =>
      ProductEnricher.validateProductData({ ...sampleProduct, price: -10 })
    ).toThrow(ProductValidationError);

    expect(() =>
      ProductEnricher.validateProductData({ ...sampleProduct, price: 0 })
    ).toThrow(ProductValidationError);

    expect(() =>
      ProductEnricher.validateProductData({ ...sampleProduct, inventory: -1 })
    ).toThrow(ProductValidationError);

    expect(() =>
      ProductEnricher.validateProductData({ ...sampleProduct, currency: "INVALID" })
    ).toThrow(ProductValidationError);

    expect(() =>
      ProductEnricher.validateProductData({ ...sampleProduct, sku: "" })
    ).toThrow(ProductValidationError);
  });
});
