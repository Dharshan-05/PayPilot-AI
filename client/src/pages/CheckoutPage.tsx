import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';
import type { RoutePath } from '../data/dashboard';
import type { ProductPick } from '../data/products';
import type { TransactionItem } from '../data/transactions';
import type { UserProfile } from '../data/users';
import { executeGovernedProductCheckout } from '../services/paypalService';
import { ApiClientError, type BackendProposal } from '../services/types';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export type CheckoutFundingMethod =
  | 'PayPal Balance'
  | 'PayPal Pay in 4'
  | 'Chase Checking ••4821'
  | 'Visa Signature ••9014';

export interface CheckoutPageProps {
  products: ProductPick[];
  selectedProdId: string;
  pendingProposal: BackendProposal | null;
  onClearPendingProposal: () => void;
  balanceNumber: number;
  rewardPoints: number;
  userProfile: UserProfile;
  checkoutDone: boolean;
  onSetCheckoutDone: (done: boolean) => void;
  onCompleteOrder: (params: {
    tx: TransactionItem;
    balanceDebit: number;
    pointsDelta: number;
  }) => void;
  onNavigate: (route: RoutePath, entityId?: string) => void;
  onToast: (msg: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  products,
  selectedProdId,
  pendingProposal,
  onClearPendingProposal,
  balanceNumber,
  rewardPoints,
  userProfile,
  checkoutDone,
  onSetCheckoutDone,
  onCompleteOrder,
  onNavigate,
  onToast,
}) => {
  const activeProd =
    products.find((p) => p.id === selectedProdId) || products[0] || null;

  const [checkoutQty, setCheckoutQty] = useState<number>(
    pendingProposal && pendingProposal.productId === activeProd?.id
      ? pendingProposal.quantity
      : 1
  );
  const [checkoutFunding, setCheckoutFunding] = useState<CheckoutFundingMethod>('PayPal Balance');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedDetails, setCompletedDetails] = useState<{
    txId: string;
    paypalOrderId: string;
    captureId: string;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (pendingProposal && activeProd && pendingProposal.productId === activeProd.id) {
      setCheckoutQty(pendingProposal.quantity);
    }
  }, [pendingProposal, activeProd]);

  if (!activeProd) {
    return (
      <div className="flex-1 flex flex-col">
        <PageHeader title="Checkout" subtitle="No product selected" onBack={() => onNavigate('/discovery')} />
        <Card className="p-[22px] flex-1">
          <EmptyState
            title="Select a product first"
            description="Browse the PayPal catalog to choose an item for checkout."
            actionLabel="Browse Products"
            onAction={() => onNavigate('/discovery')}
          />
        </Card>
      </div>
    );
  }

  const matchingPendingProposal =
    pendingProposal &&
    pendingProposal.productId === activeProd.id &&
    pendingProposal.quantity === checkoutQty &&
    pendingProposal.status === 'PENDING_CONFIRMATION'
      ? pendingProposal
      : null;

  const subtotal = matchingPendingProposal
    ? Number(matchingPendingProposal.totalAmount)
    : +(activeProd.numericPrice * checkoutQty).toFixed(2);
  const finalTotal = subtotal;

  const fundingOptions: { id: CheckoutFundingMethod; sub: string }[] = [
    { id: 'PayPal Balance', sub: `Available: $${balanceNumber.toFixed(2)} • Instant` },
    { id: 'PayPal Pay in 4', sub: `4 interest-free payments of $${(finalTotal / 4).toFixed(2)}` },
    { id: 'Chase Checking ••4821', sub: 'Verified Bank Account • $0.00 Fee' },
    { id: 'Visa Signature ••9014', sub: 'Backup Rewards Card • Instant' },
  ];

  const handleConfirmAndCapture = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await executeGovernedProductCheckout({
        product: activeProd,
        quantity: checkoutQty,
        fundingLabel: checkoutFunding,
        existingProposalId: matchingPendingProposal?.id,
      });

      const capturedVal = Number(result.proposal.totalAmount ?? finalTotal);
      const balanceDebit =
        checkoutFunding === 'PayPal Balance'
          ? capturedVal
          : checkoutFunding === 'PayPal Pay in 4'
          ? +(capturedVal / 4).toFixed(2)
          : 0;

      setCompletedDetails({
        txId: result.tx.id,
        paypalOrderId: result.capture.orderId,
        captureId: result.capture.captureId,
        total: capturedVal,
      });
      onClearPendingProposal();
      onCompleteOrder({ tx: result.tx, balanceDebit, pointsDelta: 0 });
      onSetCheckoutDone(true);
      onToast(`PayPal Order ${result.capture.orderId} captured ($${capturedVal.toFixed(2)})!`);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'PayPal checkout failed. Please review your order and retry.';
      setErrorMsg(msg);
      onToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Checkout"
        subtitle="Human-authorized checkout backed by PayPal Orders v2 & authoritative database pricing."
        onBack={() => onNavigate('/product/:id', activeProd.id)}
        rightSlot={<StatusBadge status="All Safe" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[14px] flex-1">
        <Card className="p-[22px] flex flex-col justify-between">
          {!checkoutDone ? (
            <div className="space-y-4">
              {matchingPendingProposal && (
                <div className="p-3 rounded-[14px] bg-[#d6e3c7]/60 border border-[#b4cba0] flex items-center justify-between text-[11px] text-[#2c5e3b]">
                  <span>
                    <strong>Proposal Locked:</strong> #{matchingPendingProposal.proposalNumber} (Server price lock active)
                  </span>
                  <span className="font-semibold">Human Confirmation Required</span>
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-[14px] bg-[#f5d8d4] border border-[#e3b1ab] flex items-start gap-2.5 text-[11.5px] text-[#8f2419]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="font-bold">Checkout Error</div>
                    <div>{errorMsg}</div>
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-[16px] bg-[#f4efe5] border border-[#e5ded3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-[88px] h-[76px] rounded-[10px] bg-[#faf5ec] border border-[#e5ded3] p-1 flex items-center justify-center shrink-0">
                    <img src={activeProd.image} alt={activeProd.name} className="w-[80px] h-[68px] object-contain" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#181715]">{activeProd.name}</div>
                    <div className="text-[10.5px] text-[#2b7a43] font-semibold">
                      {activeProd.price} each • {activeProd.cashbackText}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="checkout-qty" className="text-[11px] text-[#6a665f]">
                    Qty:
                  </label>
                  <select
                    id="checkout-qty"
                    value={checkoutQty}
                    disabled={submitting}
                    onChange={(e) => setCheckoutQty(Number(e.target.value))}
                    aria-label="Quantity"
                    className="h-[32px] px-2.5 rounded-[8px] bg-[#faf5ec] border border-[#dfd8cd] text-[11.5px] font-bold"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="block text-[12px] font-semibold text-[#181715] mb-1.5">
                  Select PayPal Payment Method
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {fundingOptions.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => setCheckoutFunding(m.id)}
                      className={`p-3 rounded-[14px] border text-left transition-all cursor-pointer ${
                        checkoutFunding === m.id
                          ? 'bg-[#efe6dd] border-[#181715] shadow-2xs'
                          : 'bg-[#f6f1e7] hover:bg-[#efe8dc] border-[#e5ded3]'
                      }`}
                    >
                      <div className="text-[12px] font-bold text-[#181715]">{m.id}</div>
                      <div className="text-[10px] text-[#6a665f] mt-0.5">{m.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] font-bold text-[#181715]">
                    Server-Authoritative Total Verification
                  </div>
                  <div className="text-[10px] text-[#6a665f]">
                    PayPal order amount is verified against database pricing (${finalTotal.toFixed(2)}) • Demo rewards balance: {rewardPoints.toLocaleString()} pts
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full text-[10.5px] font-semibold bg-[#d6e3c7] text-[#2c5e3b] shrink-0">
                  Price Locked
                </span>
              </div>
            </div>
          ) : (
            <div className="my-auto py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#e2e9d3] mx-auto flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-[#2e8b46] text-white flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[2.8]" aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-[18px] font-bold text-[#181715]">
                Order Confirmed &amp; Captured! Paid ${(completedDetails?.total ?? finalTotal).toFixed(2)} via {checkoutFunding}
              </h3>
              <p className="text-[11.5px] text-[#6a665f] max-w-[440px] mx-auto">
                PayPal Order <strong>{completedDetails?.paypalOrderId}</strong> (Capture ID{' '}
                <strong>{completedDetails?.captureId}</strong>) for {activeProd.name} has been captured and persisted to the SQLite ledger.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[#efe9de] flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-[#6a665f]">
              Shipping to: <strong className="text-[#181715]">{userProfile.name} • {userProfile.location}</strong>
            </div>
            {!checkoutDone ? (
              <PrimaryButton
                disabled={submitting}
                onClick={() => void handleConfirmAndCapture()}
              >
                <span>
                  {submitting
                    ? 'Confirming & Capturing with PayPal...'
                    : `Authorize & Pay with PayPal ($${finalTotal.toFixed(2)})`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </PrimaryButton>
            ) : (
              <div className="flex items-center gap-2">
                <SecondaryButton onClick={() => onNavigate('/discovery')}>Continue Shopping</SecondaryButton>
                <PrimaryButton
                  onClick={() =>
                    onNavigate('/transactions/:id', completedDetails?.txId)
                  }
                >
                  View Receipt Details
                </PrimaryButton>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-[18px] flex flex-col justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-[#181715] pb-3 border-b border-[#efe9de]">
              Order Summary
            </h3>
            <div className="py-3 space-y-2 text-[11.5px] border-b border-[#efe9de]">
              <div className="flex justify-between">
                <span className="text-[#6a665f]">Items ({checkoutQty})</span>
                <span className="font-semibold text-[#181715]">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6a665f]">Express 2-Day Shipping</span>
                <span className="font-semibold text-[#2b7a43]">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6a665f]">Authorization Gate</span>
                <span className="font-semibold text-[#2b7a43]">Human Confirmed</span>
              </div>
            </div>
            <div className="py-3 flex justify-between items-center text-[16px] font-extrabold text-[#181715]">
              <span>Authoritative Total</span>
              <span>${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-3 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] text-[10.5px] text-[#6a665f]">
            <strong className="text-[#181715]">PayPal Purchase Protection:</strong> Server-verified proposal &amp; atomic inventory lock with PayPal Sandbox Orders v2 capture.
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CheckoutPage;
