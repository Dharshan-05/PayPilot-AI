import { Client } from "@elastic/elasticsearch";
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
import { defaultEmbeddingProvider, EmbeddingProvider } from "./embedding";
import { getConfig } from "../../config/env";
import { Logger } from "../../observability/logger";
import { sanitizeString } from "../../security/sanitizer";

const log = new Logger("SemanticSearch:ElasticProvider");

export class ElasticsearchProvider implements ProductSearchProvider {
  public readonly providerType = "elastic" as const;
  private client: Client | null = null;
  private indexName: string;
  private normalizer: SearchDocumentNormalizer;
  private embeddingProvider: EmbeddingProvider;
  private isIndexInitialized = false;

  constructor(
    normalizer: SearchDocumentNormalizer = defaultDocumentNormalizer,
    embeddingProvider: EmbeddingProvider = defaultEmbeddingProvider
  ) {
    this.normalizer = normalizer;
    this.embeddingProvider = embeddingProvider;
    const config = getConfig();
    this.indexName = config.ELASTICSEARCH_INDEX || "products";
    this.initClient();
  }

  private initClient(): void {
    const config = getConfig();
    try {
      const clientOptions: any = {
        node: config.ELASTICSEARCH_URL || "http://localhost:9200",
      };

      if (config.ELASTICSEARCH_API_KEY) {
        clientOptions.auth = {
          apiKey: config.ELASTICSEARCH_API_KEY,
        };
      }

      this.client = new Client(clientOptions);
    } catch (err: any) {
      log.warn("Failed to instantiate Elasticsearch client", { error: err.message });
      this.client = null;
    }
  }

