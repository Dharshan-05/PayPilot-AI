import { AgentCapability, CallerType, CapabilityCategory, RiskLevel } from "./types";
import { APIContextProvider } from "./providers/types";
import { APIMaticProvider } from "./providers/apimatic-provider";
import { APIContextNormalizer } from "./normalizer";
import { Logger } from "../observability/logger";

const log = new Logger("AgentCapabilityRegistry");

export class AgentCapabilityRegistry {
  private capabilities: Map<string, AgentCapability> = new Map();
  private provider: APIContextProvider;
  private initialized = false;

  constructor(provider?: APIContextProvider) {
    this.provider = provider || new APIMaticProvider();
  }

  /**
   * Initializes the registry by loading capabilities from the provider.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.refreshFromProvider();
    this.initialized = true;
  }

  /**
   * Reload capabilities from the provider.
   */
  async refreshFromProvider(): Promise<void> {
    try {
      const caps = await this.provider.getCapabilities();
      this.capabilities.clear();
      for (const cap of caps) {
        const normalized = APIContextNormalizer.normalizeCapability(cap);
        this.capabilities.set(normalized.id, normalized);
      }
      log.info("AgentCapabilityRegistry loaded capabilities", {
        count: this.capabilities.size,
        provider: this.provider.providerName,
      });
    } catch (err: any) {
      log.error("Failed to load capabilities from provider", { error: err.message });
      throw err;
    }
  }

  register(capability: AgentCapability): void {
    const normalized = APIContextNormalizer.normalizeCapability(capability);
    this.capabilities.set(normalized.id, normalized);
  }

  get(idOrOperation: string): AgentCapability | undefined {
    if (!idOrOperation) return undefined;

    // 1. Direct key match
    if (this.capabilities.has(idOrOperation)) {
      return this.capabilities.get(idOrOperation);
    }

    // 2. Direct operation match
    for (const cap of this.capabilities.values()) {
      if (cap.operation === idOrOperation) {
        return cap;
      }
    }

    // 3. Flexible normalized match (e.g. cap_products_search -> products.search)
    const normalizedQuery = idOrOperation.toLowerCase().replace(/^cap_/, "").replace(/_/g, ".");
    for (const [id, cap] of this.capabilities.entries()) {
      const normId = id.toLowerCase().replace(/^cap_/, "").replace(/_/g, ".");
      const normOp = cap.operation.toLowerCase().replace(/^cap_/, "").replace(/_/g, ".");
      if (normId === normalizedQuery || normOp === normalizedQuery) {
        return cap;
      }
    }

    return undefined;
  }

  getAll(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  getEnabled(): AgentCapability[] {
    return this.getAll().filter((c) => c.enabled);
  }

  getByCategory(category: CapabilityCategory): AgentCapability[] {
    return this.getEnabled().filter((c) => c.category === category);
  }

  getByRiskLevel(riskLevel: RiskLevel): AgentCapability[] {
    return this.getEnabled().filter((c) => c.riskLevel === riskLevel);
  }

  getAvailableForCaller(caller: CallerType): AgentCapability[] {
    return this.getEnabled().filter((c) => c.allowedCallerTypes.includes(caller));
  }

  getProvider(): APIContextProvider {
    return this.provider;
  }

  setProvider(provider: APIContextProvider): void {
    this.provider = provider;
    this.initialized = false;
  }
}

export const capabilityRegistry = new AgentCapabilityRegistry();
