import { NextRequest } from "next/server";
import { z } from "zod";
import { payPalService } from "@/server/paypal/service";
import { dbRepository } from "@/server/db/repository";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";
import { generateRequestId } from "@/server/observability/correlation";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const { searchParams } = new URL(req.url);
    const rawLimit = parseInt(searchParams.get("limit") || "25", 10);
    const statusFilter = searchParams.get("status")?.toUpperCase();

    const orders = await dbRepository.getRecentOrders(rawLimit);
    const filtered = statusFilter ? orders.filter((o: any) => o.status === statusFilter) : orders;

    const safeOrders = filtered.map((o: any) => ({
      id: o.id,
      internalReference: o.internalReference,
      paypalOrderId: o.paypalOrderId,
      paypalCaptureId: o.paypalCaptureId,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      customerEmail: o.customerEmail,
      description: o.description,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      proposal: o.proposal
        ? {
            id: o.proposal.id,
            proposalNumber: o.proposal.proposalNumber,
            quantity: o.proposal.quantity,
            unitAmount: o.proposal.unitAmount,
            totalAmount: o.proposal.totalAmount,
            status: o.proposal.status,
            product: o.proposal.product,
          }
        : null,
    }));

    return createSuccessResponse(safeOrders, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}

const createOrderSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.string().length(3).default("USD"),
  description: z.string().max(255).optional(),
  customerEmail: z.string().email("Invalid email format").optional(),
  internalReference: z.string().optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "orders_create", "sensitive");
  if (limited) return limited;
  try {
    const rawBody = await safeParseJson<any>(req);
    const validated = createOrderSchema.parse(rawBody);

    const internalRef =
      validated.internalReference ||
      `ORD-${Date.now().toString(36).toUpperCase()}-${generateRequestId("ref").slice(-4).toUpperCase()}`;

    const order = await payPalService.createOrder({
      internalReference: internalRef,
      amount: validated.amount,
      currency: validated.currency,
      description: validated.description,
      customerEmail: validated.customerEmail,
      returnUrl: validated.returnUrl,
      cancelUrl: validated.cancelUrl,
    });

    return createSuccessResponse(order, requestId, 201);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
