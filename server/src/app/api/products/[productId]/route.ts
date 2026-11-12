import { NextRequest } from "next/server";
import { catalogService } from "@/server/commerce/catalog";
import {
  createSuccessResponse,
  createErrorResponse,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const { productId } = await context.params;
    const product = await catalogService.getProductById(productId);

    if (!product) {
      return createErrorResponse(
        "NOT_FOUND",
        `Product with ID '${productId}' was not found`,
        requestId,
        404
      );
    }

    return createSuccessResponse(product, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
