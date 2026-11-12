import { z } from "zod";

export type RiskLevel =
  | "READ_ONLY"
  | "LOW_RISK_WRITE"
  | "HIGH_RISK_WRITE"
  | "FINANCIAL"
  | "ADMINISTRATIVE";

export type CapabilityCategory =
  | "PRODUCT_DISCOVERY"
  | "COMMERCE_PROPOSAL"
  | "PAYPAL_ORDER"
  | "PAYPAL_PAYMENT"
  | "SYSTEM_DIAGNOSTIC";

export type CallerType = "human_user" | "ai_agent" | "server_system";

export interface JSONSchemaObject {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  description?: string;
  enum?: string[];
  items?: any;
  [key: string]: any;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  provider: string;
  version: string;
  operation: string;
  category: CapabilityCategory;
  riskLevel: RiskLevel;
  readOnly: boolean;
  requiresConfirmation: boolean;
  financialOperation: boolean;
  inputSchema: JSONSchemaObject;
  outputSchema: JSONSchemaObject;
  requiredPermissions: string[];
  allowedCallerTypes: CallerType[];
  timeoutMs: number;
  idempotencyRequired: boolean;
  auditRequired: boolean;
  enabled: boolean;
}

export interface ToolIntent {
  toolId: string;
  operation: string;
  arguments: Record<string, any>;
  callerType: CallerType;
  sessionId?: string;
  userId?: string;
  requestId?: string;
  confirmationToken?: string;
}

export interface ToolAuthorizationDecision {
  authorized: boolean;
  capabilityId: string;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  reason?: string;
  proposalId?: string;
  violations?: string[];
}

export interface ToolExecutionResult {
  success: boolean;
  capabilityId: string;
  operation: string;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  confirmationRequired?: boolean;
  proposalId?: string;
  executionTimeMs: number;
  auditLogId?: string;
}

export interface AgentContextOptions {
  callerType: CallerType;
  intent?: string;
  maxTools?: number;
  maxCharacters?: number;
  includeFinancial?: boolean;
  userId?: string;
  sessionId?: string;
}

export interface AgentContextSnapshot {
  contextVersion: string;
  schemaVersion: string;
  provider: string;
  generatedAt: number;
  expiresAt: number;
  capabilities: AgentCapability[];
  systemConstraints: string[];
  securityDirectives: string[];
  budget: {
    maxTools: number;
    maxCharacters: number;
    characterCount: number;
    truncated: boolean;
  };
}

export const toolIntentSchema = z.object({
  toolId: z.string().min(1, "toolId is required"),
  operation: z.string().min(1, "operation is required"),
  arguments: z.record(z.string(), z.any()).default({}),
  callerType: z.enum(["human_user", "ai_agent", "server_system"]).default("ai_agent"),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  requestId: z.string().optional(),
  confirmationToken: z.string().optional(),
});
