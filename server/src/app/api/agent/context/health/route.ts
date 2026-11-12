import { NextRequest } from "next/server";
import { capabilityRegistry } from "@/server/agent-context/registry";
import {
  createSuccessResponse,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    await capabilityRegistry.initialize();
    const providerHealth = await capabilityRegistry.getProvider().healthCheck();

    return createSuccessResponse(
      {
        status: providerHealth.status,
        provider: providerHealth.provider,
        capabilitiesRegistered: capabilityRegistry.getAll().length,
        capabilitiesEnabled: capabilityRegistry.getEnabled().length,
        latencyMs: providerHealth.latencyMs,
        details: providerHealth.details,
      },
      requestId
    );
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
