import { NextRequest } from "next/server";
import { insightRepository } from "@/server/db";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "ai_insights_list", "general");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const insights = await insightRepository.list({ type, severity, status, limit });

    const formatted = insights.map((i) => ({
      id: i.id,
      transactionId: i.transactionId,
      type: i.type,
      title: i.title,
      summary: i.summary,
      severity: i.severity,
      confidence: Number(i.confidence),
      recommendation: i.recommendation,
      status: i.status,
      createdAt: i.createdAt,
      customer: i.transaction?.customer
        ? {
            name: i.transaction.customer.name,
            email: i.transaction.customer.email,
          }
        : null,
    }));

    return createSuccessResponse(formatted, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
