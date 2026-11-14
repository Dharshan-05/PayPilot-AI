import { prisma } from "../client";
import { Prisma, Transaction } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class TransactionRepository {
  async list(params?: {
    customerId?: string;
    paymentId?: string;
    status?: string;
    type?: string;
    riskLevel?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));
    const offset = Math.max(0, params?.offset || 0);

    return executeDbWithFallback(
      () =>
        prisma.transaction.findMany({
          where: {
            ...(params?.customerId && { customerId: params.customerId }),
            ...(params?.paymentId && { paymentId: params.paymentId }),
            ...(params?.status && { status: params.status }),
            ...(params?.type && { type: params.type }),
            ...(params?.riskLevel && { riskLevel: params.riskLevel }),
            ...(params?.search && {
              OR: [
                { description: { contains: params.search, mode: "insensitive" } },
                { customer: { name: { contains: params.search, mode: "insensitive" } } },
                { customer: { email: { contains: params.search, mode: "insensitive" } } },
                { paypalOrderId: { contains: params.search, mode: "insensitive" } },
                { paypalCaptureId: { contains: params.search, mode: "insensitive" } },
              ],
            }),
          },
          include: {
            customer: true,
            payment: {
              include: { order: true },
            },
            riskAssessment: true,
            aiInsights: true,
          },
          orderBy: { transactionDate: "desc" },
          take: limit,
          skip: offset,
        }),
      () => {
        fallbackStore.seed();
        let items = [...fallbackStore.transactions];

        if (params?.customerId) items = items.filter((t) => t.customerId === params.customerId);
        if (params?.paymentId) items = items.filter((t) => t.paymentId === params.paymentId);
        if (params?.status) items = items.filter((t) => t.status === params.status);
        if (params?.type) items = items.filter((t) => t.type === params.type);
        if (params?.riskLevel) items = items.filter((t) => t.riskLevel === params.riskLevel);
        if (params?.search) {
          const s = params.search.toLowerCase();
          items = items.filter(
            (t) =>
              t.description.toLowerCase().includes(s) ||
              t.customer?.name.toLowerCase().includes(s) ||
              t.customer?.email.toLowerCase().includes(s) ||
              (t.paypalOrderId && t.paypalOrderId.toLowerCase().includes(s))
          );
        }

        return items.slice(offset, offset + limit) as any;
      },
      "transaction.list"
    );
  }

  async findById(id: string) {
    return executeDbWithFallback(
      () =>
        prisma.transaction.findUnique({
          where: { id },
          include: {
            customer: true,
            payment: {
              include: { order: true },
            },
            riskAssessment: true,
            aiInsights: true,
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.transactions.find((t) => t.id === id) as any) || null;
      },
      "transaction.findById"
    );
  }

  async findByPaypalOrderId(paypalOrderId: string) {
    return executeDbWithFallback(
      () =>
        prisma.transaction.findFirst({
          where: { paypalOrderId },
          include: {
            customer: true,
            payment: true,
            riskAssessment: true,
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.transactions.find((t) => t.paypalOrderId === paypalOrderId) as any) || null;
      },
      "transaction.findByPaypalOrderId"
    );
  }

  async findByPaypalCaptureId(paypalCaptureId: string) {
    return executeDbWithFallback(
      () =>
        prisma.transaction.findFirst({
          where: { paypalCaptureId },
          include: {
            customer: true,
            payment: true,
            riskAssessment: true,
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.transactions.find((t) => t.paypalCaptureId === paypalCaptureId) as any) || null;
      },
      "transaction.findByPaypalCaptureId"
    );
  }

  async create(data: Prisma.TransactionCreateInput): Promise<Transaction> {
    return executeDbWithFallback(
      () =>
        prisma.transaction.create({
          data,
          include: { customer: true },
        }),
      () => {
        fallbackStore.seed();
        const now = new Date();
        const customer = fallbackStore.customers.find((c) => c.id === data.customer.connect?.id) || fallbackStore.customers[0];
        const newTx: any = {
          id: `tx-uuid-${Date.now().toString(36)}`,
          paymentId: data.payment?.connect?.id || null,
          customerId: customer.id,
          paypalOrderId: data.paypalOrderId || null,
          paypalCaptureId: data.paypalCaptureId || null,
          type: data.type || "PAYMENT",
          status: data.status || "COMPLETED",
          amount: new Prisma.Decimal(data.amount as any),
          currency: data.currency || "USD",
          riskScore: data.riskScore || 10,
          riskLevel: data.riskLevel || "LOW",
          description: data.description,
          metadata: data.metadata || null,
          transactionDate: now,
          createdAt: now,
          updatedAt: now,
          customer,
        };
        fallbackStore.transactions.unshift(newTx);
        return newTx;
      },
      "transaction.create"
    );
  }

  async updateStatus(id: string, status: string): Promise<Transaction> {
    return executeDbWithFallback(
      () =>
        prisma.transaction.update({
          where: { id },
          data: { status },
        }),
      () => {
        fallbackStore.seed();
        const tx = fallbackStore.transactions.find((t) => t.id === id);
        if (tx) {
          tx.status = status;
          tx.updatedAt = new Date();
          return tx as any;
        }
        throw new Error(`Transaction ${id} not found in fallback store`);
      },
      "transaction.updateStatus"
    );
  }

  async count(params?: { status?: string; type?: string; riskLevel?: string }): Promise<number> {
    return executeDbWithFallback(
      () =>
        prisma.transaction.count({
          where: {
            ...(params?.status && { status: params.status }),
            ...(params?.type && { type: params.type }),
            ...(params?.riskLevel && { riskLevel: params.riskLevel }),
          },
        }),
      () => {
        fallbackStore.seed();
        let items = fallbackStore.transactions;
        if (params?.status) items = items.filter((t) => t.status === params.status);
        if (params?.type) items = items.filter((t) => t.type === params.type);
        if (params?.riskLevel) items = items.filter((t) => t.riskLevel === params.riskLevel);
        return items.length;
      },
      "transaction.count"
    );
  }

  async sumCompletedVolume(): Promise<number> {
    return executeDbWithFallback(
      async () => {
        const aggregate = await prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { status: "COMPLETED", type: "PAYMENT" },
        });
        return aggregate._sum.amount ? Number(aggregate._sum.amount) : 0;
      },
      () => {
        fallbackStore.seed();
        return fallbackStore.transactions
          .filter((t) => t.status === "COMPLETED" && t.type === "PAYMENT")
          .reduce((sum, t) => sum + Number(t.amount), 0);
      },
      "transaction.sumCompletedVolume"
    );
  }
}

export const transactionRepository = new TransactionRepository();
