import { NextRequest } from "next/server";
import { recommendationRepository } from "@/server/db";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "ai_recommendations_list", "general");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const recs = await recommendationRepository.list({ type, priority, status, limit });

    const formatted = recs.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      priority: r.priority,
      confidence: Number(r.confidence),
      expectedImpact: r.expectedImpact,
      status: r.status,
      createdAt: r.createdAt,
    }));

    return createSuccessResponse(formatted, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
