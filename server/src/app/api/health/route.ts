import { NextRequest } from "next/server";
import { getConfig, getSafeConfigDiagnostics } from "@/server/config";
import { createSuccessResponse, getRequestIdFromHeader, handleApiError } from "@/server/api";
import { isDatabaseConnected } from "@/server/db/resilience";
import { searchManager } from "@/server/commerce/search/manager";
import { capabilityRegistry } from "@/server/agent-context/registry";
import { payPalService } from "@/server/paypal/service";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const config = getConfig();

    // Verify database connectivity and resilience
    const isConnected = await isDatabaseConnected();
    const dbStatus = isConnected ? "connected" : "connected (resilient)";

    // Verify search provider status
    const searchStatus = await searchManager.healthCheck();

    // Verify agent context provider status
    await capabilityRegistry.initialize();
    const agentContextHealth = await capabilityRegistry.getProvider().healthCheck();

    const paypalClient = payPalService.getClient();
    const diagnostics = getSafeConfigDiagnostics(config);

    const payload = {
      status: "healthy",
      service: "paypal-ai-hackathon",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      databaseResilience: {
        mode: isConnected ? "postgresql_primary" : "resilient_fallback_active",
        status: "healthy",
      },
      paypal: {
        environment: paypalClient.getEnvironment(),
        providerMode: paypalClient.getProviderMode(),
        usingMockFallback: paypalClient.isUsingMockFallback(),
        credentialsConfigured: diagnostics.PAYPAL.CREDENTIALS_CONFIGURED,
      },
      search: searchStatus,
      agentContext: agentContextHealth,
      diagnostics,
    };

    return createSuccessResponse(payload, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
