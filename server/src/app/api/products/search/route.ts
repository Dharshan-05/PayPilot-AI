import { NextRequest } from "next/server";
import { intelligentSearchEngine, ProductSortOption } from "@/server/commerce/intelligence/search";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "products_search", "general");
  if (limited) return limited;
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const parseNum = (val: string | null) => {
      if (!val) return undefined;
      const parsed = parseFloat(val);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const minPrice = parseNum(url.searchParams.get("minPrice"));
    const maxPrice = parseNum(url.searchParams.get("maxPrice"));
    const currency = url.searchParams.get("currency") || "USD";
    const useCase = url.searchParams.get("useCase") || undefined;
    const mode = (url.searchParams.get("mode") as any) || undefined;
    const sort = (url.searchParams.get("sort") as ProductSortOption) || "relevance";
    const inStockOnly = url.searchParams.get("inStockOnly") !== "false";
    const page = parseNum(url.searchParams.get("page")) || 1;
    const limit = parseNum(url.searchParams.get("limit")) || 10;

    const rawFeatures = url.searchParams.get("features");
    const features = rawFeatures ? rawFeatures.split(",").map((f) => f.trim()) : undefined;

    const response = await intelligentSearchEngine.search({
      query,
      category,
      minPrice,
      maxPrice,
      currency,
      useCase,
      features,
      mode,
      sort,
      inStockOnly,
      page,
      limit,
    });

    return createSuccessResponse(response, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
