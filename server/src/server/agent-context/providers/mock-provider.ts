import { APIContextProvider, ProviderHealth } from "./types";
import { AgentCapability } from "../types";

export class MockAPIContextProvider implements APIContextProvider {
  public readonly providerName = "apimatic-modeled-mock";
  public readonly schemaVersion = "1.0.0-apimatic";

  private capabilities: AgentCapability[] = [
    {
      id: "products.search",
      name: "Search Product Catalog",
      description: "Performs hybrid semantic and lexical search across verified in-stock catalog products.",
      provider: "apimatic-modeled",
      version: "1.0.0",
      operation: "products.search",
      category: "PRODUCT_DISCOVERY",
      riskLevel: "READ_ONLY",
      readOnly: true,
      requiresConfirmation: false,
      financialOperation: false,
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query or natural language description" },
          category: { type: "string", description: "Product category filter" },
          maxPrice: { type: "number", description: "Maximum budget ceiling" },
          minPrice: { type: "number", description: "Minimum price floor" },
          mode: { type: "string", enum: ["hybrid", "semantic", "keyword"] },
          limit: { type: "integer", description: "Maximum results to return" },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          results: { type: "array", description: "Ranked product results with evidence" },
          total: { type: "integer" },
        },
      },
      requiredPermissions: ["products:read"],
      allowedCallerTypes: ["human_user", "ai_agent", "server_system"],
      timeoutMs: 3000,
      idempotencyRequired: false,
      auditRequired: false,
      enabled: true,
    },
    {
      id: "products.compare",
      name: "Compare Products Side-by-Side",
      description: "Generates an authoritative side-by-side spec and trade-off comparison of 2 to 5 products.",
      provider: "apimatic-modeled",
      version: "1.0.0",
      operation: "products.compare",
      category: "PRODUCT_DISCOVERY",
      riskLevel: "READ_ONLY",
      readOnly: true,
      requiresConfirmation: false,
      financialOperation: false,
      inputSchema: {
        type: "object",
        properties: {
          productIds: {
            type: "array",
            items: { type: "string" },
            description: "2 to 5 product IDs to compare",
          },
        },
        required: ["productIds"],
      },
      outputSchema: {
        type: "object",
        properties: {
          comparisonRows: { type: "array" },
          advantages: { type: "object" },
          tradeoffs: { type: "array" },
        },
      },
      requiredPermissions: ["products:read"],
      allowedCallerTypes: ["human_user", "ai_agent", "server_system"],
      timeoutMs: 3000,
      idempotencyRequired: false,
      auditRequired: false,
      enabled: true,
    },
    {
      id: "products.recommend",
      name: "Get Product Recommendations",
      description: "Evaluates buyer criteria and generates multi-factor ranked recommendations with explainable badges.",
      provider: "apimatic-modeled",
      version: "1.0.0",
      operation: "products.recommend",
      category: "PRODUCT_DISCOVERY",
      riskLevel: "READ_ONLY",
      readOnly: true,
      requiresConfirmation: false,
      financialOperation: false,
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string" },
          maxBudget: { type: "number" },
          useCase: { type: "string" },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          recommendations: { type: "array" },
        },
      },
      requiredPermissions: ["products:read"],
      allowedCallerTypes: ["human_user", "ai_agent", "server_system"],
      timeoutMs: 3000,
      idempotencyRequired: false,
      auditRequired: false,
      enabled: true,
    },
    {
      id: "commerce.createProposal",
      name: "Create Commerce Proposal",
      description: "Prepares an intermediate server-governed payment proposal locking price and inventory. Does not execute payment.",
      provider: "apimatic-modeled",
      version: "1.0.0",
      operation: "commerce.createProposal",
      category: "COMMERCE_PROPOSAL",
      riskLevel: "LOW_RISK_WRITE",
      readOnly: false,
      requiresConfirmation: false,
      financialOperation: false,
      inputSchema: {
        type: "object",
        properties: {
          productId: { type: "string" },
          quantity: { type: "integer", default: 1 },
          conversationId: { type: "string" },
        },
        required: ["productId"],
      },
      outputSchema: {
        type: "object",
        properties: {
          proposalNumber: { type: "string" },
          totalAmount: { type: "number" },
          currency: { type: "string" },
          status: { type: "string" },
          expiresAt: { type: "string" },
        },
      },
      requiredPermissions: ["proposals:create"],
      allowedCallerTypes: ["human_user", "ai_agent", "server_system"],
      timeoutMs: 5000,
      idempotencyRequired: true,
      auditRequired: true,
      enabled: true,
    },
    {
      id: "commerce.getProposal",
      name: "Retrieve Proposal Details",
      description: "Fetches details of an existing commerce proposal including expiration and status.",
      provider: "apimatic-modeled",
      version: "1.0.0",
      operation: "commerce.getProposal",
      category: "COMMERCE_PROPOSAL",
      riskLevel: "READ_ONLY",
      readOnly: true,
      requiresConfirmation: false,
      financialOperation: false,
      inputSchema: {
        type: "object",
        properties: {
          proposalId: { type: "string" },
        },
        required: ["proposalId"],
      },
      outputSchema: {
        type: "object",
        properties: {
          proposal: { type: "object" },
        },
      },
      requiredPermissions: ["proposals:read"],
      allowedCallerTypes: ["human_user", "ai_agent", "server_system"],
      timeoutMs: 3000,
      idempotencyRequired: false,
      auditRequired: false,
      enabled: true,
    },
    {
      id: "paypal.getOrder",
      name: "Inspect PayPal Order",
      description: "Retrieves internal and PayPal Sandbox order status and state machine details.",
      provider: "apimatic-modeled",
      version: "1.0.0",
      operation: "paypal.getOrder",
      category: "PAYPAL_ORDER",
      riskLevel: "READ_ONLY",
      readOnly: true,
      requiresConfirmation: false,
      financialOperation: false,
      inputSchema: {
        type: "object",
        properties: {
          orderId: { type: "string" },
        },
        required: ["orderId"],
      },
      outputSchema: {
        type: "object",
        properties: {
          order: { type: "object" },
          status: { type: "string" },
        },
      },
      requiredPermissions: ["orders:read"],
      allowedCallerTypes: ["human_user", "ai_agent", "server_system"],
      timeoutMs: 5000,
      idempotencyRequired: false,
      auditRequired: true,
      enabled: true,
    },
    {
      id: "paypal.createOrder",
      name: "Create PayPal Order",
      description: "Initializes a PayPal Sandbox order for an authorized transaction. AI CALLERS FORBIDDEN.",
      provider: "apimatic-modeled",
      version: "1.0.0",
      operation: "paypal.createOrder",
      category: "PAYPAL_ORDER",
      riskLevel: "HIGH_RISK_WRITE",
      readOnly: false,
      requiresConfirmation: true,
      financialOperation: false,
      inputSchema: {
        type: "object",
        properties: {
          proposalId: { type: "string" },
          amount: { type: "number" },
          currency: { type: "string" },
        },
        required: ["amount"],
      },
      outputSchema: {
        type: "object",
        properties: {
          paypalOrderId: { type: "string" },
          approvalLink: { type: "string" },
        },
      },
      requiredPermissions: ["orders:create:financial"],
      allowedCallerTypes: ["server_system", "human_user"],
      timeoutMs: 10000,
      idempotencyRequired: true,
      auditRequired: true,
      enabled: true,
    },
    {
      id: "paypal.capturePayment",
      name: "Capture Authorized PayPal Payment",
      description: "Executes final capture of funds for an approved PayPal order. STRICTLY REQUIRES EXPLICIT HUMAN AUTHORIZATION.",
      provider: "apimatic-modeled",
      version: "1.0.0",
      operation: "paypal.capturePayment",
      category: "PAYPAL_PAYMENT",
      riskLevel: "FINANCIAL",
      readOnly: false,
      requiresConfirmation: true,
      financialOperation: true,
      inputSchema: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          confirmationToken: { type: "string" },
        },
        required: ["orderId"],
      },
      outputSchema: {
        type: "object",
        properties: {
          captureId: { type: "string" },
          status: { type: "string" },
        },
      },
      requiredPermissions: ["payments:capture:human_auth"],
      allowedCallerTypes: ["human_user"], // AI strictly forbidden!
      timeoutMs: 10000,
      idempotencyRequired: true,
      auditRequired: true,
      enabled: true,
    },
    {
      id: "system.getHealth",
      name: "Check System Health",
      description: "Returns health status of database, search, and PayPal sandbox connectivity without secrets.",
      provider: "apimatic-modeled",
      version: "1.0.0",
      operation: "system.getHealth",
      category: "SYSTEM_DIAGNOSTIC",
      riskLevel: "READ_ONLY",
      readOnly: true,
      requiresConfirmation: false,
      financialOperation: false,
      inputSchema: { type: "object", properties: {} },
      outputSchema: {
        type: "object",
        properties: {
          status: { type: "string" },
          database: { type: "string" },
        },
      },
      requiredPermissions: ["system:health"],
      allowedCallerTypes: ["human_user", "ai_agent", "server_system"],
      timeoutMs: 2000,
      idempotencyRequired: false,
      auditRequired: false,
      enabled: true,
    },
  ];

  async getCapabilities(): Promise<AgentCapability[]> {
    return [...this.capabilities];
  }

  async getOperation(operationId: string): Promise<AgentCapability | null> {
    const found = this.capabilities.find(
      (c) => c.id === operationId || c.operation === operationId
    );
    return found ? { ...found } : null;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      provider: this.providerName,
      status: "healthy",
      capabilityCount: this.capabilities.length,
      latencyMs: 1,
      details: {
        schemaVersion: this.schemaVersion,
        mode: "deterministic-local-apimatic-model",
      },
    };
  }
}

export const mockAPIContextProvider = new MockAPIContextProvider();
