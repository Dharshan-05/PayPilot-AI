"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  RowSelectedEvent,
  GridApi,
  GridReadyEvent,
} from "ag-grid-community";
import {
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  Scale,
  Eye,
  Star,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Layers,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
} from "lucide-react";

// Register all community features
ModuleRegistry.registerModules([AllCommunityModule]);

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  inventory: number;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  badge?: "BEST MATCH" | "BEST VALUE" | "BUDGET OPTION" | "PREMIUM PICK" | string;
  features: string[];
  useCases: string[];
}

interface ProductCatalogGridProps {
  onSelectForProposal?: (productId: string) => void;
  onOpenProductModal?: (productId: string) => void;
  selectedForComparison?: string[];
  onToggleComparison?: (productId: string) => void;
  onOpenCompareTab?: () => void;
}

export function ProductCatalogGrid({
  onSelectForProposal,
  onOpenProductModal,
  selectedForComparison = [],
  onToggleComparison,
  onOpenCompareTab,
}: ProductCatalogGridProps) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchMode, setSearchMode] = useState<"hybrid" | "semantic" | "keyword">("hybrid");
  const [sortOption, setSortOption] = useState<"relevance" | "price_asc" | "price_desc" | "availability">("relevance");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const [gridApi, setGridApi] = useState<GridApi<ProductRow> | null>(null);

  // Categories
  const categories = [
    { id: "all", label: "All Items" },
    { id: "keyboards", label: "Keyboards" },
    { id: "audio", label: "Audio & Headphones" },
    { id: "mice", label: "Mice & Pointers" },
    { id: "monitors", label: "Displays & Monitors" },
    { id: "software", label: "Developer Cloud" },
  ];

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (inStockOnly) params.set("inStockOnly", "true");
      params.set("mode", searchMode);
      params.set("sort", sortOption);
      params.set("limit", "25");

      const res = await fetch(`/api/products/search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load catalog products from server");
      const json = await res.json();

      const searchHits = json.data?.results || [];

      // Map to ProductRow
      const mapped: ProductRow[] = searchHits.map((hit: any) => {
        const p = hit.product;
        let meta: any = {};
        if (p.metadata) {
          try {
            meta = typeof p.metadata === "string" ? JSON.parse(p.metadata) : p.metadata;
          } catch {
            meta = {};
          }
        }

        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          description: p.description,
          category: p.category,
          price: p.price,
          currency: p.currency,
          inventory: p.inventory,
          isAvailable: p.isAvailable,
          rating: meta.rating || 4.5,
          reviewCount: meta.reviewCount || 100,
          badge: hit.evidence?.badge || (p.price < 70 ? "BEST VALUE" : undefined),
          features: meta.features || [],
          useCases: meta.useCases || [],
        };
      });

      setProducts(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, inStockOnly, searchMode, sortOption]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const onGridReady = (params: GridReadyEvent<ProductRow>) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  };

  // AG Grid Column Definitions
  const columnDefs: ColDef<ProductRow>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Product Name & SKU",
        minWidth: 260,
        flex: 2,
        cellRenderer: (params: any) => {
          if (!params.data) return null;
          const { id, name, sku, category } = params.data;
          return (
            <div className="flex flex-col justify-center h-full py-1">
              <button
                onClick={() => onOpenProductModal && onOpenProductModal(id)}
                className="text-left font-bold text-slate-900 hover:text-blue-700 transition-colors line-clamp-1 focus:outline-none focus:underline"
              >
                {name}
              </button>
              <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                <span className="font-mono bg-slate-100 px-1 rounded text-slate-600 border border-slate-200">
                  {sku}
                </span>
                <span className="capitalize">{category}</span>
              </div>
            </div>
          );
        },
      },
      {
        field: "price",
        headerName: "Authoritative Price",
        width: 140,
        sortable: true,
        cellRenderer: (params: any) => {
          if (!params.data) return null;
          return (
            <div className="flex items-center h-full font-extrabold text-blue-900 text-sm">
              ${params.data.price.toFixed(2)} <span className="text-[11px] font-normal text-slate-500 ml-1">{params.data.currency}</span>
            </div>
          );
        },
      },
      {
        field: "inventory",
        headerName: "Stock Level",
        width: 150,
        sortable: true,
        cellRenderer: (params: any) => {
          if (!params.data) return null;
          const { inventory, isAvailable } = params.data;
          if (!isAvailable || inventory <= 0) {
            return (
              <span className="inline-flex items-center text-xs font-semibold text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 shrink-0" />
                Out of Stock
              </span>
            );
          }
          if (inventory < 10) {
            return (
              <span className="inline-flex items-center text-xs font-semibold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 shrink-0" />
                Low Stock ({inventory})
              </span>
            );
          }
          return (
            <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
              In Stock ({inventory})
            </span>
          );
        },
      },
      {
        field: "rating",
        headerName: "Customer Rating",
        width: 160,
        sortable: true,
        cellRenderer: (params: any) => {
          if (!params.data) return null;
          return (
            <div className="flex items-center space-x-1.5 h-full text-xs text-slate-700">
              <span className="flex items-center text-amber-600 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 mr-1 inline" />
                {params.data.rating.toFixed(1)}
              </span>
              <span className="text-slate-400">({params.data.reviewCount})</span>
            </div>
          );
        },
      },
      {
        field: "badge",
        headerName: "Intelligence Badge",
        width: 150,
        cellRenderer: (params: any) => {
          if (!params.data?.badge) {
            return <span className="text-slate-300 text-xs">—</span>;
          }
          const badge = params.data.badge;
          let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
          if (badge === "BEST MATCH") badgeClass = "bg-amber-100 text-amber-800 border-amber-300 font-extrabold";
          else if (badge === "BEST VALUE") badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold";
          else if (badge === "PREMIUM PICK") badgeClass = "bg-purple-100 text-purple-800 border-purple-300 font-extrabold";

          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${badgeClass}`}>
              <Sparkles className="w-3 h-3 mr-1 inline" />
              {badge}
            </span>
          );
        },
      },
      {
        headerName: "Actions",
        width: 220,
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          if (!params.data) return null;
          const p = params.data;
          const isCompared = selectedForComparison.includes(p.id);

          return (
            <div className="flex items-center space-x-2 h-full">
              <button
                onClick={() => onOpenProductModal && onOpenProductModal(p.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 text-xs transition-colors"
                title="View product details"
                aria-label={`View details for ${p.name}`}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onToggleComparison && onToggleComparison(p.id)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  isCompared
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 border-slate-200"
                }`}
                title={isCompared ? "Remove from comparison" : "Add to comparison"}
                aria-label={`${isCompared ? "Remove from" : "Add to"} comparison for ${p.name}`}
              >
                <Scale className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onSelectForProposal && onSelectForProposal(p.id)}
                disabled={!p.isAvailable || p.inventory <= 0}
                className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors flex items-center space-x-1"
                title="Create purchase proposal"
              >
                <ShoppingBag className="w-3 h-3" />
                <span>Buy</span>
              </button>
            </div>
          );
        },
      },
    ],
    [onOpenProductModal, onToggleComparison, onSelectForProposal, selectedForComparison]
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Search & Filter Header Bar */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/70 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Natural Language & Keyword Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products semantically (e.g., 'quiet wireless keyboard for coding under $100')..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
              aria-label="Search catalog products"
            />
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Mode Pill Selector */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
              {(["hybrid", "semantic", "keyword"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSearchMode(m)}
                  className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-colors ${
                    searchMode === m
                      ? "bg-blue-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
              aria-label="Sort products by"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="availability">Availability</option>
            </select>

            {/* In-Stock Toggle */}
            <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 cursor-pointer shadow-xs">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span>In Stock Only</span>
            </label>

            {/* View Mode Switcher */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "table" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table view (AG Grid)"
                aria-label="Switch to AG Grid Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "cards" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card grid view"
                aria-label="Switch to Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchCatalog}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-blue-700 border border-slate-300 rounded-lg bg-white shadow-xs transition-colors"
              title="Refresh product list"
              aria-label="Refresh catalog"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Category Filter Pills & Comparison Floating Tray */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? "bg-blue-700 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Comparison CTA Button */}
          {selectedForComparison.length > 0 && (
            <div className="inline-flex items-center space-x-2 animate-in fade-in">
              <span className="text-xs font-medium text-slate-600">
                {selectedForComparison.length} selected
              </span>
              <button
                onClick={onOpenCompareTab}
                disabled={selectedForComparison.length < 2}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Compare Selected ({selectedForComparison.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid or Cards Body */}
      <div className="p-4 sm:p-6 flex-1 min-h-[460px]">
        {loading && products.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Querying authoritative product catalog...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <span className="font-bold">Catalog Error:</span> {error}
          </div>
        )}

        {!loading && products.length === 0 && !error && (
          <div className="py-20 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-800">No products matched your search</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your query, relaxing budget or stock constraints, or switching search modes.
            </p>
          </div>
        )}

        {/* AG GRID TABLE VIEW */}
        {viewMode === "table" && products.length > 0 && (
          <div className="ag-theme-quartz w-full h-[520px]">
            <AgGridReact<ProductRow>
              rowData={products}
              columnDefs={columnDefs}
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[5, 10, 20]}
              rowHeight={52}
              headerHeight={44}
              animateRows={true}
              onGridReady={onGridReady}
              suppressCellFocus={true}
              domLayout="normal"
            />
          </div>
        )}

        {/* RESPONSIVE CARDS VIEW */}
        {viewMode === "cards" && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => {
              const isCompared = selectedForComparison.includes(p.id);
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {p.category}
                      </span>
                      {p.badge && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {p.badge}
                        </span>
                      )}
                    </div>

                    <h4
                      onClick={() => onOpenProductModal && onOpenProductModal(p.id)}
                      className="text-sm font-bold text-slate-900 hover:text-blue-700 cursor-pointer line-clamp-1"
                      title={p.name}
                    >
                      {p.name}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {p.description}
                    </p>

                    <div className="flex items-baseline space-x-1.5 mt-3">
                      <span className="text-xl font-extrabold text-blue-900">
                        ${p.price.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{p.currency}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="flex items-center text-amber-600 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 mr-1 inline" />
                        {p.rating.toFixed(1)}
                      </span>
                      <span className="text-slate-500">
                        {p.isAvailable && p.inventory > 0 ? (
                          <span className="text-emerald-700 font-semibold">In Stock ({p.inventory})</span>
                        ) : (
                          <span className="text-rose-600 font-semibold">Out of Stock</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => onOpenProductModal && onOpenProductModal(p.id)}
                      className="flex-1 py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => onToggleComparison && onToggleComparison(p.id)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        isCompared
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 border-slate-200"
                      }`}
                      title={isCompared ? "Remove from comparison" : "Compare"}
                    >
                      <Scale className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSelectForProposal && onSelectForProposal(p.id)}
                      disabled={!p.isAvailable || p.inventory <= 0}
                      className="py-1.5 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                    >
                      Buy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Footer Notice */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Server-Authoritative Pricing & Stock: All transactions validated directly with SQLite Prisma database.</span>
        </div>
        <div className="font-medium text-slate-600">
          Showing {products.length} products
        </div>
      </div>
    </div>
  );
}