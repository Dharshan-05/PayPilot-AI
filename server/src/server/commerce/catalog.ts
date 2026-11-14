import { prisma } from "../db/client";
import { Product, Prisma } from "@prisma/client";
import { Logger } from "../observability/logger";
import { executeDbWithFallback } from "../db/resilience";
import { fallbackStore, FallbackProduct } from "../db/fallback-store";

const log = new Logger("CatalogService");

export interface ProductSearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  inStockOnly?: boolean;
  limit?: number;
  offset?: number;
}

export const INITIAL_PRODUCTS: (Omit<Product, "id" | "createdAt" | "updatedAt" | "price" | "externalId" | "status"> & {
  price: number | Prisma.Decimal;
  externalId?: string | null;
  status?: string;
})[] = [
  {
    sku: "PROD-KB-001",
    name: "Logitech MX Mechanical Wireless Keyboard",
    description: "High-performance low-profile wireless mechanical keyboard with tactile quiet switches.",
    category: "keyboards",
    price: 79.99,
    currency: "USD",
    inventory: 45,
    isAvailable: true,
    metadata: JSON.stringify({ connectivity: "Bluetooth & Logi Bolt", batteryLife: "15 days", layout: "ANSI" }),
  },
  {
    sku: "PROD-KB-002",
    name: "Keychron K2 Wireless Mechanical Keyboard",
    description: "Compact 75% layout wireless mechanical keyboard with hot-swappable Gateron G Pro switches.",
    category: "keyboards",
    price: 69.99,
    currency: "USD",
    inventory: 30,
    isAvailable: true,
    metadata: JSON.stringify({ connectivity: "Bluetooth 5.1 & USB-C", switches: "Brown", backlight: "RGB" }),
  },
  {
    sku: "PROD-HP-001",
    name: "Sony WH-1000XM5 Wireless Headphones",
    description: "Industry-leading noise-canceling wireless headphones with dual processors and 8 microphones.",
    category: "audio",
    price: 299.99,
    currency: "USD",
    inventory: 18,
    isAvailable: true,
    metadata: JSON.stringify({ batteryLife: "30 hours", weight: "250g", codec: "LDAC, AAC, SBC" }),
  },
  {
    sku: "PROD-HP-002",
    name: "Anker Soundcore Space Q45 Headphones",
    description: "Adaptive active noise cancelling headphones with ultra-long 50-hour playtime.",
    category: "audio",
    price: 89.99,
    currency: "USD",
    inventory: 50,
    isAvailable: true,
    metadata: JSON.stringify({ batteryLife: "50 hours", hiResAudio: true, fastCharge: "5 min for 4 hours" }),
  },
  {
    sku: "PROD-MS-001",
    name: "Logitech MX Master 3S Wireless Mouse",
    description: "Ergonomic performance mouse with quiet clicks, 8K DPI sensor, and MagSpeed scrolling.",
    category: "mice",
    price: 59.99,
    currency: "USD",
    inventory: 60,
    isAvailable: true,
    metadata: JSON.stringify({ dpi: 8000, buttons: 7, scrollWheel: "MagSpeed Electromagnetic" }),
  },
  {
    sku: "PROD-DEV-001",
    name: "Developer Pro Cloud Pass (Annual)",
    description: "Full access pass to high-performance cloud developer sandboxes, APIs, and AI environments.",
    category: "software",
    price: 49.99,
    currency: "USD",
    inventory: 999,
    isAvailable: true,
    metadata: JSON.stringify({ tier: "Pro", duration: "1 Year", autoRenew: false }),
  },
  {
    sku: "PROD-MON-001",
    name: "Dell UltraSharp 27 4K USB-C Hub Monitor",
    description: "27-inch 4K UHD IPS Black monitor with 90W power delivery, RJ45 Ethernet, and wide color gamut.",
    category: "monitors",
    price: 449.99,
    currency: "USD",
    inventory: 12,
    isAvailable: true,
    metadata: JSON.stringify({ resolution: "3840 x 2160", panel: "IPS Black", refreshRate: "60Hz" }),
  },
  {
    sku: "PROD-OOS-001",
    name: "Limited Edition Retro Mechanical Keyboard",
    description: "Vintage aesthetics mechanical keyboard with customized keycaps. Sold out collector edition.",
    category: "keyboards",
    price: 129.99,
    currency: "USD",
    inventory: 0,
    isAvailable: false,
    metadata: JSON.stringify({ edition: "Numbered Collector Run", outOfStockReason: "Sold out" }),
  },
];

