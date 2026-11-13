import React, { useEffect, useMemo, useState } from 'react';
import { ASSETS } from '../assets/images';
import {
  DESIGN_TOKENS,
  HELP_QA_DATA,
  HERO_SLIDES,
  NAV_ITEMS,
  type NavItemId,
  type RoutePath,
} from '../data/dashboard';
import {
  ANALYTICS_BY_TIMEFRAME,
  SPENDING_BY_PERIOD,
  type SpendingPeriod,
} from '../data/analytics';
import { INITIAL_AGENTS, type AgentItem } from '../data/agents';
import { INITIAL_NOTIFICATIONS, type NotificationItem } from '../data/notifications';
import { AI_PRODUCT_PICKS, type ProductPick } from '../data/products';
import {
  INITIAL_POINTS_HISTORY,
  INITIAL_REWARD_OFFERS,
  type PointsHistoryItem,
  type RewardOffer,
} from '../data/rewards';
import {
  INITIAL_MONEY_REQUESTS,
  INITIAL_TRANSACTIONS,
  type MoneyRequestItem,
  type TransactionItem,
} from '../data/transactions';
import { CONTACTS_DATA, CURRENT_USER, type UserProfile } from '../data/users';
import {
  createDepositTransaction,
  executeGovernedProductCheckout,
  executePayPalTransferOrder,
} from '../services/paypalService';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { agentService } from '../services/agentService';
import { dashboardService } from '../services/dashboardService';
import { ApiClientError, type BackendProposal } from '../services/types';
import { AppLayout } from '../components/AppLayout';
import { ActionModal, type ActiveModalType } from '../components/ActionModal';
import { DashboardHomePage } from './DashboardHomePage';
import { SendMoneyPage } from './SendMoneyPage';
import { RequestMoneyPage } from './RequestMoneyPage';
import { AddMoneyPage } from './AddMoneyPage';
import { TransactionsPage } from './TransactionsPage';
import { TransactionDetailsPage } from './TransactionDetailsPage';
import { RewardsPage } from './RewardsPage';
import { FraudGuardPage } from './FraudGuardPage';
import { AgentsPage } from './AgentsPage';
import { AnalyticsPage } from './AnalyticsPage';
import { SettingsPage } from './SettingsPage';
import { ProductDiscoveryPage } from './ProductDiscoveryPage';
import { ProductDetailsPage } from './ProductDetailsPage';
import { CheckoutPage } from './CheckoutPage';
import { AiShoppingPage } from './AiShoppingPage';
import { UserProfilePage } from './UserProfilePage';
import { NotificationsPage } from './NotificationsPage';
import { HelpCenterPage } from './HelpCenterPage';

export {
  ASSETS,
  DESIGN_TOKENS,
  NAV_ITEMS,
  HERO_SLIDES,
  HELP_QA_DATA,
  CURRENT_USER,
  CONTACTS_DATA,
  INITIAL_TRANSACTIONS,
  INITIAL_MONEY_REQUESTS,
  INITIAL_REWARD_OFFERS,
  INITIAL_POINTS_HISTORY,
  INITIAL_AGENTS,
  AI_PRODUCT_PICKS,
  INITIAL_NOTIFICATIONS,
  ANALYTICS_BY_TIMEFRAME,
  SPENDING_BY_PERIOD,
};

const VALID_STATIC_ROUTES: RoutePath[] = [
  '/',
  '/send-money',
  '/request-money',
  '/add-money',
  '/ai-shopping',
  '/shopping-assistant',
  '/discovery',
  '/product/:id',
  '/checkout',
  '/transactions',
  '/transactions/:id',
  '/rewards',
  '/fraudguard',
  '/agents',
  '/analytics',
  '/settings',
  '/profile',
  '/notifications',
  '/help',
];

