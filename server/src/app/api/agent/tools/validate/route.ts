import { NextRequest } from "next/server";
import { capabilityRegistry } from "@/server/agent-context/registry";
import { ToolPolicyEngine } from "@/server/agent-context/tool-policy";
import { ToolIntentValidator } from "@/server/agent-context/validator";
import { toolIntentSchema } from "@/server/agent-context/types";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

const policyEngine = new ToolPolicyEngine(capabilityRegistry);

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "tools_validate", "sensitive");
  if (limited) return limited;
  try {
    const rawBody = await safeParseJson<any>(req);
    const parsedIntent = toolIntentSchema.parse(rawBody);

    await capabilityRegistry.initialize();
    const capability = capabilityRegistry.get(parsedIntent.toolId) || capabilityRegistry.get(parsedIntent.operation);

    const validation = ToolIntentValidator.validate(parsedIntent, capability);
    const policyDecision = await policyEngine.authorize(parsedIntent);

    return createSuccessResponse(
      {
        valid: validation.valid && policyDecision.authorized,
        schemaValid: validation.valid,
        policyAuthorized: policyDecision.authorized,
        errors: validation.errors || [],
        policyDecision,
      },
      requestId
    );
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
