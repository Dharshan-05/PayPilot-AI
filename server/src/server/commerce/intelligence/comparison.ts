import { EnrichedProduct, ProductEnricher } from "./attributes";
import { catalogService } from "../catalog";
import { Logger } from "../../observability/logger";

const log = new Logger("ProductIntelligence:Comparison");

export interface ComparisonRow {
  attribute: string;
  values: Record<string, string>;
  highlightBest?: string; // ProductId with best value if applicable
}

export interface ComparisonResult {
  productIds: string[];
  products: EnrichedProduct[];
  comparisonRows: ComparisonRow[];
  advantages: Record<string, string[]>;
  tradeoffs: string[];
  summary: string;
}

export class ProductComparisonEngine {
  /**
   * Performs an authoritative, grounded comparison of 2 or more products.
   * Enforces zero hallucinations by verifying every product ID exists in the database.
   */
  async compareProducts(productIds: string[]): Promise<ComparisonResult> {
    if (!productIds || productIds.length < 2) {
      throw new Error("Product comparison requires at least 2 valid product IDs.");
    }

    if (productIds.length > 5) {
      throw new Error("Comparison limited to a maximum of 5 products.");
    }

    const uniqueIds = Array.from(new Set(productIds));
    const enrichedList: EnrichedProduct[] = [];

    for (const id of uniqueIds) {
      const dbProduct = await catalogService.getProductById(id);
      if (!dbProduct) {
        log.warn("Comparison attempted on non-existent product ID", { id });
        throw new Error(`Product '${id}' does not exist in catalog.`);
      }
      enrichedList.push(ProductEnricher.enrich(dbProduct));
    }

    const advantages: Record<string, string[]> = {};
    for (const p of enrichedList) {
      advantages[p.id] = [];
    }

    // 1. Identify Lowest Price
    const sortedByPrice = [...enrichedList].sort((a, b) => a.price - b.price);
    const cheapest = sortedByPrice[0];
    const mostExpensive = sortedByPrice[sortedByPrice.length - 1];
    if (cheapest.price < mostExpensive.price) {
      const diff = (mostExpensive.price - cheapest.price).toFixed(2);
      advantages[cheapest.id].push(`Best price ($${diff} cheaper than ${mostExpensive.name})`);
    }

    // 2. Identify Highest Rating
    const sortedByRating = [...enrichedList].sort((a, b) => b.attributes.rating - a.attributes.rating);
    const topRated = sortedByRating[0];
    if (topRated.attributes.rating > sortedByRating[sortedByRating.length - 1].attributes.rating) {
      advantages[topRated.id].push(`Highest rated (${topRated.attributes.rating}/5)`);
    }

    // 3. Build Comparison Rows
    const rows: ComparisonRow[] = [];

    // Row: Price
    const priceVals: Record<string, string> = {};
    for (const p of enrichedList) {
      priceVals[p.id] = `$${p.price.toFixed(2)} ${p.currency}`;
    }
    rows.push({
      attribute: "Price",
      values: priceVals,
      highlightBest: cheapest.id,
    });

    // Row: Stock & Availability
    const stockVals: Record<string, string> = {};
    for (const p of enrichedList) {
      stockVals[p.id] =
        p.stockStatus === "IN_STOCK"
          ? `In Stock (${p.inventory})`
          : p.stockStatus === "LOW_STOCK"
          ? `Low Stock (${p.inventory} left)`
          : "Out of Stock";
    }
    rows.push({
      attribute: "Availability",
      values: stockVals,
    });

    // Row: Brand & Category
    const brandVals: Record<string, string> = {};
    for (const p of enrichedList) {
      brandVals[p.id] = `${p.attributes.brand} (${p.category})`;
    }
    rows.push({ attribute: "Brand", values: brandVals });

    // Row: Key Features
    const featureVals: Record<string, string> = {};
    for (const p of enrichedList) {
      featureVals[p.id] = p.attributes.features.slice(0, 4).join(", ") || "Standard";
    }
    rows.push({ attribute: "Key Features", values: featureVals });

    // Row: Primary Use Cases
    const useCaseVals: Record<string, string> = {};
    for (const p of enrichedList) {
      useCaseVals[p.id] = p.attributes.useCases.join(", ") || "General";
    }
    rows.push({ attribute: "Optimized For", values: useCaseVals });

    // Row: Battery Life
    const batteryVals: Record<string, string> = {};
    let hasBattery = false;
    for (const p of enrichedList) {
      batteryVals[p.id] = p.attributes.batteryLife || "N/A";
      if (p.attributes.batteryLife) hasBattery = true;
    }
    if (hasBattery) {
      rows.push({ attribute: "Battery Life", values: batteryVals });
    }

    // Row: Rating
    const ratingVals: Record<string, string> = {};
    for (const p of enrichedList) {
      ratingVals[p.id] = `${p.attributes.rating} / 5 (${p.attributes.reviewCount} reviews)`;
    }
    rows.push({
      attribute: "Customer Rating",
      values: ratingVals,
      highlightBest: topRated.id,
    });

    // 4. Construct Tradeoffs & Summary
    const tradeoffs: string[] = [];
    if (cheapest.id !== mostExpensive.id) {
      tradeoffs.push(
        `${cheapest.name} is the value option at $${cheapest.price.toFixed(2)}, saving $${(
          mostExpensive.price - cheapest.price
        ).toFixed(2)} compared to ${mostExpensive.name}.`
      );
    }

    for (const p of enrichedList) {
      if (p.stockStatus === "OUT_OF_STOCK") {
        tradeoffs.push(`${p.name} is currently out of stock and cannot be immediately checked out.`);
      }
    }

    const summary = `Side-by-side comparison of ${enrichedList.length} options: ${enrichedList
      .map((p) => `${p.name} ($${p.price.toFixed(2)})`)
      .join(" vs ")}.`;

    return {
      productIds: uniqueIds,
      products: enrichedList,
      comparisonRows: rows,
      advantages,
      tradeoffs,
      summary,
    };
  }
}

export const productComparisonEngine = new ProductComparisonEngine();
