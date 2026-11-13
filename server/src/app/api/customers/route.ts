import { NextRequest } from "next/server";
import { z } from "zod";
import { customerRepository } from "@/server/db";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  country: z.string().length(2).default("US"),
  externalId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "customers_list", "general");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const country = searchParams.get("country") || undefined;

    const [customers, totalCount] = await Promise.all([
      customerRepository.list({ limit, offset, search, status, country }),
      customerRepository.count(status),
    ]);

    const formatted = customers.map((c: any) => ({
      id: c.id,
      externalId: c.externalId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      country: c.country,
      status: c.status,
      totalSpent: Number(c.totalSpent),
      transactionCount: c.transactionCount,
      orderCount: c._count?.orders ?? 0,
      createdAt: c.createdAt,
    }));

    return createSuccessResponse({ customers: formatted, totalCount, limit, offset }, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "customers_create", "sensitive");
  if (limited) return limited;

  try {
    const rawBody = await safeParseJson<any>(req);
    const validated = createCustomerSchema.parse(rawBody);

    const externalId =
      validated.externalId || `CUST-${Date.now().toString(36).toUpperCase()}`;

    const customer = await customerRepository.create({
      externalId,
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      country: validated.country,
      status: "ACTIVE",
    });

    return createSuccessResponse(customer, requestId, 201);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
