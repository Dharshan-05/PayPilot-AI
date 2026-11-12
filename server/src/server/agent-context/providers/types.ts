import { AgentCapability } from "../types";

export interface ProviderHealth {
  provider: string;
  status: "healthy" | "degraded" | "unhealthy";
  capabilityCount: number;
  latencyMs: number;
  details?: Record<string, any>;
}

export interface APIContextProvider {
  readonly providerName: string;
  readonly schemaVersion: string;
  getCapabilities(): Promise<AgentCapability[]>;
  getOperation(operationId: string): Promise<AgentCapability | null>;
  healthCheck(): Promise<ProviderHealth>;
}
