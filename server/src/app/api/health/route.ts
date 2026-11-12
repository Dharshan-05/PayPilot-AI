import { NextRequest } from "next/server";
import { getConfig, getSafeConfigDiagnostics } from "@/server/config";
import { createSuccessResponse, getRequestIdFromHeader, handleApiError } from "@/server/api";
import { prisma } from "@/server/db/client";
import { searchManager } from "@/server/commerce/search/manager";
import { capabilityRegistry } from "@/server/agent-context/registry";
import { payPalService } from "@/server/paypal/service";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const config = getConfig();

    // Verify database connectivity
    let dbStatus = "connected";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "disconnected";
    }

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
