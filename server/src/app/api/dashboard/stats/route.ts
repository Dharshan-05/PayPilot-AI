import { NextRequest } from "next/server";
import { dashboardRepository } from "@/server/db";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "dashboard_stats", "general");
  if (limited) return limited;

  try {
    const summary = await dashboardRepository.getDashboardSummary();
    return createSuccessResponse(summary, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
