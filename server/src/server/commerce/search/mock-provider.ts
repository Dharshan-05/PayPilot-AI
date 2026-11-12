import { Product } from "@prisma/client";
import {
  ProductSearchDocument,
  ProductSearchHit,
  ProductSearchProvider,
  ProductSearchRequest,
  ProductSearchResponse,
  SearchHealth,
  SearchMode,
} from "./types";
import { SearchDocumentNormalizer, defaultDocumentNormalizer } from "./normalizer";
import { defaultEmbeddingProvider, EmbeddingProvider, cosineSimilarity } from "./embedding";
import { Logger } from "../../observability/logger";
import { sanitizeString } from "../../security/sanitizer";

const log = new Logger("SemanticSearch:MockProvider");

// Canonical vocabulary for typo correction and synonym expansion
const CANONICAL_VOCABULARY: Record<string, string[]> = {
  keyboard: ["keybord", "keybaord", "kyboard", "keeb", "keebs"],
  headphone: ["headfone", "headphon", "headfones", "earbuds", "headset"],
  headphones: ["headfones", "headphons", "headsets"],
  monitor: ["moniter", "monitr", "display", "screen"],
  wireless: ["wireles", "wirelss", "cordless", "blutooth"],
  bluetooth: ["blutooth", "bluetoth", "bt"],
  mechanical: ["mechanic", "mechanicl", "mechnical"],
  noise: ["noice", "noize"],
  cancelling: ["canceling", "canceling"],
  quiet: ["quite", "silent", "low-noise"],
  coding: ["codeing", "programing", "programming", "developer"],
  mouse: ["mous", "moose", "trackball", "pointer"],
};

