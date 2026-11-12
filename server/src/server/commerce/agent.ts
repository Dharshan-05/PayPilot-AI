import { Product, CommerceProposal } from "@prisma/client";
import { CommerceIntent, CommerceIntentEngine } from "./intent";
import { catalogService } from "./catalog";
import { proposalService } from "./proposal";
import { conversationManager } from "./conversation";
import { AgentActionPolicy } from "./policy";
import { intelligentSearchEngine } from "./intelligence/search";
import { productComparisonEngine, ComparisonResult } from "./intelligence/comparison";
import { RecommendationEvidence, RankedProductResult } from "./intelligence/ranking";
import { dbRepository } from "../db/repository";
import { checkPromptInjection } from "../security/injection-guard";
import { redactSensitiveData } from "../security/redactor";
import { Logger } from "../observability/logger";
import { agentContextBuilder } from "../agent-context/context-builder";
import { capabilityRegistry } from "../agent-context/registry";
import { AgentContextOptions, AgentContextSnapshot } from "../agent-context/types";
import { ContextResolver } from "./context-resolver";

const log = new Logger("CommerceAgent");

export interface AgentChatRequest {
  message: string;
  sessionId: string;
  userId?: string;
  requestId: string;
}

export interface AgentChatResponse {
  message: string;
  intent: CommerceIntent;
  products: Product[];
  proposal?: CommerceProposal;
  actionRequired: "CONFIRMATION_REQUIRED" | "CLARIFICATION_REQUIRED" | "NONE";
  status: "SUCCESS" | "POLICY_BLOCKED" | "CLARIFICATION";
  requestId: string;
  isMock: boolean;
  evidence?: RecommendationEvidence[];
  comparison?: ComparisonResult;
}

