import { NextRequest } from "next/server";
import { transactionRepository } from "@/server/db";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "transactions_list", "general");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const status = searchParams.get("status") || undefined;
    const type = searchParams.get("type") || undefined;
    const riskLevel = searchParams.get("riskLevel") || undefined;
    const search = searchParams.get("search") || undefined;
    const customerId = searchParams.get("customerId") || undefined;

    const [transactions, totalCount] = await Promise.all([
      transactionRepository.list({
        limit,
        offset,
        status,
        type,
        riskLevel,
        search,
        customerId,
      }),
      transactionRepository.count({ status, type, riskLevel }),
    ]);

    const formatted = transactions.map((t: any) => ({
      id: t.id,
      paymentId: t.paymentId,
      customerId: t.customerId,
      paypalOrderId: t.paypalOrderId,
      paypalCaptureId: t.paypalCaptureId,
      type: t.type,
      status: t.status,
      amount: Number(t.amount),
      currency: t.currency,
      riskScore: t.riskScore,
      riskLevel: t.riskLevel,
      description: t.description,
      metadata: t.metadata ? JSON.parse(t.metadata) : null,
      transactionDate: t.transactionDate,
      customer: {
        id: t.customer.id,
        name: t.customer.name,
        email: t.customer.email,
        country: t.customer.country,
      },
      riskAssessment: t.riskAssessment
        ? {
            id: t.riskAssessment.id,
            score: t.riskAssessment.score,
            level: t.riskAssessment.level,
            model: t.riskAssessment.model,
            confidence: Number(t.riskAssessment.confidence),
          }
        : null,
      aiInsights: t.aiInsights.map((i: any) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        severity: i.severity,
      })),
    }));

    return createSuccessResponse({ transactions: formatted, totalCount, limit, offset }, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
