import React, { useEffect, useState } from 'react';
import { RefreshCw, Check, ShieldCheck } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';
import { agentService, type FraudGuardAuditEvent } from '../services/agentService';
import { ApiClientError } from '../services/types';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { Badge } from '../components/Badge';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';

export interface SecurityPillarState {
  accountSecurity: boolean;
  txMonitoring: boolean;
  loginProtection: boolean;
  deviceSecurity: boolean;
  aiMonitoring: boolean;
}

type SecurityPillarKey = keyof SecurityPillarState;

export interface FraudGuardPageProps {
  onNavigate: (route: RoutePath) => void;
  onToast: (msg: string) => void;
}

const PILLARS: { key: SecurityPillarKey; title: string; desc: string }[] = [
  {
    key: 'accountSecurity',
    title: 'Account Security',
    desc: 'Passkey biometric verification & 256-bit session encryption',
  },
  {
    key: 'txMonitoring',
    title: 'Transaction Monitoring',
    desc: 'Real-time merchant reputation & zero-liability checkout screening',
  },
  {
    key: 'loginProtection',
    title: 'Login Protection',
    desc: 'Instant geo-velocity check & unfamiliar IP auto-blocking',
  },
  {
    key: 'deviceSecurity',
    title: 'Device Security',
    desc: '2 trusted devices verified (MacBook Pro M3, iPhone 16 Pro)',
  },
  {
    key: 'aiMonitoring',
    title: 'AI Monitoring',
    desc: '24/7 autonomous anomaly detection across linked bank & cards',
  },
];

