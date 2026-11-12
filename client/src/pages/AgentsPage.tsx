import React, { useEffect, useState } from 'react';
import { Plus, ShoppingBag, ShieldCheck, BarChart2, Sparkles, ArrowRight } from 'lucide-react';
import { ASSETS } from '../assets/images';
import type { RoutePath } from '../data/dashboard';
import type { AgentItem, AgentRole } from '../data/agents';
import { agentService } from '../services/agentService';
import type { BackendAgentCapability } from '../services/types';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export interface AgentsPageProps {
  agents: AgentItem[];
  activeAgentCount: number;
  onToggleAgentStatus: (id: string) => void;
  onCycleAgentStatus: (id: string) => void;
  onCreateAgent: (agent: AgentItem) => void;
  onNavigate: (route: RoutePath) => void;
  onToast: (msg: string) => void;
}

export const AgentsPage: React.FC<AgentsPageProps> = ({
  agents,
  activeAgentCount,
  onToggleAgentStatus,
  onCycleAgentStatus,
  onCreateAgent,
  onNavigate,
  onToast,
}) => {
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<AgentItem | null>(null);
  const [createAgentOpen, setCreateAgentOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState<AgentRole>('Custom');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [capabilities, setCapabilities] = useState<BackendAgentCapability[]>([]);
  const [contextProviderMode, setContextProviderMode] = useState<string>('loading');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      agentService.getCapabilities({}, { signal: controller.signal }),
      agentService.getContextHealth({ signal: controller.signal }),
    ])
      .then(([capRes, healthRes]) => {
        setCapabilities(capRes.capabilities || []);
        setContextProviderMode(healthRes.details?.mode || healthRes.status || 'healthy');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setContextProviderMode('offline');
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Your Agents"
        subtitle="AI agents working for you."
        onBack={() => onNavigate('/')}
        rightSlot={
          <PrimaryButton onClick={() => setCreateAgentOpen(true)} className="h-[35px] text-[11px]">
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Create Agent</span>
          </PrimaryButton>
        }
      />

      <div className="rounded-[20px] bg-[#f8f2e8] border border-[#e5ded3] p-[20px] mb-[14px] relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[145px]">
        <img
          src={ASSETS.agentsCat}
          alt="PayPal AI Agent Cat"
          className="w-[108px] h-[102px] sm:w-[144px] sm:h-[136px] object-contain object-left-bottom shrink-0 select-none pointer-events-none"
        />
        <div className="flex-1 sm:pl-4 pr-14 relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#2e8b46]" aria-hidden="true" />
            <span className="text-[12px] font-bold text-[#181715]">
              {activeAgentCount} Active Agents Running 24/7 • {capabilities.length} APIMatic Capabilities ({contextProviderMode})
            </span>
          </div>
          <h2 className="text-[17px] font-bold text-[#181715]">
            Autonomous Shopping, Security &amp; Cashflow Intelligence
          </h2>
          <p className="text-[11px] text-[#6a665f] mt-1 max-w-[560px]">
            Your personal PayPal AI agents monitor price drops, verify merchant safety, and optimize your Silver points automatically.
          </p>
        </div>
        <img
          src={ASSETS.agentsSkyline}
          alt=""
          className="absolute right-0 bottom-0 w-[64px] h-[120px] object-contain object-right-bottom pointer-events-none select-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] flex-1">
        {agents.map((ag) => (
          <Card key={ag.id} id={ag.id} className="p-[18px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-full bg-[#222220] text-[#f7f2e8] flex items-center justify-center">
                  {ag.role === 'Shopping' && <ShoppingBag className="w-4 h-4" aria-hidden="true" />}
                  {ag.role === 'Security' && <ShieldCheck className="w-4 h-4" aria-hidden="true" />}
                  {ag.role === 'Insights' && <BarChart2 className="w-4 h-4" aria-hidden="true" />}
                  {ag.role === 'Custom' && <Sparkles className="w-4 h-4" aria-hidden="true" />}
                </div>
                <StatusBadge status={ag.status} />
              </div>

              <h3 className="text-[15px] font-bold text-[#181715]">{ag.name}</h3>
              <p className="text-[11px] text-[#6a665f] mt-1 leading-relaxed">{ag.description}</p>

              <div className="mt-3 p-3 rounded-[12px] bg-[#f4efe5] border border-[#e5ded3] space-y-1.5 text-[10.5px]">
                <div className="text-[#78736c] font-medium">Last Activity:</div>
                <div className="text-[#181715] font-semibold">{ag.lastAction}</div>
                <div className="flex items-center justify-between pt-1.5 border-t border-[#e6dfd4] text-[10px]">
                  <span className="text-[#6a665f]">
                    Tasks completed: <strong>{ag.tasksCompleted}</strong>
                  </span>
                  <span className="text-[#2b7a43] font-semibold">{ag.savingsOrImpact}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-[#efe9de] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onCycleAgentStatus(ag.id);
                  onToast(`Updated status for ${ag.name}`);
                }}
                className="text-[11px] font-medium text-[#5c5954] hover:text-[#181715] cursor-pointer"
              >
                Switch State
              </button>
              <SecondaryButton
                onClick={() => setSelectedAgentDetail(ag)}
                className="h-[31px] px-3.5 text-[11px]"
              >
                <span>Manage</span>
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </SecondaryButton>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(selectedAgentDetail)}
        onClose={() => setSelectedAgentDetail(null)}
        title={selectedAgentDetail?.name}
      >
        {selectedAgentDetail && (
          <div className="mt-3 space-y-3 text-[11.5px]">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-[#6a665f]">
                {selectedAgentDetail.role} Agent • {selectedAgentDetail.tasksCompleted} Tasks Completed
              </span>
              <StatusBadge status={selectedAgentDetail.status} />
            </div>
            <p className="text-[#5c5954]">{selectedAgentDetail.description}</p>
            <div className="p-3 rounded-[12px] bg-[#f4efe5] border border-[#e5ded3] space-y-1.5">
              <div className="font-semibold text-[#181715]">Active Automation Rules:</div>
              {selectedAgentDetail.rules.map((r, i) => (
                <div key={i} className="text-[11px] text-[#5c5954]">
                  • {r}
                </div>
              ))}
            </div>
            {capabilities.length > 0 && (
              <div className="p-3 rounded-[12px] bg-[#f4efe5] border border-[#e5ded3] space-y-1.5">
                <div className="font-semibold text-[#181715]">
                  APIMatic Backend Capabilities ({capabilities.length} Registered):
                </div>
                <div className="max-h-[120px] overflow-y-auto space-y-1">
                  {capabilities.map((cap) => (
                    <div key={cap.id} className="flex items-center justify-between text-[10.5px] text-[#5c5954]">
                      <span className="truncate font-medium text-[#181715]">{cap.operation}</span>
                      <span className="shrink-0 ml-2">
                        {cap.riskLevel}{(cap.requiresConfirmation ?? cap.requiresHumanConfirmation) ? ' • Human Gate' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <SecondaryButton
                onClick={() => {
                  onToggleAgentStatus(selectedAgentDetail.id);
                  setSelectedAgentDetail(null);
                  onToast(`Updated status for ${selectedAgentDetail.name}`);
                }}
              >
                {selectedAgentDetail.status === 'Active' ? 'Pause Agent' : 'Activate Agent'}
              </SecondaryButton>
              <PrimaryButton onClick={() => setSelectedAgentDetail(null)}>Done</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={createAgentOpen}
        onClose={() => setCreateAgentOpen(false)}
        title="Create Custom PayPal AI Agent"
      >
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="new-agent-name" className="block text-[11px] font-semibold mb-1">
              Agent Name
            </label>
            <input
              id="new-agent-name"
              type="text"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              placeholder="e.g., Travel Flight Drop Watcher"
              className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
            />
          </div>
          <div>
            <label htmlFor="new-agent-role" className="block text-[11px] font-semibold mb-1">
              Specialty
            </label>
            <select
              id="new-agent-role"
              value={newAgentRole}
              onChange={(e) => setNewAgentRole(e.target.value as AgentRole)}
              aria-label="Specialty"
              className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
            >
              <option value="Shopping">Shopping</option>
              <option value="Security">Security</option>
              <option value="Insights">Insights</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div>
            <label htmlFor="new-agent-desc" className="block text-[11px] font-semibold mb-1">
              Instructions / Goal
            </label>
            <input
              id="new-agent-desc"
              type="text"
              value={newAgentDesc}
              onChange={(e) => setNewAgentDesc(e.target.value)}
              placeholder="e.g., Track flights to Tokyo under $750 and apply Silver points"
              className="w-full h-[38px] px-3 rounded-[10px] bg-[#f4efe5] border border-[#dfd8cd] text-[12px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={() => setCreateAgentOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton
              onClick={() => {
                if (!newAgentName.trim()) {
                  onToast('Please enter an agent name');
                  return;
                }
                const created: AgentItem = {
                  id: `ag-${Date.now()}`,
                  name: newAgentName.trim(),
                  role: newAgentRole,
                  description: newAgentDesc.trim() || 'Custom user-configured PayPal AI workflow.',
                  status: 'Active',
                  lastAction: 'Initialized & monitoring live triggers',
                  tasksCompleted: 1,
                  savingsOrImpact: 'Active 24/7',
                  rules: [newAgentDesc.trim() || 'Monitor user-defined triggers automatically'],
                };
                onCreateAgent(created);
                setNewAgentName('');
                setNewAgentDesc('');
                setCreateAgentOpen(false);
                onToast(`Created ${created.name}!`);
              }}
            >
              Launch Agent
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AgentsPage;
