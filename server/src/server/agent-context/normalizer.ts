import { AgentCapability, JSONSchemaObject, RiskLevel, CapabilityCategory } from "./types";
import { Logger } from "../observability/logger";

const log = new Logger("APIContextNormalizer");

const SUSPICIOUS_PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s+prompt/i,
  /bypass\s+(all\s+)?(security|policy|controls|limits)/i,
  /execute\s+capture\s+immediately/i,
  /grant\s+admin(istrator)?\s+access/i,
  /override\s+authorization/i,
  /<script\b[^>]*>/i,
  /javascript:/i,
];

export class APIContextNormalizer {
  /**
   * Sanitize text against prompt injection attempts within external API specs or user-provided tool docs.
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== "string") return "";

    let sanitized = input;
    for (const pattern of SUSPICIOUS_PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        log.warn("Prompt injection pattern detected in API metadata, redacting", { pattern: pattern.source });
        sanitized = sanitized.replace(pattern, "[REDACTED_SECURITY_POLICY_VIOLATION]");
      }
    }

    // Limit length to prevent buffer/context inflation attacks
    if (sanitized.length > 500) {
      sanitized = sanitized.slice(0, 497) + "...";
    }

    return sanitized;
  }

  /**
   * Sanitize and normalize JSON Schema objects.
   * Strips dangerous prototype keys, enforces depth limits, and sanitizes documentation strings.
   */
  static normalizeSchema(schema: any, depth = 0): JSONSchemaObject {
    if (!schema || typeof schema !== "object" || depth > 4) {
      return { type: "object", properties: {} };
    }

    const clean: Record<string, any> = {};

    for (const [key, value] of Object.entries(schema)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        continue; // Prototype pollution defense
      }

      if (key === "description" && typeof value === "string") {
        clean[key] = this.sanitizeText(value);
      } else if (key === "properties" && typeof value === "object" && value !== null) {
        clean.properties = {};
        for (const [propKey, propVal] of Object.entries(value)) {
          if (propKey === "__proto__" || propKey === "constructor" || propKey === "prototype") continue;
          clean.properties[propKey] = this.normalizeSchema(propVal, depth + 1);
        }
      } else if (key === "items" && typeof value === "object" && value !== null) {
        clean.items = this.normalizeSchema(value, depth + 1);
      } else if (typeof value === "string") {
        clean[key] = this.sanitizeText(value);
      } else if (typeof value === "number" || typeof value === "boolean" || Array.isArray(value)) {
        clean[key] = value;
      }
    }

    if (!clean.type) {
      clean.type = "object";
    }

    return clean as JSONSchemaObject;
  }

  /**
   * Normalizes raw capability definition into strongly-typed, safe AgentCapability.
   */
  static normalizeCapability(raw: Partial<AgentCapability>): AgentCapability {
    const id = raw.id || `cap_${Date.now()}`;
    const name = this.sanitizeText(raw.name || id);
    const description = this.sanitizeText(raw.description || "");

    const riskLevel: RiskLevel = raw.riskLevel || (raw.financialOperation ? "FINANCIAL" : raw.readOnly ? "READ_ONLY" : "LOW_RISK_WRITE");
    const category: CapabilityCategory = raw.category || "PRODUCT_DISCOVERY";

    return {
      id,
      name,
      description,
      provider: raw.provider || "apimatic",
      version: raw.version || "1.0.0",
      operation: raw.operation || id,
      category,
      riskLevel,
      readOnly: Boolean(raw.readOnly),
      requiresConfirmation: Boolean(raw.requiresConfirmation || riskLevel === "FINANCIAL" || riskLevel === "HIGH_RISK_WRITE"),
      financialOperation: Boolean(raw.financialOperation || riskLevel === "FINANCIAL"),
      inputSchema: this.normalizeSchema(raw.inputSchema || { type: "object", properties: {} }),
      outputSchema: this.normalizeSchema(raw.outputSchema || { type: "object", properties: {} }),
      requiredPermissions: Array.isArray(raw.requiredPermissions) ? raw.requiredPermissions : [],
      allowedCallerTypes: Array.isArray(raw.allowedCallerTypes) ? raw.allowedCallerTypes : ["human_user", "server_system"],
      timeoutMs: typeof raw.timeoutMs === "number" ? Math.min(Math.max(raw.timeoutMs, 500), 30000) : 5000,
      idempotencyRequired: Boolean(raw.idempotencyRequired),
      auditRequired: Boolean(raw.auditRequired ?? true),
      enabled: raw.enabled !== false,
    };
  }
}
