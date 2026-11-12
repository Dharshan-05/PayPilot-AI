"use client";

import React, { useEffect, useState } from "react";
import {
  Scale,
  CheckCircle2,
  AlertCircle,
  X,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Star,
  Check,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

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

interface ComparisonResult {
  productIds: string[];
  products: Product[];
  comparisonRows: Array<{
    attribute: string;
    values: Record<string, string>;
    highlightBest?: string;
  }>;
  advantages: Record<string, string[]>;
  tradeoffs: string[];
  summary: string;
}

interface ProductComparisonViewProps {
  selectedProductIds: string[];
  onRemoveProduct?: (productId: string) => void;
  onClearComparison?: () => void;
  onSelectForProposal?: (productId: string) => void;
  onOpenProductModal?: (productId: string) => void;
}

export function ProductComparisonView({
  selectedProductIds,
  onRemoveProduct,
  onClearComparison,
  onSelectForProposal,
  onOpenProductModal,
}: ProductComparisonViewProps) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProductIds.length < 2) {
      setComparison(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch("/api/products/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: selectedProductIds.slice(0, 5) }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Failed to compare products");
        return json.data || json;
      })
      .then((data) => {
        if (isMounted) {
          setComparison(data);
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
  }, [selectedProductIds]);

  if (selectedProductIds.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
          <Scale className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Side-by-Side Product Comparison</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
          Select between <strong>2 and 5 products</strong> in the AG Grid catalog or ask the AI Commerce Copilot (e.g. <em>"Compare the best two keyboards"</em>) to see an authoritative comparison of specifications, advantages, and trade-offs.
        </p>
        <div className="mt-4 inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
          <span>Currently selected:</span>
          <span className="font-bold text-blue-700">{selectedProductIds.length} of 5</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-800/80 border border-blue-400/30 flex items-center justify-center">
            <Scale className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight">Side-by-Side Product Comparison</h3>
            <p className="text-xs text-blue-200">
              Comparing {selectedProductIds.length} candidate items powered by Product Intelligence
            </p>
          </div>
        </div>

        {onClearComparison && (
          <button
            onClick={onClearComparison}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Comparison</span>
          </button>
        )}
      </div>

      {loading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Evaluating comparison matrix and trade-offs...</p>
        </div>
      )}

      {error && (
        <div className="p-6">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Comparison Error</h4>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      {comparison && !loading && (
        <div className="p-6 space-y-6">
          {/* Product Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {comparison.products.map((p) => {
              let parsedMeta: any = {};
              if (p.metadata) {
                try {
                  parsedMeta = typeof p.metadata === "string" ? JSON.parse(p.metadata) : p.metadata;
                } catch {
                  parsedMeta = {};
                }
              }
              const rating = parsedMeta.rating || 4.5;
              const isBest = comparison.comparisonRows.some(
                (r) => r.highlightBest === p.id && r.attribute.toLowerCase().includes("price")
              );

              return (
                <div
                  key={p.id}
                  className="relative p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/30 hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
                >
                  {onRemoveProduct && (
                    <button
                      onClick={() => onRemoveProduct(p.id)}
                      className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-200 transition-colors"
                      title="Remove from comparison"
                      aria-label={`Remove ${p.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <div>
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {p.category}
                      </span>
                      {isBest && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          BEST VALUE
                        </span>
                      )}
                    </div>

                    <h4
                      onClick={() => onOpenProductModal && onOpenProductModal(p.id)}
                      className="text-sm font-bold text-slate-900 line-clamp-2 hover:text-blue-700 cursor-pointer"
                      title={p.name}
                    >
                      {p.name}
                    </h4>

                    <div className="flex items-baseline space-x-1.5 mt-2">
                      <span className="text-xl font-extrabold text-slate-900">
                        ${p.price.toFixed(2)}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{p.currency}</span>
                    </div>

                    <div className="flex items-center space-x-1 mt-1 text-xs text-amber-600 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>{rating.toFixed(1)}</span>
                      <span className="text-slate-400 font-normal">/ 5.0</span>
                    </div>
                  </div>

                  {onSelectForProposal && (
                    <button
                      onClick={() => onSelectForProposal(p.id)}
                      disabled={!p.isAvailable || p.inventory <= 0}
                      className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Select This Option</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Side-by-Side Comparison Matrix */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4 w-44">Feature / Metric</th>
                    {comparison.products.map((p) => (
                      <th key={p.id} className="py-3 px-4 min-w-[180px]">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {comparison.comparisonRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 hover:bg-slate-50"}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-800 bg-slate-50/80">
                        {row.attribute}
                      </td>
                      {comparison.products.map((p) => {
                        const val = row.values[p.id] || "—";
                        const isBestAttr = row.highlightBest === p.id;
                        return (
                          <td
                            key={p.id}
                            className={`py-2.5 px-4 ${
                              isBestAttr ? "bg-emerald-50 text-emerald-900 font-bold" : "text-slate-700"
                            }`}
                          >
                            <div className="flex items-center space-x-1.5">
                              {isBestAttr && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              <span>{val}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advantages & Tradeoffs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Distinct Advantages */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Distinct Advantages</span>
              </div>
              <div className="space-y-3 text-xs">
                {comparison.products.map((p) => {
                  const advs = comparison.advantages[p.id] || [];
                  if (advs.length === 0) return null;
                  return (
                    <div key={p.id} className="space-y-1">
                      <span className="font-bold text-slate-900">{p.name}:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-1">
                        {advs.map((adv, aIdx) => (
                          <li key={aIdx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trade-Offs */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Trade-Offs to Consider</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                {comparison.tradeoffs.map((to, tIdx) => (
                  <li key={tIdx} className="leading-relaxed">
                    {to}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* AI Grounded Summary */}
          {comparison.summary && (
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-blue-800">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Product Intelligence Summary</span>
              </div>
              <p className="leading-relaxed text-blue-950 font-medium">{comparison.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}