import { NextRequest } from "next/server";
import { capabilityRegistry } from "@/server/agent-context/registry";
import { CallerType, CapabilityCategory, RiskLevel } from "@/server/agent-context/types";
import {
  createSuccessResponse,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    await capabilityRegistry.initialize();
    const { searchParams } = new URL(req.url);

    const callerType = searchParams.get("callerType") as CallerType | null;
    const category = searchParams.get("category") as CapabilityCategory | null;
    const riskLevel = searchParams.get("riskLevel") as RiskLevel | null;

    let capabilities = capabilityRegistry.getEnabled();

    if (callerType) {
      capabilities = capabilities.filter((c) => c.allowedCallerTypes.includes(callerType));
    }
    if (category) {
      capabilities = capabilities.filter((c) => c.category === category);
    }
    if (riskLevel) {
      capabilities = capabilities.filter((c) => c.riskLevel === riskLevel);
    }

    return createSuccessResponse(
      {
        capabilities,
        total: capabilities.length,
      },
      requestId
    );
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
