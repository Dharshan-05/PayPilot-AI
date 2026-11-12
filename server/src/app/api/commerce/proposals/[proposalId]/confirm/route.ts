import { NextRequest } from "next/server";
import { z } from "zod";
import { proposalService } from "@/server/commerce/proposal";
import { Logger } from "@/server/observability/logger";
import {
  createSuccessResponse,
  createErrorResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

const log = new Logger("ConfirmProposalRoute");

const confirmSchema = z.object({
  caller: z.enum(["human_user", "ai_agent"]).default("human_user"),
  userConfirmed: z.boolean().refine((val) => val === true, {
    message: "Explicit user confirmation is mandatory to authorize payment execution",
  }),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "proposals_confirm", "sensitive");
  if (limited) return limited;
  try {
    const { proposalId } = await context.params;
    let rawBody: any = {};
    try {
      if (typeof req.json === "function") {
        rawBody = await req.json();
      } else {
        rawBody = await safeParseJson<any>(req);
      }
    } catch (e: any) {
      log.warn("Failed to parse request JSON", { error: e.message });
      rawBody = {};
    }

    // 1. Hard Security Boundary Check: Rejects immediately if caller is AI
    if (rawBody?.caller === "ai_agent") {
      return createErrorResponse(
        "FORBIDDEN_AI_ACTION",
        "SECURITY VIOLATION: AI agent cannot authorize payment execution. Only human users can authorize checkout.",
        requestId,
        403
      );
    }

    const validated = confirmSchema.safeParse(rawBody);
    if (!validated.success) {
      const issues = validated.error.issues || (validated.error as any).errors || [];
      const errorMsg = issues.map((e: any) => e.message).join(", ");
      return createErrorResponse(
        "AUTHORIZATION_REQUIRED",
        errorMsg || "Explicit human user confirmation required to execute financial transaction.",
        requestId,
        400
      );
    }

    const caller = validated.data.caller;
    const result = await proposalService.confirmProposal(proposalId, caller);

    return createSuccessResponse(result, requestId, 200);
  } catch (err: any) {
    if (err.name === "ProposalExpiredError") {
      return createErrorResponse(
        "PROPOSAL_EXPIRED",
        err.message,
        requestId,
        410
      );
    }

    if (err.name === "PriceMismatchError") {
      return createErrorResponse(
        "PRICE_MISMATCH",
        err.message,
        requestId,
        409
      );
    }

    if (err.name === "InventoryUnavailableError") {
      return createErrorResponse(
        "INVENTORY_UNAVAILABLE",
        err.message,
        requestId,
        409
      );
    }

    if (err.name === "ProposalInvalidStateError") {
      return createErrorResponse(
        "INVALID_STATE",
        err.message,
        requestId,
        400
      );
    }

    return handleApiError(err, requestId);
  }
}
