import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { proposalService } from "@/server/commerce/proposal";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const { searchParams } = new URL(req.url);
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 20;
    const status = searchParams.get("status")?.toUpperCase();

    const proposals = await prisma.commerceProposal.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { product: true },
    });

    const enriched = proposals.map((p) => ({
      ...p,
      isExpired: new Date() > p.expiresAt,
    }));

    return createSuccessResponse(enriched, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}

const createProposalSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive().default(1),
  userId: z.string().optional(),
  conversationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "proposals_create", "sensitive");
  if (limited) return limited;
  try {
    const rawBody = await safeParseJson<any>(req);
    const validated = createProposalSchema.parse(rawBody);

    const proposal = await proposalService.createProposal({
      productId: validated.productId,
      quantity: validated.quantity,
      userId: validated.userId,
      conversationId: validated.conversationId,
    });

    return createSuccessResponse(proposal, requestId, 201);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