export class CatalogService {
  /**
   * Automatically seed product catalog if empty.
   */
  async ensureCatalogSeeded(): Promise<void> {
    try {
      await prisma.commerceProposal.deleteMany({
        where: { product: { sku: { startsWith: "RACE-ITEM-" } } },
      }).catch(() => {});
      await prisma.product.deleteMany({
        where: { sku: { startsWith: "RACE-ITEM-" } },
      }).catch(() => {});

      for (const prod of INITIAL_PRODUCTS) {
        await prisma.product.upsert({
          where: { sku: prod.sku },
          update: {
            name: prod.name,
            description: prod.description,
            category: prod.category,
            price: new Prisma.Decimal(prod.price as any),
            currency: prod.currency,
            inventory: prod.inventory,
            isAvailable: prod.isAvailable,
            metadata: prod.metadata,
          },
          create: {
            sku: prod.sku,
            name: prod.name,
            description: prod.description,
            category: prod.category,
            price: new Prisma.Decimal(prod.price as any),
            currency: prod.currency,
            inventory: prod.inventory,
            isAvailable: prod.isAvailable,
            metadata: prod.metadata,
          },
        });
      }
    } catch (err: any) {
      log.error("Failed to seed product catalog", err);
    }
  }

  /**
   * Search catalog products with filters, grounding AI in real inventory.
   */
  async searchProducts(params: ProductSearchParams = {}): Promise<Product[]> {
    const {
      query,
      category,
      minPrice,
      maxPrice,
      currency = "USD",
      inStockOnly = true,
      limit = 10,
      offset = 0,
    } = params;

    return executeDbWithFallback(
      async () => {
        await this.ensureCatalogSeeded();

        const where: any = {
          currency: currency.toUpperCase(),
        };

        if (inStockOnly) {
          where.isAvailable = true;
          where.inventory = { gt: 0 };
        }

        if (category) {
          where.category = { contains: category.toLowerCase() };
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
          where.price = {};
          if (minPrice !== undefined) where.price.gte = minPrice;
          if (maxPrice !== undefined) where.price.lte = maxPrice;
        }

        if (query && query.trim()) {
          const q = query.trim().toLowerCase();
          where.OR = [
            { name: { contains: q } },
            { description: { contains: q } },
            { category: { contains: q } },
            { sku: { contains: q } },
          ];
        }

        return prisma.product.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { price: "asc" },
        });
      },
      () => {
        fallbackStore.seed();
        let filtered = [...fallbackStore.products];

        if (currency) {
          filtered = filtered.filter((p) => p.currency.toUpperCase() === currency.toUpperCase());
        }

        if (inStockOnly) {
          filtered = filtered.filter((p) => p.isAvailable && p.inventory > 0);
        }

        if (category) {
          const cat = category.toLowerCase();
          filtered = filtered.filter((p) => p.category.toLowerCase().includes(cat));
        }

        if (minPrice !== undefined) {
          filtered = filtered.filter((p) => Number(p.price) >= minPrice);
        }

        if (maxPrice !== undefined) {
          filtered = filtered.filter((p) => Number(p.price) <= maxPrice);
        }

        if (query && query.trim()) {
          const q = query.trim().toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              p.category.toLowerCase().includes(q) ||
              p.sku.toLowerCase().includes(q)
          );
        }

        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        return filtered.slice(offset, offset + limit) as any;
      },
      "searchProducts"
    );
  }

  async getProductById(id: string): Promise<Product | null> {
    return executeDbWithFallback(
      () =>
        prisma.product.findUnique({
          where: { id },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.products.find((p) => p.id === id || p.sku === id) as any) || null;
      },
      "getProductById"
    );
  }

  async getProductBySku(sku: string): Promise<Product | null> {
    return executeDbWithFallback(
      () =>
        prisma.product.findUnique({
          where: { sku },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.products.find((p) => p.sku === sku) as any) || null;
      },
      "getProductBySku"
    );
  }

  async updateProductPrice(id: string, newPrice: number): Promise<Product> {
    return executeDbWithFallback(
      () =>
        prisma.product.update({
          where: { id },
          data: { price: newPrice },
        }),
      () => {
        fallbackStore.seed();
        const p = fallbackStore.products.find((prod) => prod.id === id || prod.sku === id);
        if (p) {
          p.price = new Prisma.Decimal(newPrice);
          return p as any;
        }
        throw new Error(`Product ${id} not found in fallback catalog`);
      },
      "updateProductPrice"
    );
  }

  async updateProductInventory(id: string, newInventory: number, isAvailable?: boolean): Promise<Product> {
    return executeDbWithFallback(
      () =>
        prisma.product.update({
          where: { id },
          data: {
            inventory: newInventory,
            ...(isAvailable !== undefined
              ? { isAvailable }
              : { isAvailable: newInventory > 0 }),
          },
        }),
      () => {
        fallbackStore.seed();
        const p = fallbackStore.products.find((prod) => prod.id === id || prod.sku === id);
        if (p) {
          p.inventory = newInventory;
          p.isAvailable = isAvailable !== undefined ? isAvailable : newInventory > 0;
          return p as any;
        }
        throw new Error(`Product ${id} not found in fallback catalog`);
      },
      "updateProductInventory"
    );
  }
}

export const catalogService = new CatalogService();
