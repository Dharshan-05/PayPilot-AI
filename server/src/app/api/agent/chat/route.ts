import { NextRequest } from "next/server";
import { z } from "zod";
import { commerceAgent } from "@/server/commerce/agent";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

const agentChatSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000, "Message exceeds 2000 characters"),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "agent_chat", "sensitive");
  if (limited) return limited;
  try {
    const rawBody = await safeParseJson<any>(req);
    const validated = agentChatSchema.parse(rawBody);

    const sessionId = validated.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const result = await commerceAgent.processMessage({
      message: validated.message,
      sessionId,
      userId: validated.userId,
      requestId,
    });

    return createSuccessResponse(result, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
