import { prisma } from "../client";
import { Prisma, Payment } from "@prisma/client";

export class PaymentRepository {
  async list(params?: { orderId?: string; customerId?: string; status?: string; limit?: number; offset?: number }): Promise<Payment[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));
    const offset = Math.max(0, params?.offset || 0);

    return prisma.payment.findMany({
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
    });
  }

  async findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
        customer: true,
        transactions: {
          include: { riskAssessment: true, aiInsights: true },
        },
      },
    });
  }

  async findByPaypalOrderId(paypalOrderId: string): Promise<Payment | null> {
    return prisma.payment.findFirst({
      where: { paypalOrderId },
      include: { order: true, customer: true, transactions: true },
    });
  }

  async findByPaypalCaptureId(paypalCaptureId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { paypalCaptureId },
      include: { order: true, customer: true, transactions: true },
    });
  }

  async create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return prisma.payment.create({
      data,
      include: { order: true, customer: true },
    });
  }

  async updateCapture(id: string, captureId: string, status: string = "COMPLETED"): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: {
        paypalCaptureId: captureId,
        status,
        capturedAt: new Date(),
      },
      include: { order: true, customer: true },
    });
  }

  async count(status?: string): Promise<number> {
    return prisma.payment.count({
      where: status ? { status } : undefined,
    });
  }
}

export const paymentRepository = new PaymentRepository();
