import { prisma } from "../client";
import { Prisma, Product } from "@prisma/client";

export class ProductRepository {
  async list(params?: {
    category?: string;
    inStockOnly?: boolean;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));
    const offset = Math.max(0, params?.offset || 0);

    return prisma.product.findMany({
      where: {
        ...(params?.category && { category: params.category }),
        ...(params?.status && { status: params.status }),
        ...(params?.inStockOnly && { inventory: { gt: 0 }, isAvailable: true }),
        ...(params?.search && {
          OR: [
            { name: { contains: params.search, mode: "insensitive" } },
            { description: { contains: params.search, mode: "insensitive" } },
            { sku: { contains: params.search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
    });
  }

  async findBySku(sku: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { sku },
    });
  }

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return prisma.product.create({ data });
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data,
    });
  }

  async decrementInventory(id: string, quantity: number): Promise<Product> {
    const current = await this.findById(id);
    if (!current) throw new Error(`Product ${id} not found`);

    const newInventory = Math.max(0, current.inventory - quantity);
    return prisma.product.update({
      where: { id },
      data: {
        inventory: newInventory,
        isAvailable: newInventory > 0,
        status: newInventory === 0 ? "OUT_OF_STOCK" : current.status,
      },
    });
  }

  async count(category?: string): Promise<number> {
    return prisma.product.count({
      where: category ? { category } : undefined,
    });
  }
}

export const productRepository = new ProductRepository();
