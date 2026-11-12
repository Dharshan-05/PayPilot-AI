import React, { useState } from 'react';
import { PlusCircle, Check } from 'lucide-react';
import type { RoutePath } from '../data/dashboard';
import type { TransactionItem } from '../data/transactions';
import { createDepositTransaction } from '../services/paypalService';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Badge } from '../components/Badge';

export type AddFundingSource =
  | 'Chase Checking ••4821'
  | 'Bank of America Savings ••7732'
  | 'Visa Debit ••9014';

export type AddTransferTiming =
  | 'Instant (within seconds)'
  | 'Standard (1–3 business days)';

export interface AddMoneyPageProps {
  balanceNumber: number;
  onUpdateBalance: (updater: (prev: number) => number) => void;
  onAddTransaction: (tx: TransactionItem) => void;
  onNavigate: (route: RoutePath) => void;
  onToast: (msg: string) => void;
}

export const AddMoneyPage: React.FC<AddMoneyPageProps> = ({
  balanceNumber,
  onUpdateBalance,
  onAddTransaction,
  onNavigate,
  onToast,
}) => {
  const [addStep, setAddStep] = useState<'form' | 'done'>('form');
  const [addAmount, setAddAmount] = useState('250.00');
  const [addSource, setAddSource] = useState<AddFundingSource>('Chase Checking ••4821');
  const [addTiming, setAddTiming] = useState<AddTransferTiming>('Instant (within seconds)');

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Add Money"
        subtitle="Add money to your PayPal Balance."
        onBack={() => onNavigate('/')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_370px] gap-[14px] flex-1">
        <Card className="p-[22px] flex flex-col justify-between">
          {addStep !== 'done' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-[16px] bg-[#efe6dd] border border-[#dfd6c9] flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium text-[#6a665f]">Current PayPal Balance</div>
                  <div className="text-[28px] font-extrabold text-[#181715] tracking-[-0.02em]">
                    ${balanceNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="success">Instant Top-Up Eligible</Badge>
                  <div className="text-[10px] text-[#6a665f] mt-1">
                    After transfer: ${(balanceNumber + (parseFloat(addAmount) || 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="add-money-amount" className="block text-[12px] font-semibold text-[#181715] mb-1.5">
                  Add Amount (USD)
                </label>
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  {['50.00', '100.00', '250.00', '500.00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAddAmount(preset)}
                      className={`h-[32px] px-3.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                        addAmount === preset
                          ? 'bg-[#222220] text-[#f7f2e8] border-[#222220]'
                          : 'bg-[#f4efe5] text-[#2b2927] border-[#dfd8cd] hover:bg-[#ebe4d8]'
                      }`}
                    >
                      +${preset}
                    </button>
                  ))}
                </div>
                <input
                  id="add-money-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="w-full h-[46px] px-4 rounded-[14px] bg-[#f4efe5] border border-[#dfd8cd] text-[20px] font-extrabold text-[#181715]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-source" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Funding Source (Bank Account / Debit Card)
                  </label>
                  <select
                    id="add-source"
                    value={addSource}
                    onChange={(e) => setAddSource(e.target.value as AddFundingSource)}
                    aria-label="Funding Source"
                    className="w-full h-[42px] px-3 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[11.5px] font-medium"
                  >
                    <option value="Chase Checking ••4821">Bank Account: Chase Checking ••4821</option>
                    <option value="Bank of America Savings ••7732">Bank Account: Bank of America ••7732</option>
                    <option value="Visa Debit ••9014">Debit Card: Visa Debit ••9014</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-timing" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Transfer Timing
                  </label>
                  <select
                    id="add-timing"
                    value={addTiming}
                    onChange={(e) => setAddTiming(e.target.value as AddTransferTiming)}
                    aria-label="Transfer Timing"
                    className="w-full h-[42px] px-3 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[11.5px] font-medium"
                  >
                    <option value="Instant (within seconds)">Instant (within seconds) — $0.00 Fee</option>
                    <option value="Standard (1–3 business days)">Standard ACH (1–3 business days) — $0.00 Fee</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="my-auto py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#e2e9d3] mx-auto flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-[#2e8b46] text-white flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[2.8]" aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-[18px] font-bold text-[#181715]">
                Demo Top-Up: +${(parseFloat(addAmount) || 0).toFixed(2)} Added to Balance
              </h3>
              <p className="text-[11.5px] text-[#6a665f]">
                Simulated funding from <strong>{addSource}</strong> ({addTiming}). Updated demo PayPal Balance is{' '}
                <strong>${balanceNumber.toFixed(2)}</strong>.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[#efe9de] flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-[#6a665f]">
              Transfer Fee: <strong className="text-[#2b7a43]">$0.00 (Free)</strong>
            </div>
            {addStep !== 'done' ? (
              <div className="flex items-center gap-2">
                <SecondaryButton onClick={() => onNavigate('/')}>Cancel</SecondaryButton>
                <PrimaryButton
                  onClick={() => {
                    const amt = parseFloat(addAmount) || 0;
                    if (amt <= 0) {
                      onToast('Enter an amount greater than $0.00');
                      return;
                    }
                    onUpdateBalance((b) => +(b + amt).toFixed(2));
                    const newTx = createDepositTransaction({
                      amount: amt,
                      sourceLabel: addSource,
                      timingLabel: addTiming,
                    });
                    onAddTransaction(newTx);
                    setAddStep('done');
                    onToast(`Demo top-up: added $${amt.toFixed(2)} to PayPal Balance`);
                  }}
                >
                  <span>Add Money</span>
                  <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                </PrimaryButton>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <SecondaryButton onClick={() => onNavigate('/')}>Back to Home</SecondaryButton>
                <PrimaryButton onClick={() => setAddStep('form')}>Add More Funds</PrimaryButton>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-[18px] flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-[13.5px] font-semibold text-[#181715]">Linked Funding Sources</h3>
            {[
              { name: 'Chase Checking ••4821', type: 'Verified Bank Account • ACH', fee: '$0.00 Fee' },
              { name: 'Bank of America Savings ••7732', type: 'Verified Savings Account', fee: '$0.00 Fee' },
              { name: 'Visa Signature Debit ••9014', type: 'Instant Debit Card', fee: '$0.00 Fee' },
            ].map((src) => (
              <div
                key={src.name}
                className="p-3 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-[11.5px] font-semibold text-[#181715]">{src.name}</div>
                  <div className="text-[10px] text-[#78736c]">{src.type}</div>
                </div>
                <Badge variant="success">{src.fee}</Badge>
              </div>
            ))}
          </div>
          <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] mt-4">
            <div className="text-[11px] font-semibold text-[#181715]">Level 2 Silver Benefit</div>
            <p className="text-[10px] text-[#6a665f] mt-1">
              Your account qualifies for free instant bank top-ups up to $5,000 per day with FraudGuard protection.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AddMoneyPage;
