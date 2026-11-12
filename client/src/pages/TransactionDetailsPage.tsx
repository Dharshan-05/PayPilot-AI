import React, { useEffect, useState } from 'react';
import { Download, AlertTriangle, HelpCircle } from 'lucide-react';
import type { RoutePath } from '../data/dashboard';
import type { TransactionItem } from '../data/transactions';
import { mapBackendOrderToTransaction, orderService } from '../services/orderService';
import { TransactionAvatar } from '../components/BrandIcons';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Badge } from '../components/Badge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export interface TransactionDetailsPageProps {
  transactions: TransactionItem[];
  selectedTxId: string;
  onSelectTxId: (id: string) => void;
  onNavigate: (route: RoutePath) => void;
  onToast: (msg: string) => void;
}

export const TransactionDetailsPage: React.FC<TransactionDetailsPageProps> = ({
  transactions,
  selectedTxId,
  onSelectTxId,
  onNavigate,
  onToast,
}) => {
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Item not as described or delayed');
  const [verifiedTx, setVerifiedTx] = useState<TransactionItem | null>(null);

  const localMatch = transactions.find((t) => t.id === selectedTxId) || transactions[0];
  const activeTx = verifiedTx && verifiedTx.id === selectedTxId ? verifiedTx : localMatch;

  useEffect(() => {
    setVerifiedTx(null);
    if (!selectedTxId || selectedTxId.startsWith('tx-')) return;
    const controller = new AbortController();
    orderService
      .getOrder(selectedTxId, { signal: controller.signal })
      .then((order) => {
        setVerifiedTx(mapBackendOrderToTransaction(order, localMatch?.paymentMethod));
      })
      .catch(() => {
        // Keep matched list record if lookup is unavailable
      });
    return () => controller.abort();
  }, [selectedTxId, localMatch?.paymentMethod]);

  if (!activeTx) {
    return (
      <div className="flex-1 flex flex-col">
        <PageHeader title="Transaction Details" subtitle="No transaction selected" onBack={() => onNavigate('/transactions')} />
        <Card className="p-[22px] flex-1 text-center text-[12px] text-[#6a665f]">
          Select a transaction from the Transactions ledger to inspect its official receipt.
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Transaction Details"
        subtitle={`Complete record and digital receipt for ${activeTx.txCode}`}
        onBack={() => onNavigate('/transactions')}
        rightSlot={
          <select
            value={activeTx.id}
            onChange={(e) => onSelectTxId(e.target.value)}
            aria-label="Select transaction"
            className="h-[34px] px-3 rounded-full bg-[#faf5ec] border border-[#dfd8cd] text-[11px] font-medium"
          >
            {transactions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.merchant} ({t.amount})
              </option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[14px] flex-1">
        <Card className="p-[22px] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="p-4 rounded-[16px] bg-[#f4efe5] border border-[#e5ded3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <TransactionAvatar brand={activeTx.brand} size="lg" />
                <div>
                  <h2 className="text-[17px] font-bold text-[#181715]">{activeTx.merchant}</h2>
                  <div className="text-[11px] text-[#6a665f]">
                    {activeTx.counterpartyEmail} • {activeTx.category}
                  </div>
                </div>
              </div>
              <div className="sm:text-right">
                <div
                  className={`text-[26px] font-extrabold leading-none ${
                    activeTx.isPositive ? 'text-[#2b7a43]' : 'text-[#181715]'
                  }`}
                >
                  {activeTx.amount}
                </div>
                <div className="mt-1.5">
                  <StatusBadge status={activeTx.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11.5px]">
              <div className="p-3 rounded-[12px] bg-[#f6f1e7] border border-[#e8e1d6]">
                <div className="text-[10px] text-[#78736c]">Date &amp; Time</div>
                <div className="font-semibold text-[#181715] mt-0.5">
                  {activeTx.date} • {activeTx.time}
                </div>
              </div>
              <div className="p-3 rounded-[12px] bg-[#f6f1e7] border border-[#e8e1d6]">
                <div className="text-[10px] text-[#78736c]">Transaction ID</div>
                <div className="font-semibold text-[#181715] mt-0.5">{activeTx.txCode}</div>
              </div>
              <div className="p-3 rounded-[12px] bg-[#f6f1e7] border border-[#e8e1d6]">
                <div className="text-[10px] text-[#78736c]">Payment Method</div>
                <div className="font-semibold text-[#181715] mt-0.5">{activeTx.paymentMethod}</div>
              </div>
              <div className="p-3 rounded-[12px] bg-[#f6f1e7] border border-[#e8e1d6]">
                <div className="text-[10px] text-[#78736c]">Transaction Type</div>
                <div className="font-semibold text-[#181715] mt-0.5">{activeTx.type}</div>
              </div>
              <div className="p-3 rounded-[12px] bg-[#f6f1e7] border border-[#e8e1d6]">
                <div className="text-[10px] text-[#78736c]">Category</div>
                <div className="font-semibold text-[#181715] mt-0.5">{activeTx.category}</div>
              </div>
              <div className="p-3 rounded-[12px] bg-[#f6f1e7] border border-[#e8e1d6]">
                <div className="text-[10px] text-[#78736c]">PayPal Fee</div>
                <div className="font-semibold text-[#2b7a43] mt-0.5">{activeTx.fee}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3]">
              <div className="text-[10.5px] font-semibold text-[#6a665f] mb-1">Description &amp; Notes</div>
              <div className="text-[12px] text-[#181715]">{activeTx.description}</div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#efe9de] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PrimaryButton
                onClick={() => onToast(`Downloaded receipt for ${activeTx.txCode}`)}
                className="h-[35px] text-[11px]"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download Receipt</span>
              </PrimaryButton>
              <SecondaryButton
                onClick={() => setReportIssueOpen(true)}
                className="h-[35px] text-[11px]"
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Report Problem</span>
              </SecondaryButton>
            </div>
            <SecondaryButton
              onClick={() => onNavigate('/help')}
              className="h-[35px] text-[11px]"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Get Help</span>
            </SecondaryButton>
          </div>
        </Card>

        <Card className="p-[18px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#efe9de]">
              <h3 className="text-[13.5px] font-bold text-[#181715]">Official PayPal Receipt</h3>
              <Badge variant="success">Verified</Badge>
            </div>

            <div className="py-3 space-y-2.5 text-[11.5px] border-b border-[#efe9de]">
              {(activeTx.receiptItems || [{ label: activeTx.merchant, price: activeTx.amount }]).map((item, idx) => (
                <div key={idx} className="flex justify-between gap-2">
                  <span className="text-[#5c5954]">{item.label}</span>
                  <span className="font-semibold text-[#181715] whitespace-nowrap">{item.price}</span>
                </div>
              ))}
              <div className="flex justify-between text-[#6a665f] pt-1">
                <span>Processing Fee</span>
                <span>{activeTx.fee}</span>
              </div>
            </div>

            <div className="py-3 flex justify-between items-center text-[14px] font-extrabold text-[#181715]">
              <span>Total</span>
              <span className={activeTx.isPositive ? 'text-[#2b7a43]' : 'text-[#181715]'}>{activeTx.amount}</span>
            </div>
          </div>

          <div className="p-3 rounded-[12px] bg-[#f4efe5] border border-[#e5ded3] text-[10.5px] text-[#6a665f]">
            <strong className="text-[#181715]">FraudGuard Protection:</strong> This transaction was verified with zero risk flags and is eligible for 180-day dispute resolution.
          </div>
        </Card>
      </div>

      <Modal open={reportIssueOpen} onClose={() => setReportIssueOpen(false)} title="Report a Problem">
        <div className="mt-3 space-y-3">
          <label htmlFor="report-reason" className="block text-[11px] font-semibold">
            Select Issue Reason
          </label>
          <select
            id="report-reason"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            aria-label="Issue Reason"
            className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
          >
            <option>Item not as described or delayed</option>
            <option>I didn&apos;t authorize this transaction</option>
            <option>Duplicate or incorrect charge amount</option>
            <option>Merchant promised a refund that hasn&apos;t arrived</option>
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setReportIssueOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton
              onClick={() => {
                setReportIssueOpen(false);
                onToast('Demo dispute case opened with FraudGuard Buyer Protection');
              }}
            >
              Submit Report
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TransactionDetailsPage;
