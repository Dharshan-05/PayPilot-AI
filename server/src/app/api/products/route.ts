import { NextRequest } from "next/server";
import { catalogService } from "@/server/commerce/catalog";
import {
  createSuccessResponse,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const minPrice = url.searchParams.get("minPrice")
      ? parseFloat(url.searchParams.get("minPrice")!)
      : undefined;
    const maxPrice = url.searchParams.get("maxPrice")
      ? parseFloat(url.searchParams.get("maxPrice")!)
      : undefined;
    const currency = url.searchParams.get("currency") || "USD";
    const inStockOnly = url.searchParams.get("inStockOnly") !== "false";
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!, 10)
      : 20;

    const products = await catalogService.searchProducts({
      query,
      category,
      minPrice,
      maxPrice,
      currency,
      inStockOnly,
      limit,
    });

    return createSuccessResponse(products, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
