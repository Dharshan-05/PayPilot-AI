import { AIStructuredResponse, BusinessRuleValidationResult, AIAction, AIParameters } from "./types";
import { getConfig } from "../config/env";
import { checkPromptInjection } from "../security/injection-guard";
import { sanitizeAmount, sanitizeString } from "../security/sanitizer";
import { Logger } from "../observability/logger";

const log = new Logger("BusinessRuleValidator");

export class BusinessRuleValidator {
  /**
   * Enforces strict business policy over AI recommendations.
   * AI IS NEVER THE AUTHORITY FOR PAYMENT EXECUTION.
   */
  public static validate(
    aiResponse: AIStructuredResponse,
    originalPrompt: string
  ): BusinessRuleValidationResult {
    const config = getConfig();
    const violations: string[] = [];
    const warnings: string[] = [...(aiResponse.warnings || [])];

    // 1. Prompt Injection Pre-check
    const injectionCheck = checkPromptInjection(originalPrompt);
    if (!injectionCheck.isSafe) {
      log.warn("Business policy rejected prompt injection", { violations: injectionCheck.violations });
      return {
        isValid: false,
        violations: injectionCheck.violations,
        warnings,
        authorizedAction: "reject",
        sanitizedParameters: {
          reason: "Request blocked due to security policy violations.",
        },
      };
    }

    // 2. Action Whitelist & Authorization
    let authorizedAction: AIAction = aiResponse.action;
    const sanitizedParams: AIParameters = {};

    if (authorizedAction === "prepare_order") {
      const rawAmount = aiResponse.parameters?.amount;
      const validAmount = sanitizeAmount(rawAmount);

      if (validAmount === null) {
        violations.push("Payment amount is missing, non-numeric, or non-positive.");
      } else if (validAmount > config.MAX_TRANSACTION_AMOUNT) {
        violations.push(
          `Requested amount of ${validAmount} exceeds the maximum authorized transaction limit of ${config.MAX_TRANSACTION_AMOUNT}.`
        );
      } else {
        sanitizedParams.amount = validAmount;
      }

      const currency = (aiResponse.parameters?.currency || "USD").toUpperCase();
      if (!config.ALLOWED_CURRENCIES.includes(currency)) {
        violations.push(
          `Currency '${currency}' is not authorized. Allowed currencies: ${config.ALLOWED_CURRENCIES.join(", ")}`
        );
      } else {
        sanitizedParams.currency = currency;
      }

      if (aiResponse.parameters?.description) {
        sanitizedParams.description = sanitizeString(aiResponse.parameters.description, 200);
      }

      if (aiResponse.parameters?.customerEmail) {
        sanitizedParams.customerEmail = sanitizeString(aiResponse.parameters.customerEmail, 100);
      }

      if (aiResponse.parameters?.items && Array.isArray(aiResponse.parameters.items)) {
        sanitizedParams.items = aiResponse.parameters.items.map((item) => ({
          name: sanitizeString(item.name, 100),
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
          unitAmount: sanitizeAmount(item.unitAmount) || 0.01,
        }));
      }

      // If confidence is too low for an order preparation, downgrade to inquiry
      if (aiResponse.confidence < 0.6) {
        warnings.push("AI confidence is low (< 0.60); downgraded to informational review.");
        authorizedAction = "inquire_info";
      }
    } else if (authorizedAction === "recommend_product") {
      sanitizedParams.description = sanitizeString(aiResponse.parameters?.description, 200);
      sanitizedParams.items = aiResponse.parameters?.items;
    } else {
      sanitizedParams.reason = sanitizeString(
        aiResponse.parameters?.reason || aiResponse.reasoning_summary,
        250
      );
    }

    const isValid = violations.length === 0;
    if (!isValid) {
      authorizedAction = "reject";
      sanitizedParams.reason = violations.join("; ");
    }

    return {
      isValid,
      violations,
      warnings,
      authorizedAction,
      sanitizedParameters: sanitizedParams,
    };
  }
}
