import { z } from "zod";
import { checkPromptInjection } from "../security/injection-guard";
import { sanitizeString } from "../security/sanitizer";
import { Logger } from "../observability/logger";

const log = new Logger("CommerceIntentEngine");

export const commerceIntentTypeEnum = z.enum([
  "SEARCH",
  "COMPARE",
  "RECOMMEND",
  "PURCHASE",
  "PRICE_CHECK",
  "ORDER_STATUS",
  "CANCEL_ORDER",
  "REFUND_REQUEST",
  "GENERAL_COMMERCE",
  "UNKNOWN",
]);

export type CommerceIntentType = z.infer<typeof commerceIntentTypeEnum>;

export const commerceIntentSchema = z.object({
  intent: commerceIntentTypeEnum,
  category: z.string().optional(),
  productQuery: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  budget: z
    .object({
      amount: z.number().positive(),
      currency: z.string().length(3).default("USD"),
    })
    .optional(),
  preferences: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  proposedAction: z.string().default("SEARCH_PRODUCTS"),
  reasoningSummary: z.string().min(1),
  warnings: z.array(z.string()).default([]),
});

export type CommerceIntent = z.infer<typeof commerceIntentSchema>;

export class CommerceIntentEngine {
  /**
   * Deterministically parses commerce prompts into structured CommerceIntent.
   * Also used by MockAIProvider to ensure reliable offline testing.
   */
  public static parsePrompt(prompt: string): CommerceIntent {
    const rawLower = prompt.toLowerCase();
    const cleanPrompt = sanitizeString(prompt, 500);

    // 1. Prompt Injection Pre-check
    const injectionCheck = checkPromptInjection(prompt);
    if (!injectionCheck.isSafe) {
      log.warn("Prompt injection detected in intent analysis", { violations: injectionCheck.violations });
      return {
        intent: "UNKNOWN",
        quantity: 1,
        confidence: 0.1,
        proposedAction: "REJECT",
        reasoningSummary: "Request was blocked by security policy for malicious injection patterns.",
        preferences: [],
        constraints: [],
        warnings: injectionCheck.violations,
      };
    }

    // 2. Extract Budget (e.g. "under $80", "budget 80", "under 100 usd", "$49.99")
    // Require a budget keyword, "$" prefix, or currency suffix so model numbers (e.g. K2, 3S, 4K) are not misparsed as prices.
    let budget: { amount: number; currency: string } | undefined = undefined;
    const priceMatch =
      prompt.match(/(?:under|below|budget|max|up to|less than)\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*(usd|eur|gbp|cad|aud|\$)?/i) ||
      prompt.match(/\$\s*(\d+(?:\.\d{1,2})?)\s*(usd|eur|gbp|cad|aud)?/i) ||
      prompt.match(/\b(\d+(?:\.\d{1,2})?)\s*(usd|eur|gbp|cad|aud)\b/i);
    if (priceMatch && priceMatch[1]) {
      const parsedAmount = parseFloat(priceMatch[1]);
      if (parsedAmount > 0) {
        let curr = "USD";
        if (priceMatch[2]) {
          const matchCurr = priceMatch[2].toUpperCase();
          if (["USD", "EUR", "GBP", "CAD", "AUD"].includes(matchCurr)) {
            curr = matchCurr;
          }
        }
        budget = { amount: parsedAmount, currency: curr };
      }
    }

    // 3. Extract Quantity
    let quantity = 1;
    const qtyMatch = prompt.match(/\b(\d+)\s*(?:units|items|pieces|copies|keyboards|headphones|mice)\b/i);
    if (qtyMatch && qtyMatch[1]) {
      quantity = Math.max(1, parseInt(qtyMatch[1], 10));
    }

    // 4. Extract Category & Product Keywords
    let category: string | undefined = undefined;
    let productQuery: string | undefined = undefined;
    const preferences: string[] = [];
    const constraints: string[] = [];

    if (rawLower.includes("keyboard") || rawLower.includes("keybord") || rawLower.includes("keeb")) {
      category = "keyboards";
      productQuery = "keyboard";
      if (rawLower.includes("wireless") || rawLower.includes("wireles") || rawLower.includes("cordless")) preferences.push("wireless");
      if (rawLower.includes("mechanical")) preferences.push("mechanical");
      if (rawLower.includes("quiet") || rawLower.includes("silent")) preferences.push("quiet");
    } else if (rawLower.includes("headphone") || rawLower.includes("headfone") || rawLower.includes("audio") || rawLower.includes("earphone") || rawLower.includes("earbuds") || rawLower.includes("headset")) {
      category = "audio";
      productQuery = "headphones";
      if (rawLower.includes("noise") || rawLower.includes("cancelling") || rawLower.includes("anc")) preferences.push("noise-cancelling");
      if (rawLower.includes("wireless") || rawLower.includes("wireles")) preferences.push("wireless");
    } else if (rawLower.includes("mouse") || rawLower.includes("mice") || rawLower.includes("trackball") || rawLower.includes("pointer")) {
      category = "mice";
      productQuery = "mouse";
      if (rawLower.includes("ergonomic")) preferences.push("ergonomic");
      if (rawLower.includes("wireless") || rawLower.includes("wireles")) preferences.push("wireless");
    } else if (rawLower.includes("monitor") || rawLower.includes("moniter") || rawLower.includes("screen") || rawLower.includes("display")) {
      category = "monitors";
      productQuery = "monitor";
      if (rawLower.includes("4k") || rawLower.includes("uhd")) preferences.push("4K UHD");
    } else if (rawLower.includes("cloud") || rawLower.includes("developer") || rawLower.includes("subscription") || rawLower.includes("license") || rawLower.includes("software")) {
      category = "software";
      productQuery = "Developer Pro";
    }

    if (budget) {
      constraints.push(`Maximum price: ${budget.currency} ${budget.amount}`);
    }

    // 5. Intent Classification
    if (rawLower.includes("status") || rawLower.includes("where is my order") || rawLower.includes("did my payment go through")) {
      return {
        intent: "ORDER_STATUS",
        quantity: 1,
        confidence: 0.95,
        proposedAction: "ORDER_STATUS",
        reasoningSummary: "User is querying the status of an existing order or payment.",
        preferences,
        constraints,
        warnings: [],
      };
    }

    if (rawLower.includes("refund")) {
      return {
        intent: "REFUND_REQUEST",
        quantity: 1,
        confidence: 0.92,
        proposedAction: "REFUND_POLICY_INFO",
        reasoningSummary: "User requested a refund. Routed to policy explainer; AI cannot execute financial refunds.",
        preferences,
        constraints,
        warnings: ["AI does not have financial authority to refund transactions."],
      };
    }

    if (rawLower.includes("cancel order")) {
      return {
        intent: "CANCEL_ORDER",
        quantity: 1,
        confidence: 0.9,
        proposedAction: "CANCEL_ORDER_INFO",
        reasoningSummary: "User requested order cancellation.",
        preferences,
        constraints,
        warnings: [],
      };
    }

    if (rawLower.includes("compare") || rawLower.includes("difference between") || rawLower.includes("versus") || rawLower.includes(" vs ")) {
      return {
        intent: "COMPARE",
        category,
        productQuery,
        quantity,
        budget,
        confidence: 0.88,
        proposedAction: "COMPARE_PRODUCTS",
        reasoningSummary: "User requested a comparison between product candidates.",
        preferences,
        constraints,
        warnings: [],
      };
    }

    if (rawLower.includes("how much is") || rawLower.includes("price of") || rawLower.includes("cost of")) {
      return {
        intent: "PRICE_CHECK",
        category,
        productQuery,
        quantity,
        budget,
        confidence: 0.89,
        proposedAction: "VIEW_PRODUCT",
        reasoningSummary: "User requested pricing information for a specific product or category.",
        preferences,
        constraints,
        warnings: [],
      };
    }

    if (
      rawLower.includes("buy") ||
      rawLower.includes("purchase") ||
      rawLower.includes("order") ||
      rawLower.includes("checkout") ||
      rawLower.includes("i need a") ||
      rawLower.includes("i want a") ||
      rawLower.includes("get me a") ||
      rawLower.includes("take the") ||
      rawLower.includes("i'll take") ||
      rawLower.includes("ill take") ||
      rawLower.includes("choose the")
    ) {
      const confidence = category ? 0.94 : 0.75;
      return {
        intent: "PURCHASE",
        category,
        productQuery: productQuery || cleanPrompt.slice(0, 50),
        quantity,
        budget,
        confidence,
        proposedAction: "CREATE_PROPOSAL",
        reasoningSummary: `User expressed intent to purchase ${category || "an item"}. Extracted budget and requirements.`,
        preferences,
        constraints,
        warnings: [],
      };
    }

    if (rawLower.includes("recommend") || rawLower.includes("suggest") || rawLower.includes("what are the best")) {
      return {
        intent: "RECOMMEND",
        category,
        productQuery,
        quantity,
        budget,
        confidence: 0.9,
        proposedAction: "SEARCH_PRODUCTS",
        reasoningSummary: "User is seeking product recommendations matching criteria.",
        preferences,
        constraints,
        warnings: [],
      };
    }

    if (category || productQuery) {
      return {
        intent: "SEARCH",
        category,
        productQuery,
        quantity,
        budget,
        confidence: 0.85,
        proposedAction: "SEARCH_PRODUCTS",
        reasoningSummary: "User query matched product catalog categories.",
        preferences,
        constraints,
        warnings: [],
      };
    }

    return {
      intent: "GENERAL_COMMERCE",
      quantity: 1,
      confidence: 0.6,
      proposedAction: "INQUIRE_INFO",
      reasoningSummary: "General commerce inquiry. Prompting user for specific product or category preferences.",
      preferences: [],
      constraints: [],
      warnings: [],
    };
  }
}
