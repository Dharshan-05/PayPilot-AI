import React, { useState } from 'react';
import { MessageSquare, Sparkles, ArrowRight } from 'lucide-react';
import { HELP_QA_DATA, type RoutePath } from '../data/dashboard';
import type { UserProfile } from '../data/users';
import { agentService } from '../services/agentService';
import { ApiClientError } from '../services/types';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export interface HelpCenterPageProps {
  userProfile: UserProfile;
  onNavigate: (route: RoutePath) => void;
  onToast: (msg: string) => void;
}

export const HelpCenterPage: React.FC<HelpCenterPageProps> = ({
  userProfile,
  onNavigate,
  onToast,
}) => {
  const [helpQuestion, setHelpQuestion] = useState('Why was my payment declined?');
  const [activeHelpTopic, setActiveHelpTopic] = useState<string>('Why was my payment declined?');
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [aiAsking, setAiAsking] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const currentAns =
    HELP_QA_DATA[activeHelpTopic] || HELP_QA_DATA['Why was my payment declined?'];

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="How can we help?"
        subtitle="Ask PayPal AI or browse instant solutions across your account."
        onBack={() => onNavigate('/')}
        rightSlot={
          <PrimaryButton onClick={() => setSupportModalOpen(true)} className="h-[35px] text-[11px]">
            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Contact Support</span>
          </PrimaryButton>
        }
      />

      <Card className="p-[20px] mb-[14px] bg-[#efe6dd] border border-[#dfd5c7] relative overflow-hidden">
        <div className="relative z-10 max-w-[680px] space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4 text-[#181715]" aria-hidden="true" />
            <span className="text-[12px] font-bold text-[#181715]">Ask PayPal AI</span>
            <Badge variant="success">Instant Account-Aware Answers</Badge>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!helpQuestion.trim() || aiAsking) return;
              const q = helpQuestion.trim().toLowerCase();
              const matched = Object.keys(HELP_QA_DATA).find(
                (k) =>
                  k.toLowerCase().includes(q) ||
                  HELP_QA_DATA[k].answer.toLowerCase().includes(q)
              );
              setActiveHelpTopic(matched || 'Why was my payment declined?');
              setAiAsking(true);
              setAiSummary(null);
              try {
                const res = await agentService.analyzeIntent({ prompt: helpQuestion.trim() });
                const summary =
                  res.aiResponse?.summary ||
                  res.policyDecision?.reason ||
                  `Intent analyzed: ${res.intent || 'HELP_QUERY'}`;
                setAiSummary(summary);
                onToast(`PayPal AI evaluated your question (${res.requestId})`);
              } catch (err: unknown) {
                const msg =
                  err instanceof ApiClientError ? err.message : 'Unable to reach AI intent engine.';
                onToast(msg);
              } finally {
                setAiAsking(false);
              }
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={helpQuestion}
              onChange={(e) => setHelpQuestion(e.target.value)}
              disabled={aiAsking}
              aria-label="Ask PayPal AI"
              placeholder="Ask any question about your payments, refunds, rewards, or security..."
              className="flex-1 h-[40px] px-4 rounded-full bg-[#faf5ec] border border-[#d6cec0] text-[12px] text-[#181715]"
            />
            <PrimaryButton type="submit" disabled={aiAsking} className="h-[40px] px-5">
              <span>{aiAsking ? 'Asking...' : 'Ask AI'}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </PrimaryButton>
          </form>

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {Object.keys(HELP_QA_DATA).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setHelpQuestion(q);
                  setActiveHelpTopic(q);
                }}
                className={`px-3 py-1 rounded-full text-[10.5px] font-medium border transition-colors cursor-pointer ${
                  activeHelpTopic === q
                    ? 'bg-[#222220] text-[#f7f2e8] border-[#222220]'
                    : 'bg-[#faf5ec] text-[#2b2927] border-[#dcd4c8] hover:bg-[#f2ebe0]'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-[14px] flex-1">
        <Card className="p-[20px] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#efe9de]">
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full bg-[#003087] text-white text-[10px] font-bold italic flex items-center justify-center"
                  aria-hidden="true"
                >
                  P
                </span>
                <h3 className="text-[15px] font-bold text-[#181715]">{currentAns.title}</h3>
              </div>
              <Badge variant="default">PayPal AI Verified</Badge>
            </div>

            <p className="text-[12px] text-[#3a3835] leading-relaxed">{currentAns.answer}</p>

            {aiSummary && (
              <div className="p-3 rounded-[12px] bg-[#efe6dd] border border-[#dfd5c7] text-[11px] text-[#181715]">
                <strong>Live AI Policy Summary:</strong> {aiSummary}
              </div>
            )}

            <div className="p-3.5 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] space-y-2">
              <div className="text-[11px] font-bold text-[#181715]">Recommended Steps:</div>
              {currentAns.steps.map((st, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-[#5c5954]">
                  <span className="w-4 h-4 rounded-full bg-[#222220] text-[#f7f2e8] text-[9.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{st}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#efe9de] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10.5px] text-[#78736c]">
              Personalized for {userProfile.name} ({userProfile.tier})
            </span>
            <PrimaryButton onClick={() => onNavigate(currentAns.relatedRoute)} className="h-[33px] text-[11px]">
              <span>{currentAns.relatedLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </PrimaryButton>
          </div>
        </Card>

        <Card className="p-[18px] flex flex-col justify-between">
          <div>
            <h3 className="text-[13.5px] font-bold text-[#181715] mb-3">Popular Help Topics</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Payments', sub: 'Send, request & fees', route: '/send-money' as RoutePath },
                { label: 'Security', sub: 'FraudGuard & 2FA', route: '/fraudguard' as RoutePath },
                { label: 'Account', sub: 'Profile & limits', route: '/profile' as RoutePath },
                { label: 'Rewards', sub: 'Silver points & cash', route: '/rewards' as RoutePath },
                { label: 'Transactions', sub: 'Receipts & refunds', route: '/transactions' as RoutePath },
                { label: 'Agents', sub: 'AI shopping & rules', route: '/agents' as RoutePath },
              ].map((topic) => (
                <button
                  key={topic.label}
                  type="button"
                  onClick={() => onNavigate(topic.route)}
                  className="p-3 rounded-[14px] bg-[#f4efe5] hover:bg-[#ebe4d8] border border-[#e5ded3] text-left transition-colors cursor-pointer"
                >
                  <div className="text-[12px] font-bold text-[#181715] flex items-center justify-between">
                    <span>{topic.label}</span>
                    <ArrowRight className="w-3 h-3 text-[#78736c]" aria-hidden="true" />
                  </div>
                  <div className="text-[10px] text-[#6a665f] mt-0.5">{topic.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-[14px] bg-[#222220] text-[#f7f2e8] flex items-center justify-between gap-2 mt-3">
            <div>
              <div className="text-[11.5px] font-semibold">Need 1-on-1 human support?</div>
              <div className="text-[9.5px] text-[#b8b2a8]">Priority Silver Concierge • Under 2 min wait</div>
            </div>
            <button
              type="button"
              onClick={() => setSupportModalOpen(true)}
              className="px-3 py-1.5 rounded-full bg-[#efe6dd] text-[#181715] text-[10.5px] font-semibold cursor-pointer shrink-0"
            >
              Chat Now
            </button>
          </div>
        </Card>
      </div>

      <Modal
        open={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        title="Contact PayPal Silver Concierge"
      >
        <div className="mt-3 space-y-3">
          <p className="text-[11.5px] text-[#5c5954]">
            Describe your question and our support team + PayPal AI specialist will respond in your Notifications center.
          </p>
          <input
            type="text"
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
            aria-label="Support message"
            placeholder="How can our specialist help you today?"
            className="w-full h-[40px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
          />
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setSupportModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton
              onClick={() => {
                setSupportModalOpen(false);
                setSupportMessage('');
                onToast('Demo support ticket #PP-8821 submitted!');
              }}
            >
              Send Message
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HelpCenterPage;
