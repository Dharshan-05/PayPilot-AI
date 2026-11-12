import { NextRequest } from "next/server";
import { z } from "zod";
import { productComparisonEngine } from "@/server/commerce/intelligence/comparison";
import {
  createSuccessResponse,
  createErrorResponse,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

const compareSchema = z.object({
  productIds: z
    .array(z.string().min(1))
    .min(2, "At least 2 product IDs are required for comparison")
    .max(5, "A maximum of 5 products can be compared at once"),
});

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const rawBody = await safeParseJson<any>(req);
    const validated = compareSchema.parse(rawBody);

    const comparison = await productComparisonEngine.compareProducts(validated.productIds);

    return createSuccessResponse(comparison, requestId, 200);
  } catch (err: any) {
    if (err.message && err.message.includes("does not exist in catalog")) {
      return createErrorResponse(
        "PRODUCT_NOT_FOUND",
        err.message,
        requestId,
        404
      );
    }
    return handleApiError(err, requestId);
  }
}
