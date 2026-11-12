import React, { useState } from 'react';
import { Search, ArrowRight, Send, Check, ShieldCheck } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';
import { CONTACTS_DATA, type ContactPerson } from '../data/users';
import type { PaymentMethodName, TransactionItem } from '../data/transactions';
import { executePayPalTransferOrder } from '../services/paypalService';
import { ApiClientError } from '../services/types';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';

export interface SendMoneyPageProps {
  balanceNumber: number;
  onUpdateBalance: (updater: (prev: number) => number) => void;
  onAddTransaction: (tx: TransactionItem) => void;
  onNavigate: (route: RoutePath) => void;
  onToast: (msg: string) => void;
}

export const SendMoneyPage: React.FC<SendMoneyPageProps> = ({
  balanceNumber,
  onUpdateBalance,
  onAddTransaction,
  onNavigate,
  onToast,
}) => {
  const [sendStep, setSendStep] = useState<'form' | 'review' | 'done'>('form');
  const [sendRecipient, setSendRecipient] = useState<ContactPerson>(CONTACTS_DATA[0]);
  const [sendCustomQuery, setSendCustomQuery] = useState('');
  const [sendAmount, setSendAmount] = useState('125.00');
  const [sendCurrency, setSendCurrency] = useState('USD');
  const [sendMessage, setSendMessage] = useState('Dinner & concert tickets split!');
  const [sendSource, setSendSource] = useState<PaymentMethodName>('PayPal Balance');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [completedTxCode, setCompletedTxCode] = useState<string | null>(null);

  const filteredContacts = CONTACTS_DATA.filter(
    (c) =>
      !sendCustomQuery ||
      c.name.toLowerCase().includes(sendCustomQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(sendCustomQuery.toLowerCase()) ||
      c.handle.toLowerCase().includes(sendCustomQuery.toLowerCase())
  );

  const handleUseCustomRecipient = () => {
    const trimmed = sendCustomQuery.trim();
    if (!trimmed) return;
    const initials = trimmed
      .replace(/^@/, '')
      .split(/[\s.@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || '')
      .join('') || 'PP';
    setSendRecipient({
      id: `custom-${trimmed}`,
      name: trimmed,
      email: trimmed.includes('@') && trimmed.includes('.') ? trimmed : `${trimmed.replace(/^@/, '')}@paypal.com`,
      phone: 'External recipient',
      handle: trimmed.startsWith('@') ? trimmed : `@${trimmed.split('@')[0]}`,
      initials,
      bgColor: '#222220',
    });
    onToast(`Selected recipient ${trimmed}`);
  };

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Send Money"
        subtitle="Send money quickly and securely."
        onBack={() => onNavigate('/')}
        rightSlot={
          <div className="flex items-center gap-2 text-[11px] text-[#6a665f] bg-[#faf5ec] px-3 py-1.5 rounded-full border border-[#e5ded3]">
            <span>PayPal Balance:</span>
            <strong className="text-[#181715]">${balanceNumber.toFixed(2)}</strong>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[14px] flex-1 min-w-0">
        <Card className="flex flex-col justify-between p-[22px] min-w-0">
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-[#efe9de] text-[11px]">
            {(['Recipient & Amount', 'Review & Payment Source', 'Confirmation'] as const).map((label, idx) => {
              const stepIndex = sendStep === 'form' ? 0 : sendStep === 'review' ? 1 : 2;
              const active = idx <= stepIndex;
              return (
                <React.Fragment key={label}>
                  <div className={`flex items-center gap-1.5 min-w-0 ${active ? 'text-[#181715] font-semibold' : 'text-[#8c867e]'}`}>
                    <span
                      className={`w-[20px] h-[20px] rounded-full text-[10px] flex items-center justify-center shrink-0 ${
                        active ? 'bg-[#222220] text-[#f7f2e8]' : 'bg-[#efe8dc] text-[#78736c]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate">{label}</span>
                  </div>
                  {idx < 2 && <div className="hidden sm:block flex-1 h-[1px] bg-[#e5ded3] mx-1" />}
                </React.Fragment>
              );
            })}
          </div>

          {sendStep === 'form' && (
            <div className="space-y-4 my-auto py-3">
              <div>
                <label htmlFor="send-recipient-search" className="block text-[12px] font-semibold text-[#181715] mb-1.5">
                  Who are you sending money to?
                </label>
                <div className="relative flex flex-wrap sm:flex-nowrap gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 text-[#78736c] absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      id="send-recipient-search"
                      type="text"
                      value={sendCustomQuery}
                      onChange={(e) => setSendCustomQuery(e.target.value)}
                      placeholder="Search by name, @username, email, or mobile number..."
                      className="w-full h-[40px] pl-10 pr-4 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px] text-[#1c1b19] focus:outline-none focus:border-[#1c1b19]"
                    />
                  </div>
                  {sendCustomQuery.trim() && filteredContacts.length === 0 && (
                    <SecondaryButton onClick={handleUseCustomRecipient} className="h-[40px] px-3.5 text-[11px]">
                      Use "{sendCustomQuery.trim()}"
                    </SecondaryButton>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2.5">
                  {filteredContacts.map((contact) => {
                    const selected = sendRecipient.id === contact.id;
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setSendRecipient(contact)}
                        className={`p-2.5 rounded-[14px] border text-left transition-all cursor-pointer flex flex-col items-center text-center ${
                          selected
                            ? 'bg-[#efe6dd] border-[#181715] shadow-2xs'
                            : 'bg-[#f6f1e7] hover:bg-[#efe8dc] border-[#e5ded3]'
                        }`}
                      >
                        <div
                          style={{ backgroundColor: contact.bgColor }}
                          className="w-9 h-9 rounded-full text-[#f7f2e8] text-[11px] font-bold flex items-center justify-center mb-1.5"
                        >
                          {contact.initials}
                        </div>
                        <div className="text-[11px] font-semibold text-[#181715] truncate w-full">
                          {contact.name}
                        </div>
                        <div className="text-[9.5px] text-[#78736c] truncate w-full">
                          {contact.handle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
                <div>
                  <label htmlFor="send-amount" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-bold text-[#181715]">
                      $
                    </span>
                    <input
                      id="send-amount"
                      type="number"
                      step="0.01"
                      min="1"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="w-full h-[46px] pl-9 pr-4 rounded-[14px] bg-[#f4efe5] border border-[#dfd8cd] text-[20px] font-extrabold text-[#181715] focus:outline-none focus:border-[#181715]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="send-currency" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Currency
                  </label>
                  <select
                    id="send-currency"
                    value={sendCurrency}
                    onChange={(e) => setSendCurrency(e.target.value)}
                    aria-label="Currency"
                    className="w-full h-[46px] px-3 rounded-[14px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px] font-semibold text-[#181715]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label htmlFor="send-source" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Payment Source
                  </label>
                  <select
                    id="send-source"
                    value={sendSource}
                    onChange={(e) => setSendSource(e.target.value as PaymentMethodName)}
                    aria-label="Payment Source"
                    className="w-full max-w-full min-w-0 h-[40px] px-3 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[11.5px] font-medium text-[#181715]"
                  >
                    <option value="PayPal Balance">
                      PayPal Balance (${balanceNumber.toFixed(2)}) — $0.00 Fee
                    </option>
                    <option value="Chase Checking ••4821">
                      Bank Account: Chase Checking ••4821 — $0.00 Fee
                    </option>
                    <option value="Visa Signature ••9014">
                      Card: Visa Signature ••9014 — 2.9% Fee
                    </option>
                  </select>
                </div>

                <div className="min-w-0">
                  <label htmlFor="send-message" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Optional Message
                  </label>
                  <input
                    id="send-message"
                    type="text"
                    value={sendMessage}
                    onChange={(e) => setSendMessage(e.target.value)}
                    placeholder="What's this payment for?"
                    className="w-full h-[40px] px-3 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[11.5px] text-[#181715]"
                  />
                </div>
              </div>
            </div>
          )}

          {sendStep === 'review' && (
            <div className="my-auto py-4 space-y-4">
              {sendError && (
                <div
                  role="alert"
                  className="p-3 rounded-[12px] bg-[#f5d8d4] border border-[#e3b1ab] text-[11px] text-[#8f2419]"
                >
                  <strong>Transfer Failed:</strong> {sendError}
                </div>
              )}
              <div className="p-4 rounded-[16px] bg-[#f4efe5] border border-[#e3dcd1] space-y-3">
                <div className="flex items-center justify-between border-b border-[#e5ded3] pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: sendRecipient.bgColor }}
                      className="w-10 h-10 rounded-full text-[#f7f2e8] font-bold text-[12px] flex items-center justify-center"
                    >
                      {sendRecipient.initials}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-[#181715]">{sendRecipient.name}</div>
                      <div className="text-[10.5px] text-[#6a665f]">
                        {sendRecipient.email} • {sendRecipient.phone}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-extrabold text-[#181715]">
                      ${(parseFloat(sendAmount) || 0).toFixed(2)} {sendCurrency}
                    </div>
                    <div className="text-[10px] text-[#2b7a43] font-semibold">Instant Arrival</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="text-[#6a665f]">Payment Source</div>
                  <div className="text-right font-semibold text-[#181715]">{sendSource}</div>
                  <div className="text-[#6a665f]">Transfer Fee</div>
                  <div className="text-right font-semibold text-[#2b7a43]">
                    {sendSource.includes('Visa')
                      ? `$${((parseFloat(sendAmount) || 0) * 0.029 + 0.3).toFixed(2)}`
                      : '$0.00 (Free)'}
                  </div>
                  <div className="text-[#6a665f]">Estimated Arrival</div>
                  <div className="text-right font-semibold text-[#181715]">Within seconds</div>
                  <div className="text-[#6a665f]">Note</div>
                  <div className="text-right text-[#181715] italic">"{sendMessage || 'No note'}"</div>
                </div>
              </div>
            </div>
          )}

          {sendStep === 'done' && (
            <div className="my-auto py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#e2e9d3] mx-auto flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-[#2e8b46] text-white flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[2.8]" aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-[18px] font-bold text-[#181715]">
                Transfer Complete: ${(parseFloat(sendAmount) || 0).toFixed(2)} {sendCurrency} to{' '}
                {sendRecipient.name}
              </h3>
              <p className="text-[11.5px] text-[#6a665f] max-w-[380px] mx-auto">
                PayPal Sandbox Capture ID <strong>{completedTxCode || 'Verified'}</strong> recorded in your Transactions history and FraudGuard audit ledger.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[#efe9de] flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10.5px] text-[#6a665f]">
              Fee: <strong className="text-[#181715]">{sendSource.includes('Visa') ? '2.9% + $0.30' : '$0.00'}</strong> • Arrival:{' '}
              <strong className="text-[#2b7a43]">Instant</strong>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {sendStep === 'form' && (
                <>
                  <SecondaryButton onClick={() => onNavigate('/')}>Cancel</SecondaryButton>
                  <PrimaryButton
                    onClick={() => {
                      const amt = parseFloat(sendAmount);
                      if (!amt || amt <= 0) {
                        onToast('Please enter a valid amount greater than $0.00');
                        return;
                      }
                      if (sendSource === 'PayPal Balance' && amt > balanceNumber) {
                        onToast('Amount exceeds available PayPal Balance; choose a linked bank/card or lower amount.');
                        return;
                      }
                      setSendStep('review');
                    }}
                  >
                    <span>Continue to Review</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </PrimaryButton>
                </>
              )}
              {sendStep === 'review' && (
                <>
                  <SecondaryButton disabled={sending} onClick={() => setSendStep('form')}>Back</SecondaryButton>
                  <PrimaryButton
                    disabled={sending}
                    onClick={async () => {
                      const amt = parseFloat(sendAmount) || 0;
                      setSending(true);
                      setSendError(null);
                      try {
                        const { tx } = await executePayPalTransferOrder({
                          recipientName: sendRecipient.name,
                          recipientEmail: sendRecipient.email,
                          amount: amt,
                          currency: sendCurrency,
                          source: sendSource,
                          note: sendMessage,
                        });
                        if (sendSource === 'PayPal Balance') {
                          onUpdateBalance((b) => Math.max(0, +(b - amt).toFixed(2)));
                        }
                        setCompletedTxCode(tx.txCode);
                        onAddTransaction(tx);
                        setSendStep('done');
                        onToast(`Sent $${amt.toFixed(2)} ${sendCurrency} via PayPal (${tx.txCode})`);
                      } catch (err: unknown) {
                        const msg =
                          err instanceof ApiClientError
                            ? err.message
                            : 'Transfer failed. Please check server connection and retry.';
                        setSendError(msg);
                        onToast(msg);
                      } finally {
                        setSending(false);
                      }
                    }}
                  >
                    <span>{sending ? 'Processing with PayPal...' : 'Send Money'}</span>
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  </PrimaryButton>
                </>
              )}
              {sendStep === 'done' && (
                <>
                  <SecondaryButton onClick={() => onNavigate('/transactions')}>
                    View in Transactions
                  </SecondaryButton>
                  <PrimaryButton onClick={() => setSendStep('form')}>
                    Send Another Payment
                  </PrimaryButton>
                </>
              )}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-[14px]">
          <Card className="p-[18px]">
            <h3 className="text-[13px] font-semibold text-[#181715] mb-3">Selected Recipient</h3>
            <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center gap-3">
              <div
                style={{ backgroundColor: sendRecipient.bgColor }}
                className="w-11 h-11 rounded-full text-[#f7f2e8] font-bold text-[13px] flex items-center justify-center shrink-0"
              >
                {sendRecipient.initials}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#181715] truncate">{sendRecipient.name}</div>
                <div className="text-[10.5px] text-[#6a665f] truncate">{sendRecipient.email}</div>
                <div className="text-[10px] text-[#857f77] mt-0.5">{sendRecipient.phone}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-[11px] text-[#6a665f]">
              <div className="flex justify-between">
                <span>Delivery Speed</span>
                <span className="font-semibold text-[#2b7a43]">Instant (Seconds)</span>
              </div>
              <div className="flex justify-between">
                <span>FraudGuard Verification</span>
                <span className="font-semibold text-[#181715]">Trusted Contact ✓</span>
              </div>
            </div>
          </Card>

          <Card className="p-[18px] relative overflow-hidden flex-1 flex flex-col justify-between bg-[#f7f2e9]">
            <img
              src={ASSETS.fraudguardSkyline}
              alt=""
              className="absolute right-0 bottom-0 w-[102px] h-[135px] object-contain object-right-bottom pointer-events-none"
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-[#2e8b46]" aria-hidden="true" />
                <span className="text-[12.5px] font-semibold text-[#181715]">
                  PayPal Purchase &amp; Transfer Shield
                </span>
              </div>
              <p className="text-[11px] text-[#6a665f] leading-relaxed">
                Every transfer is encrypted and screened in real time by FraudGuard AI. Eligible purchases include full Buyer Protection at zero extra cost.
              </p>
            </div>
            <div className="relative z-10 mt-3">
              <SecondaryButton onClick={() => onNavigate('/fraudguard')} className="h-[31px] text-[11px]">
                <span>View Security Coverage</span>
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </SecondaryButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SendMoneyPage;
