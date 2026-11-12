import { AgentCapability, CallerType, RiskLevel, ToolAuthorizationDecision, ToolIntent } from "./types";
import { AgentCapabilityRegistry } from "./registry";
import { Logger } from "../observability/logger";

const log = new Logger("ToolPolicyEngine");

export class ToolPolicyEngine {
  constructor(private registry: AgentCapabilityRegistry) {}

  /**
   * Authorizes a tool execution intent against the capability registry and strict safety policies.
   */
  async authorize(intent: ToolIntent): Promise<ToolAuthorizationDecision> {
    await this.registry.initialize();
    const capability = this.registry.get(intent.toolId) || this.registry.get(intent.operation);

    if (!capability) {
      return {
        authorized: false,
        capabilityId: intent.toolId,
        riskLevel: "HIGH_RISK_WRITE",
        requiresConfirmation: false,
        reason: `Unknown capability or tool operation: '${intent.toolId}' / '${intent.operation}'`,
        violations: ["UNKNOWN_CAPABILITY"],
      };
    }

    const violations: string[] = [];

    // 1. Enabled check
    if (!capability.enabled) {
      return {
        authorized: false,
        capabilityId: capability.id,
        riskLevel: capability.riskLevel,
        requiresConfirmation: false,
        reason: `Capability '${capability.id}' is currently disabled in the registry`,
        violations: ["CAPABILITY_DISABLED"],
      };
    }

    // 2. Caller Type Authorization
    if (!capability.allowedCallerTypes.includes(intent.callerType)) {
      violations.push("CALLER_TYPE_UNAUTHORIZED");
    }

    // 3. Financial Safety Invariant
    if (capability.financialOperation || capability.riskLevel === "FINANCIAL" || capability.operation === "paypal.capturePayment") {
      if (intent.callerType === "ai_agent") {
        violations.push("AI_FINANCIAL_EXECUTION_FORBIDDEN");
        log.warn("Security policy blocked AI agent from executing financial operation", {
          toolId: capability.id,
          caller: intent.callerType,
        });
      }
    }

    // 4. Confirmation Gates
    if (capability.requiresConfirmation && intent.callerType === "ai_agent") {
      if (!violations.includes("AI_FINANCIAL_EXECUTION_FORBIDDEN")) {
        violations.push("HUMAN_CONFIRMATION_REQUIRED");
      }
    }

    if (capability.requiresConfirmation && intent.callerType === "human_user") {
      if (!intent.confirmationToken && !intent.arguments?.confirmed) {
        violations.push("CONFIRMATION_TOKEN_MISSING");
      }
    }

    if (violations.length > 0) {
      let reason = `Action '${capability.id}' rejected by safety policy: ${violations.join(", ")}`;
      if (violations.includes("AI_FINANCIAL_EXECUTION_FORBIDDEN")) {
        reason = "AI agents are strictly forbidden from executing financial captures or payments. Financial mutations require explicit human user authorization.";
      } else if (violations.includes("CALLER_TYPE_UNAUTHORIZED")) {
        reason = `Caller '${intent.callerType}' is not authorized to invoke '${capability.id}'. Permitted: [${capability.allowedCallerTypes.join(", ")}]`;
      } else if (violations.includes("CONFIRMATION_TOKEN_MISSING")) {
        reason = `Action '${capability.id}' requires human confirmation token or confirmation flag.`;
      }

      return {
        authorized: false,
        capabilityId: capability.id,
        riskLevel: capability.riskLevel,
        requiresConfirmation: capability.requiresConfirmation,
        reason,
        violations,
      };
    }

    return {
      authorized: true,
      capabilityId: capability.id,
      riskLevel: capability.riskLevel,
      requiresConfirmation: capability.requiresConfirmation,
      proposalId: intent.arguments?.proposalId,
    };
  }
}