  private async ensureIndex(): Promise<void> {
    if (this.isIndexInitialized || !this.client) return;

    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          mappings: {
            properties: {
              id: { type: "keyword" },
              sku: { type: "keyword" },
              name: { type: "text", analyzer: "standard" },
              description: { type: "text" },
              category: { type: "keyword" },
              brand: { type: "keyword" },
              model: { type: "keyword" },
              price: { type: "float" },
              currency: { type: "keyword" },
              inventory: { type: "integer" },
              isAvailable: { type: "boolean" },
              stockStatus: { type: "keyword" },
              features: { type: "keyword" },
              useCases: { type: "keyword" },
              connectivity: { type: "keyword" },
              compatibility: { type: "keyword" },
              rating: { type: "float" },
              reviewCount: { type: "integer" },
              warranty: { type: "keyword" },
              searchText: { type: "text" },
              embedding: {
                type: "dense_vector",
                dims: 64,
                index: true,
                similarity: "cosine",
              },
              indexedAt: { type: "date" },
            },
          },
        });
        log.info("Elasticsearch index created successfully", { index: this.indexName });
      }
      this.isIndexInitialized = true;
    } catch (err: any) {
      log.warn("Failed to ensure Elasticsearch index", { error: err.message });
      throw err;
    }
  }

  async indexProduct(product: Product): Promise<void> {
    if (!this.client) throw new Error("Elasticsearch client is not initialized.");
    await this.ensureIndex();

    const doc = await this.normalizer.normalizeProduct(product);
    await this.client.index({
      index: this.indexName,
      id: doc.id,
      document: doc,
      refresh: true,
    });
  }

  async updateProduct(product: Product): Promise<void> {
    await this.indexProduct(product);
  }

  async deleteProduct(productId: string): Promise<void> {
    if (!this.client) throw new Error("Elasticsearch client is not initialized.");
    await this.ensureIndex();

    try {
      await this.client.delete({
        index: this.indexName,
        id: productId,
        refresh: true,
      });
    } catch (err: any) {
      if (err.meta?.statusCode !== 404) {
        throw err;
      }
    }
  }

  async bulkIndex(products: Product[]): Promise<number> {
    if (!this.client) throw new Error("Elasticsearch client is not initialized.");
    if (products.length === 0) return 0;
    await this.ensureIndex();

    const docs = await this.normalizer.normalizeProducts(products);
    const operations = docs.flatMap((doc) => [
      { index: { _index: this.indexName, _id: doc.id } },
      doc,
    ]);

    const bulkResponse = await this.client.bulk({
      refresh: true,
      operations,
    });

    if (bulkResponse.errors) {
      log.warn("Bulk indexing encountered errors", { errors: bulkResponse.items });
    }

    return docs.length;
  }

  async clearIndex(): Promise<void> {
    if (!this.client) return;
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (exists) {
        await this.client.indices.delete({ index: this.indexName });
        this.isIndexInitialized = false;
      }
    } catch (err: any) {
      log.warn("Failed to clear Elasticsearch index", { error: err.message });
    }
  }

  async reindex(products: Product[]): Promise<{ count: number; durationMs: number }> {
    const start = performance.now();
    await this.clearIndex();
    const count = await this.bulkIndex(products);
    const durationMs = Math.round(performance.now() - start);
    return { count, durationMs };
  }

  async healthCheck(): Promise<SearchHealth> {
    const start = performance.now();
    if (!this.client) {
      return {
        provider: "elastic",
        status: "unhealthy",
        index: this.indexName,
        documentCount: 0,
        latencyMs: 0,
        details: { error: "Elasticsearch client not configured or unavailable" },
      };
    }

    try {
      const ping = await this.client.ping();
      let docCount = 0;
      if (ping) {
        const countRes = await this.client.count({ index: this.indexName });
        docCount = countRes.count;
      }

      return {
        provider: "elastic",
        status: ping ? "healthy" : "unhealthy",
        index: this.indexName,
        documentCount: docCount,
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (err: any) {
      return {
        provider: "elastic",
        status: "unhealthy",
        index: this.indexName,
        documentCount: 0,
        latencyMs: Math.round(performance.now() - start),
        details: { error: err.message },
      };
    }
  }

  async search(request: ProductSearchRequest): Promise<ProductSearchResponse> {
    if (!this.client) {
      throw new Error("Elasticsearch client is unavailable");
    }
    await this.ensureIndex();

    const startTime = performance.now();
    const mode: SearchMode = request.mode || "hybrid";
    const rawQuery = request.query || "";
    const cleanQuery = sanitizeString(rawQuery, 200).toLowerCase().trim();

    // Query filters
    const filterClauses: any[] = [];
    if (request.category) {
      filterClauses.push({ term: { category: request.category.toLowerCase() } });
    }
    if (request.currency) {
      filterClauses.push({ term: { currency: request.currency.toUpperCase() } });
    }
    if (request.minPrice !== undefined || request.maxPrice !== undefined) {
      const rangeClause: any = {};
      if (request.minPrice !== undefined) rangeClause.gte = request.minPrice;
      if (request.maxPrice !== undefined) rangeClause.lte = request.maxPrice;
      filterClauses.push({ range: { price: rangeClause } });
    }
    if (request.inStockOnly) {
      filterClauses.push({ term: { isAvailable: true } });
      filterClauses.push({ range: { inventory: { gt: 0 } } });
    }
    if (request.features && request.features.length > 0) {
      for (const feat of request.features) {
        filterClauses.push({ term: { features: feat.toLowerCase() } });
      }
    }

    // Must query (Lexical)
    const mustClauses: any[] = [];
    if (cleanQuery.length > 0) {
      mustClauses.push({
        multi_match: {
          query: cleanQuery,
          fields: ["name^3", "category^2", "brand^2", "model^2", "description", "searchText"],
          fuzziness: "AUTO",
        },
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    // KNN Vector Search (Semantic)
    let knnClause: any = undefined;
    if ((mode === "hybrid" || mode === "semantic") && cleanQuery.length > 0) {
      const queryVector = await this.embeddingProvider.getEmbedding(cleanQuery);
      knnClause = {
        field: "embedding",
        query_vector: queryVector,
        k: 20,
        num_candidates: 50,
      };
    }

    const searchBody: any = {
      index: this.indexName,
      from: request.offset || 0,
      size: request.limit || 10,
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses,
        },
      },
    };

    if (knnClause && mode !== "keyword") {
      searchBody.knn = knnClause;
    }

    const esResponse = await this.client.search<ProductSearchDocument>(searchBody);

    const hits: ProductSearchHit[] = (esResponse.hits.hits || []).map((hit) => {
      const doc = hit._source as ProductSearchDocument;
      const score = hit._score || 0;
      return {
        id: doc.id,
        score: Number(score.toFixed(4)),
        lexicalScore: Number(score.toFixed(4)),
        semanticScore: Number(score.toFixed(4)),
        document: doc,
        matchExplanation: {
          matchedTokens: [cleanQuery],
          matchedFeatures: doc.features || [],
          matchedUseCases: doc.useCases || [],
        },
      };
    });

    const total = typeof esResponse.hits.total === "number" ? esResponse.hits.total : esResponse.hits.total?.value || 0;

    return {
      hits,
      total,
      searchMode: mode,
      provider: "elastic",
      latencyMs: Math.round(performance.now() - startTime),
      queryAnalysis: {
        rawQuery,
        normalizedQuery: cleanQuery,
        tokens: cleanQuery.split(/\s+/),
        detectedSynonyms: [],
        correctedTypos: {},
      },
    };
  }
}
