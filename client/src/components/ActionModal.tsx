import React from 'react';
import type { RoutePath } from '../data/dashboard';
import type { ProductPick } from '../data/products';
import { Modal } from './Modal';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export type ActiveModalType =
  | null
  | 'send'
  | 'request'
  | 'add'
  | 'rewards'
  | 'ai-shopping'
  | 'balance-info';

export interface ActionModalProps {
  activeModal: ActiveModalType;
  onClose: () => void;
  submitting?: boolean;
  balanceNumber: number;
  rewardPoints: number;
  selectedProduct: ProductPick | null;
  transferAmount: string;
  onChangeTransferAmount: (val: string) => void;
  onConfirmTransfer: (mode: 'send' | 'request' | 'add') => void | Promise<void>;
  onConfirmCheckoutProduct: (product: ProductPick) => void | Promise<void>;
  onRedeemRewards: (ptsCost?: number, cashVal?: number, title?: string) => void;
  onNavigate: (route: RoutePath) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  activeModal,
  onClose,
  submitting = false,
  balanceNumber,
  rewardPoints,
  selectedProduct,
  transferAmount,
  onChangeTransferAmount,
  onConfirmTransfer,
  onConfirmCheckoutProduct,
  onRedeemRewards,
  onNavigate,
}) => {
  const title =
    activeModal === 'balance-info'
      ? 'About PayPal Balance'
      : activeModal === 'ai-shopping'
      ? selectedProduct?.name || 'AI Shopping Checkout'
      : activeModal === 'send'
      ? 'Send Money'
      : activeModal === 'request'
      ? 'Request Money'
      : activeModal === 'add'
      ? 'Add Money'
      : activeModal === 'rewards'
      ? 'Redeem PayPal Rewards'
      : undefined;

  return (
    <Modal open={Boolean(activeModal)} onClose={onClose} title={title}>
      {activeModal === 'balance-info' && (
        <div className="mt-3 space-y-3 text-[12px] text-[#5c5954]">
          <p>
            Your PayPal Balance (<strong>${balanceNumber.toFixed(2)}</strong>) is eligible for
            instant peer transfers and earns Level 2 Silver points on eligible checkout purchases.
          </p>
          <p className="text-[10.5px] text-[#78736c]">
            Demo preview: balance updates reflect simulated local transactions.
          </p>
          <div className="flex justify-end gap-2">
            <SecondaryButton
              onClick={() => {
                onClose();
                onNavigate('/add-money');
              }}
            >
              Add Money
            </SecondaryButton>
            <PrimaryButton onClick={onClose}>Close</PrimaryButton>
          </div>
        </div>
      )}

      {activeModal === 'ai-shopping' && (
        <div className="mt-3 space-y-3">
          {selectedProduct && (
            <div className="p-3 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center gap-3">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-[80px] h-[68px] object-contain shrink-0"
              />
              <div>
                <div className="text-[12.5px] font-bold text-[#181715]">
                  {selectedProduct.name}
                </div>
                <div className="text-[11px] text-[#2b7a43] font-semibold">
                  {selectedProduct.price} • {selectedProduct.cashbackText} (
                  {selectedProduct.rewardPoints})
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <SecondaryButton disabled={submitting} onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton
              disabled={submitting}
              onClick={() => {
                if (selectedProduct) {
                  void onConfirmCheckoutProduct(selectedProduct);
                }
              }}
            >
              {submitting ? 'Authorizing & Capturing...' : 'Confirm Express Checkout'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {activeModal === 'rewards' && (
        <div className="mt-3 space-y-3 text-[12px] text-[#5c5954]">
          <p>
            Available balance:{' '}
            <strong className="text-[#181715]">
              {rewardPoints.toLocaleString('en-US')} pts
            </strong>{' '}
            (${(rewardPoints / 100).toFixed(2)} cashback value).
          </p>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton
              disabled={rewardPoints < 500}
              onClick={() => onRedeemRewards(500, 5, '$5.00 PayPal Cashback')}
            >
              Redeem 500 pts (+$5.00)
            </PrimaryButton>
          </div>
        </div>
      )}

      {(activeModal === 'send' || activeModal === 'request' || activeModal === 'add') && (
        <div className="mt-3 space-y-3">
          <label htmlFor="quick-transfer-amount" className="block text-[11px] font-semibold text-[#181715]">
            Amount (USD)
          </label>
          <input
            id="quick-transfer-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={transferAmount}
            onChange={(e) => onChangeTransferAmount(e.target.value)}
            className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[14px] font-bold"
          />
          <div className="flex justify-end gap-2">
            <SecondaryButton disabled={submitting} onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton disabled={submitting} onClick={() => void onConfirmTransfer(activeModal)}>
              {submitting ? 'Processing...' : 'Confirm'}
            </PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ActionModal;
