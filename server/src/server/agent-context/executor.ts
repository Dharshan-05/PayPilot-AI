import { ToolIntent, ToolExecutionResult, AgentCapability } from "./types";
import { AgentCapabilityRegistry, capabilityRegistry } from "./registry";
import { ToolPolicyEngine } from "./tool-policy";
import { ToolIntentValidator } from "./validator";
import { intelligentSearchEngine } from "../commerce/intelligence/search";
import { productComparisonEngine } from "../commerce/intelligence/comparison";
import { productAlternativesEngine } from "../commerce/intelligence/alternatives";
import { proposalService } from "../commerce/proposal";
import { payPalService } from "../paypal/service";
import { dbRepository } from "../db/repository";
import { redactSensitiveData } from "../security/redactor";
import { Logger } from "../observability/logger";

const log = new Logger("ToolExecutionEngine");

export class ToolExecutionEngine {
  private policyEngine: ToolPolicyEngine;

  constructor(private registry: AgentCapabilityRegistry = capabilityRegistry) {
    this.policyEngine = new ToolPolicyEngine(this.registry);
  }

  /**
   * Authorizes, validates, and executes an agent tool intent.
   * Guarantees that AI callers can never capture payments or trigger unauthorized mutations.
   */
  async execute(intent: ToolIntent): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    await this.registry.initialize();

    const capability = this.registry.get(intent.toolId) || this.registry.get(intent.operation);
    const rawOp = capability?.operation || intent.operation || intent.toolId;
    const capabilityId = capability?.id || intent.toolId;
    const normalizedOp = rawOp.toLowerCase().replace(/^cap_/, "").replace(/_/g, ".");

    // 1. Validate Envelope, Schema & Security (Prototype Pollution)
    const validation = ToolIntentValidator.validate(intent, capability);
    if (!validation.valid) {
      const latencyMs = Date.now() - startTime;
      await this.recordAudit({
        operation: rawOp,
        caller: intent.callerType,
        status: "VALIDATION_FAILED",
        latencyMs,
        details: { errors: validation.errors },
      });

      return {
        success: false,
        capabilityId,
        operation: rawOp,
        error: {
          code: "VALIDATION_FAILED",
          message: "Arguments failed schema validation",
          details: validation.errors,
        },
        executionTimeMs: latencyMs,
      };
    }

    // 2. Authorize Intent with Tool Policy Engine
    const decision = await this.policyEngine.authorize(intent);
    if (!decision.authorized) {
      const latencyMs = Date.now() - startTime;
      await this.recordAudit({
        operation: rawOp,
        caller: intent.callerType,
        status: "BLOCKED_BY_POLICY",
        latencyMs,
        details: { reason: decision.reason, violations: decision.violations },
      });

      return {
        success: false,
        capabilityId,
        operation: rawOp,
        error: {
          code: "UNAUTHORIZED_OPERATION",
          message: decision.reason || "Action blocked by safety policy",
          details: { violations: decision.violations },
        },
        confirmationRequired: decision.requiresConfirmation,
        proposalId: decision.proposalId,
        executionTimeMs: latencyMs,
      };
    }

    const sanitizedArgs = validation.sanitizedArguments || {};

    // 3. Authoritative Execution
    try {
      let rawResult: any;

      switch (normalizedOp) {
        case "products.search": {
          rawResult = await intelligentSearchEngine.search(sanitizedArgs);
          break;
        }

        case "products.compare": {
          rawResult = await productComparisonEngine.compareProducts(sanitizedArgs.productIds);
          break;
        }

        case "products.recommend": {
          if (sanitizedArgs.targetProductId) {
            rawResult = await productAlternativesEngine.findAlternatives(
              sanitizedArgs.targetProductId,
              sanitizedArgs.options
            );
          } else {
            rawResult = await intelligentSearchEngine.search({
              category: sanitizedArgs.category,
              maxPrice: sanitizedArgs.maxBudget,
              inStockOnly: true,
              limit: sanitizedArgs.limit || 5,
            });
          }
          break;
        }

        case "commerce.createproposal": {
          rawResult = await proposalService.createProposal({
            productId: sanitizedArgs.productId,
            quantity: sanitizedArgs.quantity || 1,
            userId: intent.userId,
            conversationId: intent.sessionId,
          });
          break;
        }

        case "commerce.getproposal": {
          rawResult = await proposalService.getProposalById(sanitizedArgs.proposalId);
          if (!rawResult) {
            throw new Error(`Proposal '${sanitizedArgs.proposalId}' not found.`);
          }
          break;
        }

        case "paypal.getorder": {
          rawResult = await payPalService.getOrder(sanitizedArgs.orderId);
          break;
        }

        case "paypal.createorder": {
          rawResult = await payPalService.createOrder({
            internalReference: sanitizedArgs.internalReference || `REF-${Date.now()}`,
            amount: sanitizedArgs.amount,
            currency: sanitizedArgs.currency || "USD",
            customerEmail: sanitizedArgs.customerEmail,
            description: sanitizedArgs.description,
          });
          break;
        }

        case "paypal.capturepayment": {
          rawResult = await payPalService.captureOrder(sanitizedArgs.orderId);
          break;
        }

        case "system.gethealth": {
          const providerHealth = await this.registry.getProvider().healthCheck();
          rawResult = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            providerHealth,
            activeCapabilities: this.registry.getEnabled().length,
          };
          break;
        }

        default:
          throw new Error(`Unsupported capability operation: '${rawOp}'`);
      }

      const executionTimeMs = Date.now() - startTime;
      const sanitizedData = redactSensitiveData(rawResult);

      const auditLog = await this.recordAudit({
        operation: rawOp,
        caller: intent.callerType,
        status: "SUCCESS",
        latencyMs: executionTimeMs,
        details: { capabilityId },
      });

      return {
        success: true,
        capabilityId,
        operation: rawOp,
        data: sanitizedData,
        executionTimeMs,
        auditLogId: auditLog?.id,
      };
    } catch (err: any) {
      const executionTimeMs = Date.now() - startTime;
      log.error("Tool execution failed", {
        operation: rawOp,
        error: err.message,
      });

      await this.recordAudit({
        operation: rawOp,
        caller: intent.callerType,
        status: "FAILED",
        latencyMs: executionTimeMs,
        details: { error: err.message },
      });

      return {
        success: false,
        capabilityId,
        operation: rawOp,
        error: {
          code: "EXECUTION_ERROR",
          message: err.message || "Failed to execute tool operation",
        },
        executionTimeMs,
      };
    }
  }

  private async recordAudit(params: {
    operation: string;
    caller: string;
    status: string;
    latencyMs: number;
    details?: any;
  }) {
    try {
      return await dbRepository.recordAiAuditLog({
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        operation: `tool.${params.operation}`,
        provider: "agent-context",
        model: "executor-engine",
        status: params.status,
        latencyMs: params.latencyMs,
        promptSummary: `Caller: ${params.caller}`,
        responseSummary: params.status,
        metadata: params.details,
      });
    } catch (e: any) {
      log.warn("Failed to record tool audit log in database", { error: e.message });
      return null;
    }
  }
}

export const toolExecutionEngine = new ToolExecutionEngine();
