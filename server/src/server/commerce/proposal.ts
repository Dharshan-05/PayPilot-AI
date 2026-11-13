import { prisma } from "../db/client";
import { Product, CommerceProposal, Prisma } from "@prisma/client";
import { catalogService } from "./catalog";
import { payPalService } from "../paypal/service";
import { Logger } from "../observability/logger";
import { AgentActionPolicy } from "./policy";

const log = new Logger("ProposalService");

export const PROPOSAL_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class ProposalExpiredError extends Error {
  constructor(message: string = "Commerce proposal has expired. Please refresh recommendation.") {
    super(message);
    this.name = "ProposalExpiredError";
  }
}

export class PriceMismatchError extends Error {
  constructor(
    public readonly expectedPrice: number,
    public readonly currentPrice: number,
    message: string = `Product price changed from $${expectedPrice.toFixed(2)} to $${currentPrice.toFixed(2)}. Refresh proposal required.`
  ) {
    super(message);
    this.name = "PriceMismatchError";
  }
}

export class InventoryUnavailableError extends Error {
  constructor(message: string = "Product is no longer available or has insufficient inventory.") {
    super(message);
    this.name = "InventoryUnavailableError";
  }
}

export class ProposalInvalidStateError extends Error {
  constructor(message: string = "Commerce proposal is not in PENDING_CONFIRMATION state.") {
    super(message);
    this.name = "ProposalInvalidStateError";
  }
}

export interface CreateProposalParams {
  productId: string;
  quantity?: number;
  userId?: string;
  conversationId?: string;
}

export interface ConfirmProposalResult {
  proposal: CommerceProposal;
  paypalOrderId: string;
  paypalApprovalUrl?: string;
  internalReference: string;
}

export class ProposalService {
  /**
   * Generates a server-authoritative CommerceProposal grounded in verified product data.
   */
  async createProposal(params: CreateProposalParams): Promise<CommerceProposal> {
    const { productId, quantity = 1, userId, conversationId } = params;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity (${quantity}). Quantity must be a positive integer.`);
    }

    const product = await catalogService.getProductById(productId);
    if (!product) {
      throw new Error(`Product '${productId}' not found in catalog.`);
    }

    if (!product.isAvailable || product.inventory < quantity) {
      throw new InventoryUnavailableError(
        `Product '${product.name}' is out of stock or does not have ${quantity} units available.`
      );
    }

    const numPrice = Number(product.price);
    const numTotal = Math.round(numPrice * quantity * 100) / 100;
    const unitAmount = new Prisma.Decimal(numPrice);
    const totalAmount = new Prisma.Decimal(numTotal);
    const proposalNumber = `PROP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + PROPOSAL_TTL_MS);

    log.info("Creating commerce proposal", {
      proposalNumber,
      productId: product.id,
      productName: product.name,
      totalAmount: numTotal,
    });

