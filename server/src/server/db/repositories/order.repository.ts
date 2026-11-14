import { prisma } from "../client";
import { Prisma, Order } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class OrderRepository {
  async list(params?: { customerId?: string; status?: string; limit?: number; offset?: number }): Promise<Order[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));
    const offset = Math.max(0, params?.offset || 0);

    return executeDbWithFallback(
      () =>
        prisma.order.findMany({
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
        }),
      () => {
        fallbackStore.seed();
        let items = [...fallbackStore.orders];
        if (params?.customerId) items = items.filter((o) => o.customerId === params.customerId);
        if (params?.status) items = items.filter((o) => o.status === params.status);
        return items.slice(offset, offset + limit) as any;
      },
      "order.list"
    );
  }

  async findById(id: string): Promise<Order | null> {
    return executeDbWithFallback(
      () =>
        prisma.order.findUnique({
          where: { id },
          include: {
            customer: true,
            payments: {
              include: {
                transactions: true,
              },
            },
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.orders.find((o) => o.id === id) as any) || null;
      },
      "order.findById"
    );
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return executeDbWithFallback(
      () =>
        prisma.order.findUnique({
          where: { orderNumber },
          include: {
            customer: true,
            payments: true,
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.orders.find((o) => o.orderNumber === orderNumber) as any) || null;
      },
      "order.findByOrderNumber"
    );
  }

  async findByPaypalOrderId(paypalOrderId: string): Promise<Order | null> {
    return executeDbWithFallback(
      () =>
        prisma.order.findUnique({
          where: { paypalOrderId },
          include: {
            customer: true,
            payments: true,
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.orders.find((o) => o.paypalOrderId === paypalOrderId) as any) || null;
      },
      "order.findByPaypalOrderId"
    );
  }

  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return executeDbWithFallback(
      () =>
        prisma.order.create({
          data,
          include: { customer: true },
        }),
      () => {
        fallbackStore.seed();
        const now = new Date();
        const customer = fallbackStore.customers.find((c) => c.id === data.customer.connect?.id) || fallbackStore.customers[0];
        const newOrder: any = {
          id: `ord-uuid-${Date.now().toString(36)}`,
          orderNumber: data.orderNumber,
          customerId: customer.id,
          status: data.status || "PENDING",
          amount: new Prisma.Decimal(data.amount as any),
          currency: data.currency || "USD",
          paypalOrderId: data.paypalOrderId || null,
          createdAt: now,
          updatedAt: now,
          customer,
        };
        fallbackStore.orders.unshift(newOrder);
        return newOrder;
      },
      "order.create"
    );
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    return executeDbWithFallback(
      () =>
        prisma.order.update({
          where: { id },
          data: { status },
        }),
      () => {
        fallbackStore.seed();
        const order = fallbackStore.orders.find((o) => o.id === id);
        if (order) {
          order.status = status;
          order.updatedAt = new Date();
          return order as any;
        }
        throw new Error(`Order ${id} not found in fallback store`);
      },
      "order.updateStatus"
    );
  }

  async count(status?: string): Promise<number> {
    return executeDbWithFallback(
      () =>
        prisma.order.count({
          where: status ? { status } : undefined,
        }),
      () => {
        fallbackStore.seed();
        return status
          ? fallbackStore.orders.filter((o) => o.status === status).length
          : fallbackStore.orders.length;
      },
      "order.count"
    );
  }
}

export const orderRepository = new OrderRepository();
