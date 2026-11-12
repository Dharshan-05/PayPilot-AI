import { prisma } from "./client";
import { PaymentOrder, AIAuditLog, WebhookEvent, User } from "@prisma/client";
import { Logger } from "../observability/logger";
import { PaymentStateMachine } from "../paypal/state-machine";

const log = new Logger("DatabaseRepository");

export interface CreateOrderParams {
  internalReference: string;
  paypalOrderId?: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  description?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

export interface RecordAuditParams {
  requestId: string;
  operation: string;
  provider: string;
  model: string;
  status: string;
  latencyMs?: number;
  promptSummary?: string;
  responseSummary?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

export interface RecordWebhookParams {
  eventId: string;
  eventType: string;
  resourceType?: string;
  processingStatus: string;
  signatureVerified: boolean;
  payload?: Record<string, any> | string;
  errorMessage?: string;
}

export class DatabaseRepository {
  // -------------------------------------------------------------
  // User Operations
  // -------------------------------------------------------------
  async findOrCreateUser(email: string, name?: string): Promise<User> {
    return prisma.user.upsert({
      where: { email },
      update: { ...(name && { name }) },
      create: { email, name },
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  // -------------------------------------------------------------
  // Order Operations
  // -------------------------------------------------------------
  async createPaymentOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    log.debug("Creating payment order record", { internalReference: params.internalReference });
    try {
      return await prisma.paymentOrder.create({
        data: {
          internalReference: params.internalReference,
          paypalOrderId: params.paypalOrderId,
          amount: params.amount,
          currency: params.currency.toUpperCase(),
          status: "CREATED",
          customerEmail: params.customerEmail,
          description: params.description,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
          userId: params.userId,
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        log.info("Duplicate payment order detected on unique constraint; returning existing record", {
          internalReference: params.internalReference,
          paypalOrderId: params.paypalOrderId,
        });
        const existing = await prisma.paymentOrder.findFirst({
          where: {
            OR: [
              { internalReference: params.internalReference },
              ...(params.paypalOrderId ? [{ paypalOrderId: params.paypalOrderId }] : []),
            ],
          },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async getOrderByInternalRef(internalReference: string): Promise<PaymentOrder | null> {
    return prisma.paymentOrder.findUnique({
      where: { internalReference },
    });
  }

  async getOrderByPaypalId(paypalOrderId: string): Promise<PaymentOrder | null> {
    return prisma.paymentOrder.findUnique({
      where: { paypalOrderId },
    });
  }

  async getRecentOrders(limit: number = 25) {
    const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 25;
    return prisma.paymentOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      include: {
        proposal: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                category: true,
                price: true,
                currency: true,
              },
            },
          },
        },
      },
    });
  }

  async updateOrderPaypalId(internalReference: string, paypalOrderId: string): Promise<PaymentOrder> {
    return prisma.paymentOrder.update({
      where: { internalReference },
      data: { paypalOrderId },
    });
  }

  async updateOrderCaptureSuccess(
    paypalOrderId: string,
    captureId: string,
    metadataUpdate?: Record<string, any>
  ): Promise<PaymentOrder | null> {
    log.info("Updating order to CAPTURED", { paypalOrderId, captureId });
    const existing = await this.getOrderByPaypalId(paypalOrderId);
    if (!existing) {
      log.warn("Order not found in database to update capture", { paypalOrderId });
      return null;
    }

    if (existing.status === "CAPTURED") {
      log.info("Order already in CAPTURED state; ignoring duplicate transition", { paypalOrderId });
      return existing;
    }

    if (!PaymentStateMachine.canTransition(existing.status, "CAPTURED")) {
      log.warn("Cannot transition order to CAPTURED from current state", {
        from: existing.status,
        paypalOrderId,
      });
      return existing;
    }

    const updatedOrder = await prisma.paymentOrder.update({
      where: { paypalOrderId },
      data: {
        paypalCaptureId: captureId,
        status: "CAPTURED",
        ...(metadataUpdate && {
          metadata: JSON.stringify(metadataUpdate),
        }),
      },
    });

    // Fulfill associated CommerceProposal and decrement authoritative inventory
    try {
      const proposal = await prisma.commerceProposal.findUnique({
        where: { paymentOrderId: existing.id },
      });

      if (proposal && proposal.status !== "COMPLETED") {
        await prisma.commerceProposal.update({
          where: { id: proposal.id },
          data: { status: "COMPLETED" },
        });

        const product = await prisma.product.findUnique({
          where: { id: proposal.productId },
        });

        if (product) {
          const nextInventory = Math.max(0, product.inventory - proposal.quantity);
          await prisma.product.update({
            where: { id: product.id },
            data: {
              inventory: nextInventory,
              isAvailable: nextInventory > 0,
            },
          });
          log.info("Fulfilled proposal and decremented inventory upon capture", {
            proposalId: proposal.id,
            productId: product.id,
            previousInventory: product.inventory,
            nextInventory,
          });
        }
      }
    } catch (invErr: any) {
      log.warn("Failed to decrement inventory for captured order proposal", { err: invErr.message });
    }

    return updatedOrder;
  }

  async updateOrderStatus(paypalOrderId: string, status: string, errorMessage?: string): Promise<PaymentOrder | null> {
    log.info("Updating order status", { paypalOrderId, status, errorMessage });
    const existing = await this.getOrderByPaypalId(paypalOrderId);
    if (!existing) {
      log.warn("Order not found in database to update status", { paypalOrderId });
      return null;
    }

    if (!PaymentStateMachine.canTransition(existing.status, status)) {
      log.warn("Illegal state machine transition attempted in DB repository", {
        from: existing.status,
        to: status,
        paypalOrderId,
      });
      return existing;
    }

    return prisma.paymentOrder.update({
      where: { paypalOrderId },
      data: {
        status,
        ...(errorMessage && { description: errorMessage }),
      },
    });
  }

  // -------------------------------------------------------------
  // AI Audit Operations
  // -------------------------------------------------------------
  async recordAiAuditLog(params: RecordAuditParams): Promise<AIAuditLog> {
    return prisma.aIAuditLog.create({
      data: {
        requestId: params.requestId,
        operation: params.operation,
        provider: params.provider,
        model: params.model,
        status: params.status,
        latencyMs: params.latencyMs,
        promptSummary: params.promptSummary,
        responseSummary: params.responseSummary,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        userId: params.userId,
      },
    });
  }

  async getRecentAuditLogs(limit: number = 20): Promise<AIAuditLog[]> {
    return prisma.aIAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  // -------------------------------------------------------------
  // Webhook Event Operations
  // -------------------------------------------------------------
  async recordWebhookEvent(params: RecordWebhookParams): Promise<WebhookEvent> {
    const payloadStr =
      typeof params.payload === "string" ? params.payload : JSON.stringify(params.payload || {});

    return prisma.webhookEvent.upsert({
      where: { eventId: params.eventId },
      update: {
        processingStatus: params.processingStatus,
        signatureVerified: params.signatureVerified,
        payload: payloadStr,
        errorMessage: params.errorMessage,
        processedAt: ["PROCESSED", "DUPLICATE", "FAILED"].includes(params.processingStatus)
          ? new Date()
          : null,
      },
      create: {
        eventId: params.eventId,
        eventType: params.eventType,
        resourceType: params.resourceType,
        processingStatus: params.processingStatus,
        signatureVerified: params.signatureVerified,
        payload: payloadStr,
        errorMessage: params.errorMessage,
        receivedAt: new Date(),
        processedAt: ["PROCESSED", "DUPLICATE", "FAILED"].includes(params.processingStatus)
          ? new Date()
          : null,
      },
    });
  }

  async getWebhookEventByEventId(eventId: string): Promise<WebhookEvent | null> {
    return prisma.webhookEvent.findUnique({
      where: { eventId },
    });
  }

  async updateWebhookEventStatus(
    eventId: string,
    processingStatus: string,
    errorMessage?: string
  ): Promise<WebhookEvent> {
    return prisma.webhookEvent.update({
      where: { eventId },
      data: {
        processingStatus,
        errorMessage,
        processedAt: new Date(),
      },
    });
  }
}

export const dbRepository = new DatabaseRepository();
