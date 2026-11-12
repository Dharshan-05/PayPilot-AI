import { Product } from "@prisma/client";
import { ProductSearchDocument } from "./types";
import { ProductEnricher } from "../intelligence/attributes";
import { defaultEmbeddingProvider, EmbeddingProvider } from "./embedding";
import { sanitizeString } from "../../security/sanitizer";

export class SearchDocumentNormalizer {
  private embeddingProvider: EmbeddingProvider;

  constructor(embeddingProvider: EmbeddingProvider = defaultEmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
  }

  /**
   * Deterministically transforms an authoritative Prisma Product into a canonical ProductSearchDocument.
   */
  async normalizeProduct(product: Product): Promise<ProductSearchDocument> {
    const enriched = ProductEnricher.enrich(product);

    // Clean text fields and remove unsafe control characters
    const cleanName = sanitizeString(product.name, 200).trim();
    const cleanDesc = sanitizeString(product.description, 1000).trim();
    const cleanCategory = product.category.toLowerCase().trim();
    const cleanBrand = enriched.attributes.brand.trim();
    const cleanModel = enriched.attributes.model.trim();

    // Features and use cases normalization
    const normalizedFeatures = enriched.attributes.features.map((f) => f.toLowerCase().trim());
    const normalizedUseCases = enriched.attributes.useCases.map((u) => u.toLowerCase().trim());
    const normalizedConnectivity = enriched.attributes.connectivity.map((c) => c.toLowerCase().trim());
    const normalizedCompatibility = enriched.attributes.compatibility.map((c) => c.toLowerCase().trim());

    // Canonical search text representation for full-text and lexical retrieval
    const searchTokens = [
      cleanName,
      cleanCategory,
      cleanBrand,
      cleanModel,
      cleanDesc,
      normalizedFeatures.join(" "),
      normalizedUseCases.join(" "),
      normalizedConnectivity.join(" "),
      normalizedCompatibility.join(" "),
      product.sku,
    ];

    const canonicalSearchText = searchTokens.join(" ").toLowerCase().replace(/\s+/g, " ").trim();

    // Generate deterministic embedding
    const embedding = await this.embeddingProvider.getEmbedding(canonicalSearchText);

    return {
      id: product.id,
      sku: product.sku,
      name: cleanName,
      description: cleanDesc,
      category: cleanCategory,
      brand: cleanBrand,
      model: cleanModel,
      price: product.price,
      currency: product.currency.toUpperCase(),
      inventory: product.inventory,
      isAvailable: product.isAvailable && product.inventory > 0,
      stockStatus: enriched.stockStatus,
      features: normalizedFeatures,
      useCases: normalizedUseCases,
      connectivity: normalizedConnectivity,
      compatibility: normalizedCompatibility,
      rating: enriched.attributes.rating,
      reviewCount: enriched.attributes.reviewCount,
      warranty: enriched.attributes.warranty || "1 Year Limited Warranty",
      searchText: canonicalSearchText,
      embedding,
      indexedAt: Date.now(),
    };
  }

  /**
   * Batch normalizes multiple products into search documents.
   */
  async normalizeProducts(products: Product[]): Promise<ProductSearchDocument[]> {
    return Promise.all(products.map((p) => this.normalizeProduct(p)));
  }
}

export const defaultDocumentNormalizer = new SearchDocumentNormalizer();
