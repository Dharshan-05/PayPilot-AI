"use client";

import React, { useState } from "react";
import { Header, ActiveNavTab } from "@/components/Header";
import { ProductCatalogGrid } from "@/components/ProductCatalogGrid";
import { ProductComparisonView } from "@/components/ProductComparisonView";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { CommerceAgentPanel } from "@/components/CommerceAgentPanel";
import { OrderFlowCard } from "@/components/OrderFlowCard";
import { SecurityAuditFeed } from "@/components/SecurityAuditFeed";
import {
  ShieldCheck,
  Lock,
  Layers,
  Zap,
  ShoppingBag,
  Bot,
  CreditCard,
  Scale,
  Activity,
  CheckCircle2,
  ExternalLink,
  Info,
} from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>("all");
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([
    "prod_keychron_k2",
    "prod_logitech_mx_keys",
  ]);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [draftOrder, setDraftOrder] = useState<{
    amount: number;
    currency: string;
    description: string;
    paypalOrderId?: string;
    internalReference?: string;
    approvalUrl?: string;
  } | null>(null);

  const [refreshSignal, setRefreshSignal] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleRefreshAudit = () => {
    setRefreshSignal((prev) => prev + 1);
  };

  const handleToggleComparison = (productId: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(productId)) {
        showToast("Removed product from comparison");
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 5) {
        showToast("Comparison limit reached (maximum 5 products)");
        return prev;
      }
      showToast("Added product to comparison");
      return [...prev, productId];
    });
  };

  const handleRemoveComparison = (productId: string) => {
    setSelectedForComparison((prev) => prev.filter((id) => id !== productId));
  };

  const handleClearComparison = () => {
    setSelectedForComparison([]);
    showToast("Comparison cleared");
  };

  const handleOpenProductModal = (productId: string) => {
    setViewingProductId(productId);
  };

  const handleCloseProductModal = () => {
    setViewingProductId(null);
  };

  const handleSelectForProposal = async (productId: string) => {
    try {
      showToast("Creating authoritative proposal...");
      const res = await fetch("/api/commerce/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Proposal created for ${data.data.product?.name || "Product"}. Switch to Copilot or Orders.`);
        handleRefreshAudit();
      } else {
        showToast(`Proposal creation failed: ${data.error?.message || "Unknown error"}`);
      }
    } catch (err: any) {
      showToast(`Error creating proposal: ${err.message}`);
    }
  };

  const handleProposalConfirmed = (orderData: {
    paypalOrderId: string;
    internalReference: string;
    amount: number;
    currency: string;
    description: string;
    approvalUrl?: string;
  }) => {
    setDraftOrder({
      amount: orderData.amount,
      currency: orderData.currency,
      description: orderData.description,
      paypalOrderId: orderData.paypalOrderId,
      internalReference: orderData.internalReference,
      approvalUrl: orderData.approvalUrl,
    });
    handleRefreshAudit();
    showToast("Proposal confirmed! PayPal Sandbox order ready for capture.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-slate-900 font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#001C64] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 animate-in slide-in-from-bottom-3 duration-200 border border-blue-400/30">
          <Info className="w-4 h-4 text-[#FFC439] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header with Tab Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        comparisonCount={selectedForComparison.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Fintech Hero Banner */}
        <section className="bg-gradient-to-r from-[#001C64] via-[#003087] to-[#00266e] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-900/40">
          <div className="absolute top-0 right-0 translate-x-12 -translate-y-8 w-96 h-96 bg-[#0079C1]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-48 translate-y-16 w-64 h-64 bg-[#FFC439]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full bg-[#FFC439] text-[#001C64] shadow-xs">
                PayPal AI Hackathon
              </span>
              <span className="text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                Phase 8 — PayPal-Inspired Product UI & AG Grid
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Enterprise Agentic Commerce & PayPal Checkout
            </h1>
            <p className="text-blue-100 text-sm sm:text-base mt-2.5 leading-relaxed font-normal max-w-3xl">
              An enterprise-grade commerce portal combining AG Grid catalog exploration, APIMatic-orchestrated AI copilot, multi-product comparative intelligence, and server-authoritative PayPal Sandbox execution.
            </p>

            {/* Invariant Trust Pillars */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-blue-400/20">
              <div className="flex items-center space-x-2.5 text-xs text-blue-100">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">Server Authoritative</div>
                  <div className="text-[10px] text-blue-200">Client never sets price</div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 text-xs text-blue-100">
                <div className="p-1.5 rounded-lg bg-[#FFC439]/20 text-[#FFC439]">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">Human Confirmation</div>
                  <div className="text-[10px] text-blue-200">Explicit gate before charge</div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 text-xs text-blue-100">
                <div className="p-1.5 rounded-lg bg-blue-400/20 text-blue-300">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">AG Grid Enterprise</div>
                  <div className="text-[10px] text-blue-200">High-performance catalog</div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 text-xs text-blue-100">
                <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">PayPal Sandbox</div>
                  <div className="text-[10px] text-blue-200">Strict payment state machine</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab-driven Content Areas */}

        {/* 1. Full Dashboard View */}
        {activeTab === "all" && (
          <div className="space-y-8">
            {/* Catalog Grid Section */}
            <section aria-labelledby="catalog-heading">
              <ProductCatalogGrid
                onSelectForProposal={handleSelectForProposal}
                onOpenProductModal={handleOpenProductModal}
                selectedForComparison={selectedForComparison}
                onToggleComparison={handleToggleComparison}
                onOpenCompareTab={() => setActiveTab("compare")}
              />
            </section>

            {/* Side-by-side Comparison Matrix (if items selected) */}
            {selectedForComparison.length > 0 && (
              <section aria-labelledby="compare-heading">
                <ProductComparisonView
                  selectedProductIds={selectedForComparison}
                  onRemoveProduct={handleRemoveComparison}
                  onClearComparison={handleClearComparison}
                  onSelectForProposal={handleSelectForProposal}
                  onOpenProductModal={handleOpenProductModal}
                />
              </section>
            )}

            {/* Split Section: AI Copilot + PayPal Checkout */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <CommerceAgentPanel
                onProposalConfirmed={handleProposalConfirmed}
                onRefreshAudit={handleRefreshAudit}
                onOpenProductModal={handleOpenProductModal}
                onToggleComparison={handleToggleComparison}
                selectedForComparison={selectedForComparison}
              />

              <OrderFlowCard
                draftOrder={draftOrder}
                onOrderCompleted={handleRefreshAudit}
              />
            </section>

            {/* Security Audit Feed */}
            <section aria-labelledby="audit-heading">
              <SecurityAuditFeed refreshSignal={refreshSignal} />
            </section>
          </div>
        )}

        {/* 2. Catalog View Only */}
        {activeTab === "catalog" && (
          <section className="space-y-6">
            <ProductCatalogGrid
              onSelectForProposal={handleSelectForProposal}
              onOpenProductModal={handleOpenProductModal}
              selectedForComparison={selectedForComparison}
              onToggleComparison={handleToggleComparison}
              onOpenCompareTab={() => setActiveTab("compare")}
            />
          </section>
        )}

        {/* 3. AI Copilot View Only */}
        {activeTab === "copilot" && (
          <section className="max-w-4xl mx-auto space-y-6">
            <CommerceAgentPanel
              onProposalConfirmed={handleProposalConfirmed}
              onRefreshAudit={handleRefreshAudit}
              onOpenProductModal={handleOpenProductModal}
              onToggleComparison={handleToggleComparison}
              selectedForComparison={selectedForComparison}
            />
          </section>
        )}

        {/* 4. Comparison View Only */}
        {activeTab === "compare" && (
          <section className="space-y-6">
            <ProductComparisonView
              selectedProductIds={selectedForComparison}
              onRemoveProduct={handleRemoveComparison}
              onClearComparison={handleClearComparison}
              onSelectForProposal={handleSelectForProposal}
              onOpenProductModal={handleOpenProductModal}
            />
            {selectedForComparison.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
                <Scale className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No products selected for comparison</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Browse the AG Grid catalog and click &ldquo;+ Compare&rdquo; on any 2 to 5 products to see an authoritative side-by-side analysis.
                </p>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className="mt-4 px-4 py-2 bg-[#003087] text-white rounded-xl text-xs font-bold hover:bg-[#001C64] transition-colors"
                >
                  Browse Catalog
                </button>
              </div>
            )}
          </section>
        )}

        {/* 5. Orders & Checkout View Only */}
        {activeTab === "orders" && (
          <section className="max-w-2xl mx-auto space-y-6">
            <OrderFlowCard
              draftOrder={draftOrder}
              onOrderCompleted={handleRefreshAudit}
            />
          </section>
        )}

        {/* 6. Security & Policy Audit View Only */}
        {activeTab === "audit" && (
          <section className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-[#001C64] flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Financial Security Invariant & Authorization Architecture</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800 mb-1">1. Non-Authoritative Client</div>
                  <p className="text-slate-600 leading-relaxed">
                    Browser, AG Grid, and AI prompt context can never set unit prices or change inventory status. All calculations originate on the server against the Prisma SQLite database.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800 mb-1">2. Explicit Human Gate</div>
                  <p className="text-slate-600 leading-relaxed">
                    AI suggestions are emitted as proposals with a 15-minute expiration window. PayPal orders are only created and captured upon explicit human confirmation.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800 mb-1">3. Sandbox State Machine</div>
                  <p className="text-slate-600 leading-relaxed">
                    Payment state moves from CREATED to CAPTURED via PayPal Sandbox API. Double-capture is prevented by multi-tier idempotency keys and database checks.
                  </p>
                </div>
              </div>
            </div>

            <SecurityAuditFeed refreshSignal={refreshSignal} />
          </section>
        )}
      </main>

      {/* Authoritative Product Detail Modal */}
      <ProductDetailModal
        productId={viewingProductId}
        isOpen={viewingProductId !== null}
        onClose={handleCloseProductModal}
        onAddToCompare={(id) => handleToggleComparison(id)}
        onSelectForProposal={(id) => {
          handleSelectForProposal(id);
          handleCloseProductModal();
        }}
      />

      {/* Global Fintech Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#001C64]">PayPal AI Commerce</span>
            <span>•</span>
            <span>Hackathon Phase 8 — UI & AG Grid</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-500">
            <span>AG Grid React v33+</span>
            <span>•</span>
            <span>PayPal Sandbox Verified</span>
            <span>•</span>
            <span>Server Authoritative Pricing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
