import { prisma } from "../client";
import { Prisma, Customer } from "@prisma/client";

export class CustomerRepository {
  async list(params?: { search?: string; status?: string; country?: string; limit?: number; offset?: number }): Promise<Customer[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));
    const offset = Math.max(0, params?.offset || 0);

    return prisma.customer.findMany({
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
    });
  }

  async findById(id: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        orders: { take: 5, orderBy: { createdAt: "desc" } },
        transactions: { take: 10, orderBy: { transactionDate: "desc" } },
      },
    });
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { email },
    });
  }

  async findByExternalId(externalId: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { externalId },
    });
  }

  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return prisma.customer.create({ data });
  }

  async update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return prisma.customer.update({
      where: { id },
      data,
    });
  }

  async count(status?: string): Promise<number> {
    return prisma.customer.count({
      where: status ? { status } : undefined,
    });
  }

  async incrementSpend(id: string, amount: number): Promise<Customer> {
    return prisma.customer.update({
      where: { id },
      data: {
        totalSpent: { increment: new Prisma.Decimal(amount) },
        transactionCount: { increment: 1 },
      },
    });
  }
}

export const customerRepository = new CustomerRepository();
