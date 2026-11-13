import { prisma } from "../client";
import { Prisma, Order } from "@prisma/client";

export class OrderRepository {
  async list(params?: { customerId?: string; status?: string; limit?: number; offset?: number }): Promise<Order[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));
    const offset = Math.max(0, params?.offset || 0);

    return prisma.order.findMany({
      where: {
        ...(params?.customerId && { customerId: params.customerId }),
        ...(params?.status && { status: params.status }),
      },
      include: {
        customer: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async findById(id: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        payments: {
          include: {
            transactions: true,
          },
        },
      },
    });
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: {
        customer: true,
        payments: true,
      },
    });
  }

  async findByPaypalOrderId(paypalOrderId: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { paypalOrderId },
      include: {
        customer: true,
        payments: true,
      },
    });
  }

  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return prisma.order.create({
      data,
      include: { customer: true },
    });
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async count(status?: string): Promise<number> {
    return prisma.order.count({
      where: status ? { status } : undefined,
    });
  }
}

export const orderRepository = new OrderRepository();
