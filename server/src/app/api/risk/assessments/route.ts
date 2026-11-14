import { NextRequest } from "next/server";
import { riskRepository } from "@/server/db";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "risk_assessments_list", "general");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") || undefined;
    const minScore = searchParams.get("minScore") ? parseInt(searchParams.get("minScore")!, 10) : undefined;
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const [assessments, overview] = await Promise.all([
      riskRepository.list({ level, minScore, limit }),
      riskRepository.getOverview(),
    ]);

    const formatted = assessments.map((ra: any) => ({
      id: ra.id,
      transactionId: ra.transactionId,
      score: ra.score,
      level: ra.level,
      reasons: JSON.parse(ra.reasons || "[]"),
      model: ra.model,
      confidence: Number(ra.confidence),
      createdAt: ra.createdAt,
      transaction: {
        id: ra.transaction.id,
        amount: Number(ra.transaction.amount),
        currency: ra.transaction.currency,
        status: ra.transaction.status,
        description: ra.transaction.description,
        customer: {
          name: ra.transaction.customer.name,
          email: ra.transaction.customer.email,
        },
      },
    }));

    return createSuccessResponse({ assessments: formatted, overview }, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
