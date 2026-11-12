import { NextRequest } from "next/server";
import { z } from "zod";
import { productAlternativesEngine } from "@/server/commerce/intelligence/alternatives";
import {
  createSuccessResponse,
  createErrorResponse,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

const similarSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  maxBudget: z.number().positive().optional(),
  inStockOnly: z.boolean().default(true),
  limit: z.number().int().min(1).max(10).default(4),
});

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const rawBody = await safeParseJson<any>(req);
    const validated = similarSchema.parse(rawBody);

    const similar = await productAlternativesEngine.findSimilarProducts(validated.productId, {
      maxBudget: validated.maxBudget,
      inStockOnly: validated.inStockOnly,
      limit: validated.limit,
    });

    return createSuccessResponse(similar, requestId, 200);
  } catch (err: any) {
    if (err.message && err.message.includes("not found")) {
      return createErrorResponse("PRODUCT_NOT_FOUND", err.message, requestId, 404);
    }
    return handleApiError(err, requestId);
  }
}
