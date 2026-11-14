import { prisma } from "../client";
import { Prisma, Product } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

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

    return executeDbWithFallback(
      () =>
        prisma.product.findMany({
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
        }),
      () => {
        fallbackStore.seed();
        let items = [...fallbackStore.products];
        if (params?.category) items = items.filter((p) => p.category.toLowerCase().includes(params.category!.toLowerCase()));
        if (params?.status) items = items.filter((p) => p.status === params.status);
        if (params?.inStockOnly) items = items.filter((p) => p.isAvailable && p.inventory > 0);
        if (params?.search) {
          const s = params.search.toLowerCase();
          items = items.filter((p) => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
        }
        return items.slice(offset, offset + limit) as any;
      },
      "product.list"
    );
  }

  async findById(id: string): Promise<Product | null> {
    return executeDbWithFallback(
      () =>
        prisma.product.findUnique({
          where: { id },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.products.find((p) => p.id === id || p.sku === id) as any) || null;
      },
      "product.findById"
    );
  }

  async findBySku(sku: string): Promise<Product | null> {
    return executeDbWithFallback(
      () =>
        prisma.product.findUnique({
          where: { sku },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.products.find((p) => p.sku === sku) as any) || null;
      },
      "product.findBySku"
    );
  }

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return executeDbWithFallback(
      () => prisma.product.create({ data }),
      () => {
        fallbackStore.seed();
        const now = new Date();
        const newProd: any = {
          id: `prod-uuid-${Date.now().toString(36)}`,
          sku: data.sku,
          externalId: data.externalId || null,
          name: data.name,
          description: data.description,
          category: data.category,
          price: new Prisma.Decimal(data.price as any),
          currency: data.currency || "USD",
          inventory: data.inventory || 0,
          status: data.status || "ACTIVE",
          isAvailable: data.isAvailable !== false,
          metadata: data.metadata || null,
          createdAt: now,
          updatedAt: now,
        };
        fallbackStore.products.unshift(newProd);
        return newProd;
      },
      "product.create"
    );
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return executeDbWithFallback(
      () =>
        prisma.product.update({
          where: { id },
          data,
        }),
      () => {
        fallbackStore.seed();
        const prod = fallbackStore.products.find((p) => p.id === id || p.sku === id);
        if (prod) {
          if (data.name) prod.name = data.name as string;
          if (data.price) prod.price = new Prisma.Decimal(data.price as any);
          if (data.inventory !== undefined) prod.inventory = data.inventory as number;
          if (data.isAvailable !== undefined) prod.isAvailable = data.isAvailable as boolean;
          prod.updatedAt = new Date();
          return prod as any;
        }
        throw new Error(`Product ${id} not found in fallback store`);
      },
      "product.update"
    );
  }

  async decrementInventory(id: string, quantity: number): Promise<Product> {
    return executeDbWithFallback(
      async () => {
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
      },
      () => {
        fallbackStore.seed();
        const prod = fallbackStore.products.find((p) => p.id === id || p.sku === id);
        if (!prod) throw new Error(`Product ${id} not found`);
        prod.inventory = Math.max(0, prod.inventory - quantity);
        prod.isAvailable = prod.inventory > 0;
        prod.status = prod.inventory === 0 ? "OUT_OF_STOCK" : prod.status;
        prod.updatedAt = new Date();
        return prod as any;
      },
      "product.decrementInventory"
    );
  }

  async count(category?: string): Promise<number> {
    return executeDbWithFallback(
      () =>
        prisma.product.count({
          where: category ? { category } : undefined,
        }),
      () => {
        fallbackStore.seed();
        return category
          ? fallbackStore.products.filter((p) => p.category.toLowerCase().includes(category.toLowerCase())).length
          : fallbackStore.products.length;
      },
      "product.count"
    );
  }
}

export const productRepository = new ProductRepository();
