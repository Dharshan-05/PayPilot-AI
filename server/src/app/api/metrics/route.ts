import { NextRequest } from "next/server";
import { metricRepository } from "@/server/db";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "metrics_list", "general");
  if (limited) return limited;

  try {
    const metrics = await metricRepository.getLatestMetrics();

    const formatted = metrics.map((m) => ({
      id: m.id,
      metric: m.metric,
      value: Number(m.value),
      previousValue: m.previousValue ? Number(m.previousValue) : null,
      changePercent: m.changePercent ? Number(m.changePercent) : null,
      period: m.period,
      recordedAt: m.recordedAt,
    }));

    return createSuccessResponse(formatted, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