const SYNONYMS: Record<string, string[]> = {
  keeb: ["keyboard", "mechanical"],
  display: ["monitor", "screen"],
  screen: ["monitor", "display"],
  audio: ["headphones", "headset", "sound"],
  earbuds: ["headphones", "audio"],
  headset: ["headphones", "audio"],
  pointer: ["mouse", "trackball"],
  mice: ["mouse"],
  cordless: ["wireless", "bluetooth"],
  silent: ["quiet", "quiet-clicks"],
  programming: ["coding", "software", "development"],
  developer: ["coding", "software"],
  ide: ["software", "coding"],
  copilot: ["software", "cloud"],
};

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export class MockSearchProvider implements ProductSearchProvider {
  public readonly providerType = "mock" as const;
  private documents: Map<string, ProductSearchDocument> = new Map();
  private normalizer: SearchDocumentNormalizer;
  private embeddingProvider: EmbeddingProvider;

  constructor(
    normalizer: SearchDocumentNormalizer = defaultDocumentNormalizer,
    embeddingProvider: EmbeddingProvider = defaultEmbeddingProvider
  ) {
    this.normalizer = normalizer;
    this.embeddingProvider = embeddingProvider;
  }

  async indexProduct(product: Product): Promise<void> {
    const doc = await this.normalizer.normalizeProduct(product);
    this.documents.set(doc.id, doc);
  }

  async updateProduct(product: Product): Promise<void> {
    await this.indexProduct(product);
  }

  async deleteProduct(productId: string): Promise<void> {
    this.documents.delete(productId);
  }

  async bulkIndex(products: Product[]): Promise<number> {
    const docs = await this.normalizer.normalizeProducts(products);
    for (const doc of docs) {
      this.documents.set(doc.id, doc);
    }
    return docs.length;
  }

  async clearIndex(): Promise<void> {
    this.documents.clear();
  }

  async reindex(products: Product[]): Promise<{ count: number; durationMs: number }> {
    const start = performance.now();
    this.documents.clear();
    const count = await this.bulkIndex(products);
    const durationMs = Math.round(performance.now() - start);
    return { count, durationMs };
  }

  async healthCheck(): Promise<SearchHealth> {
    return {
      provider: "mock",
      status: "healthy",
      index: "in-memory-products",
      documentCount: this.documents.size,
      latencyMs: 1,
      details: {
        mode: "deterministic-in-memory-elastic-mock",
        indexedDocumentKeys: Array.from(this.documents.keys()),
      },
    };
  }

  async search(request: ProductSearchRequest): Promise<ProductSearchResponse> {
    const startTime = performance.now();
    const mode: SearchMode = request.mode || "hybrid";
    const rawQuery = request.query || "";
    const cleanQuery = sanitizeString(rawQuery, 200).toLowerCase().trim();

    // 1. Tokenize & Typo Correction
    const rawTokens = cleanQuery
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);

    const correctedTypos: Record<string, string> = {};
    const detectedSynonyms: string[] = [];
    const tokens: string[] = [];

    for (const t of rawTokens) {
      let resolvedToken = t;

      // Check direct synonyms
      if (SYNONYMS[t]) {
        detectedSynonyms.push(...SYNONYMS[t]);
      }

      // Check typo dictionary
      let typoFound = false;
      for (const [canonical, variants] of Object.entries(CANONICAL_VOCABULARY)) {
        if (variants.includes(t)) {
          correctedTypos[t] = canonical;
          resolvedToken = canonical;
          typoFound = true;
          break;
        }
      }

      // Dynamic Levenshtein for unknown tokens >= 5 chars
      if (!typoFound && t.length >= 5) {
        for (const canonical of Object.keys(CANONICAL_VOCABULARY)) {
          if (levenshteinDistance(t, canonical) <= 2) {
            correctedTypos[t] = canonical;
            resolvedToken = canonical;
            break;
          }
        }
      }

      tokens.push(resolvedToken);
    }

    // Extended query string including resolved synonyms and typo fixes
    const expandedTokens = Array.from(new Set([...tokens, ...detectedSynonyms]));
    const expandedQueryText = expandedTokens.join(" ");

    // 2. Query Embedding for Semantic Search
    let queryEmbedding: number[] = [];
    if (mode === "hybrid" || mode === "semantic") {
      queryEmbedding = await this.embeddingProvider.getEmbedding(
        expandedQueryText.length > 0 ? expandedQueryText : cleanQuery
      );
    }

    // 3. Filter and Score Candidates
    const hits: ProductSearchHit[] = [];

    for (const doc of this.documents.values()) {
      // Structured Filters
      if (request.category && !doc.category.includes(request.category.toLowerCase())) {
        continue;
      }
      if (request.currency && doc.currency !== request.currency.toUpperCase()) {
        continue;
      }
      if (request.minPrice !== undefined && doc.price < request.minPrice) {
        continue;
      }
      if (request.maxPrice !== undefined && doc.price > request.maxPrice) {
        continue;
      }
      if (request.inStockOnly && (!doc.isAvailable || doc.inventory <= 0)) {
        continue;
      }
      if (request.features && request.features.length > 0) {
        const hasAllFeatures = request.features.every((f) =>
          doc.features.some((df) => df.includes(f.toLowerCase()))
        );
        if (!hasAllFeatures) continue;
      }
      if (request.useCase && !doc.useCases.includes(request.useCase.toLowerCase())) {
        // If strict use-case requested and doesn't match, heavily de-prioritize or filter
        if (request.mode === "keyword") continue;
      }

      // Lexical Scoring (BM25 / TF-IDF approximation)
      let lexicalScore = 0;
      const matchedTokens: string[] = [];
      const matchedFeatures: string[] = [];
      const matchedUseCases: string[] = [];

      const docText = doc.searchText.toLowerCase();

      for (const token of expandedTokens) {
        if (docText.includes(token)) {
          matchedTokens.push(token);
          // Boost matches in name or category
          if (doc.name.toLowerCase().includes(token)) {
            lexicalScore += 0.4;
          } else if (doc.category.includes(token)) {
            lexicalScore += 0.3;
          } else if (doc.features.some((f) => f.includes(token))) {
            lexicalScore += 0.25;
            matchedFeatures.push(token);
          } else {
            lexicalScore += 0.15;
          }
        }
      }

      // Check matched use cases
      for (const uc of doc.useCases) {
        if (expandedTokens.includes(uc) || cleanQuery.includes(uc)) {
          matchedUseCases.push(uc);
          lexicalScore += 0.2;
        }
      }

      // Cap lexical score to [0.0, 1.0]
      lexicalScore = Math.min(1.0, lexicalScore);

      // Semantic Scoring (Cosine Similarity)
      let semanticScore = 0;
      if ((mode === "hybrid" || mode === "semantic") && doc.embedding && queryEmbedding.length > 0) {
        semanticScore = cosineSimilarity(queryEmbedding, doc.embedding);
      }

      // Combined Hybrid Scoring
      let finalScore = 0;
      if (mode === "hybrid") {
        if (tokens.length === 0) {
          finalScore = 1.0; // Empty query returns all matching filter items
        } else {
          finalScore = 0.5 * lexicalScore + 0.5 * semanticScore;
        }
      } else if (mode === "semantic") {
        finalScore = semanticScore;
      } else if (mode === "keyword") {
        finalScore = lexicalScore;
      }

      // Discard completely irrelevant hits when query is provided
      if (tokens.length > 0 && finalScore < 0.1) {
        continue;
      }

      hits.push({
        id: doc.id,
        score: Number(finalScore.toFixed(4)),
        lexicalScore: Number(lexicalScore.toFixed(4)),
        semanticScore: Number(semanticScore.toFixed(4)),
        document: doc,
        matchExplanation: {
          matchedTokens: Array.from(new Set(matchedTokens)),
          matchedFeatures: Array.from(new Set(matchedFeatures)),
          matchedUseCases: Array.from(new Set(matchedUseCases)),
          typoCorrections: Object.keys(correctedTypos).length > 0 ? correctedTypos : undefined,
        },
      });
    }

    // Sort hits descending by score
    hits.sort((a, b) => b.score - a.score);

    // Apply pagination
    const offset = request.offset || 0;
    const limit = request.limit || 10;
    const paginatedHits = hits.slice(offset, offset + limit);

    return {
      hits: paginatedHits,
      total: hits.length,
      searchMode: mode,
      provider: "mock",
      latencyMs: Math.round(performance.now() - startTime),
      queryAnalysis: {
        rawQuery,
        normalizedQuery: cleanQuery,
        tokens,
        detectedSynonyms,
        correctedTypos,
      },
    };
  }
}

export const mockSearchProvider = new MockSearchProvider();
