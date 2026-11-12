import { NextRequest } from "next/server";
import { searchManager } from "@/server/commerce/search/manager";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "products_reindex", "sensitive");
  if (limited) return limited;
  try {
    const result = await searchManager.reindexAll();
    return createSuccessResponse(result, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
