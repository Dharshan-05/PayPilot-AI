import { ASSETS } from '../assets/images';
import type { ProductCategory, ProductPick } from '../data/products';
import { apiClient, type RequestOptions } from './apiClient';
import type {
  BackendProduct,
  BackendRankedProduct,
  BackendSearchEntry,
  BackendSearchResponse,
} from './types';

function unwrapSearchEntry(entry: BackendSearchEntry | BackendRankedProduct): BackendRankedProduct {
  if ('product' in entry && entry.product) {
    return {
      ...entry.product,
      overallScore: entry.evidence?.overallScore,
      badge: entry.evidence?.badge,
      whyRecommended: entry.evidence?.whyRecommended,
      tradeoffs: entry.evidence?.tradeoffs,
    };
  }
  return entry as BackendRankedProduct;
}

function inferBrand(p: BackendProduct): string {
  if (p.attributes?.brand) return p.attributes.brand;
  const firstWord = p.name.split(/\s+/)[0];
  if (firstWord && firstWord.length > 1) return firstWord;
  return 'PayPal Merchant';
}

function inferImage(p: BackendProduct): string {
  const cat = (p.category || '').toLowerCase();
  const name = p.name.toLowerCase();
  if (cat.includes('audio') || name.includes('headphone')) return ASSETS.prodHeadphones;
  if (cat.includes('watch') || cat.includes('wearable') || cat.includes('mice') || name.includes('mouse')) {
    return ASSETS.prodWatch;
  }
  return ASSETS.prodLaptop;
}

function mapDisplayCategory(p: BackendProduct, index: number): ProductCategory {
  const cat = (p.category || '').toLowerCase();
  if (cat === 'audio') return 'Best Deals';
  if (cat === 'keyboards') return 'Recommended for you';
  if (cat === 'software') return 'PayPal Rewards';
  if (cat === 'monitors' || cat === 'mice') return 'Price Drops';
  const cycle: ProductCategory[] = [
    'Recommended for you',
    'Best Deals',
    'Price Drops',
    'PayPal Rewards',
  ];
  return cycle[index % cycle.length];
}

export function mapBackendProductToProductPick(
  p: BackendProduct | BackendRankedProduct,
  index: number = 0
): ProductPick {
  const ranked = p as BackendRankedProduct;
  const numericPrice = Number(p.price) || 0;
  const ratingVal = p.attributes?.rating ?? 4.7;
  const reviewsCount = p.attributes?.reviewCount ?? 128;
  const stockBadge =
    !p.isAvailable || p.inventory <= 0
      ? 'Out of Stock'
      : p.inventory <= 10
      ? `${p.inventory} left`
      : ranked.badge || `${p.inventory} in stock`;

  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: inferBrand(p),
    category: mapDisplayCategory(p, index),
    backendCategory: p.category,
    price: `$${numericPrice.toFixed(2)}`,
    numericPrice,
    originalPrice: `$${(numericPrice * 1.15).toFixed(2)}`,
    savings: stockBadge,
    rating: `${ratingVal.toFixed(1)} ★`,
    reviewsCount,
    rewardPoints: `+${Math.round(numericPrice * 2)} pts`,
    cashbackText: `${p.currency} Authoritative`,
    image: inferImage(p),
    summary: p.description,
    inventory: p.inventory,
    isAvailable: p.isAvailable,
    badge: ranked.badge,
    whyRecommended: ranked.whyRecommended,
    tradeoffs: ranked.tradeoffs,
    warranty: p.attributes?.warranty,
    features: p.attributes?.features,
  };
}

export interface SearchProductsQuery {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  mode?: 'hybrid' | 'semantic' | 'keyword';
  sort?: 'relevance' | 'price_asc' | 'price_desc';
  inStockOnly?: boolean;
  limit?: number;
  page?: number;
}

export const productService = {
  async listProducts(
    params: { inStockOnly?: boolean; limit?: number; category?: string } = {},
    options?: RequestOptions
  ): Promise<ProductPick[]> {
    const search = new URLSearchParams();
    if (params.inStockOnly === false) search.set('inStockOnly', 'false');
    if (params.limit) search.set('limit', String(params.limit));
    if (params.category) search.set('category', params.category);

    const qs = search.toString();
    const { data } = await apiClient.get<BackendProduct[]>(
      `/api/products${qs ? `?${qs}` : ''}`,
      options
    );
    return data.map((p, idx) => mapBackendProductToProductPick(p, idx));
  },

  async getProductById(productId: string, options?: RequestOptions): Promise<ProductPick> {
    const { data } = await apiClient.get<BackendProduct>(
      `/api/products/${encodeURIComponent(productId)}`,
      options
    );
    return mapBackendProductToProductPick(data, 0);
  },

  async searchProducts(
    query: SearchProductsQuery,
    options?: RequestOptions
  ): Promise<{ products: ProductPick[]; totalCount: number; latencyMs?: number; provider?: string }> {
    const search = new URLSearchParams();
    if (query.q) search.set('q', query.q);
    if (query.category) search.set('category', query.category);
    if (query.minPrice !== undefined) search.set('minPrice', String(query.minPrice));
    if (query.maxPrice !== undefined) search.set('maxPrice', String(query.maxPrice));
    if (query.mode) search.set('mode', query.mode);
    if (query.sort) search.set('sort', query.sort);
    if (query.inStockOnly === false) search.set('inStockOnly', 'false');
    if (query.limit) search.set('limit', String(query.limit));
    if (query.page) search.set('page', String(query.page));

    const { data } = await apiClient.get<BackendSearchResponse>(
      `/api/products/search?${search.toString()}`,
      options
    );
    const unwrapped = (data.results || []).map(unwrapSearchEntry);
    return {
      products: unwrapped.map((p, idx) => mapBackendProductToProductPick(p, idx)),
      totalCount: data.pagination?.total ?? data.totalCount ?? unwrapped.length,
      latencyMs: data.queryMetadata?.latencyMs,
      provider: data.queryMetadata?.searchProvider || data.queryMetadata?.provider,
    };
  },

  async getRecommendations(
    params: { query?: string; maxBudget?: number; category?: string; limit?: number },
    options?: RequestOptions
  ): Promise<ProductPick[]> {
    const { data } = await apiClient.post<{ recommendations: Array<BackendSearchEntry | BackendRankedProduct> }>(
      '/api/products/recommend',
      params,
      options
    );
    return (data.recommendations || [])
      .map(unwrapSearchEntry)
      .map((p, idx) => mapBackendProductToProductPick(p, idx));
  },
};
