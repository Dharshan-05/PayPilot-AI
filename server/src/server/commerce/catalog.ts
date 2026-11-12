import { prisma } from "../db/client";
import { Product } from "@prisma/client";
import { Logger } from "../observability/logger";

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

export const INITIAL_PRODUCTS: Omit<Product, "id" | "createdAt" | "updatedAt">[] = [
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
      const count = await prisma.product.count();
      if (count === 0) {
        log.info("Product catalog empty. Seeding initial products...");
        for (const prod of INITIAL_PRODUCTS) {
          await prisma.product.upsert({
            where: { sku: prod.sku },
            update: {},
            create: prod,
          });
        }
        log.info("Product catalog successfully seeded", { seededCount: INITIAL_PRODUCTS.length });
      }
    } catch (err: any) {
      log.error("Failed to seed product catalog", err);
    }
  }

  /**
   * Search catalog products with filters, grounding AI in real inventory.
   */
  async searchProducts(params: ProductSearchParams = {}): Promise<Product[]> {
    await this.ensureCatalogSeeded();

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
  }

  async getProductById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
    });
  }

  async getProductBySku(sku: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { sku },
    });
  }

  async updateProductPrice(id: string, newPrice: number): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: { price: newPrice },
    });
  }

  async updateProductInventory(id: string, newInventory: number, isAvailable?: boolean): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: {
        inventory: newInventory,
        ...(isAvailable !== undefined
          ? { isAvailable }
          : { isAvailable: newInventory > 0 }),
      },
    });
  }
}

export const catalogService = new CatalogService();