export default function DashboardPage() {
  const [currentRoute, setCurrentRoute] = useState<RoutePath>('/');
  const [selectedTxId, setSelectedTxId] = useState<string>('tx-1');
  const [selectedProdId, setSelectedProdId] = useState<string>('prod-1');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);
  const [spendingPeriod, setSpendingPeriod] = useState<SpendingPeriod>('This Month');

  const [balanceNumber, setBalanceNumber] = useState<number>(1248.75);
  const [rewardPoints, setRewardPoints] = useState<number>(2450);
  const [products, setProducts] = useState<ProductPick[]>(AI_PRODUCT_PICKS);
  const [pendingProposal, setPendingProposal] = useState<BackendProposal | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);
  const [moneyRequests, setMoneyRequests] = useState<MoneyRequestItem[]>(INITIAL_MONEY_REQUESTS);
  const [rewardOffers] = useState<RewardOffer[]>(INITIAL_REWARD_OFFERS);
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>(INITIAL_POINTS_HISTORY);
  const [agents, setAgents] = useState<AgentItem[]>(INITIAL_AGENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [userProfile, setUserProfile] = useState<UserProfile>(CURRENT_USER);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('PayPal Balance ($1,248.75)');

  const [checkoutDone, setCheckoutDone] = useState(false);
  const [aiPromptInput] = useState('Find the best laptop under $900...');
  const [selectedProduct, setSelectedProduct] = useState<ProductPick | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [transferAmount, setTransferAmount] = useState('50.00');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const navigate = (route: RoutePath, entityId?: string) => {
    if (route === '/transaction/' || route === '/transactions/:id') {
      if (entityId) setSelectedTxId(entityId);
      setCurrentRoute('/transactions/:id');
    } else if (route === '/product/:id') {
      if (entityId) setSelectedProdId(entityId);
      setCurrentRoute('/product/:id');
    } else if (route === '/shopping-assistant') {
      setCurrentRoute('/ai-shopping');
    } else {
      setCurrentRoute(route);
    }
    setUserMenuOpen(false);
    try {
      let hash = `#${route}`;
      if (route === '/transaction/' || route === '/transactions/:id') {
        hash = `#/transactions/${entityId || selectedTxId}`;
      } else if (route === '/product/:id') {
        hash = `#/product/${entityId || selectedProdId}`;
      } else if (route === '/shopping-assistant') {
        hash = '#/ai-shopping';
      }
      if (window.location.hash !== hash) {
        window.history.pushState({ route, entityId }, '', hash);
      }
    } catch {
      // Sandbox iframe safe fallback
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    async function hydrateBackendState() {
      try {
        const [catalogRes, ordersRes, dashboardRes, notifsRes] = await Promise.allSettled([
          productService.listProducts({ limit: 20 }, { signal: controller.signal }),
          orderService.listOrders(25, { signal: controller.signal }),
          dashboardService.getStats({ signal: controller.signal }),
          dashboardService.getNotifications({ signal: controller.signal }),
        ]);

        if (controller.signal.aborted) return;

        if (catalogRes.status === 'fulfilled' && catalogRes.value.length > 0) {
          setProducts(catalogRes.value);
          setSelectedProdId((prev) =>
            prev === 'prod-1' ? catalogRes.value[0].id : prev
          );
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value.length > 0) {
          setTransactions(ordersRes.value);
          setSelectedTxId((prev) =>
            prev === 'tx-1' ? ordersRes.value[0].id : prev
          );
        }

        if (dashboardRes.status === 'fulfilled' && dashboardRes.value) {
          const stats = dashboardRes.value;
          if (stats.metrics.totalRevenue > 0) {
            setBalanceNumber(Number(stats.metrics.totalRevenue.toFixed(2)));
          }
        }

        if (notifsRes.status === 'fulfilled' && notifsRes.value && Array.isArray(notifsRes.value.notifications)) {
          const fetchedNotifs = notifsRes.value.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            body: n.message,
            time: new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            category: (['PAYMENT', 'SECURITY', 'REWARD', 'AGENT'].includes(n.type) ? n.type.charAt(0) + n.type.slice(1).toLowerCase() + 's' : 'Payments') as any,
            unread: !n.read,
            targetRoute: '/notifications' as const,
          }));
          if (fetchedNotifs.length > 0) {
            setNotifications(fetchedNotifs);
          }
        }

        await agentService.getHealth({ signal: controller.signal }).catch(() => null);
      } catch {
        // Leave controlled initial demo fallback intact when server is unreachable
      }
    }

    void hydrateBackendState();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      try {
        const hashRaw = window.location.hash.replace(/^#/, '');
        const pathRaw = window.location.pathname;
        const raw = hashRaw || (pathRaw && pathRaw !== '/' ? pathRaw : '/');

        if (raw.startsWith('/transactions/') || raw.startsWith('/transaction/')) {
          const id = raw.replace('/transactions/', '').replace('/transaction/', '') || 'tx-1';
          setSelectedTxId(id);
          setCurrentRoute('/transactions/:id');
          return;
        }
        if (raw.startsWith('/product/')) {
          const id = raw.replace('/product/', '');
          if (id) setSelectedProdId(id);
          setCurrentRoute('/product/:id');
          return;
        }
        if (raw === '/shopping-assistant') {
          setCurrentRoute('/ai-shopping');
          return;
        }
        if (VALID_STATIC_ROUTES.includes(raw as RoutePath)) {
          setCurrentRoute(raw as RoutePath);
        }
      } catch {
        // Ignore in restricted iframe
      }
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, []);

  const activeNav: NavItemId = useMemo(() => {
    switch (currentRoute) {
      case '/':
        return 'home';
      case '/send-money':
        return 'send';
      case '/request-money':
        return 'request';
      case '/add-money':
        return 'add';
      case '/ai-shopping':
      case '/shopping-assistant':
        return 'ai-shopping';
      case '/discovery':
        return 'discovery';
      case '/product/:id':
        return 'product-details';
      case '/checkout':
        return 'checkout';
      case '/transactions':
        return 'transactions';
      case '/transactions/:id':
      case '/transaction/':
        return 'transaction-details';
      case '/rewards':
        return 'rewards';
      case '/fraudguard':
        return 'fraudguard';
      case '/agents':
        return 'agents';
      case '/analytics':
        return 'analytics';
      case '/settings':
      case '/profile':
        return 'settings';
      default:
        return 'home';
    }
  }, [currentRoute]);

  const filteredHomeTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transactions.slice(0, 4);
    return transactions
      .filter(
        (t) =>
          t.merchant.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.amount.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [transactions, searchQuery]);

  const activeAgentCount = agents.filter((a) => a.status === 'Active').length;
  const unreadNotifCount = notifications.filter((n) => n.unread).length;

  const handleHeaderSearchSubmit = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    if (q.includes('laptop') || q.includes('headphone') || q.includes('watch') || q.includes('deal')) {
      navigate('/shopping-assistant');
    } else if (q.includes('send')) {
      navigate('/send-money');
    } else if (q.includes('reward') || q.includes('point')) {
      navigate('/rewards');
    } else if (q.includes('help') || q.includes('decline') || q.includes('refund')) {
      navigate('/help');
    } else {
      setTxSearch(searchQuery);
      navigate('/transactions');
    }
  };

  const handleConfirmQuickTransfer = async (mode: 'send' | 'request' | 'add') => {
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerToast('Please enter a valid positive amount.');
      return;
    }

    if (mode === 'send') {
      setModalSubmitting(true);
      try {
        const { tx } = await executePayPalTransferOrder({
          recipientName: 'Sarah K.',
          recipientEmail: 'sarah.k@designstudio.io',
          amount: amt,
          currency: 'USD',
          source: 'PayPal Balance',
          note: 'Quick PayPal transfer to Sarah K.',
        });
        setBalanceNumber((prev) => Math.max(0, +(prev - amt).toFixed(2)));
        setTransactions((prev) => [tx, ...prev]);
        setSelectedTxId(tx.id);
        setActiveModal(null);
        triggerToast(`Sent $${amt.toFixed(2)} via PayPal (${tx.txCode})`);
      } catch (err: unknown) {
        triggerToast(
          err instanceof ApiClientError
            ? err.message
            : 'Unable to execute PayPal transfer.'
        );
      } finally {
        setModalSubmitting(false);
      }
      return;
    }

    if (mode === 'request') {
      triggerToast(`Demo request: $${amt.toFixed(2)} from Sarah K.`);
    } else {
      setBalanceNumber((prev) => +(prev + amt).toFixed(2));
      const newTx = createDepositTransaction({
        amount: amt,
        sourceLabel: 'Bank Account',
        timingLabel: 'Instant',
      });
      setTransactions((prev) => [newTx, ...prev]);
      triggerToast(`Demo top-up: added $${amt.toFixed(2)} to PayPal Balance`);
    }
    setActiveModal(null);
  };

  const handleRedeemPoints = (
    ptsCost = 500,
    cashVal = 5.0,
    title = '$5.00 PayPal Cashback'
  ) => {
    if (rewardPoints < ptsCost) {
      triggerToast(`You need at least ${ptsCost} points to redeem this reward.`);
      return;
    }
    setRewardPoints((p) => p - ptsCost);
    setBalanceNumber((b) => +(b + cashVal).toFixed(2));
    setPointsHistory((prev) => [
      {
        id: `ph-${Date.now()}`,
        title: `Redeemed ${title}`,
        date: 'Nov 11, 2026',
        category: 'Cashback',
        pointsDelta: `-${ptsCost} pts`,
        isPositive: false,
      },
      ...prev,
    ]);
    triggerToast(`Demo redemption: ${ptsCost} pts for +$${cashVal.toFixed(2)} (${title})`);
    setActiveModal(null);
  };

  return (
    <AppLayout
      activeNav={activeNav}
      currentRoute={currentRoute}
      onNavigate={(route) => navigate(route)}
      mobileSidebarOpen={mobileSidebarOpen}
      onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
      searchQuery={searchQuery}
      onSearchChange={(val) => {
        setSearchQuery(val);
        if (currentRoute === '/transactions') {
          setTxSearch(val);
        }
      }}
      onSearchSubmit={handleHeaderSearchSubmit}
      unreadNotifCount={unreadNotifCount}
      userProfile={userProfile}
      userMenuOpen={userMenuOpen}
      onToggleUserMenu={() => setUserMenuOpen((prev) => !prev)}
      onCloseUserMenu={() => setUserMenuOpen(false)}
      toastMessage={toastMessage}
    >
      {currentRoute === '/' && (
        <DashboardHomePage
          heroSlide={heroSlide}
          onSelectHeroSlide={setHeroSlide}
          balanceNumber={balanceNumber}
          onOpenBalanceInfo={() => setActiveModal('balance-info')}
          spendingPeriod={spendingPeriod}
          onChangeSpendingPeriod={setSpendingPeriod}
          recentTransactions={filteredHomeTransactions}
          searchQuery={searchQuery}
          rewardPoints={rewardPoints}
          aiPromptInput={aiPromptInput}
          featuredProducts={products}
          onSelectProduct={setSelectedProduct}
          activeAgentCount={activeAgentCount}
          onNavigate={navigate}
        />
      )}

      {currentRoute === '/send-money' && (
        <SendMoneyPage
          balanceNumber={balanceNumber}
          onUpdateBalance={setBalanceNumber}
          onAddTransaction={(tx) => setTransactions((prev) => [tx, ...prev])}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {currentRoute === '/request-money' && (
        <RequestMoneyPage
          moneyRequests={moneyRequests}
          onAddRequest={(req) => setMoneyRequests((prev) => [req, ...prev])}
          onUpdateRequestStatus={(id, status, creditAmount) => {
            setMoneyRequests((prev) =>
              prev.map((r) => (r.id === id ? { ...r, status } : r))
            );
            if (creditAmount) {
              setBalanceNumber((b) => +(b + creditAmount).toFixed(2));
            }
          }}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {currentRoute === '/add-money' && (
        <AddMoneyPage
          balanceNumber={balanceNumber}
          onUpdateBalance={setBalanceNumber}
          onAddTransaction={(tx) => setTransactions((prev) => [tx, ...prev])}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {currentRoute === '/transactions' && (
        <TransactionsPage
          transactions={transactions}
          txSearch={txSearch}
          onChangeTxSearch={setTxSearch}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {(currentRoute === '/transactions/:id' || currentRoute === '/transaction/') && (
        <TransactionDetailsPage
          transactions={transactions}
          selectedTxId={selectedTxId}
          onSelectTxId={setSelectedTxId}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {currentRoute === '/rewards' && (
        <RewardsPage
          rewardPoints={rewardPoints}
          rewardOffers={rewardOffers}
          pointsHistory={pointsHistory}
          onRedeemPoints={handleRedeemPoints}
          onNavigate={navigate}
        />
      )}

      {currentRoute === '/fraudguard' && (
        <FraudGuardPage onNavigate={navigate} onToast={triggerToast} />
      )}

      {currentRoute === '/agents' && (
        <AgentsPage
          agents={agents}
          activeAgentCount={activeAgentCount}
          onToggleAgentStatus={(id) =>
            setAgents((prev) =>
              prev.map((a) =>
                a.id === id ? { ...a, status: a.status === 'Active' ? 'Paused' : 'Active' } : a
              )
            )
          }
          onCycleAgentStatus={(id) =>
            setAgents((prev) =>
              prev.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      status:
                        item.status === 'Active'
                          ? 'Paused'
                          : item.status === 'Paused'
                          ? 'Needs Attention'
                          : 'Active',
                    }
                  : item
              )
            )
          }
          onCreateAgent={(agent) => setAgents((prev) => [...prev, agent])}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {currentRoute === '/analytics' && <AnalyticsPage onNavigate={navigate} />}

      {currentRoute === '/settings' && (
        <SettingsPage
          userProfile={userProfile}
          onUpdateProfile={(patch) => setUserProfile((p) => ({ ...p, ...patch }))}
          defaultPaymentMethod={defaultPaymentMethod}
          onChangeDefaultPaymentMethod={setDefaultPaymentMethod}
          balanceNumber={balanceNumber}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {currentRoute === '/discovery' && (
        <ProductDiscoveryPage
          initialProducts={products}
          onSelectProductForCheckout={(prodId) => {
            setSelectedProdId(prodId);
            setPendingProposal(null);
            setCheckoutDone(false);
          }}
          onNavigate={navigate}
        />
      )}

      {currentRoute === '/product/:id' && (
        <ProductDetailsPage
          products={products}
          selectedProdId={selectedProdId}
          onSelectProdId={setSelectedProdId}
          onStartCheckout={(prodId) => {
            setSelectedProdId(prodId);
            setPendingProposal(null);
            setCheckoutDone(false);
          }}
          onNavigate={navigate}
        />
      )}

      {currentRoute === '/checkout' && (
        <CheckoutPage
          products={products}
          selectedProdId={selectedProdId}
          pendingProposal={pendingProposal}
          onClearPendingProposal={() => setPendingProposal(null)}
          balanceNumber={balanceNumber}
          rewardPoints={rewardPoints}
          userProfile={userProfile}
          checkoutDone={checkoutDone}
          onSetCheckoutDone={setCheckoutDone}
          onCompleteOrder={({ tx, balanceDebit, pointsDelta }) => {
            if (balanceDebit > 0) {
              setBalanceNumber((b) => Math.max(0, +(b - balanceDebit).toFixed(2)));
            }
            setRewardPoints((p) => Math.max(0, p + pointsDelta));
            setTransactions((prev) => [tx, ...prev]);
            setSelectedTxId(tx.id);
          }}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {(currentRoute === '/ai-shopping' || currentRoute === '/shopping-assistant') && (
        <AiShoppingPage
          initialProducts={products}
          onSelectProductForModal={(prod) => {
            setSelectedProduct(prod);
            setActiveModal('ai-shopping');
          }}
          onReviewProposalCheckout={(proposal, prod) => {
            setPendingProposal(proposal);
            setSelectedProdId(prod?.id || proposal.productId);
            setCheckoutDone(false);
            navigate('/checkout');
          }}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {currentRoute === '/profile' && (
        <UserProfilePage
          userProfile={userProfile}
          defaultPaymentMethod={defaultPaymentMethod}
          rewardPoints={rewardPoints}
          onUpdateProfile={(patch) => setUserProfile((p) => ({ ...p, ...patch }))}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {currentRoute === '/notifications' && (
        <NotificationsPage
          notifications={notifications}
          unreadNotifCount={unreadNotifCount}
          onUpdateNotifications={setNotifications}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      {currentRoute === '/help' && (
        <HelpCenterPage
          userProfile={userProfile}
          onNavigate={navigate}
          onToast={triggerToast}
        />
      )}

      <ActionModal
        activeModal={activeModal}
        onClose={() => !modalSubmitting && setActiveModal(null)}
        submitting={modalSubmitting}
        balanceNumber={balanceNumber}
        rewardPoints={rewardPoints}
        selectedProduct={selectedProduct}
        transferAmount={transferAmount}
        onChangeTransferAmount={setTransferAmount}
        onConfirmTransfer={handleConfirmQuickTransfer}
        onConfirmCheckoutProduct={async (prod) => {
          setModalSubmitting(true);
          try {
            const { tx, capture } = await executeGovernedProductCheckout({
              product: prod,
              quantity: 1,
              fundingLabel: 'PayPal Balance',
            });
            const paid = Number(capture.amount?.value ?? prod.numericPrice);
            setBalanceNumber((b) => Math.max(0, +(b - paid).toFixed(2)));
            setTransactions((prev) => [tx, ...prev]);
            setSelectedTxId(tx.id);
            setActiveModal(null);
            triggerToast(`PayPal Express Checkout captured ${prod.name} ($${paid.toFixed(2)})`);
          } catch (err: unknown) {
            triggerToast(
              err instanceof ApiClientError
                ? err.message
                : 'Express checkout failed. Please try again.'
            );
          } finally {
            setModalSubmitting(false);
          }
        }}
        onRedeemRewards={handleRedeemPoints}
        onNavigate={navigate}
      />
    </AppLayout>
  );
}
