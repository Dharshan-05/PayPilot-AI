import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';
import type { ProductPick } from '../data/products';
import { productService } from '../services/productService';
import { ApiClientError } from '../services/types';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Badge } from '../components/Badge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';

export interface ProductDetailsPageProps {
  products: ProductPick[];
  selectedProdId: string;
  onSelectProdId: (id: string) => void;
  onStartCheckout: (prodId: string) => void;
  onNavigate: (route: RoutePath) => void;
}

export const ProductDetailsPage: React.FC<ProductDetailsPageProps> = ({
  products,
  selectedProdId,
  onSelectProdId,
  onStartCheckout,
  onNavigate,
}) => {
  const exactMatch = products.find((p) => p.id === selectedProdId) || null;
  const isDefaultDemoId = !selectedProdId || selectedProdId === 'prod-1';
  const initialMatch = exactMatch || (isDefaultDemoId ? products[0] || null : null);

  const [liveProduct, setLiveProduct] = useState<ProductPick | null>(initialMatch);
  const [loading, setLoading] = useState<boolean>(!initialMatch);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const matched = products.find((p) => p.id === selectedProdId) || null;
    const isDefault = !selectedProdId || selectedProdId === 'prod-1';
    const fallback = matched || (isDefault ? products[0] || null : null);
    setLiveProduct(fallback);

    if (!selectedProdId || isDefault) {
      setLoading(false);
      setErrorMsg(null);
      return;
    }

    const controller = new AbortController();
    setLoading(!fallback);
    setErrorMsg(null);

    productService
      .getProductById(selectedProdId, { signal: controller.signal })
      .then((fresh) => {
        setLiveProduct(fresh);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (!fallback) {
          setLiveProduct(null);
          setErrorMsg(
            err instanceof ApiClientError
              ? err.message
              : 'Unable to load product details from server.'
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedProdId, products, reloadNonce]);

  if (loading && !liveProduct) {
    return (
      <div className="flex-1 flex flex-col">
        <PageHeader title="Product Details" subtitle="Loading authoritative catalog listing..." onBack={() => onNavigate('/discovery')} />
        <Card className="p-[22px] flex-1">
          <LoadingState rows={4} label="Fetching product details..." />
        </Card>
      </div>
    );
  }

  if (errorMsg || !liveProduct) {
    return (
      <div className="flex-1 flex flex-col">
        <PageHeader title="Product Details" subtitle="Product unavailable" onBack={() => onNavigate('/discovery')} />
        <Card className="p-[22px] flex-1">
          <EmptyState
            title="Product not found"
            description={errorMsg || 'The requested product could not be loaded from the catalog.'}
            actionLabel="Retry"
            onAction={() => setReloadNonce((n) => n + 1)}
          />
        </Card>
      </div>
    );
  }

  const activeProd = liveProduct;
  const outOfStock = activeProd.isAvailable === false || activeProd.inventory === 0;

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Product Details"
        subtitle={`Verified PayPal AI merchant listing • ${activeProd.brand}${activeProd.sku ? ` (${activeProd.sku})` : ''}`}
        onBack={() => onNavigate('/discovery')}
        rightSlot={
          products.length > 0 ? (
            <select
              value={activeProd.id}
              onChange={(e) => onSelectProdId(e.target.value)}
              aria-label="Select product"
              className="h-[34px] w-full max-w-full sm:w-auto min-w-0 px-3 rounded-full bg-[#faf5ec] border border-[#dfd8cd] text-[11px] font-medium truncate"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price})
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-[14px] flex-1 min-w-0">
        <Card className="p-[22px] flex flex-col justify-between min-w-0">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="dark">{activeProd.brand}</Badge>
                <Badge variant={outOfStock ? 'default' : 'success'}>
                  {activeProd.inventory !== undefined
                    ? outOfStock
                      ? 'Out of Stock'
                      : `${activeProd.inventory} in stock`
                    : activeProd.savings}
                </Badge>
                <Badge variant="default">
                  {activeProd.rating} ({activeProd.reviewsCount} reviews)
                </Badge>
              </div>
              <span className="text-[11px] font-semibold text-[#2b7a43]">{activeProd.cashbackText}</span>
            </div>

            <div className="h-[150px] rounded-[18px] bg-[#f4efe5] border border-[#e5ded3] p-5 flex items-center justify-center">
              <img
                src={activeProd.image}
                alt={activeProd.name}
                className="w-[80px] h-[68px] object-contain"
              />
            </div>

            <div>
              <h2 className="text-[19px] font-bold text-[#181715]">{activeProd.name}</h2>
              <p className="text-[12px] text-[#5c5954] mt-1.5 leading-relaxed">{activeProd.summary}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 rounded-[12px] bg-[#f4efe5] border border-[#e5ded3]">
                <div className="text-[#78736c]">PayPal Pay in 4</div>
                <div className="font-bold text-[#181715] mt-0.5">
                  4 × ${(activeProd.numericPrice / 4).toFixed(2)} (0% APR)
                </div>
              </div>
              <div className="p-3 rounded-[12px] bg-[#f4efe5] border border-[#e5ded3]">
                <div className="text-[#78736c]">Inventory Status</div>
                <div className="font-bold text-[#2b7a43] mt-0.5">
                  {outOfStock ? 'Unavailable' : `${activeProd.inventory ?? 'Verified'} Units Ready`}
                </div>
              </div>
              <div className="p-3 rounded-[12px] bg-[#f4efe5] border border-[#e5ded3]">
                <div className="text-[#78736c]">Buyer Protection</div>
                <div className="font-bold text-[#181715] mt-0.5">Full 180-Day Shield ✓</div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#efe9de] flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[24px] font-extrabold text-[#181715]">{activeProd.price}</span>
              <span className="text-[12px] text-[#857f77] line-through ml-2">{activeProd.originalPrice}</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <SecondaryButton onClick={() => onNavigate('/ai-shopping')}>
                Ask AI Assistant
              </SecondaryButton>
              <PrimaryButton
                disabled={outOfStock}
                onClick={() => {
                  onStartCheckout(activeProd.id);
                  onNavigate('/checkout');
                }}
              >
                <span>{outOfStock ? 'Out of Stock' : 'Proceed to Checkout'}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </PrimaryButton>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-[14px] min-w-0">
          <Card className="p-[18px] bg-[#f4eee4] relative overflow-hidden min-h-[175px] flex flex-col justify-between">
            <img
              src={ASSETS.aiCat}
              alt="AI Shopping Cat"
              className="absolute right-1 bottom-0 w-[124px] h-[98px] object-contain object-right-bottom pointer-events-none select-none"
            />
            <div className="relative z-10 max-w-[230px] space-y-1.5">
              <Badge variant="success">Server-Authoritative Pricing</Badge>
              <h3 className="text-[13.5px] font-bold text-[#181715]">Verified Catalog Price Lock</h3>
              <p className="text-[10.5px] text-[#5c5954] leading-relaxed">
                Your checkout proposal locks {activeProd.price} directly from the authoritative database with zero client-side tampering.
              </p>
            </div>
          </Card>

          <Card className="p-[18px] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-[13.5px] font-bold text-[#181715] mb-2.5">
                Merchant &amp; Warranty Details
              </h3>
              <div className="space-y-2 text-[11px] text-[#5c5954]">
                <div className="flex justify-between py-1.5 border-b border-[#efe9de]">
                  <span>Authorized Seller</span>
                  <strong className="text-[#181715]">{activeProd.brand} Official Store</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#efe9de]">
                  <span>Shipping Speed</span>
                  <strong className="text-[#2b7a43]">Free 2-Day Express</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#efe9de]">
                  <span>Return Window</span>
                  <strong className="text-[#181715]">30-Day Free Returns</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>FraudGuard Risk Score</span>
                  <strong className="text-[#2b7a43]">99/100 Trusted ✓</strong>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
