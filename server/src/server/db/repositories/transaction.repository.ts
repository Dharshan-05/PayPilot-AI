import { prisma } from "../client";
import { Prisma, Transaction } from "@prisma/client";

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

    return prisma.transaction.findMany({
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
    });
  }

  async findById(id: string) {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        payment: {
          include: { order: true },
        },
        riskAssessment: true,
        aiInsights: true,
      },
    });
  }

  async findByPaypalOrderId(paypalOrderId: string) {
    return prisma.transaction.findFirst({
      where: { paypalOrderId },
      include: {
        customer: true,
        payment: true,
        riskAssessment: true,
      },
    });
  }

  async findByPaypalCaptureId(paypalCaptureId: string) {
    return prisma.transaction.findFirst({
      where: { paypalCaptureId },
      include: {
        customer: true,
        payment: true,
        riskAssessment: true,
      },
    });
  }

  async create(data: Prisma.TransactionCreateInput): Promise<Transaction> {
    return prisma.transaction.create({
      data,
      include: { customer: true },
    });
  }

  async updateStatus(id: string, status: string): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id },
      data: { status },
    });
  }

  async count(params?: { status?: string; type?: string; riskLevel?: string }): Promise<number> {
    return prisma.transaction.count({
      where: {
        ...(params?.status && { status: params.status }),
        ...(params?.type && { type: params.type }),
        ...(params?.riskLevel && { riskLevel: params.riskLevel }),
      },
    });
  }

  async sumCompletedVolume(): Promise<number> {
    const aggregate = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED", type: "PAYMENT" },
    });
    return aggregate._sum.amount ? Number(aggregate._sum.amount) : 0;
  }
}

export const transactionRepository = new TransactionRepository();
