import { NextRequest } from "next/server";
import { dbRepository } from "@/server/db/repository";
import { createSuccessResponse, getRequestIdFromHeader, handleApiError } from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const rawLogs = await dbRepository.getRecentAuditLogs(limit);

    // Ensure safe redaction of internal fields
    const safeLogs = rawLogs.map((log) => ({
      id: log.id,
      requestId: log.requestId,
      operation: log.operation,
      provider: log.provider,
      model: log.model,
      status: log.status,
      latencyMs: log.latencyMs,
      promptSummary: log.promptSummary,
      responseSummary: log.responseSummary,
      createdAt: log.createdAt,
    }));

    return createSuccessResponse(safeLogs, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