    return prisma.commerceProposal.create({
      data: {
        proposalNumber,
        productId: product.id,
        quantity,
        unitAmount,
        totalAmount,
        currency: product.currency,
        status: "PENDING_CONFIRMATION",
        expiresAt,
        userId,
        conversationId,
        metadata: JSON.stringify({
          productName: product.name,
          sku: product.sku,
          category: product.category,
        }),
      },
    });
  }

  async getProposalById(id: string): Promise<(CommerceProposal & { product: Product }) | null> {
    return prisma.commerceProposal.findUnique({
      where: { id },
      include: { product: true },
    });
  }

  async getProposalByNumber(proposalNumber: string): Promise<(CommerceProposal & { product: Product }) | null> {
    return prisma.commerceProposal.findUnique({
      where: { proposalNumber },
      include: { product: true },
    });
  }

  /**
   * User Confirmation Gate & PayPal Handoff:
   * 1. Validates user confirmation (AI cannot invoke this).
   * 2. Checks proposal expiration (rejects if expired).
   * 3. Re-checks database product price for price integrity (rejects if price changed).
   * 4. Re-checks inventory availability.
   * 5. Atomically creates PayPal Order using existing Phase 2 PayPalService.
   * 6. Updates proposal status to CONFIRMED.
   */
  async confirmProposal(
    proposalId: string,
    caller: "human_user" | "ai_agent" = "human_user"
  ): Promise<ConfirmProposalResult> {
    // 1. Hard Security Boundary: AI cannot confirm payment!
    const authCheck = AgentActionPolicy.authorizeAction("CONFIRM_PAYMENT", caller);
    if (!authCheck.authorized) {
      log.warn("Blocked unauthorized confirmation attempt", { proposalId, caller });
      throw new Error(authCheck.reason);
    }

    const proposal = await this.getProposalById(proposalId);
    if (!proposal) {
      throw new Error(`Commerce proposal '${proposalId}' not found.`);
    }

    // 2. Concurrency / Idempotency check
    if (proposal.status === "CONFIRMED" && proposal.paymentOrderId) {
      log.info("Proposal already confirmed; returning existing payment order", {
        proposalId,
        paymentOrderId: proposal.paymentOrderId,
      });
      const order = await prisma.paymentOrder.findUnique({
        where: { id: proposal.paymentOrderId },
      });
      return {
        proposal,
        paypalOrderId: order?.paypalOrderId || "",
        internalReference: order?.internalReference || "",
      };
    }

    if (proposal.status !== "PENDING_CONFIRMATION") {
      throw new ProposalInvalidStateError(
        `Proposal cannot be confirmed in state '${proposal.status}'. Expected PENDING_CONFIRMATION.`
      );
    }

    // 3. Expiration Check
    if (new Date() > proposal.expiresAt) {
      log.warn("Proposal confirmation rejected: Expired", { proposalId, expiresAt: proposal.expiresAt });
      await prisma.commerceProposal.update({
        where: { id: proposal.id },
        data: { status: "EXPIRED" },
      });
      throw new ProposalExpiredError();
    }

    // 4. Live Grounded Data & Price Integrity Re-check
    const product = await catalogService.getProductById(proposal.productId);
    if (!product) {
      throw new Error(`Referenced product '${proposal.productId}' no longer exists.`);
    }

    if (Number(product.price) !== Number(proposal.unitAmount)) {
      log.warn("Proposal confirmation rejected: Price Mismatch Detected", {
        proposalPrice: Number(proposal.unitAmount),
        currentDatabasePrice: Number(product.price),
      });
      throw new PriceMismatchError(Number(proposal.unitAmount), Number(product.price));
    }

    // 5. Inventory Availability Re-check
    if (!product.isAvailable || product.inventory < proposal.quantity) {
      log.warn("Proposal confirmation rejected: Out of Stock", {
        productId: product.id,
        available: product.isAvailable,
        inventory: product.inventory,
      });
      throw new InventoryUnavailableError(
        `Product '${product.name}' is no longer in stock for the requested quantity.`
      );
    }

    // 6. Safe Financial Handoff to Existing PayPal Service
    const internalReference = `ORD-PROP-${proposal.proposalNumber}`;
    const description = `Purchase: ${proposal.quantity}x ${product.name}`;

    log.info("Executing PayPal order creation for confirmed proposal", {
      proposalNumber: proposal.proposalNumber,
      internalReference,
      totalAmount: Number(proposal.totalAmount),
    });

    const payPalOrder = await payPalService.createOrder({
      amount: Number(proposal.totalAmount),
      currency: proposal.currency,
      description,
      internalReference,
    });

    // 7. Find created PaymentOrder in DB and update CommerceProposal
    const paymentOrderRecord = await prisma.paymentOrder.findUnique({
      where: { internalReference },
    });

    const updatedProposal = await prisma.commerceProposal.update({
      where: { id: proposal.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        paymentOrderId: paymentOrderRecord?.id,
      },
    });

    const approveLink = payPalOrder.approvalLink;

    log.info("Commerce proposal confirmed successfully", {
      proposalId: updatedProposal.id,
      paypalOrderId: payPalOrder.id,
    });

    return {
      proposal: updatedProposal,
      paypalOrderId: payPalOrder.id,
      paypalApprovalUrl: approveLink,
      internalReference,
    };
  }

  async cancelProposal(proposalId: string): Promise<CommerceProposal> {
    const proposal = await prisma.commerceProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new Error(`Proposal '${proposalId}' not found.`);

    if (proposal.status !== "PENDING_CONFIRMATION") {
      throw new ProposalInvalidStateError(`Cannot cancel proposal in state '${proposal.status}'.`);
    }

    return prisma.commerceProposal.update({
      where: { id: proposalId },
      data: { status: "CANCELLED" },
    });
  }
}

export const proposalService = new ProposalService();
