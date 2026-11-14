import { prisma } from "../client";
import { Prisma, Customer } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class CustomerRepository {
  async list(params?: { search?: string; status?: string; country?: string; limit?: number; offset?: number }): Promise<Customer[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));
    const offset = Math.max(0, params?.offset || 0);

    return executeDbWithFallback(
      () =>
        prisma.customer.findMany({
          where: {
            ...(params?.status && { status: params.status }),
            ...(params?.country && { country: params.country }),
            ...(params?.search && {
              OR: [
                { name: { contains: params.search, mode: "insensitive" } },
                { email: { contains: params.search, mode: "insensitive" } },
                { externalId: { contains: params.search, mode: "insensitive" } },
              ],
            }),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            _count: {
              select: { orders: true, payments: true, transactions: true },
            },
          },
        }),
      () => {
        fallbackStore.seed();
        let items = [...fallbackStore.customers];
        if (params?.status) items = items.filter((c) => c.status === params.status);
        if (params?.country) items = items.filter((c) => c.country === params.country);
        if (params?.search) {
          const s = params.search.toLowerCase();
          items = items.filter((c) => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.externalId.toLowerCase().includes(s));
        }
        return items.slice(offset, offset + limit) as any;
      },
      "customer.list"
    );
  }

  async findById(id: string): Promise<Customer | null> {
    return executeDbWithFallback(
      () =>
        prisma.customer.findUnique({
          where: { id },
          include: {
            orders: { take: 5, orderBy: { createdAt: "desc" } },
            transactions: { take: 10, orderBy: { transactionDate: "desc" } },
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.customers.find((c) => c.id === id) as any) || null;
      },
      "customer.findById"
    );
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return executeDbWithFallback(
      () =>
        prisma.customer.findUnique({
          where: { email },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.customers.find((c) => c.email.toLowerCase() === email.toLowerCase()) as any) || null;
      },
      "customer.findByEmail"
    );
  }

  async findByExternalId(externalId: string): Promise<Customer | null> {
    return executeDbWithFallback(
      () =>
        prisma.customer.findUnique({
          where: { externalId },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.customers.find((c) => c.externalId === externalId) as any) || null;
      },
      "customer.findByExternalId"
    );
  }

  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return executeDbWithFallback(
      () => prisma.customer.create({ data }),
      () => {
        fallbackStore.seed();
        const now = new Date();
        const newCust: any = {
          id: `cust-uuid-${Date.now().toString(36)}`,
          externalId: data.externalId,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          country: data.country || "US",
          status: data.status || "ACTIVE",
          totalSpent: new Prisma.Decimal(0),
          transactionCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        fallbackStore.customers.unshift(newCust);
        return newCust;
      },
      "customer.create"
    );
  }

  async update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return executeDbWithFallback(
      () =>
        prisma.customer.update({
          where: { id },
          data,
        }),
      () => {
        fallbackStore.seed();
        const cust = fallbackStore.customers.find((c) => c.id === id);
        if (cust) {
          if (data.name) cust.name = data.name as string;
          if (data.status) cust.status = data.status as string;
          cust.updatedAt = new Date();
          return cust as any;
        }
        throw new Error(`Customer ${id} not found in fallback store`);
      },
      "customer.update"
    );
  }

  async count(status?: string): Promise<number> {
    return executeDbWithFallback(
      () =>
        prisma.customer.count({
          where: status ? { status } : undefined,
        }),
      () => {
        fallbackStore.seed();
        return status
          ? fallbackStore.customers.filter((c) => c.status === status).length
          : fallbackStore.customers.length;
      },
      "customer.count"
    );
  }

  async incrementSpend(id: string, amount: number): Promise<Customer> {
    return executeDbWithFallback(
      () =>
        prisma.customer.update({
          where: { id },
          data: {
            totalSpent: { increment: new Prisma.Decimal(amount) },
            transactionCount: { increment: 1 },
          },
        }),
      () => {
        fallbackStore.seed();
        const cust = fallbackStore.customers.find((c) => c.id === id);
        if (cust) {
          cust.totalSpent = new Prisma.Decimal(Number(cust.totalSpent) + amount);
          cust.transactionCount += 1;
          cust.updatedAt = new Date();
          return cust as any;
        }
        throw new Error(`Customer ${id} not found in fallback store`);
      },
      "customer.incrementSpend"
    );
  }
}

export const customerRepository = new CustomerRepository();
