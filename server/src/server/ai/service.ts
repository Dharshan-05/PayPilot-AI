import { AIProvider } from "./provider.interface";
import { MockAIProvider } from "./mock-provider";
import { GeminiProvider } from "./gemini-provider";
import {
  AIRequest,
  AIStructuredResponse,
  aiResponseSchema,
  BusinessRuleValidationResult,
} from "./types";
import { BusinessRuleValidator } from "./business-rules";
import { DatabaseRepository, dbRepository } from "../db/repository";
import { getConfig } from "../config/env";
import { Logger } from "../observability/logger";

const log = new Logger("AIService");

export interface ProcessedAIResult {
  rawResponse: AIStructuredResponse;
  validation: BusinessRuleValidationResult;
  authorizedAction: string;
  isMock: boolean;
  requestId: string;
}

export class AIService {
  private provider: AIProvider;
  private db: DatabaseRepository;

  constructor(provider?: AIProvider, db?: DatabaseRepository) {
    const config = getConfig();
    if (provider) {
      this.provider = provider;
    } else if (config.AI_PROVIDER === "gemini") {
      this.provider = new GeminiProvider(config.AI_API_KEY, config.AI_MODEL);
    } else {
      this.provider = new MockAIProvider();
    }
    this.db = db || dbRepository;
  }

  public getProvider(): AIProvider {
    return this.provider;
  }

  public setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  /**
   * Complete Governed AI Pipeline:
   * 1. AI Provider Generation
   * 2. Schema Validation (Zod)
   * 3. Business Rule & Security Evaluation
   * 4. Audit Persistence
   * 5. Safe Output Return
   */
  async processIntent(request: AIRequest): Promise<ProcessedAIResult> {
    const startTime = Date.now();
    log.info("Starting AI intent processing", {
      provider: this.provider.name,
      requestId: request.requestId,
    });

    let rawOutput: any;
    try {
      rawOutput = await this.provider.generate(request);
    } catch (err: any) {
      log.error("AI provider error during generation", err, { requestId: request.requestId });
      // Record failed audit
      await this.db.recordAiAuditLog({
        requestId: request.requestId,
        operation: "INTENT_ANALYSIS",
        provider: this.provider.name,
        model: this.provider.model,
        status: "FAILED",
        latencyMs: Date.now() - startTime,
        promptSummary: request.prompt.slice(0, 100),
        responseSummary: "Provider failed: " + err.message,
        userId: request.userId,
      });
      throw err;
    }

    // 2. Schema Validation
    const parseResult = aiResponseSchema.safeParse(rawOutput);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || (parseResult.error as any).errors || [];
      const errorMsg = issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ");
      log.warn("AI output failed schema validation", { errorMsg, requestId: request.requestId });

      await this.db.recordAiAuditLog({
        requestId: request.requestId,
        operation: "INTENT_ANALYSIS",
        provider: this.provider.name,
        model: this.provider.model,
        status: "MALFORMED_OUTPUT",
        latencyMs: Date.now() - startTime,
        promptSummary: request.prompt.slice(0, 100),
        responseSummary: "Schema validation failure: " + errorMsg,
        userId: request.userId,
      });

      throw new Error(`AI generated malformed output schema: ${errorMsg}`);
    }

    const structuredResponse = parseResult.data;

    // 3. Business Rule Validation
    const validation = BusinessRuleValidator.validate(structuredResponse, request.prompt);

    const latencyMs = Date.now() - startTime;
    const auditStatus = validation.isValid ? "SUCCESS" : "REJECTED_BY_POLICY";

    // 4. Record Audit Log in Database
    await this.db.recordAiAuditLog({
      requestId: request.requestId,
      operation: "INTENT_ANALYSIS",
      provider: this.provider.name,
      model: this.provider.model,
      status: auditStatus,
      latencyMs,
      promptSummary: request.prompt.slice(0, 100),
      responseSummary: `Action: ${validation.authorizedAction}, Valid: ${validation.isValid}`,
      metadata: {
        violations: validation.violations,
        warnings: validation.warnings,
        confidence: structuredResponse.confidence,
      },
      userId: request.userId,
    });

    log.info("AI intent processed successfully", {
      authorizedAction: validation.authorizedAction,
      isValid: validation.isValid,
      requestId: request.requestId,
    });

    return {
      rawResponse: structuredResponse,
      validation,
      authorizedAction: validation.authorizedAction,
      isMock: structuredResponse.metadata.isMock,
      requestId: request.requestId,
    };
  }
}

export const aiService = new AIService();
