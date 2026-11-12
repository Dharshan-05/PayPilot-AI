import { getConfig } from "../config/env";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERNS = [
  /secret/i,
  /password/i,
  /api[-_]?key/i,
  /token/i,
  /auth(orization)?/i,
  /bearer/i,
  /credit[-_]?card/i,
  /cvv/i,
  /private[-_]?key/i,
];

/**
 * Deeply clone and redact sensitive properties from an object or value.
 */
export function redactSensitiveData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted as T;
}

export class Logger {
  private context: string;

  constructor(context: string = "App") {
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    try {
      const config = getConfig();
      const configuredLevel = (config.LOG_LEVEL || "info") as LogLevel;
      return LOG_LEVELS[level] >= (LOG_LEVELS[configuredLevel] || 20);
    } catch {
      return true; // Default to logging if config not yet initialized
    }
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    meta?: Record<string, any>,
    requestId?: string
  ): string {
    const timestamp = new Date().toISOString();
    const safeMeta = meta ? redactSensitiveData(meta) : undefined;

    const payload = {
      timestamp,
      level: level.toUpperCase(),
      context: this.context,
      message,
      ...(requestId && { requestId }),
      ...(safeMeta && { meta: safeMeta }),
    };

    return JSON.stringify(payload);
  }

  debug(message: string, meta?: Record<string, any>, requestId?: string): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, meta, requestId));
    }
  }

  info(message: string, meta?: Record<string, any>, requestId?: string): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, meta, requestId));
    }
  }

  warn(message: string, meta?: Record<string, any>, requestId?: string): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta, requestId));
    }
  }

  error(message: string, error?: unknown, meta?: Record<string, any>, requestId?: string): void {
    if (this.shouldLog("error")) {
      const errorMeta = {
        ...meta,
        ...(error instanceof Error
          ? {
              errorName: error.name,
              errorMessage: error.message,
              // Stack trace included in server logs for debugging, but never leaked in API response
              stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
            }
          : { rawError: String(error) }),
      };
      console.error(this.formatMessage("error", message, errorMeta, requestId));
    }
  }

  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`);
  }
}

export const appLogger = new Logger("Root");
