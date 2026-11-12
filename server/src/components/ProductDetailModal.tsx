"use client";

import React, { useEffect, useState } from "react";
import { X, ShieldCheck, Tag, Box, Star, CheckCircle2, AlertTriangle, ArrowRight, Scale, ShoppingBag } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  inventory: number;
  isAvailable: boolean;
  metadata?: string | null;
}

interface ProductDetailModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCompare?: (productId: string) => void;
  onSelectForProposal?: (productId: string) => void;
}

export function ProductDetailModal({
  productId,
  isOpen,
  onClose,
  onAddToCompare,
  onSelectForProposal,
}: ProductDetailModalProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !productId) {
      setProduct(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/products/${productId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load product details from server");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setProduct(data.data || data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [productId, isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let parsedMeta: any = {};
  if (product?.metadata) {
    try {
      parsedMeta = typeof product.metadata === "string" ? JSON.parse(product.metadata) : product.metadata;
    } catch {
      parsedMeta = {};
    }
  }

  const features: string[] = parsedMeta.features || [];
  const useCases: string[] = parsedMeta.useCases || [];
  const rating: number = parsedMeta.rating || 4.5;
  const reviewCount: number = parsedMeta.reviewCount || 98;
  const brand: string = parsedMeta.brand || "PayPal Commerce Verified";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              {product?.category || "Product"}
            </span>
            <span className="text-xs font-mono text-slate-500">
              SKU: {product?.sku || "..."}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500">Loading authoritative product details...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Product Not Found</h4>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {product && (
            <>
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{brand}</span>
                    <h2 id="modal-product-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                      {product.name}
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      ${product.price.toFixed(2)}
                    </div>
                    <span className="text-xs font-medium text-slate-500">{product.currency} Authoritative Price</span>
                  </div>
                </div>

                {/* Rating & Stock */}
                <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center space-x-1 text-amber-600 font-semibold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <span>{rating.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">({reviewCount} customer reviews)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {product.isAvailable && product.inventory > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        In Stock ({product.inventory} units available)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {product.description}
                </p>
              </div>

              {/* Key Features */}
              {features.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Hardware & Specs</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {features.map((feat, idx) => (
                      <div key={idx} className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Use Cases */}
              {useCases.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Recommended Use Cases</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {useCases.map((uc, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium flex items-center space-x-1">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        <span>{uc}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Policy Notice */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">PayPal Governed Commerce Protection:</span>
                  <p className="text-blue-800 text-xs mt-0.5">
                    Product prices and availability are verified directly against server database records. Clicking "Create Proposal" prepares a non-binding proposal with a 15-minute price lock.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {product && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-t border-slate-200 gap-3">
            <button
              onClick={() => {
                if (onAddToCompare && product) {
                  onAddToCompare(product.id);
                  onClose();
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
            >
              <Scale className="w-4 h-4 text-slate-500" />
              <span>Add to Comparison</span>
            </button>

            <button
              disabled={!product.isAvailable || product.inventory <= 0}
              onClick={() => {
                if (onSelectForProposal && product) {
                  onSelectForProposal(product.id);
                  onClose();
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Generate Purchase Proposal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}