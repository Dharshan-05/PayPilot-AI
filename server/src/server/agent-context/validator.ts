import { AgentCapability, ToolIntent, toolIntentSchema } from "./types";

export interface ToolValidationResult {
  valid: boolean;
  errors?: string[];
  sanitizedArguments?: Record<string, any>;
}

export class ToolIntentValidator {
  /**
   * Validates a raw intent against schema and security rules.
   */
  static validate(rawIntent: unknown, capability?: AgentCapability): ToolValidationResult {
    // 1. Prototype pollution check on raw input before schema parsing
    const protoError = this.checkPrototypePollution(rawIntent);
    if (protoError) {
      return {
        valid: false,
        errors: [protoError],
      };
    }

    // 2. Validate envelope
    const parsed = toolIntentSchema.safeParse(rawIntent);
    if (!parsed.success) {
      return {
        valid: false,
        errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      };
    }

    const intent = parsed.data;
    const errors: string[] = [];

    // 3. Schema validation if capability provided
    if (capability && capability.inputSchema) {
      const required = capability.inputSchema.required || [];
      for (const field of required) {
        if (intent.arguments[field] === undefined || intent.arguments[field] === null || intent.arguments[field] === "") {
          errors.push(`Missing required argument: '${field}'`);
        }
      }

      // Check properties type
      const properties = capability.inputSchema.properties || {};
      for (const [propName, propVal] of Object.entries(properties)) {
        const val = intent.arguments[propName];
        if (val !== undefined && val !== null) {
          const expectedType = propVal.type;
          if (expectedType === "string" && typeof val !== "string") {
            errors.push(`Argument '${propName}' must be a string, got ${typeof val}`);
          } else if (expectedType === "number" && typeof val !== "number") {
            errors.push(`Argument '${propName}' must be a number, got ${typeof val}`);
          } else if (expectedType === "boolean" && typeof val !== "boolean") {
            errors.push(`Argument '${propName}' must be a boolean, got ${typeof val}`);
          } else if (expectedType === "array" && !Array.isArray(val)) {
            errors.push(`Argument '${propName}' must be an array, got ${typeof val}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      sanitizedArguments: this.sanitizeArguments(intent.arguments),
    };
  }

  private static checkPrototypePollution(obj: any, depth = 0): string | null {
    if (!obj || typeof obj !== "object" || depth > 5) return null;

    try {
      const raw = JSON.stringify(obj);
      if (raw.includes('"__proto__":') || raw.includes('"constructor":') || raw.includes('"prototype":')) {
        return "Security violation: prototype pollution attempt detected";
      }
    } catch {
      // pass
    }

    if (Object.prototype.hasOwnProperty.call(obj, "__proto__") ||
        Object.prototype.hasOwnProperty.call(obj, "constructor") ||
        Object.prototype.hasOwnProperty.call(obj, "prototype")) {
      return "Security violation: prototype pollution attempt detected";
    }

    for (const key of Object.keys(obj)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return "Security violation: prototype pollution attempt detected";
      }
      const val = obj[key];
      if (typeof val === "object" && val !== null) {
        const nestedErr = this.checkPrototypePollution(val, depth + 1);
        if (nestedErr) return nestedErr;
      }
    }

    return null;
  }

  private static sanitizeArguments(args: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(args)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      if (typeof v === "string") {
        clean[k] = v.trim();
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }
}
