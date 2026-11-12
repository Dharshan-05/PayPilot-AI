import { AIProvider } from "./provider.interface";
import { AIRequest, AIStructuredResponse } from "./types";
import { Logger } from "../observability/logger";

const log = new Logger("MockAIProvider");

export class MockAIProvider implements AIProvider {
  public readonly name = "mock";
  public readonly model = "deterministic-mock-v1";

  async generate(request: AIRequest): Promise<AIStructuredResponse> {
    const startTime = Date.now();
    log.info("[MOCK AI] Processing intent request", { requestId: request.requestId });

    const lowerPrompt = request.prompt.toLowerCase();

    // Trigger for testing malformed schema failure in test suites
    if (lowerPrompt.includes("__test_trigger_malformed__")) {
      return {
        // missing required fields or invalid structure
        success: true,
        action: "invalid_action_unknown" as any,
        confidence: 999, // invalid confidence > 1
        reasoning_summary: "",
        parameters: {},
        warnings: [],
        metadata: {
          provider: this.name,
          model: this.model,
          latencyMs: 1,
          requestId: request.requestId,
          isMock: true,
        },
      };
    }

    // Trigger for testing excessive amount injection
    if (lowerPrompt.includes("__test_trigger_excessive_amount__")) {
      return {
        success: true,
        action: "prepare_order",
        confidence: 0.95,
        reasoning_summary: "Simulated mock response with amount exceeding limit.",
        parameters: {
          amount: 99999.0,
          currency: "USD",
          description: "Unauthorized High-Value Item",
        },
        warnings: [],
        metadata: {
          provider: this.name,
          model: this.model,
          latencyMs: Date.now() - startTime,
          requestId: request.requestId,
          isMock: true,
        },
      };
    }

    // Purchase / Order intent simulation
    if (
      lowerPrompt.includes("buy") ||
      lowerPrompt.includes("purchase") ||
      lowerPrompt.includes("order") ||
      lowerPrompt.includes("pay")
    ) {
      return {
        success: true,
        action: "prepare_order",
        confidence: 0.92,
        reasoning_summary:
          "User expressed clear purchase intent. Prepared draft order for review and approval.",
        parameters: {
          amount: 49.99,
          currency: "USD",
          description: "Developer Pro Subscription (Annual)",
          items: [
            {
              name: "Developer Pro Subscription",
              quantity: 1,
              unitAmount: 49.99,
            },
          ],
        },
        warnings: [
          "MOCK AI: This recommendation was deterministically generated for testing and development.",
        ],
        metadata: {
          provider: this.name,
          model: this.model,
          latencyMs: Date.now() - startTime,
          requestId: request.requestId,
          isMock: true,
        },
      };
    }

    // Product recommendation intent
    if (
      lowerPrompt.includes("recommend") ||
      lowerPrompt.includes("product") ||
      lowerPrompt.includes("shoes") ||
      lowerPrompt.includes("item")
    ) {
      return {
        success: true,
        action: "recommend_product",
        confidence: 0.88,
        reasoning_summary:
          "Identified product discovery inquiry. Recommended top-rated items matching query.",
        parameters: {
          description: "Recommended Cloud Developer Kit and Tools",
          items: [
            { name: "Cloud Toolkit Pro", quantity: 1, unitAmount: 29.99 },
            { name: "API Sandbox Access Pass", quantity: 1, unitAmount: 19.99 },
          ],
        },
        warnings: ["MOCK AI: Product data is mock-generated."],
        metadata: {
          provider: this.name,
          model: this.model,
          latencyMs: Date.now() - startTime,
          requestId: request.requestId,
          isMock: true,
        },
      };
    }

    // Default conversational response
    return {
      success: true,
      action: "inquire_info",
      confidence: 0.8,
      reasoning_summary:
        "User intent is informational. Suggested options to proceed with payment or exploration.",
      parameters: {
        reason: "How can I help you with PayPal orders or purchases today?",
      },
      warnings: ["MOCK AI: Offline simulated response."],
      metadata: {
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - startTime,
        requestId: request.requestId,
        isMock: true,
      },
    };
  }
}
