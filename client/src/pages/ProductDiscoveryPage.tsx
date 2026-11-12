import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { RoutePath } from '../data/dashboard';
import type { ProductPick } from '../data/products';
import { productService } from '../services/productService';
import { ApiClientError } from '../services/types';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Badge } from '../components/Badge';
import { Tabs } from '../components/Tabs';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';

export type DiscoveryCategory = 'All' | 'Keyboards & Mice' | 'Audio' | 'Monitors & Cloud';
export type DiscoveryPriceCap = 'All' | 'Under $100' | 'Under $400' | 'Under $900';

export interface ProductDiscoveryPageProps {
  initialProducts: ProductPick[];
  onSelectProductForCheckout: (prodId: string) => void;
  onNavigate: (route: RoutePath, entityId?: string) => void;
}

export const ProductDiscoveryPage: React.FC<ProductDiscoveryPageProps> = ({
  initialProducts,
  onSelectProductForCheckout,
  onNavigate,
}) => {
  const [discoverySearch, setDiscoverySearch] = useState('');
  const [discoveryCategory, setDiscoveryCategory] = useState<DiscoveryCategory>('All');
  const [discoveryPriceCap, setDiscoveryPriceCap] = useState<DiscoveryPriceCap>('All');
  const [products, setProducts] = useState<ProductPick[]>(initialProducts);
  const [loading, setLoading] = useState<boolean>(initialProducts.length === 0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const maxPrice =
          discoveryPriceCap === 'Under $100'
            ? 100
            : discoveryPriceCap === 'Under $400'
            ? 400
            : discoveryPriceCap === 'Under $900'
            ? 900
            : undefined;

        const categoryParam =
          discoveryCategory === 'Audio'
            ? 'audio'
            : undefined;

        const res = await productService.searchProducts(
          {
            q: discoverySearch.trim() || undefined,
            category: categoryParam,
            maxPrice,
            mode: 'hybrid',
            inStockOnly: true,
            limit: 20,
          },
          { signal: controller.signal }
        );

        const filtered = res.products.filter((p) => {
          const cat = (p.backendCategory || '').toLowerCase();
          if (discoveryCategory === 'Keyboards & Mice') {
            return cat === 'keyboards' || cat === 'mice';
          }
          if (discoveryCategory === 'Monitors & Cloud') {
            return cat === 'monitors' || cat === 'software';
          }
          return true;
        });

        setProducts(filtered);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const msg =
          err instanceof ApiClientError
            ? err.message
            : 'Unable to load catalog products from server.';
        setErrorMsg(msg);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [discoverySearch, discoveryCategory, discoveryPriceCap, reloadNonce]);

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Product Discovery"
        subtitle="Explore verified merchant deals with authoritative PayPal pricing and semantic hybrid search."
        onBack={() => onNavigate('/ai-shopping')}
        rightSlot={
          <Tabs
            tabs={['All', 'Keyboards & Mice', 'Audio', 'Monitors & Cloud']}
            activeTab={discoveryCategory}
            onChange={(t) => setDiscoveryCategory(t as DiscoveryCategory)}
          />
        }
      />

      <Card className="p-[16px] mb-[12px] bg-[#efe6dd] border border-[#dfd5c7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-[420px]">
          <Search className="w-4 h-4 text-[#6a665f] absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            value={discoverySearch}
            onChange={(e) => setDiscoverySearch(e.target.value)}
            aria-label="Filter products"
            placeholder="Semantic search by brand, model, or feature..."
            className="w-full h-[36px] pl-9 pr-4 rounded-full bg-[#faf5ec] border border-[#d6cec0] text-[11.5px]"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', 'Under $100', 'Under $400', 'Under $900'] as const).map((cap) => (
            <button
              key={cap}
              type="button"
              onClick={() => setDiscoveryPriceCap(cap)}
              className={`h-[32px] px-3 rounded-full text-[10.5px] font-semibold border cursor-pointer ${
                discoveryPriceCap === cap
                  ? 'bg-[#222220] text-[#f7f2e8] border-[#222220]'
                  : 'bg-[#faf5ec] text-[#3a3835] border-[#d6cec0]'
              }`}
            >
              {cap}
            </button>
          ))}
        </div>
      </Card>

      {errorMsg ? (
        <Card className="flex-1">
          <EmptyState
            title="Catalog unavailable"
            description={errorMsg}
            actionLabel="Retry Search"
            onAction={() => setReloadNonce((n) => n + 1)}
          />
        </Card>
      ) : loading ? (
        <Card className="flex-1 p-[18px]">
          <LoadingState rows={4} label="Searching PayPal catalog..." />
        </Card>
      ) : products.length === 0 ? (
        <Card className="flex-1">
          <EmptyState
            title="No matching products"
            description="Adjust your search term, category, or price cap to explore verified PayPal deals."
            actionLabel="Reset Filters"
            onAction={() => {
              setDiscoverySearch('');
              setDiscoveryCategory('All');
              setDiscoveryPriceCap('All');
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] flex-1">
          {products.map((prod) => (
            <Card key={prod.id} className="p-[18px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="default">{prod.brand}</Badge>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="success">{prod.savings}</Badge>
                    <Badge variant="dark">{prod.cashbackText}</Badge>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('/product/:id', prod.id)}
                  className="w-full h-[100px] rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] p-3 flex items-center justify-center my-2 cursor-pointer hover:border-[#bab2a6] transition-colors"
                >
                  <img src={prod.image} alt={prod.name} className="w-[80px] h-[68px] object-contain" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/product/:id', prod.id)}
                  className="text-left text-[14px] font-bold text-[#181715] hover:underline cursor-pointer"
                >
                  {prod.name}
                </button>
                <p className="text-[11px] text-[#6a665f] mt-1 leading-relaxed">{prod.summary}</p>
              </div>

              <div className="pt-3 mt-3 border-t border-[#efe9de] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[18px] font-extrabold text-[#181715]">
                    {prod.price}{' '}
                    <span className="text-[11px] font-normal text-[#857f77] line-through">
                      {prod.originalPrice}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#2b7a43] font-semibold">
                    Or 4 payments of ${(prod.numericPrice / 4).toFixed(2)} • Earn {prod.rewardPoints}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SecondaryButton
                    onClick={() => onNavigate('/product/:id', prod.id)}
                    className="h-[33px] px-3 text-[11px]"
                  >
                    Product Details
                  </SecondaryButton>
                  <PrimaryButton
                    disabled={prod.isAvailable === false || prod.inventory === 0}
                    onClick={() => {
                      onSelectProductForCheckout(prod.id);
                      onNavigate('/checkout');
                    }}
                    className="h-[33px] px-3.5 text-[11px]"
                  >
                    Checkout
                  </PrimaryButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductDiscoveryPage;