export class CommerceAgent {
  async processMessage(request: AgentChatRequest): Promise<AgentChatResponse> {
    const startTime = Date.now();
    const { message, sessionId, userId, requestId } = request;

    log.info("Processing commerce agent turn", { sessionId, requestId });

    // 1. Record incoming user message in conversational memory
    await conversationManager.addMessage({
      sessionId,
      role: "user",
      content: message,
      userId,
    });

    // 2. Strict Prompt Injection Defense
    const injection = checkPromptInjection(message);
    if (!injection.isSafe) {
      log.warn("Blocked prompt injection in commerce agent", { violations: injection.violations, requestId });

      const rejectionMessage =
        "I cannot fulfill this request because it violates our security and safety policy. Please ask for product recommendations or inquiries.";

      await conversationManager.addMessage({
        sessionId,
        role: "assistant",
        content: rejectionMessage,
        userId,
      });

      await dbRepository.recordAiAuditLog({
        requestId,
        operation: "COMMERCE_AGENT_TURN",
        provider: "commerce-agent",
        model: "policy-guard-v1",
        status: "BLOCKED_INJECTION",
        latencyMs: Date.now() - startTime,
        promptSummary: message.slice(0, 100),
        responseSummary: rejectionMessage,
        metadata: { violations: injection.violations },
        userId,
      });

      return {
        message: rejectionMessage,
        intent: {
          intent: "UNKNOWN",
          quantity: 1,
          confidence: 0,
          proposedAction: "REJECT",
          reasoningSummary: "Rejected by Prompt Injection Guard.",
          preferences: [],
          constraints: [],
          warnings: injection.violations,
        },
        products: [],
        actionRequired: "NONE",
        status: "POLICY_BLOCKED",
        requestId,
        isMock: true,
      };
    }

    // 3. Extract Intent & Commerce Parameters
    const intent = CommerceIntentEngine.parsePrompt(message);

    // 4. Policy Check: Disallow AI from executing financial actions directly
    const policyResult = AgentActionPolicy.authorizeAction(intent.proposedAction, "ai_agent");
    if (!policyResult.authorized) {
      log.warn("Policy blocked unauthorized action requested by intent", {
        proposedAction: intent.proposedAction,
        requestId,
      });

      const blockedMsg = policyResult.reason || "This financial action requires server-side human authorization.";
      await conversationManager.addMessage({
        sessionId,
        role: "assistant",
        content: blockedMsg,
        userId,
      });

      return {
        message: blockedMsg,
        intent,
        products: [],
        actionRequired: "NONE",
        status: "POLICY_BLOCKED",
        requestId,
        isMock: true,
      };
    }

    // 5. Handle Specialized Informational Intents (Order Status, Refunds, Cancellations)
    if (intent.intent === "ORDER_STATUS") {
      const orderRefMatch = message.match(/\b(ORD-[A-Z0-9-]+|MOCK-[A-Z0-9-]+|[0-9A-Z]{17})\b/i);
      let statusReply = "";
      if (orderRefMatch) {
        const ref = orderRefMatch[1];
        const order =
          (await dbRepository.getOrderByInternalRef(ref)) ||
          (await dbRepository.getOrderByPaypalId(ref));

        if (order) {
          statusReply = `Order ${ref} is currently **${order.status}** for amount ${order.currency} $${order.amount.toFixed(2)}.`;
        } else {
          statusReply = `I looked for order reference "${ref}", but could not find an existing record in our database.`;
        }
      } else {
        statusReply =
          "To check your order status, please provide your order reference number (e.g. ORD-XXXX or PayPal Order ID).";
      }

      await conversationManager.addMessage({ sessionId, role: "assistant", content: statusReply, userId });

      return {
        message: statusReply,
        intent,
        products: [],
        actionRequired: "NONE",
        status: "SUCCESS",
        requestId,
        isMock: true,
      };
    }

    if (intent.intent === "REFUND_REQUEST") {
      const refundReply =
        "I can help you review your order details, but refund execution requires authorized merchant processing. AI assistants are strictly prohibited from modifying financial balances or initiating refunds directly.";

      await conversationManager.addMessage({ sessionId, role: "assistant", content: refundReply, userId });

      return {
        message: refundReply,
        intent,
        products: [],
        actionRequired: "NONE",
        status: "SUCCESS",
        requestId,
        isMock: true,
      };
    }

    if (intent.intent === "CANCEL_ORDER") {
      const cancelReply =
        "Orders can only be cancelled prior to capture through the merchant management portal. Completed PayPal transactions must go through dispute or refund resolution.";

      await conversationManager.addMessage({ sessionId, role: "assistant", content: cancelReply, userId });

      return {
        message: cancelReply,
        intent,
        products: [],
        actionRequired: "NONE",
        status: "SUCCESS",
        requestId,
        isMock: true,
      };
    }

    if (
      intent.intent === "UNKNOWN" &&
      /\b(capabilities|tools|capability|context|what can you do|available actions)\b/i.test(message)
    ) {
      await capabilityRegistry.initialize();
      const tools = capabilityRegistry.getAvailableForCaller("ai_agent");
      const toolNames = tools
        .map((t) => `• **${t.name}** (\`${t.operation}\`) — ${t.description} [${t.riskLevel}]`)
        .join("\n");
      const reply = `I have access to the following server-governed tools and capabilities:\n\n${toolNames}\n\n*Note: Financial payments and capture require explicit human approval via PayPal Checkout.*`;

      await conversationManager.addMessage({ sessionId, role: "assistant", content: reply, userId });

      return {
        message: reply,
        intent,
        products: [],
        actionRequired: "NONE",
        status: "SUCCESS",
        requestId,
        isMock: true,
      };
    }

    // 5.5 Contextual Continuity & Pronoun Resolution
    const contextual = await ContextResolver.resolve(sessionId, message);

    // If user asks about the price of their active proposal
    if (contextual.isPriceInquiryIntent && contextual.activeProposal) {
      const p = contextual.activeProposal;
      const text = `Here is the authoritative price breakdown for Proposal **#${p.proposalNumber}**:\n\n` +
        `• **Product**: ${p.product.name}\n` +
        `• **Unit Price**: $${p.unitAmount.toFixed(2)} ${p.currency}\n` +
        `• **Quantity**: ${p.quantity}\n` +
        `• **Total Amount**: **$${p.totalAmount.toFixed(2)} ${p.currency}**\n` +
        `• **Status**: ${p.status}\n` +
        `• **Expires At**: ${p.expiresAt.toLocaleTimeString()}\n\n` +
        `To authorize payment, please proceed with the explicit PayPal Checkout confirmation below.`;

      await conversationManager.addMessage({
        sessionId,
        role: "assistant",
        content: text,
        metadata: { proposalId: p.id, products: [p.product] },
        userId,
      });

      await dbRepository.recordAiAuditLog({
        requestId,
        operation: "COMMERCE_AGENT_TURN",
        provider: "commerce-agent",
        model: "deterministic-v1",
        status: "SUCCESS",
        latencyMs: Date.now() - startTime,
        promptSummary: message.slice(0, 100),
        responseSummary: text.slice(0, 150),
        metadata: { intent: "PRICE_CHECK", proposalId: p.id },
        userId,
      });

      return {
        message: text,
        intent,
        products: [p.product],
        proposal: p,
        actionRequired: "CONFIRMATION_REQUIRED",
        status: "SUCCESS",
        requestId,
        isMock: true,
      };
    }

    // If user says "yes, buy it", "checkout", "confirm purchase"
    if (contextual.isConfirmationIntent && contextual.activeProposal) {
      const p = contextual.activeProposal;
      const text = `To complete your purchase for **${p.product.name}** ($${p.totalAmount.toFixed(2)} ${p.currency}), please click the **Authorize with PayPal** button below.\n\n` +
        `*Security Policy Directive: Under our financial governance invariant, AI assistants cannot auto-charge accounts; explicit human confirmation is strictly required.*`;

      await conversationManager.addMessage({
        sessionId,
        role: "assistant",
        content: text,
        metadata: { proposalId: p.id, products: [p.product] },
        userId,
      });

      await dbRepository.recordAiAuditLog({
        requestId,
        operation: "COMMERCE_AGENT_TURN",
        provider: "commerce-agent",
        model: "deterministic-v1",
        status: "SUCCESS",
        latencyMs: Date.now() - startTime,
        promptSummary: message.slice(0, 100),
        responseSummary: text.slice(0, 150),
        metadata: { intent: "PURCHASE", proposalId: p.id },
        userId,
      });

      return {
        message: text,
        intent,
        products: [p.product],
        proposal: p,
        actionRequired: "CONFIRMATION_REQUIRED",
        status: "SUCCESS",
        requestId,
        isMock: true,
      };
    }

    // If user asks use-case evaluation: "Which one is better for programming?"
    if (contextual.useCaseRecommendation) {
      const rec = contextual.useCaseRecommendation;
      const text = `${rec.reason}\n\nWould you like me to prepare a purchase proposal for **${rec.product.name}**?`;

      await conversationManager.addMessage({
        sessionId,
        role: "assistant",
        content: text,
        metadata: { products: [rec.product] },
        userId,
      });

      await dbRepository.recordAiAuditLog({
        requestId,
        operation: "COMMERCE_AGENT_TURN",
        provider: "commerce-agent",
        model: "deterministic-v1",
        status: "SUCCESS",
        latencyMs: Date.now() - startTime,
        promptSummary: message.slice(0, 100),
        responseSummary: text.slice(0, 150),
        metadata: { intent: "RECOMMEND", productId: rec.product.id },
        userId,
      });

      return {
        message: text,
        intent,
        products: [rec.product],
        actionRequired: "NONE",
        status: "SUCCESS",
        requestId,
        isMock: true,
      };
    }

    // If user requested relative comparison: "Compare the best two"
    if (contextual.resolvedProductsForComparison && contextual.resolvedProductsForComparison.length >= 2) {
      const comparedProds = contextual.resolvedProductsForComparison;
      const comparisonResult = await productComparisonEngine.compareProducts(comparedProds.map((p) => p.id));

      const text = `Here is a side-by-side comparison of the top options:\n` +
        comparisonResult.products
          .map((p, idx) => {
            const adv = comparisonResult.advantages[p.id]?.length
              ? ` (Advantages: ${comparisonResult.advantages[p.id].join(", ")})`
              : "";
            return `${idx + 1}. **${p.name}** — $${p.price.toFixed(2)}${adv}`;
          })
          .join("\n") +
        `\n\n${comparisonResult.tradeoffs.join("\n")}\n\n${comparisonResult.summary}`;

      await conversationManager.addMessage({
        sessionId,
        role: "assistant",
        content: text,
        metadata: { products: comparedProds },
        userId,
      });

      await dbRepository.recordAiAuditLog({
        requestId,
        operation: "COMMERCE_AGENT_TURN",
        provider: "commerce-agent",
        model: "deterministic-v1",
        status: "SUCCESS",
        latencyMs: Date.now() - startTime,
        promptSummary: message.slice(0, 100),
        responseSummary: text.slice(0, 150),
        metadata: { intent: "COMPARE", productIds: comparedProds.map((p) => p.id) },
        userId,
      });

      return {
        message: text,
        intent,
        products: comparedProds,
        comparison: comparisonResult,
        actionRequired: "NONE",
        status: "SUCCESS",
        requestId,
        isMock: true,
      };
    }

    // If user selected a relative product: "I'll take the first one", "the cheaper one", "buy that"
    if (
      contextual.resolvedProduct &&
      (intent.intent === "PURCHASE" || /\b(take|buy|choose|want|get|first|second|cheaper|premium|best)\b/i.test(message))
    ) {
      const targetProduct = contextual.resolvedProduct;
      try {
        const prop = await proposalService.createProposal({
          productId: targetProduct.id,
          quantity: intent.quantity || 1,
          userId,
          conversationId: sessionId,
        });

        const reply = `I have prepared a payment proposal (#${prop.proposalNumber}) for **${targetProduct.name}** at **$${prop.totalAmount.toFixed(
          2
        )} ${prop.currency}**.\n\nPlease review and confirm below to proceed to PayPal checkout.`;

        await conversationManager.addMessage({
          sessionId,
          role: "assistant",
          content: reply,
          metadata: { proposalId: prop.id, products: [targetProduct] },
          userId,
        });

        await dbRepository.recordAiAuditLog({
          requestId,
          operation: "COMMERCE_AGENT_TURN",
          provider: "commerce-agent",
          model: "deterministic-v1",
          status: "SUCCESS",
          latencyMs: Date.now() - startTime,
          promptSummary: message.slice(0, 100),
          responseSummary: reply.slice(0, 150),
          metadata: { intent: "PURCHASE", proposalId: prop.id, productId: targetProduct.id },
          userId,
        });

        return {
          message: reply,
          intent,
          products: [targetProduct],
          proposal: prop,
          actionRequired: "CONFIRMATION_REQUIRED",
          status: "SUCCESS",
          requestId,
          isMock: true,
        };
      } catch (err: any) {
        log.warn("Could not generate contextual proposal", { err: err.message, productId: targetProduct.id });
      }
    }

    // 6. Grounded Product Retrieval & Recommendation
    let matchingProducts: Product[] = [];
    let evidenceList: RecommendationEvidence[] = [];
    let comparisonData: ComparisonResult | undefined = undefined;

    if (["SEARCH", "RECOMMEND", "PURCHASE", "PRICE_CHECK", "COMPARE"].includes(intent.intent)) {
      const searchRes = await intelligentSearchEngine.search({
        query: intent.productQuery,
        category: intent.category || contextual.inferredCategory,
        maxPrice: intent.budget?.amount,
        currency: intent.budget?.currency || "USD",
        userPreferences: intent.preferences,
        inStockOnly: true,
        limit: 4,
      });

      matchingProducts = searchRes.results.map((r) => r.product);
      evidenceList = searchRes.results.map((r) => r.evidence);

      // If comparison requested and 2+ products found, perform structured side-by-side comparison
      if (intent.intent === "COMPARE" && matchingProducts.length >= 2) {
        try {
          comparisonData = await productComparisonEngine.compareProducts(
            matchingProducts.slice(0, 3).map((p) => p.id)
          );
        } catch (compErr: any) {
          log.warn("Comparison generation fallback", { err: compErr.message });
        }
      }
    }

    // 7. Proposal Generation (Only for Purchase Intent with high confidence and verified in-stock product)
    let proposal: CommerceProposal | undefined = undefined;
    let actionRequired: "CONFIRMATION_REQUIRED" | "CLARIFICATION_REQUIRED" | "NONE" = "NONE";
    let assistantText = "";

    if (intent.intent === "PURCHASE" && matchingProducts.length > 0) {
      const selectedProduct = matchingProducts[0];
      const topEvidence = evidenceList[0];
      try {
        // Create server-governed proposal (DRAFT/PENDING_CONFIRMATION)
        proposal = await proposalService.createProposal({
          productId: selectedProduct.id,
          quantity: intent.quantity,
          userId,
          conversationId: sessionId,
        });

        actionRequired = "CONFIRMATION_REQUIRED";
        const badgeLabel = topEvidence?.badge ? ` [${topEvidence.badge}]` : "";
        const alternatives = matchingProducts.slice(1);
        const altText =
          alternatives.length > 0
            ? `\n\nOther matching options found:\n` +
              alternatives
                .map((p) => `• **${p.name}** — $${p.price.toFixed(2)} ${p.currency}`)
                .join("\n")
            : "";
        assistantText = `I found the best match for your request: **${selectedProduct.name}**${badgeLabel} at **$${selectedProduct.price.toFixed(
          2
        )} ${selectedProduct.currency}**.\n\n${topEvidence?.whyRecommended?.join(" • ") || ""}${altText}\n\nI have prepared a payment proposal (#${
          proposal.proposalNumber
        }) for **$${proposal.totalAmount.toFixed(2)}**. Please review and confirm below to proceed to PayPal checkout.`;
      } catch (err: any) {
        log.warn("Could not generate proposal", { err: err.message, productId: selectedProduct.id });
        assistantText = `I found **${selectedProduct.name}**, but could not prepare a proposal: ${err.message}`;
      }
    } else if (matchingProducts.length > 0) {
      if (intent.intent === "COMPARE" && comparisonData) {
        assistantText = `Here is a side-by-side comparison of the top matching options:\n` +
          comparisonData.products
            .map((p, idx) => {
              const adv = comparisonData?.advantages[p.id]?.length ? ` (Advantages: ${comparisonData.advantages[p.id].join(", ")})` : "";
              return `${idx + 1}. **${p.name}** — $${p.price.toFixed(2)}${adv}`;
            })
            .join("\n") +
          `\n\n${comparisonData.tradeoffs.join("\n")}\n\n${comparisonData.summary}`;
      } else {
        assistantText = `I found ${matchingProducts.length} option(s) matching your criteria:\n` +
          matchingProducts
            .map((p, idx) => {
              const ev = evidenceList[idx];
              const badge = ev?.badge ? ` [${ev.badge}]` : "";
              return `${idx + 1}. **${p.name}**${badge} — $${p.price.toFixed(2)}`;
            })
            .join("\n") +
          `\n\nWould you like me to prepare an order proposal for any of these?`;
      }
    } else {
      actionRequired = "CLARIFICATION_REQUIRED";
      assistantText =
        "I couldn't find any in-stock items matching that specific description or budget. Could you specify your target category (e.g., keyboards, audio, mice, monitors, or software) or adjust the price range?";
    }

    // 8. Record in Conversational Memory
    await conversationManager.addMessage({
      sessionId,
      role: "assistant",
      content: assistantText,
      metadata: {
        intent: intent.intent,
        confidence: intent.confidence,
        proposalId: proposal?.id,
        productIds: matchingProducts.map((p) => p.id),
        products: matchingProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          category: p.category,
        })),
      },
      userId,
    });

    // 9. Record Auditable AI Activity
    await dbRepository.recordAiAuditLog({
      requestId,
      operation: "COMMERCE_AGENT_TURN",
      provider: "commerce-agent",
      model: "deterministic-v1",
      status: "SUCCESS",
      latencyMs: Date.now() - startTime,
      promptSummary: message.slice(0, 100),
      responseSummary: assistantText.slice(0, 150),
      metadata: {
        intent: intent.intent,
        confidence: intent.confidence,
        proposalNumber: proposal?.proposalNumber,
        productCount: matchingProducts.length,
      },
      userId,
    });

    return {
      message: assistantText,
      intent,
      products: matchingProducts,
      proposal,
      actionRequired,
      status: "SUCCESS",
      requestId,
      isMock: true,
      evidence: evidenceList,
      comparison: comparisonData,
    };
  }

  async getContextSnapshot(options?: Partial<AgentContextOptions>): Promise<AgentContextSnapshot> {
    return agentContextBuilder.buildContext({
      callerType: options?.callerType || "ai_agent",
      ...options,
    });
  }
}

export const commerceAgent = new CommerceAgent();
