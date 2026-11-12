import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import type { RoutePath } from '../data/dashboard';
import { CONTACTS_DATA } from '../data/users';
import type { MoneyRequestItem } from '../data/transactions';
import { createMoneyRequestRecord } from '../services/paypalService';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { Badge } from '../components/Badge';
import { StatusBadge } from '../components/StatusBadge';

export interface RequestMoneyPageProps {
  moneyRequests: MoneyRequestItem[];
  onAddRequest: (req: MoneyRequestItem) => void;
  onUpdateRequestStatus: (id: string, status: MoneyRequestItem['status'], creditAmount?: number) => void;
  onNavigate: (route: RoutePath) => void;
  onToast: (msg: string) => void;
}

export const RequestMoneyPage: React.FC<RequestMoneyPageProps> = ({
  moneyRequests,
  onAddRequest,
  onUpdateRequestStatus,
  onNavigate,
  onToast,
}) => {
  const [reqStep, setReqStep] = useState<'form' | 'done'>('form');
  const [reqTarget, setReqTarget] = useState('alex.rivera@stanford.edu');
  const [reqAmount, setReqAmount] = useState('85.00');
  const [reqCurrency, setReqCurrency] = useState('USD');
  const [reqDueDate, setReqDueDate] = useState('Nov 20, 2026');
  const [reqMessage, setReqMessage] = useState('Shared cloud server & domain renewal');
  const [reqNote, setReqNote] = useState('Thanks! Let me know once sent.');

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Request Money"
        subtitle="Request money from friends, family, or customers."
        onBack={() => onNavigate('/')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-[14px] flex-1">
        <Card className="p-[22px] flex flex-col justify-between">
          {reqStep === 'form' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="req-target" className="block text-[12px] font-semibold text-[#181715] mb-1.5">
                  Request from (Email, phone, or contact search)
                </label>
                <input
                  id="req-target"
                  type="text"
                  value={reqTarget}
                  onChange={(e) => setReqTarget(e.target.value)}
                  placeholder="name@email.com or +1 (555) 000-0000"
                  className="w-full h-[40px] px-3.5 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px] text-[#181715]"
                />
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {CONTACTS_DATA.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setReqTarget(c.email)}
                      className={`px-2.5 py-1 rounded-full text-[10.5px] border transition-colors cursor-pointer ${
                        reqTarget === c.email
                          ? 'bg-[#222220] text-[#f7f2e8] border-[#222220]'
                          : 'bg-[#f4efe5] text-[#3a3835] border-[#dfd8cd] hover:bg-[#ebe4d8]'
                      }`}
                    >
                      {c.name} ({c.handle})
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="req-amount" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Amount
                  </label>
                  <input
                    id="req-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    value={reqAmount}
                    onChange={(e) => setReqAmount(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[14px] font-bold text-[#181715]"
                  />
                </div>
                <div>
                  <label htmlFor="req-currency" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Currency
                  </label>
                  <select
                    id="req-currency"
                    value={reqCurrency}
                    onChange={(e) => setReqCurrency(e.target.value)}
                    aria-label="Request Currency"
                    className="w-full h-[40px] px-3 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px] font-medium"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="req-due" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Due Date
                  </label>
                  <input
                    id="req-due"
                    type="text"
                    value={reqDueDate}
                    onChange={(e) => setReqDueDate(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="req-message" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Message
                  </label>
                  <input
                    id="req-message"
                    type="text"
                    value={reqMessage}
                    onChange={(e) => setReqMessage(e.target.value)}
                    placeholder="What is this request for?"
                    className="w-full h-[40px] px-3 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[11.5px]"
                  />
                </div>
                <div>
                  <label htmlFor="req-note" className="block text-[11.5px] font-semibold text-[#181715] mb-1">
                    Optional Note
                  </label>
                  <input
                    id="req-note"
                    type="text"
                    value={reqNote}
                    onChange={(e) => setReqNote(e.target.value)}
                    placeholder="Add an optional note or invoice ref..."
                    className="w-full h-[40px] px-3 rounded-[12px] bg-[#f4efe5] border border-[#dfd8cd] text-[11.5px]"
                  />
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
              <h3 className="text-[17px] font-bold text-[#181715]">
                Demo Payment Request for ${(parseFloat(reqAmount) || 0).toFixed(2)} {reqCurrency} Created
              </h3>
              <p className="text-[11.5px] text-[#6a665f] max-w-[360px] mx-auto">
                Prepared a payment request link for <strong>{reqTarget}</strong> due by {reqDueDate}.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[#efe9de] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10.5px] text-[#6a665f]">
              No fee to request money • Instant notification link
            </span>
            {reqStep === 'form' ? (
              <PrimaryButton
                onClick={() => {
                  const amt = parseFloat(reqAmount) || 0;
                  if (amt <= 0 || !reqTarget.trim()) {
                    onToast('Please enter a valid recipient and amount');
                    return;
                  }
                  const matched = CONTACTS_DATA.find((c) => c.email === reqTarget);
                  const newReq = createMoneyRequestRecord({
                    person: matched ? matched.name : reqTarget,
                    email: reqTarget,
                    amount: amt,
                    currency: reqCurrency,
                    dueDate: reqDueDate,
                    note: reqMessage || reqNote,
                  });
                  onAddRequest(newReq);
                  setReqStep('done');
                  onToast(`Demo request: $${amt.toFixed(2)} from ${newReq.person}`);
                }}
              >
                <span>Request Money</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => setReqStep('form')}>
                Create Another Request
              </PrimaryButton>
            )}
          </div>
        </Card>

        <Card className="p-[18px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-[#181715]">Recent Requests</h3>
              <Badge variant="default">{moneyRequests.length} Total</Badge>
            </div>

            <div className="space-y-2.5">
              {moneyRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12px] font-bold text-[#181715]">{req.person}</div>
                      <div className="text-[10px] text-[#78736c]">
                        Due {req.dueDate} • {req.note}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-bold text-[#181715]">{req.amount}</div>
                      <StatusBadge status={req.status} />
                    </div>
                  </div>

                  {req.status === 'Pending' && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#e8e1d5]">
                      <button
                        type="button"
                        onClick={() => onToast(`Reminder sent to ${req.person}`)}
                        className="text-[10px] font-semibold text-[#181715] hover:underline cursor-pointer"
                      >
                        Send Reminder
                      </button>
                      <span className="text-[#cfc8bc]">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateRequestStatus(req.id, 'Paid', req.numericAmount);
                          onToast(`Demo: ${req.person} marked as Paid (+${req.amount})`);
                        }}
                        className="text-[10px] font-semibold text-[#2b7a43] hover:underline cursor-pointer"
                      >
                        Simulate Paid
                      </button>
                      <span className="text-[#cfc8bc]">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateRequestStatus(req.id, 'Cancelled');
                          onToast(`Cancelled request to ${req.person}`);
                        }}
                        className="text-[10px] font-semibold text-[#9e2a1c] hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RequestMoneyPage;
