import { apiClient, type RequestOptions } from './apiClient';
import type {
  BackendAgentCapability,
  BackendAgentChatResponse,
  BackendAuditLog,
  BackendHealthResponse,
  BackendIntentResponse,
} from './types';

export interface FraudGuardAuditEvent {
  id: string;
  requestId: string;
  title: string;
  detail: string;
  time: string;
  status: 'Completed' | 'All Safe' | 'Failed';
  rawStatus: string;
}

export function mapAuditLogToFraudEvent(entry: BackendAuditLog): FraudGuardAuditEvent {
  const isBlocked =
    entry.status === 'BLOCKED_INJECTION' || entry.status === 'REJECTED_BY_POLICY';
  const isFailed = entry.status === 'FAILED';

  const dt = new Date(entry.createdAt);
  const timeStr = Number.isNaN(dt.getTime())
    ? 'Recent'
    : dt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return {
    id: entry.id,
    requestId: entry.requestId,
    title: isBlocked
      ? `Policy Guard Blocked (${entry.operation})`
      : `AI Guard Verified (${entry.operation})`,
    detail: `${entry.promptSummary || 'Agent request'} → ${entry.responseSummary || entry.status}`,
    time: `${timeStr}${entry.latencyMs ? ` • ${entry.latencyMs}ms` : ''}`,
    status: isBlocked ? 'All Safe' : isFailed ? 'Failed' : 'Completed',
    rawStatus: entry.status,
  };
}

export const agentService = {
  async getHealth(options?: RequestOptions): Promise<BackendHealthResponse> {
    const { data } = await apiClient.get<BackendHealthResponse>('/api/health', options);
    return data;
  },

  async chat(
    params: { message: string; sessionId?: string; userId?: string },
    options?: RequestOptions
  ): Promise<BackendAgentChatResponse> {
    const { data } = await apiClient.post<BackendAgentChatResponse>(
      '/api/agent/chat',
      params,
      options
    );
    return data;
  },

  async analyzeIntent(
    params: { prompt: string; userId?: string },
    options?: RequestOptions
  ): Promise<BackendIntentResponse> {
    const { data } = await apiClient.post<BackendIntentResponse>(
      '/api/ai/intent',
      params,
      options
    );
    return data;
  },

  async getCapabilities(
    params: { callerType?: string; category?: string; riskLevel?: string } = {},
    options?: RequestOptions
  ): Promise<{ capabilities: BackendAgentCapability[]; total: number }> {
    const search = new URLSearchParams();
    if (params.callerType) search.set('callerType', params.callerType);
    if (params.category) search.set('category', params.category);
    if (params.riskLevel) search.set('riskLevel', params.riskLevel);
    const qs = search.toString();
    const { data } = await apiClient.get<{ capabilities: BackendAgentCapability[]; total: number }>(
      `/api/agent/capabilities${qs ? `?${qs}` : ''}`,
      options
    );
    return data;
  },

  async getContextHealth(options?: RequestOptions): Promise<{
    provider: string;
    status: string;
    capabilityCount?: number;
    details?: { mode?: string; message?: string };
  }> {
    const { data } = await apiClient.get<{
      provider: string;
      status: string;
      capabilityCount?: number;
      details?: { mode?: string; message?: string };
    }>('/api/agent/context/health', options);
    return data;
  },

  async validateTool(
    params: {
      capabilityId: string;
      callerType: 'ai_agent' | 'human_user' | 'system';
      arguments?: Record<string, unknown>;
      userConfirmed?: boolean;
    },
    options?: RequestOptions
  ): Promise<unknown> {
    const { data } = await apiClient.post<unknown>('/api/agent/tools/validate', params, options);
    return data;
  },

  async getAuditLogs(limit: number = 15, options?: RequestOptions): Promise<FraudGuardAuditEvent[]> {
    const { data } = await apiClient.get<BackendAuditLog[]>(
      `/api/audit/ai?limit=${limit}`,
      options
    );
    return data.map(mapAuditLogToFraudEvent);
  },
};
