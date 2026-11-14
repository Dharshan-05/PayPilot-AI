import { prisma } from "./client";
import { PaymentOrder, AIAuditLog, WebhookEvent, User, Prisma } from "@prisma/client";
import { Logger } from "../observability/logger";
import { PaymentStateMachine } from "../paypal/state-machine";
import { executeDbWithFallback } from "./resilience";
import { fallbackStore, FallbackPaymentOrder, FallbackOrder, FallbackPayment, FallbackTransaction } from "./fallback-store";

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
    return executeDbWithFallback(
      () =>
        prisma.user.upsert({
          where: { email },
          update: { ...(name && { name }) },
          create: { email, name },
        }),
      () => {
        let u = fallbackStore.users.find((user) => user.email === email);
        if (u) {
          if (name) u.name = name;
          return u as any;
        }
        const newUser = {
          id: `usr-${Date.now().toString(36)}`,
          email,
          name: name || null,
          role: "MERCHANT",
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        fallbackStore.users.push(newUser);
        return newUser as any;
      },
      "findOrCreateUser"
    );
  }

  async getUserById(id: string): Promise<User | null> {
    return executeDbWithFallback(
      () => prisma.user.findUnique({ where: { id } }),
      () => (fallbackStore.users.find((u) => u.id === id) as any) || null,
      "getUserById"
    );
  }

  // -------------------------------------------------------------
  // Order Operations
  // -------------------------------------------------------------
  async createPaymentOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    log.debug("Creating payment order record", { internalReference: params.internalReference });

    return executeDbWithFallback(
      async () => {
        try {
          return await prisma.$transaction(async (tx) => {
            // 1. Create or retrieve associated Customer
            const customerEmail = params.customerEmail || "demo.customer@paypilot.ai";
            const customerName = params.customerEmail ? params.customerEmail.split("@")[0] : "Demo Customer";
            const customer = await tx.customer.upsert({
              where: { email: customerEmail },
              update: {},
              create: {
                externalId: `CUST-${Date.now().toString(36).toUpperCase()}`,
                name: customerName,
                email: customerEmail,
                country: "US",
                status: "ACTIVE",
              },
            });

            // 2. Create PaymentOrder
            const paymentOrder = await tx.paymentOrder.create({
              data: {
                internalReference: params.internalReference,
                paypalOrderId: params.paypalOrderId,
                amount: new Prisma.Decimal(params.amount),
                currency: params.currency.toUpperCase(),
                status: "CREATED",
                customerEmail: params.customerEmail,
                description: params.description,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null,
                userId: params.userId,
              },
            });

            // 3. Create normalized Order
            const normalizedOrder = await tx.order.create({
              data: {
                orderNumber: params.internalReference,
                customerId: customer.id,
                status: "PENDING",
                amount: new Prisma.Decimal(params.amount),
                currency: params.currency.toUpperCase(),
                paypalOrderId: params.paypalOrderId,
              },
            });

            // 4. Create Payment record
            const payment = await tx.payment.create({
              data: {
                orderId: normalizedOrder.id,
                customerId: customer.id,
                paypalOrderId: params.paypalOrderId,
                status: "INITIATED",
                amount: new Prisma.Decimal(params.amount),
                currency: params.currency.toUpperCase(),
                paymentMethod: "PayPal Sandbox",
                payerEmail: params.customerEmail,
              },
            });

            // 5. Create Transaction record
            await tx.transaction.create({
              data: {
                paymentId: payment.id,
                customerId: customer.id,
                paypalOrderId: params.paypalOrderId,
                type: "PAYMENT",
                status: "PENDING",
                amount: new Prisma.Decimal(params.amount),
                currency: params.currency.toUpperCase(),
                riskScore: 10,
                riskLevel: "LOW",
                description: params.description || `Order ${params.internalReference}`,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null,
              },
            });

            return paymentOrder;
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
      },
      () => {
        const existing = fallbackStore.paymentOrders.find(
          (o) =>
            o.internalReference === params.internalReference ||
            (params.paypalOrderId && o.paypalOrderId === params.paypalOrderId)
        );
        if (existing) return existing as any;

        const customerEmail = params.customerEmail || "demo.customer@paypilot.ai";
        const customerName = params.customerEmail ? params.customerEmail.split("@")[0] : "Demo Customer";
        let cust = fallbackStore.customers.find((c) => c.email === customerEmail);
        if (!cust) {
          cust = {
            id: `cust-uuid-${Date.now().toString(36)}`,
            externalId: `CUST-${Date.now().toString(36).toUpperCase()}`,
            name: customerName,
            email: customerEmail,
            phone: null,
            country: "US",
            status: "ACTIVE",
            totalSpent: new Prisma.Decimal(0),
            transactionCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          fallbackStore.customers.push(cust);
        }

        const now = new Date();
        const paymentOrder: FallbackPaymentOrder = {
          id: `pord-${Date.now().toString(36)}`,
          internalReference: params.internalReference,
          paypalOrderId: params.paypalOrderId || null,
          paypalCaptureId: null,
          amount: new Prisma.Decimal(params.amount),
          currency: params.currency.toUpperCase(),
          status: "CREATED",
          customerEmail: params.customerEmail || null,
          description: params.description || null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
          userId: params.userId || null,
          createdAt: now,
          updatedAt: now,
        };
        fallbackStore.paymentOrders.unshift(paymentOrder);

        const order: FallbackOrder = {
          id: `ord-uuid-${Date.now().toString(36)}`,
          orderNumber: params.internalReference,
          customerId: cust.id,
          status: "PENDING",
          amount: new Prisma.Decimal(params.amount),
          currency: params.currency.toUpperCase(),
          paypalOrderId: params.paypalOrderId || null,
          createdAt: now,
          updatedAt: now,
          customer: cust,
        };
        fallbackStore.orders.unshift(order);

        const payment: FallbackPayment = {
          id: `pay-uuid-${Date.now().toString(36)}`,
          orderId: order.id,
          customerId: cust.id,
          paypalOrderId: params.paypalOrderId || null,
          paypalCaptureId: null,
          status: "INITIATED",
          amount: new Prisma.Decimal(params.amount),
          currency: params.currency.toUpperCase(),
          paymentMethod: "PayPal Sandbox",
          payerEmail: params.customerEmail || null,
          capturedAt: null,
          createdAt: now,
          updatedAt: now,
          order,
          customer: cust,
        };
        fallbackStore.payments.unshift(payment);

        const tx: FallbackTransaction = {
          id: `tx-uuid-${Date.now().toString(36)}`,
          paymentId: payment.id,
          customerId: cust.id,
          paypalOrderId: params.paypalOrderId || null,
          paypalCaptureId: null,
          type: "PAYMENT",
          status: "PENDING",
          amount: new Prisma.Decimal(params.amount),
          currency: params.currency.toUpperCase(),
          riskScore: 10,
          riskLevel: "LOW",
          description: params.description || `Order ${params.internalReference}`,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
          transactionDate: now,
          createdAt: now,
          updatedAt: now,
          customer: cust,
          payment: { ...payment, order },
        };
        fallbackStore.transactions.unshift(tx);

        return paymentOrder as any;
      },
      "createPaymentOrder"
    );
  }

  async getOrderById(id: string): Promise<PaymentOrder | null> {
    return executeDbWithFallback(
      () =>
        prisma.paymentOrder.findUnique({
          where: { id },
        }),
      () => (fallbackStore.paymentOrders.find((o) => o.id === id) as any) || null,
      "getOrderById"
    );
  }

  async getOrderByInternalRef(internalReference: string): Promise<PaymentOrder | null> {
    return executeDbWithFallback(
      () =>
        prisma.paymentOrder.findUnique({
          where: { internalReference },
        }),
      () => (fallbackStore.paymentOrders.find((o) => o.internalReference === internalReference) as any) || null,
      "getOrderByInternalRef"
    );
  }

  async getOrderByPaypalId(paypalOrderId: string): Promise<PaymentOrder | null> {
    return executeDbWithFallback(
      () =>
        prisma.paymentOrder.findUnique({
          where: { paypalOrderId },
        }),
      () => (fallbackStore.paymentOrders.find((o) => o.paypalOrderId === paypalOrderId) as any) || null,
      "getOrderByPaypalId"
    );
  }

  async getRecentOrders(limit: number = 25) {
    const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 25;
    return executeDbWithFallback(
      () =>
        prisma.paymentOrder.findMany({
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
        }),
      () => fallbackStore.paymentOrders.slice(0, safeLimit) as any,
      "getRecentOrders"
    );
  }

  async updateOrderPaypalId(internalReference: string, paypalOrderId: string): Promise<PaymentOrder> {
    return executeDbWithFallback(
      () =>
        prisma.paymentOrder.update({
          where: { internalReference },
          data: { paypalOrderId },
        }),
      () => {
        const order = fallbackStore.paymentOrders.find((o) => o.internalReference === internalReference);
        if (order) {
          order.paypalOrderId = paypalOrderId;
          return order as any;
        }
        return {
          id: `pord-${Date.now().toString(36)}`,
          internalReference,
          paypalOrderId,
          paypalCaptureId: null,
          amount: new Prisma.Decimal(10),
          currency: "USD",
          status: "CREATED",
          customerEmail: null,
          description: null,
          metadata: null,
          userId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
      },
      "updateOrderPaypalId"
    );
  }

  async updateOrderCaptureSuccess(
    paypalOrderId: string,
    captureId: string,
    metadataUpdate?: Record<string, any>
  ): Promise<PaymentOrder | null> {
    log.info("Updating order to CAPTURED", { paypalOrderId, captureId });

    return executeDbWithFallback(
      async () => {
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

        return await prisma.$transaction(async (tx) => {
          const updatedOrder = await tx.paymentOrder.update({
            where: { paypalOrderId },
            data: {
              paypalCaptureId: captureId,
              status: "CAPTURED",
              ...(metadataUpdate && {
                metadata: JSON.stringify(metadataUpdate),
              }),
            },
          });

          await tx.order.updateMany({
            where: { paypalOrderId },
            data: { status: "COMPLETED" },
          });

          await tx.payment.updateMany({
            where: { paypalOrderId },
            data: {
              paypalCaptureId: captureId,
              status: "COMPLETED",
              capturedAt: new Date(),
            },
          });

          await tx.transaction.updateMany({
            where: { paypalOrderId },
            data: {
              paypalCaptureId: captureId,
              status: "COMPLETED",
            },
          });

          if (existing.customerEmail) {
            await tx.customer.updateMany({
              where: { email: existing.customerEmail },
              data: {
                totalSpent: { increment: existing.amount },
                transactionCount: { increment: 1 },
              },
            });
          }

          await tx.auditLog.create({
            data: {
              action: "PAYMENT_CAPTURED",
              entity: "Payment",
              entityId: captureId,
              details: JSON.stringify({
                paypalOrderId,
                amount: existing.amount.toString(),
                currency: existing.currency,
                customerEmail: existing.customerEmail,
              }),
            },
          });

          const proposal = await tx.commerceProposal.findUnique({
            where: { paymentOrderId: existing.id },
          });

          if (proposal && proposal.status !== "COMPLETED") {
            await tx.commerceProposal.update({
              where: { id: proposal.id },
              data: { status: "COMPLETED" },
            });

            const product = await tx.product.findUnique({
              where: { id: proposal.productId },
            });

            if (product) {
              const nextInventory = Math.max(0, product.inventory - proposal.quantity);
              await tx.product.update({
                where: { id: product.id },
                data: {
                  inventory: nextInventory,
                  isAvailable: nextInventory > 0,
                },
              });
            }
          }

          return updatedOrder;
        });
      },
      () => {
        const order = fallbackStore.paymentOrders.find((o) => o.paypalOrderId === paypalOrderId);
        if (order) {
          order.paypalCaptureId = captureId;
          order.status = "CAPTURED";
          order.updatedAt = new Date();
        }

        const normOrder = fallbackStore.orders.find((o) => o.paypalOrderId === paypalOrderId);
        if (normOrder) normOrder.status = "COMPLETED";

        const payment = fallbackStore.payments.find((p) => p.paypalOrderId === paypalOrderId);
        if (payment) {
          payment.status = "COMPLETED";
          payment.paypalCaptureId = captureId;
          payment.capturedAt = new Date();
        }

        const tx = fallbackStore.transactions.find((t) => t.paypalOrderId === paypalOrderId);
        if (tx) {
          tx.status = "COMPLETED";
          tx.paypalCaptureId = captureId;
        }

        return order as any || null;
      },
      "updateOrderCaptureSuccess"
    );
  }

  async updateOrderStatus(paypalOrderId: string, status: string, errorMessage?: string): Promise<PaymentOrder | null> {
    log.info("Updating order status", { paypalOrderId, status, errorMessage });

    return executeDbWithFallback(
      async () => {
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
      },
      () => {
        const order = fallbackStore.paymentOrders.find((o) => o.paypalOrderId === paypalOrderId);
        if (order) {
          order.status = status;
          if (errorMessage) order.description = errorMessage;
          order.updatedAt = new Date();
          return order as any;
        }
        return null;
      },
      "updateOrderStatus"
    );
  }

  // -------------------------------------------------------------
  // AI Audit Operations
  // -------------------------------------------------------------
  async recordAiAuditLog(params: RecordAuditParams): Promise<AIAuditLog> {
    return executeDbWithFallback(
      async () => {
        const result = await prisma.aIAuditLog.upsert({
          where: { requestId: params.requestId },
          update: {
            status: params.status,
            latencyMs: params.latencyMs,
            responseSummary: params.responseSummary,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null,
          },
          create: {
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
        fallbackStore.recordAiAuditLog(params);
        return result;
      },
      () => fallbackStore.recordAiAuditLog(params) as any,
      "recordAiAuditLog"
    );
  }

  async getRecentAuditLogs(limit: number = 20): Promise<AIAuditLog[]> {
    return executeDbWithFallback(
      () =>
        prisma.aIAuditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
      () => fallbackStore.getRecentAuditLogs(limit) as any,
      "getRecentAuditLogs"
    );
  }

  // -------------------------------------------------------------
  // Webhook Event Operations
  // -------------------------------------------------------------
  async recordWebhookEvent(params: RecordWebhookParams): Promise<WebhookEvent> {
    const payloadStr =
      typeof params.payload === "string" ? params.payload : JSON.stringify(params.payload || {});

    return executeDbWithFallback(
      () =>
        prisma.webhookEvent.upsert({
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
        }),
      () => {
        let ev = fallbackStore.webhookEvents.find((e) => e.eventId === params.eventId);
        if (ev) {
          ev.processingStatus = params.processingStatus;
          ev.signatureVerified = params.signatureVerified;
          ev.payload = payloadStr;
          ev.errorMessage = params.errorMessage || null;
          ev.processedAt = new Date();
          return ev as any;
        }
        const newEv = {
          id: `wh-${Date.now().toString(36)}`,
          eventId: params.eventId,
          eventType: params.eventType,
          resourceType: params.resourceType || null,
          processingStatus: params.processingStatus,
          signatureVerified: params.signatureVerified,
          payload: payloadStr,
          errorMessage: params.errorMessage || null,
          receivedAt: new Date(),
          processedAt: new Date(),
        };
        fallbackStore.webhookEvents.push(newEv);
        return newEv as any;
      },
      "recordWebhookEvent"
    );
  }

  async getWebhookEventByEventId(eventId: string): Promise<WebhookEvent | null> {
    return executeDbWithFallback(
      () =>
        prisma.webhookEvent.findUnique({
          where: { eventId },
        }),
      () => (fallbackStore.webhookEvents.find((e) => e.eventId === eventId) as any) || null,
      "getWebhookEventByEventId"
    );
  }

  async updateWebhookEventStatus(
    eventId: string,
    processingStatus: string,
    errorMessage?: string
  ): Promise<WebhookEvent> {
    return executeDbWithFallback(
      () =>
        prisma.webhookEvent.update({
          where: { eventId },
          data: {
            processingStatus,
            errorMessage,
            processedAt: new Date(),
          },
        }),
      () => {
        let ev = fallbackStore.webhookEvents.find((e) => e.eventId === eventId);
        if (ev) {
          ev.processingStatus = processingStatus;
          ev.errorMessage = errorMessage || null;
          ev.processedAt = new Date();
          return ev as any;
        }
        return {
          id: `wh-${Date.now().toString(36)}`,
          eventId,
          eventType: "PAYMENT.CAPTURE.COMPLETED",
          resourceType: "capture",
          processingStatus,
          signatureVerified: true,
          payload: "{}",
          errorMessage: errorMessage || null,
          receivedAt: new Date(),
          processedAt: new Date(),
        } as any;
      },
      "updateWebhookEventStatus"
    );
  }
}

export const dbRepository = new DatabaseRepository();
