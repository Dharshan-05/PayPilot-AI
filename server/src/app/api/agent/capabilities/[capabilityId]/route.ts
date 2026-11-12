import { NextRequest } from "next/server";
import { capabilityRegistry } from "@/server/agent-context/registry";
import {
  createSuccessResponse,
  createErrorResponse,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ capabilityId: string }> }
) {
  const requestId = getRequestIdFromHeader(req);
  try {
    await capabilityRegistry.initialize();
    const { capabilityId } = await context.params;
    const capability = capabilityRegistry.get(capabilityId);

    if (!capability) {
      return createErrorResponse(
        "NOT_FOUND",
        `Capability with ID or operation '${capabilityId}' was not found`,
        requestId,
        404
      );
    }

    return createSuccessResponse(capability, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
