import { NextRequest } from "next/server";
import { proposalService } from "@/server/commerce/proposal";
import {
  createSuccessResponse,
  createErrorResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "proposals_get", "general");
  if (limited) return limited;
  try {
    const { proposalId } = await context.params;
    const proposal = await proposalService.getProposalById(proposalId);

    if (!proposal) {
      return createErrorResponse(
        "NOT_FOUND",
        `Proposal with ID '${proposalId}' was not found`,
        requestId,
        404
      );
    }

    const isExpired = new Date() > proposal.expiresAt;

    return createSuccessResponse(
      {
        ...proposal,
        isExpired,
      },
      requestId
    );
  } catch (err) {
    return handleApiError(err, requestId);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "proposals_delete", "sensitive");
  if (limited) return limited;
  try {
    const { proposalId } = await context.params;
    const cancelled = await proposalService.cancelProposal(proposalId);
    return createSuccessResponse(cancelled, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
