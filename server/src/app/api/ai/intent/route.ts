import { NextRequest } from "next/server";
import { z } from "zod";
import { aiService } from "@/server/ai/service";
import {
  createSuccessResponse,
  createErrorResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

const intentRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty").max(1000, "Prompt exceeds 1000 characters"),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "ai_intent", "sensitive");
  if (limited) return limited;
  try {
    const rawBody = await safeParseJson<any>(req);
    const validated = intentRequestSchema.parse(rawBody);

    const result = await aiService.processIntent({
      prompt: validated.prompt,
      userId: validated.userId,
      requestId,
    });

    return createSuccessResponse(result, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
