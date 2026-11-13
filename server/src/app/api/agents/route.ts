import { NextRequest } from "next/server";
import { agentRepository } from "@/server/db";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "agents_list", "general");
  if (limited) return limited;

  try {
    const agents = await agentRepository.list();

    const formatted = agents.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      description: a.description,
      status: a.status,
      lastRunAt: a.lastRunAt,
      totalRuns: a._count?.runs ?? 0,
      recentRuns: a.runs?.map((r: any) => ({
        id: r.id,
        status: r.status,
        input: r.input,
        output: r.output,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        error: r.error,
      })) ?? [],
    }));

    return createSuccessResponse(formatted, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
