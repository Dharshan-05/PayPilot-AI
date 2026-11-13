import { apiClient, type RequestOptions } from './apiClient';

export interface DashboardStatsResponse {
  metrics: {
    totalRevenue: number;
    transactionCount: number;
    successfulPayments: number;
    pendingPayments: number;
    failedPayments: number;
    averageTransactionValue: number;
    customerCount: number;
    orderCount: number;
    riskAlertCount: number;
    highRiskTransactionCount: number;
    activeAgentCount: number;
    unreadNotificationCount: number;
    fraudguardScore: number;
  };
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    status: string;
    type: string;
    riskLevel: string;
    riskScore: number;
    date: string;
    customer: {
      name: string;
      email: string;
    };
  }>;
  recentInsights: Array<{
    id: string;
    title: string;
    summary: string;
    type: string;
    severity: string;
    recommendation: string | null;
  }>;
  topRecommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    type: string;
    expectedImpact: string | null;
  }>;
  activeAgents: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    lastRunAt: string | null;
    totalRuns: number;
  }>;
}

export const dashboardService = {
  async getStats(options?: RequestOptions): Promise<DashboardStatsResponse | null> {
    try {
      const res = await apiClient.get<DashboardStatsResponse>('/api/dashboard/stats', options);
      return res.data;
    } catch {
      return null;
    }
  },

  async getTransactions(
    params?: { limit?: number; offset?: number; search?: string; status?: string },
    options?: RequestOptions
  ) {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);

    const endpoint = `/api/transactions${q.toString() ? `?${q.toString()}` : ''}`;
    const res = await apiClient.get<{ transactions: any[]; totalCount: number }>(endpoint, options);
    return res.data;
  },

  async getTransactionById(id: string, options?: RequestOptions) {
    const res = await apiClient.get<any>(`/api/transactions/${id}`, options);
    return res.data;
  },

  async getNotifications(options?: RequestOptions) {
    const res = await apiClient.get<{ notifications: any[]; unreadCount: number }>('/api/notifications', options);
    return res.data;
  },

  async markNotificationRead(id?: string, all?: boolean, options?: RequestOptions) {
    const res = await apiClient.post<any>('/api/notifications', { id, all }, options);
    return res.data;
  },

  async getAgents(options?: RequestOptions) {
    const res = await apiClient.get<any[]>('/api/agents', options);
    return res.data;
  },

  async getInsights(options?: RequestOptions) {
    const res = await apiClient.get<any[]>('/api/ai/insights', options);
    return res.data;
  },

  async getRecommendations(options?: RequestOptions) {
    const res = await apiClient.get<any[]>('/api/ai/recommendations', options);
    return res.data;
  },

  async getMetrics(options?: RequestOptions) {
    const res = await apiClient.get<any[]>('/api/metrics', options);
    return res.data;
  },
};
