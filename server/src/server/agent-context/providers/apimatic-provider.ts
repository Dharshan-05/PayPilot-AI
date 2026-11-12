import { AgentCapability } from "../types";
import { APIContextProvider, ProviderHealth } from "./types";
import { MockAPIContextProvider } from "./mock-provider";
import { getConfig } from "../../config/env";
import { Logger } from "../../observability/logger";

const log = new Logger("APIMaticProvider");

export class APIMaticProvider implements APIContextProvider {
  readonly providerName = "apimatic";
  readonly schemaVersion = "1.0.0";
  private mockFallback: MockAPIContextProvider;

  constructor() {
    this.mockFallback = new MockAPIContextProvider();
  }

  async getCapabilities(): Promise<AgentCapability[]> {
    const config = getConfig();
    if (!config.APIMATIC_ENABLED || !config.APIMATIC_API_KEY) {
      log.debug("APIMatic not fully configured; using local modeled capabilities");
      return this.mockFallback.getCapabilities();
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${config.APIMATIC_BASE_URL}/api-specs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.APIMATIC_API_KEY}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        log.warn("APIMatic remote fetch failed; falling back to local modeled capabilities", {
          status: res.status,
        });
        return this.mockFallback.getCapabilities();
      }

      const data = await res.json();
      if (Array.isArray(data?.capabilities) && data.capabilities.length > 0) {
        return data.capabilities;
      }

      return this.mockFallback.getCapabilities();
    } catch (err: any) {
      log.warn("APIMatic connection error; falling back to local modeled capabilities", {
        error: err.message,
      });
      return this.mockFallback.getCapabilities();
    }
  }

  async getOperation(operationId: string): Promise<AgentCapability | null> {
    const caps = await this.getCapabilities();
    return caps.find((c) => c.operation === operationId || c.id === operationId) || null;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    const config = getConfig();
    const isConfigured = Boolean(config.APIMATIC_ENABLED && config.APIMATIC_API_KEY);

    if (!isConfigured) {
      return {
        provider: this.providerName,
        status: "healthy",
        capabilityCount: 9,
        latencyMs: Date.now() - start,
        details: {
          configured: false,
          mode: "mock_fallback",
          realApimaticValidation: "PENDING — EXTERNAL CREDENTIALS/ENVIRONMENT NOT AVAILABLE",
          message: "APIMatic credentials not configured; operating deterministically via MockAPIContextProvider",
        },
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${config.APIMATIC_BASE_URL}/health`, {
        headers: { Authorization: `Bearer ${config.APIMATIC_API_KEY}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - start;

      if (res.ok) {
        return {
          provider: this.providerName,
          status: "healthy",
          capabilityCount: 9,
          latencyMs,
          details: {
            configured: true,
            mode: "live_apimatic",
            realApimaticValidation: "CONFIRMED_ONLINE",
          },
        };
      } else {
        return {
          provider: this.providerName,
          status: "degraded",
          capabilityCount: 9,
          latencyMs,
          details: {
            configured: true,
            mode: "mock_fallback",
            realApimaticValidation: "FAILED_RESPONSE",
            httpStatus: res.status,
          },
        };
      }
    } catch (err: any) {
      return {
        provider: this.providerName,
        status: "degraded",
        capabilityCount: 9,
        latencyMs: Date.now() - start,
        details: {
          configured: true,
          mode: "mock_fallback",
          realApimaticValidation: "PENDING — EXTERNAL CREDENTIALS/ENVIRONMENT NOT AVAILABLE",
          error: err.message,
        },
      };
    }
  }
}