export const FraudGuardPage: React.FC<FraudGuardPageProps> = ({ onNavigate, onToast }) => {
  const [securityScore, setSecurityScore] = useState(98);
  const [securityScanRunning, setSecurityScanRunning] = useState(false);
  const [auditEvents, setAuditEvents] = useState<FraudGuardAuditEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [securityPillarStates, setSecurityPillarStates] = useState<SecurityPillarState>({
    accountSecurity: true,
    txMonitoring: true,
    loginProtection: true,
    deviceSecurity: true,
    aiMonitoring: true,
  });

  const runLiveSecurityAudit = async (showToastFeedback: boolean) => {
    setSecurityScanRunning(true);
    setAuditError(null);
    try {
      const [health, events] = await Promise.all([
        agentService.getHealth(),
        agentService.getAuditLogs(6),
      ]);
      setAuditEvents(events);
      const allHealthy = health.status === 'healthy' && health.database === 'connected';
      const nextScore = allHealthy ? 99 : 84;
      setSecurityScore(nextScore);
      if (showToastFeedback) {
        onToast(
          `FraudGuard Live Audit complete: DB ${health.database}, ${events.length} audit logs verified (${nextScore}/100)`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Unable to fetch FraudGuard audit logs from server.';
      setAuditError(msg);
      if (showToastFeedback) onToast(msg);
    } finally {
      setSecurityScanRunning(false);
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    void runLiveSecurityAudit(false);
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="FraudGuard Security"
        subtitle="AI-powered protection & live backend audit verification for your PayPal account."
        onBack={() => onNavigate('/')}
        rightSlot={
          <PrimaryButton
            disabled={securityScanRunning}
            onClick={() => void runLiveSecurityAudit(true)}
            className="h-[34px] text-[11px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${securityScanRunning ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{securityScanRunning ? 'Scanning Account...' : 'Run Security Scan'}</span>
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[14px] mb-[14px]">
        <div className="rounded-[20px] bg-[#f7f2e9] border border-[#e5ded3] p-[22px] relative overflow-hidden flex items-center justify-between">
          <img
            src={ASSETS.fraudguardSkyline}
            alt=""
            className="absolute right-0 bottom-0 w-[102px] h-[135px] sm:w-[136px] sm:h-[180px] object-contain object-right-bottom pointer-events-none select-none"
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-[78px] h-[78px] rounded-full bg-[#e2e9d3] flex items-center justify-center shrink-0">
              <div className="w-[46px] h-[46px] rounded-full bg-[#2e8b46] text-white flex items-center justify-center shadow-sm">
                <Check className="w-6 h-6 stroke-[3]" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-1.5 max-w-[430px]">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status="All Safe" />
                <span className="text-[10.5px] font-semibold text-[#2b7a43]">
                  24/7 Real-Time AI Monitoring Active
                </span>
              </div>
              <h2 className="text-[19px] font-bold text-[#181715]">
                Your PayPal account &amp; linked cards are protected
              </h2>
              <p className="text-[11px] text-[#6a665f] leading-relaxed">
                FraudGuard continuously screens sign-ins, device fingerprints, and checkout merchants to block unauthorized charges before they happen.
              </p>
            </div>
          </div>
        </div>

        <Card className="p-[20px] flex flex-col justify-between bg-[#faf5ec]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#181715]">Security Score</span>
            <Badge variant="success">Excellent</Badge>
          </div>
          <div className="my-auto py-2">
            <div className="text-[36px] font-extrabold text-[#181715] leading-none">
              {securityScore} <span className="text-[16px] font-semibold text-[#78736c]">/ 100</span>
            </div>
            <div className="w-full h-[8px] rounded-full bg-[#e6dfd4] mt-3 overflow-hidden">
              <div
                style={{ width: `${securityScore}%` }}
                className="h-full rounded-full bg-[#2e8b46] transition-all duration-300"
              />
            </div>
          </div>
          <div className="text-[10.5px] text-[#6a665f]">
            Passkey + Hardware 2FA + AI Anomaly Shield active
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-[14px] flex-1">
        <Card className="p-[18px]">
          <h3 className="text-[13.5px] font-semibold text-[#181715] mb-3">
            Active Protection Pillars
          </h3>
          <div className="space-y-2.5">
            {PILLARS.map((pillar) => {
              const enabled = securityPillarStates[pillar.key];
              return (
                <div
                  key={pillar.key}
                  className="p-3 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#e2e9d3] text-[#2e8b46] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-[#181715]">{pillar.title}</div>
                      <div className="text-[10px] text-[#6a665f]">{pillar.desc}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-pressed={enabled}
                    onClick={() => {
                      setSecurityPillarStates((prev) => ({
                        ...prev,
                        [pillar.key]: !prev[pillar.key],
                      }));
                      onToast(`Updated ${pillar.title}`);
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-colors shrink-0 ${
                      enabled ? 'bg-[#d6e3c7] text-[#2c5e3b]' : 'bg-[#efe8dc] text-[#78736c]'
                    }`}
                  >
                    {enabled ? 'Protected ✓' : 'Paused'}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-[18px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13.5px] font-semibold text-[#181715]">
                Recent Security &amp; AI Audit Events
              </h3>
              <Badge variant="default">Live DB Feed</Badge>
            </div>
            {loadingEvents ? (
              <LoadingState rows={3} label="Loading security audit trail..." />
            ) : auditError ? (
              <div className="p-3.5 rounded-[14px] bg-[#f5d8d4] border border-[#e3b1ab] text-[11px] text-[#8f2419]">
                {auditError}
              </div>
            ) : auditEvents.length === 0 ? (
              <div className="p-4 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] text-[11px] text-[#6a665f] text-center">
                No AI or policy security events recorded yet. Submit an AI Shopping query or checkout order to log verified events.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {auditEvents.slice(0, 5).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-[14px] bg-[#f4efe5] border border-[#e5ded3] flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-bold text-[#181715] truncate">{ev.title}</div>
                      <div className="text-[10px] text-[#6a665f] mt-0.5 line-clamp-2">{ev.detail}</div>
                      <div className="text-[9.5px] text-[#8c867e] mt-1">{ev.time}</div>
                    </div>
                    <StatusBadge status={ev.status === 'Failed' ? 'Failed' : ev.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FraudGuardPage;
