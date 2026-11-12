import React, { useEffect, useState } from 'react';
import { Sparkles, Send, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';
import { type ProductCategory, type ProductPick } from '../data/products';
import { agentService } from '../services/agentService';
import { mapBackendProductToProductPick } from '../services/productService';
import { ApiClientError, type BackendProposal } from '../services/types';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Badge } from '../components/Badge';
import { Tabs } from '../components/Tabs';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';

export type ShoppingTab = 'All' | ProductCategory;

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  proposal?: BackendProposal | null;
  isError?: boolean;
}

export interface AiShoppingPageProps {
  initialProducts: ProductPick[];
  onSelectProductForModal: (prod: ProductPick) => void;
  onReviewProposalCheckout: (proposal: BackendProposal, product?: ProductPick) => void;
  onNavigate: (route: RoutePath, entityId?: string) => void;
  onToast: (msg: string) => void;
}

export const AiShoppingPage: React.FC<AiShoppingPageProps> = ({
  initialProducts,
  onSelectProductForModal,
  onReviewProposalCheckout,
  onNavigate,
  onToast,
}) => {
  const [shoppingTab, setShoppingTab] = useState<ShoppingTab>('All');
  const [shoppingInput, setShoppingInput] = useState('Find a wireless mechanical keyboard under $100.');
  const [sessionId] = useState(() => `fe_session_${Date.now().toString(36)}`);
  const [sending, setSending] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState<ProductPick[]>(initialProducts);
  const [shoppingMessages, setShoppingMessages] = useState<ChatMessage[]>([
    {
      id: 'm-welcome',
      sender: 'ai',
      text: 'Welcome to PayPal AI Deal Finder! Ask me to search the live catalog by budget or category. I can draft a server-authoritative purchase proposal for your confirmation.',
      timestamp: 'Ready',
    },
  ]);

  useEffect(() => {
    if (displayedProducts.length === 0 && initialProducts.length > 0) {
      setDisplayedProducts(initialProducts);
    }
  }, [initialProducts, displayedProducts.length]);

  const sendPrompt = async (prompt: string) => {
    const q = prompt.trim();
    if (!q || sending) return;

    const nowLabel = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setShoppingMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, sender: 'user', text: q, timestamp: nowLabel },
    ]);
    setSending(true);

    try {
      const response = await agentService.chat({ message: q, sessionId });
      if (response.products && response.products.length > 0) {
        const mapped = response.products.map((p, idx) =>
          mapBackendProductToProductPick(p, idx)
        );
        setDisplayedProducts(mapped);
        setShoppingTab('All');
      }

      setShoppingMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'ai',
          text: response.message,
          timestamp: nowLabel,
          proposal: response.proposal ?? null,
        },
      ]);
    } catch (err: unknown) {
      const errText =
        err instanceof ApiClientError
          ? err.message
          : 'Unable to reach AI Commerce Agent. Please try again.';
      setShoppingMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: errText,
          timestamp: nowLabel,
          isError: true,
        },
      ]);
      onToast(errText);
    } finally {
      setSending(false);
    }
  };

  const visibleProducts = displayedProducts.filter(
    (p) => shoppingTab === 'All' || p.category === shoppingTab
  );

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="AI Shopping Assistant"
        subtitle="Find smarter deals with PayPal AI & server-authoritative proposals."
        onBack={() => onNavigate('/')}
        rightSlot={
          <Tabs
            tabs={['All', 'Recommended for you', 'Best Deals', 'Price Drops', 'PayPal Rewards']}
            activeTab={shoppingTab}
            onChange={(t) => setShoppingTab(t as ShoppingTab)}
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-[14px] flex-1">
        <Card className="p-[18px] flex flex-col justify-between bg-[#f4eee4] relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#e5ded3]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#181715]" aria-hidden="true" />
                <span className="text-[13px] font-bold text-[#181715]">PayPal Deal Finder AI</span>
              </div>
              <Badge variant="success">{sending ? 'Analyzing...' : 'Live Agent Ready'}</Badge>
            </div>

            <div className="flex items-center gap-3 mt-3 p-2.5 rounded-[12px] bg-[#faf5ec]/80 border border-[#e5ded3]">
              <img src={ASSETS.aiCat} alt="AI Shopping Cat" className="w-[93px] h-[74px] sm:w-[124px] sm:h-[98px] object-contain shrink-0" />
              <div className="text-[10.5px] text-[#5c5954]">
                Ask me for keyboards, noise-canceling audio, monitors, or cloud passes under your budget.
              </div>
            </div>

            <div className="space-y-2.5 my-3 max-h-[260px] overflow-y-auto pr-1">
              {shoppingMessages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-[14px] text-[11px] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#222220] text-[#f7f2e8] ml-6 rounded-br-[4px]'
                      : m.isError
                      ? 'bg-[#f5d8d4] text-[#8f2419] border border-[#e3b1ab] mr-4 rounded-bl-[4px]'
                      : 'bg-[#faf5ec] text-[#1c1b19] border border-[#e5ded3] mr-4 rounded-bl-[4px]'
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>
                  {m.proposal && m.proposal.status === 'PENDING_CONFIRMATION' && (
                    <div className="mt-2.5 pt-2 border-t border-[#e5ded3] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-[#2b7a43]">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          Proposal #{m.proposal.proposalNumber}
                        </span>
                        <span>${Number(m.proposal.totalAmount).toFixed(2)}</span>
                      </div>
                      <PrimaryButton
                        onClick={() => {
                          const matched = displayedProducts.find(
                            (p) => p.id === m.proposal?.productId
                          );
                          onReviewProposalCheckout(m.proposal!, matched);
                        }}
                        className="w-full h-[30px] text-[10.5px]"
                      >
                        Review &amp; Confirm Checkout
                      </PrimaryButton>
                    </div>
                  )}
                  <div className="text-[9px] opacity-70 mt-1 text-right">{m.timestamp}</div>
                </div>
              ))}
              {sending && (
                <div className="p-2.5 rounded-[14px] bg-[#faf5ec] border border-[#e5ded3] mr-4 text-[10.5px] text-[#6a665f]">
                  Scanning authoritative catalog &amp; policy rules...
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-2 relative z-10">
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              {[
                'Find a wireless mechanical keyboard under $100.',
                'Noise-canceling headphones deal',
                'I want to buy Developer Pro Cloud Pass',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    setShoppingInput(prompt);
                    void sendPrompt(prompt);
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#faf5ec] hover:bg-[#efe8dc] border border-[#dfd8cd] text-[9.5px] font-medium text-[#2b2927] cursor-pointer disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const current = shoppingInput;
                setShoppingInput('');
                void sendPrompt(current);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={shoppingInput}
                onChange={(e) => setShoppingInput(e.target.value)}
                disabled={sending}
                aria-label="Ask PayPal AI for deals or products"
                placeholder="Ask PayPal AI for deals or products..."
                className="flex-1 h-[38px] px-3.5 rounded-full bg-[#faf5ec] border border-[#dfd8cd] text-[11.5px]"
              />
              <PrimaryButton type="submit" disabled={sending} className="h-[38px] px-4">
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
              </PrimaryButton>
            </form>
          </div>
        </Card>

        {displayedProducts.length === 0 && sending ? (
          <Card className="p-[18px]">
            <LoadingState rows={4} label="Loading recommended products..." />
          </Card>
        ) : visibleProducts.length === 0 ? (
          <Card className="p-[18px]">
            <EmptyState
              title="No products in this tab"
              description="Switch to All or ask PayPal AI for a different product category."
              actionLabel="Show All Products"
              onAction={() => {
                setShoppingTab('All');
                setDisplayedProducts(initialProducts);
              }}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
            {visibleProducts.map((prod) => (
              <Card key={prod.id} className="p-[18px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="default">{prod.category}</Badge>
                    <Badge variant="success">{prod.savings}</Badge>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('/product/:id', prod.id)}
                    className="w-full h-[96px] rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] p-3 flex items-center justify-center mb-3 cursor-pointer hover:border-[#bab2a6] transition-colors"
                  >
                    <img src={prod.image} alt={prod.name} className="w-[80px] h-[68px] object-contain" />
                  </button>

                  <div className="flex items-center justify-between text-[10.5px] text-[#6a665f] mb-1">
                    <span className="font-semibold text-[#181715]">{prod.brand}</span>
                    <span>
                      {prod.rating} ({prod.reviewsCount} reviews)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('/product/:id', prod.id)}
                    className="text-left text-[13.5px] font-bold text-[#181715] leading-snug hover:underline cursor-pointer"
                  >
                    {prod.name}
                  </button>
                  <p className="text-[10.5px] text-[#6a665f] mt-1 leading-relaxed">{prod.summary}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-[#efe9de]">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <span className="text-[18px] font-extrabold text-[#181715]">{prod.price}</span>
                      <span className="text-[11px] text-[#8c867e] line-through ml-1.5">
                        {prod.originalPrice}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10.5px] font-bold text-[#2b7a43]">{prod.cashbackText}</div>
                      <div className="text-[9.5px] text-[#6a665f]">{prod.rewardPoints}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <SecondaryButton
                      onClick={() => onNavigate('/product/:id', prod.id)}
                      className="h-[34px] px-3 text-[11px]"
                    >
                      Details
                    </SecondaryButton>
                    <PrimaryButton
                      disabled={prod.isAvailable === false || prod.inventory === 0}
                      onClick={() => onSelectProductForModal(prod)}
                      className="flex-1 h-[34px] text-[11px]"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Buy / View with PayPal</span>
                    </PrimaryButton>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiShoppingPage;
