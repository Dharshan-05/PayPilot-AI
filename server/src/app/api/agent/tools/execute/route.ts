import { NextRequest } from "next/server";
import { toolExecutionEngine } from "@/server/agent-context/executor";
import { toolIntentSchema } from "@/server/agent-context/types";
import {
  createSuccessResponse,
  createErrorResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "tools_execute", "sensitive");
  if (limited) return limited;
  try {
    const rawBody = await safeParseJson<any>(req);
    const parsedIntent = toolIntentSchema.parse({
      ...rawBody,
      requestId: rawBody?.requestId || requestId,
    });

    const result = await toolExecutionEngine.execute(parsedIntent);

    if (!result.success && result.error?.code === "UNAUTHORIZED_OPERATION") {
      return createErrorResponse(
        "FORBIDDEN_OPERATION",
        result.error.message,
        requestId,
        403,
        {
          capabilityId: result.capabilityId,
          operation: result.operation,
          confirmationRequired: result.confirmationRequired,
          details: result.error.details,
        }
      );
    }

    return createSuccessResponse(result, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
