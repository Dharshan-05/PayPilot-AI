import { NextRequest } from "next/server";
import { agentContextBuilder } from "@/server/agent-context/context-builder";
import { CallerType } from "@/server/agent-context/types";
import {
  createSuccessResponse,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const { searchParams } = new URL(req.url);
    const callerType = (searchParams.get("callerType") as CallerType) || "ai_agent";
    const maxTools = searchParams.get("maxTools") ? parseInt(searchParams.get("maxTools")!, 10) : undefined;
    const maxCharacters = searchParams.get("maxCharacters") ? parseInt(searchParams.get("maxCharacters")!, 10) : undefined;
    const includeFinancial = searchParams.get("includeFinancial") === "true";
    const userId = searchParams.get("userId") || undefined;
    const sessionId = searchParams.get("sessionId") || undefined;

    const snapshot = await agentContextBuilder.buildContext({
      callerType,
      maxTools,
      maxCharacters,
      includeFinancial,
      userId,
      sessionId,
    });

    return createSuccessResponse(snapshot, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
