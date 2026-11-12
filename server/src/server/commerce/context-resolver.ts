import { Product, CommerceProposal } from "@prisma/client";
import { conversationManager } from "./conversation";
import { catalogService } from "./catalog";
import { proposalService } from "./proposal";
import { prisma } from "../db/client";
import { Logger } from "../observability/logger";

const log = new Logger("ContextResolver");

export interface ContextualResolution {
  resolvedProduct?: Product;
  resolvedProductsForComparison?: Product[];
  activeProposal?: CommerceProposal & { product: Product };
  useCaseRecommendation?: {
    product: Product;
    reason: string;
  };
  inferredCategory?: string;
  isConfirmationIntent?: boolean;
  isPriceInquiryIntent?: boolean;
}

export class ContextResolver {
  /**
   * Resolves contextual references (pronouns, ordinals, comparatives, active proposals)
   * grounded strictly in server-authoritative conversational state and database records.
   */
  static async resolve(sessionId: string, currentMessage: string): Promise<ContextualResolution> {
    const rawLower = currentMessage.toLowerCase().trim();
    const result: ContextualResolution = {};

    // 1. Fetch recent messages for session
    const recentMessages = await conversationManager.getRecentMessages(sessionId, 6);

    // 2. Extract recent products Surfaced by assistant
    const recentProducts: Product[] = [];
    const seenIds = new Set<string>();

    // Scan backwards from newest assistant message
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];
      if (msg.role === "assistant" && msg.metadata) {
        try {
          const meta = JSON.parse(msg.metadata);
          if (Array.isArray(meta.products) && meta.products.length > 0) {
            for (const p of meta.products) {
              if (p.id && !seenIds.has(p.id)) {
                seenIds.add(p.id);
                // Fetch fresh authoritative product record from database
                const dbProduct = await catalogService.getProductById(p.id);
                if (dbProduct) {
                  recentProducts.push(dbProduct);
                }
              }
            }
            if (recentProducts.length > 0) break; // Found latest surfaced set
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    if (recentProducts.length > 0) {
      result.inferredCategory = recentProducts[0].category;
    }

    // 3. Check for active pending proposal in session
    const activeProposal = await prisma.commerceProposal.findFirst({
      where: {
        conversationId: sessionId,
        status: "PENDING_CONFIRMATION",
        expiresAt: { gt: new Date() },
      },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });

    if (activeProposal) {
      result.activeProposal = activeProposal;
    }

    // 4. Resolve Ordinal / Relative Product References
    // "the first one", "first product", "1st", "option 1"
    if (/\b(first|1st|option 1|number 1|top one)\b/i.test(rawLower) && recentProducts.length >= 1) {
      result.resolvedProduct = recentProducts[0];
      log.info("Resolved contextual reference: first product", { productId: result.resolvedProduct.id });
    }
    // "the second one", "second product", "2nd", "option 2"
    else if (/\b(second|2nd|option 2|number 2)\b/i.test(rawLower) && recentProducts.length >= 2) {
      result.resolvedProduct = recentProducts[1];
      log.info("Resolved contextual reference: second product", { productId: result.resolvedProduct.id });
    }
    // "the third one", "third product", "3rd", "option 3"
    else if (/\b(third|3rd|option 3|number 3)\b/i.test(rawLower) && recentProducts.length >= 3) {
      result.resolvedProduct = recentProducts[2];
      log.info("Resolved contextual reference: third product", { productId: result.resolvedProduct.id });
    }
    // Comparatives: "the cheaper one", "cheapest", "lower price"
    else if (/\b(cheap(er|est)?|lower price|budget option|least expensive)\b/i.test(rawLower) && recentProducts.length >= 2) {
      const sortedByPrice = [...recentProducts].sort((a, b) => a.price - b.price);
      result.resolvedProduct = sortedByPrice[0];
      log.info("Resolved contextual reference: cheapest product", { productId: result.resolvedProduct.id, price: result.resolvedProduct.price });
    }
    // Comparatives: "the premium one", "more expensive", "top tier"
    else if (/\b(premium|expensive|more expensive|high end|top tier)\b/i.test(rawLower) && recentProducts.length >= 2) {
      const sortedByPrice = [...recentProducts].sort((a, b) => b.price - a.price);
      result.resolvedProduct = sortedByPrice[0];
      log.info("Resolved contextual reference: premium product", { productId: result.resolvedProduct.id, price: result.resolvedProduct.price });
    }
    // Pronoun: "buy that", "take that", "buy it", "that one"
    else if (/\b(that one|buy that|take that|that keyboard|that headset|that mouse)\b/i.test(rawLower) && recentProducts.length >= 1) {
      result.resolvedProduct = recentProducts[0];
    }

    // 5. Comparison Candidate Resolution
    // "compare the best two", "compare those", "compare the two", "compare them"
    if (
      /\b(compare\s+(the\s+)?(best\s+)?(two|2|top\s+two)|compare\s+(those|them|these))\b/i.test(rawLower) &&
      recentProducts.length >= 2
    ) {
      result.resolvedProductsForComparison = recentProducts.slice(0, 2);
      log.info("Resolved contextual comparison candidates", {
        productIds: result.resolvedProductsForComparison.map((p) => p.id),
      });
    }

    // 6. Use-Case Question Resolution
    // "which one is better for programming / coding?"
    if (/\b(which\s+(one\s+)?is\s+better|which\s+should\s+i\s+(pick|choose|buy)|best\s+for)\b/i.test(rawLower) && recentProducts.length >= 2) {
      if (/\b(program(ming)?|cod(ing)?|developer|software)\b/i.test(rawLower)) {
        // Look for mechanical or ergonomic keyboards or high res monitors
        const match = recentProducts.find(
          (p) =>
            p.description.toLowerCase().includes("mechanical") ||
            p.description.toLowerCase().includes("tactile") ||
            p.description.toLowerCase().includes("developer")
        ) || recentProducts[0];

        result.useCaseRecommendation = {
          product: match,
          reason: `**${match.name}** is the best choice for programming and coding because it features responsive tactile switches, dedicated productivity keys, and ergonomic spacing designed for sustained typing.`,
        };
      } else if (/\b(travel|commute|portable|on the go)\b/i.test(rawLower)) {
        const match = recentProducts.find(
          (p) =>
            p.description.toLowerCase().includes("anc") ||
            p.description.toLowerCase().includes("compact") ||
            p.description.toLowerCase().includes("noise")
        ) || recentProducts[0];

        result.useCaseRecommendation = {
          product: match,
          reason: `**${match.name}** is the ideal option for travel due to its lightweight wireless form factor, robust battery life, and active noise cancellation.`,
        };
      }
    }

    // 7. Price Breakdown Inquiry
    // "show me the final price", "what's the total", "price breakdown"
    if (/\b(final\s+price|total\s+price|what('s|\s+is)\s+the\s+total|price\s+breakdown|how\s+much\s+total)\b/i.test(rawLower)) {
      result.isPriceInquiryIntent = true;
    }

    // 8. Explicit Checkout / Confirmation Guidance
    // "yes, buy it", "checkout", "confirm purchase", "proceed to payment"
    if (/\b(yes,?\s*(buy|do\s+it|confirm)|checkout|proceed\s+to\s+(checkout|payment)|confirm\s+(order|purchase))\b/i.test(rawLower)) {
      result.isConfirmationIntent = true;
    }

    return result;
  }
}
