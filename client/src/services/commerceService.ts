import { apiClient, type RequestOptions } from './apiClient';
import type { BackendConfirmProposalResult, BackendProposal } from './types';

export const commerceService = {
  async listProposals(
    params: { status?: string; limit?: number } = {},
    options?: RequestOptions
  ): Promise<BackendProposal[]> {
    const search = new URLSearchParams();
    if (params.status) search.set('status', params.status);
    if (params.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    const { data } = await apiClient.get<BackendProposal[]>(
      `/api/commerce/proposals${qs ? `?${qs}` : ''}`,
      options
    );
    return data;
  },

  async createProposal(
    params: { productId: string; quantity?: number; conversationId?: string },
    options?: RequestOptions
  ): Promise<BackendProposal> {
    const { data } = await apiClient.post<BackendProposal>(
      '/api/commerce/proposals',
      {
        productId: params.productId,
        quantity: params.quantity ?? 1,
        ...(params.conversationId ? { conversationId: params.conversationId } : {}),
      },
      options
    );
    return data;
  },

  async getProposal(proposalId: string, options?: RequestOptions): Promise<BackendProposal> {
    const { data } = await apiClient.get<BackendProposal>(
      `/api/commerce/proposals/${encodeURIComponent(proposalId)}`,
      options
    );
    return data;
  },

  async confirmProposal(
    proposalId: string,
    options?: RequestOptions
  ): Promise<BackendConfirmProposalResult> {
    const { data } = await apiClient.post<BackendConfirmProposalResult>(
      `/api/commerce/proposals/${encodeURIComponent(proposalId)}/confirm`,
      {
        caller: 'human_user',
        userConfirmed: true,
      },
      options
    );
    return data;
  },

  async cancelProposal(proposalId: string, options?: RequestOptions): Promise<BackendProposal> {
    const { data } = await apiClient.del<BackendProposal>(
      `/api/commerce/proposals/${encodeURIComponent(proposalId)}`,
      options
    );
    return data;
  },
};
