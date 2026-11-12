import { Product } from "@prisma/client";
import { StockStatus } from "../intelligence/attributes";

export type SearchMode = "hybrid" | "semantic" | "keyword";
export type SearchProviderType = "mock" | "elastic" | "database";

export interface ProductSearchDocument {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  model: string;
  price: number;
  currency: string;
  inventory: number;
  isAvailable: boolean;
  stockStatus: StockStatus;
  features: string[];
  useCases: string[];
  connectivity: string[];
  compatibility: string[];
  rating: number;
  reviewCount: number;
  warranty: string;
  searchText: string;
  embedding?: number[];
  indexedAt: number;
}

export interface ProductSearchRequest {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  features?: string[];
  useCase?: string;
  preferences?: string[];
  inStockOnly?: boolean;
  mode?: SearchMode;
  limit?: number;
  offset?: number;
}

export interface ProductSearchHit {
  id: string;
  score: number;
  lexicalScore: number;
  semanticScore: number;
  document: ProductSearchDocument;
  matchExplanation: {
    matchedFeatures: string[];
    matchedUseCases: string[];
    matchedTokens: string[];
    typoCorrections?: Record<string, string>;
  };
}

export interface ProductSearchResponse {
  hits: ProductSearchHit[];
  total: number;
  searchMode: SearchMode;
  provider: SearchProviderType;
  latencyMs: number;
  queryAnalysis: {
    rawQuery: string;
    normalizedQuery: string;
    tokens: string[];
    detectedCategory?: string;
    detectedBudget?: number;
    detectedSynonyms: string[];
    correctedTypos: Record<string, string>;
  };
}

export interface SearchHealth {
  provider: SearchProviderType;
  status: "healthy" | "degraded" | "unhealthy";
  index: string;
  documentCount: number;
  latencyMs: number;
  details?: Record<string, any>;
}

export interface ProductSearchProvider {
  readonly providerType: SearchProviderType;
  indexProduct(product: Product): Promise<void>;
  updateProduct(product: Product): Promise<void>;
  deleteProduct(productId: string): Promise<void>;
  bulkIndex(products: Product[]): Promise<number>;
  search(request: ProductSearchRequest): Promise<ProductSearchResponse>;
  reindex(products: Product[]): Promise<{ count: number; durationMs: number }>;
  healthCheck(): Promise<SearchHealth>;
  clearIndex(): Promise<void>;
}
