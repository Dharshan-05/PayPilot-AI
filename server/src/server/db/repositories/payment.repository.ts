import { prisma } from "../client";
import { Prisma, Payment } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class PaymentRepository {
  async list(params?: { orderId?: string; customerId?: string; status?: string; limit?: number; offset?: number }): Promise<Payment[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));
    const offset = Math.max(0, params?.offset || 0);

    return executeDbWithFallback(
      () =>
        prisma.payment.findMany({
          where: {
            ...(params?.orderId && { orderId: params.orderId }),
            ...(params?.customerId && { customerId: params.customerId }),
            ...(params?.status && { status: params.status }),
          },
          include: {
            order: true,
            customer: true,
            transactions: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
      () => {
        fallbackStore.seed();
        let items = [...fallbackStore.payments];
        if (params?.orderId) items = items.filter((p) => p.orderId === params.orderId);
        if (params?.customerId) items = items.filter((p) => p.customerId === params.customerId);
        if (params?.status) items = items.filter((p) => p.status === params.status);
        return items.slice(offset, offset + limit) as any;
      },
      "payment.list"
    );
  }

  async findById(id: string): Promise<Payment | null> {
    return executeDbWithFallback(
      () =>
        prisma.payment.findUnique({
          where: { id },
          include: {
            order: true,
            customer: true,
            transactions: {
              include: { riskAssessment: true, aiInsights: true },
            },
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.payments.find((p) => p.id === id) as any) || null;
      },
      "payment.findById"
    );
  }

  async findByPaypalOrderId(paypalOrderId: string): Promise<Payment | null> {
    return executeDbWithFallback(
      () =>
        prisma.payment.findFirst({
          where: { paypalOrderId },
          include: { order: true, customer: true, transactions: true },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.payments.find((p) => p.paypalOrderId === paypalOrderId) as any) || null;
      },
      "payment.findByPaypalOrderId"
    );
  }

  async findByPaypalCaptureId(paypalCaptureId: string): Promise<Payment | null> {
    return executeDbWithFallback(
      () =>
        prisma.payment.findUnique({
          where: { paypalCaptureId },
          include: { order: true, customer: true, transactions: true },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.payments.find((p) => p.paypalCaptureId === paypalCaptureId) as any) || null;
      },
      "payment.findByPaypalCaptureId"
    );
  }

  async create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return executeDbWithFallback(
      () =>
        prisma.payment.create({
          data,
          include: { order: true, customer: true },
        }),
      () => {
        fallbackStore.seed();
        const now = new Date();
        const newPayment: any = {
          id: `pay-uuid-${Date.now().toString(36)}`,
          orderId: data.order.connect?.id || "ord-001",
          customerId: data.customer?.connect?.id || "cust-001",
          paypalOrderId: data.paypalOrderId || null,
          paypalCaptureId: data.paypalCaptureId || null,
          status: data.status || "INITIATED",
          amount: new Prisma.Decimal(data.amount as any),
          currency: data.currency || "USD",
          paymentMethod: data.paymentMethod,
          payerEmail: data.payerEmail || null,
          capturedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        fallbackStore.payments.unshift(newPayment);
        return newPayment;
      },
      "payment.create"
    );
  }

  async updateCapture(id: string, captureId: string, status: string = "COMPLETED"): Promise<Payment> {
    return executeDbWithFallback(
      () =>
        prisma.payment.update({
          where: { id },
          data: {
            paypalCaptureId: captureId,
            status,
            capturedAt: new Date(),
          },
          include: { order: true, customer: true },
        }),
      () => {
        fallbackStore.seed();
        const payment = fallbackStore.payments.find((p) => p.id === id);
        if (payment) {
          payment.paypalCaptureId = captureId;
          payment.status = status;
          payment.capturedAt = new Date();
          payment.updatedAt = new Date();
          return payment as any;
        }
        throw new Error(`Payment ${id} not found in fallback store`);
      },
      "payment.updateCapture"
    );
  }

  async count(status?: string): Promise<number> {
    return executeDbWithFallback(
      () =>
        prisma.payment.count({
          where: status ? { status } : undefined,
        }),
      () => {
        fallbackStore.seed();
        return status
          ? fallbackStore.payments.filter((p) => p.status === status).length
          : fallbackStore.payments.length;
      },
      "payment.count"
    );
  }
}

export const paymentRepository = new PaymentRepository();
