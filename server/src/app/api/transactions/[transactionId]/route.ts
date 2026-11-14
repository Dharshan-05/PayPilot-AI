import { NextRequest } from "next/server";
import { transactionRepository } from "@/server/db";
import {
  createErrorResponse,
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "transaction_detail", "general");
  if (limited) return limited;

  try {
    const { transactionId } = await params;
    const tx = await transactionRepository.findById(transactionId);
    if (!tx) {
      return createErrorResponse(
        "NOT_FOUND",
        `Transaction with ID '${transactionId}' not found.`,
        requestId,
        404
      );
    }

    const formatted = {
      id: tx.id,
      paymentId: tx.paymentId,
      customerId: tx.customerId,
      paypalOrderId: tx.paypalOrderId,
      paypalCaptureId: tx.paypalCaptureId,
      type: tx.type,
      status: tx.status,
      amount: Number(tx.amount),
      currency: tx.currency,
      riskScore: tx.riskScore,
      riskLevel: tx.riskLevel,
      description: tx.description,
      metadata: tx.metadata ? JSON.parse(tx.metadata) : null,
      transactionDate: tx.transactionDate,
      createdAt: tx.createdAt,
      customer: {
        id: tx.customer.id,
        name: tx.customer.name,
        email: tx.customer.email,
        phone: tx.customer.phone,
        country: tx.customer.country,
      },
      payment: tx.payment
        ? {
            id: tx.payment.id,
            status: tx.payment.status,
            paymentMethod: tx.payment.paymentMethod,
            payerEmail: tx.payment.payerEmail,
            capturedAt: tx.payment.capturedAt,
          }
        : null,
      riskAssessment: tx.riskAssessment
        ? {
            id: tx.riskAssessment.id,
            score: tx.riskAssessment.score,
            level: tx.riskAssessment.level,
            model: tx.riskAssessment.model,
            confidence: Number(tx.riskAssessment.confidence),
            reasons: JSON.parse(tx.riskAssessment.reasons || "[]"),
          }
        : null,
      aiInsights: tx.aiInsights.map((i: any) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        summary: i.summary,
        severity: i.severity,
        recommendation: i.recommendation,
      })),
    };

    return createSuccessResponse(formatted, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
