import { z } from "zod";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

const environmentSchema = z.enum(["development", "test", "production"]);
const paypalEnvironmentSchema = z.enum(["sandbox", "live"]);
const paypalProviderSchema = z.enum(["auto", "paypal", "mock"]);
const aiProviderSchema = z.enum(["mock", "gemini", "openai"]);
const searchProviderSchema = z.enum(["mock", "elastic", "database"]);

const PAYPAL_PLACEHOLDERS = new Set([
  "",
  "sandbox_client_id_placeholder",
  "sandbox_client_secret_placeholder",
  "mock_client_id",
  "mock_client_secret",
  "your_paypal_sandbox_client_id_here",
  "your_paypal_sandbox_client_secret_here",
]);

export function hasValidPayPalCredentials(clientId?: string, clientSecret?: string): boolean {
  const cleanId = (clientId || "").trim();
  const cleanSecret = (clientSecret || "").trim();
  return (
    cleanId.length > 0 &&
    cleanSecret.length > 0 &&
    !PAYPAL_PLACEHOLDERS.has(cleanId) &&
    !PAYPAL_PLACEHOLDERS.has(cleanSecret)
  );
}

export function validatePayPalEnvironment(config?: AppConfig): { configured: boolean; message?: string } {
  const cfg = config || getConfig();
  const configured = hasValidPayPalCredentials(cfg.PAYPAL_CLIENT_ID, cfg.PAYPAL_CLIENT_SECRET);
  if (!configured) {
    return {
      configured: false,
      message: "PayPal credentials are not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
    };
  }
  return { configured: true };
}

export const configSchema = z.object({
  NODE_ENV: environmentSchema.default("development"),
  PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").default("file:./dev.db"),

  // PayPal Configuration
  PAYPAL_ENVIRONMENT: paypalEnvironmentSchema.default("sandbox"),
  PAYPAL_PROVIDER: paypalProviderSchema.default("auto"),
  PAYPAL_CLIENT_ID: z.string().min(1, "PAYPAL_CLIENT_ID is required").default("sandbox_client_id_placeholder"),
  PAYPAL_CLIENT_SECRET: z.string().min(1, "PAYPAL_CLIENT_SECRET is required").default("sandbox_client_secret_placeholder"),
  PAYPAL_WEBHOOK_ID: z.string().optional().default("sandbox_webhook_id_placeholder"),

  // AI Configuration
  AI_PROVIDER: aiProviderSchema.default("mock"),
  AI_API_KEY: z.string().optional().default("mock_key_for_local_testing"),
  AI_MODEL: z.string().default("gemini-2.0-flash"),

  // Elasticsearch / Semantic Search Configuration
  SEARCH_PROVIDER: searchProviderSchema.default("mock"),
  ELASTICSEARCH_ENABLED: z.preprocess((val) => val === true || val === "true" || val === "1", z.boolean()).default(false),
  ELASTICSEARCH_URL: z.string().optional().default("http://localhost:9200"),
  ELASTICSEARCH_API_KEY: z.string().optional(),
  ELASTICSEARCH_INDEX: z.string().default("products"),

  // APIMatic / Agent Context Configuration
  APIMATIC_ENABLED: z.preprocess((val) => val === true || val === "true" || val === "1", z.boolean()).default(false),
  APIMATIC_API_KEY: z.string().optional(),
  APIMATIC_BASE_URL: z.string().optional().default("https://api.apimatic.io"),

  // Business Rules & Safety Limits
  MAX_TRANSACTION_AMOUNT: z.coerce.number().positive().default(1000.0),
  ALLOWED_CURRENCIES: z
    .string()
    .default("USD,EUR,GBP,CAD,AUD")
    .transform((val) => val.split(",").map((c) => c.trim().toUpperCase())),
});

export type AppConfig = z.infer<typeof configSchema>;

let cachedConfig: AppConfig | null = null;

/**
 * Validates and retrieves application configuration.
 * Fails fast with clear developer messages if validation fails.
 */
export function getConfig(overrideEnv?: Record<string, string | undefined>): AppConfig {
  if (cachedConfig && !overrideEnv) {
    return cachedConfig;
  }

  const rawEnv: Record<string, any> = { ...(overrideEnv || process.env) };

  // If running on Vercel without explicit APP_BASE_URL, infer public domain from Vercel system env vars
  if (!overrideEnv && (!rawEnv.APP_BASE_URL || rawEnv.APP_BASE_URL === "http://localhost:3000")) {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      rawEnv.APP_BASE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.VERCEL_URL) {
      rawEnv.APP_BASE_URL = `https://${process.env.VERCEL_URL}`;
    }
  }

  const result = configSchema.safeParse(rawEnv);

  if (!result.success) {
    const issues = result.error.issues || (result.error as any).errors || [];
    const errorDetails = issues
      .map((err: any) => `  - ${err.path.join(".")}: ${err.message}`)
      .join("\n");
    throw new Error(
      `\n❌ [CONFIGURATION ERROR] Missing or invalid environment configuration:\n${errorDetails}\n\nPlease check your .env file or refer to .env.example.\n`
    );
  }

  // Safety constraint: In development or test, never accidentally switch to live PayPal
  if (result.data.NODE_ENV !== "production" && result.data.PAYPAL_ENVIRONMENT === "live") {
    throw new Error(
      "❌ [SECURITY VIOLATION] Live PayPal environment is strictly forbidden in non-production environments. Set PAYPAL_ENVIRONMENT=sandbox."
    );
  }

  if (!overrideEnv) {
    cachedConfig = result.data;
  }

  return result.data;
}

/**
 * Reset cached config (useful for testing configuration changes)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}

/**
 * Returns a redacted, safe copy of configuration for diagnostics and logging.
 * NEVER leaks client secret or AI API keys.
 */
export function getSafeConfigDiagnostics(config: AppConfig): Record<string, any> {
  return {
    NODE_ENV: config.NODE_ENV,
    PORT: config.PORT,
    APP_BASE_URL: config.APP_BASE_URL,
    LOG_LEVEL: config.LOG_LEVEL,
    DATABASE_URL: config.DATABASE_URL.startsWith("file:") ? "file:./dev.db" : "[REDACTED_DB_URL]",
    PAYPAL: {
      ENVIRONMENT: config.PAYPAL_ENVIRONMENT,
      PROVIDER: config.PAYPAL_PROVIDER,
      CREDENTIALS_CONFIGURED: hasValidPayPalCredentials(config.PAYPAL_CLIENT_ID, config.PAYPAL_CLIENT_SECRET),
      CLIENT_ID: config.PAYPAL_CLIENT_ID ? `${config.PAYPAL_CLIENT_ID.slice(0, 6)}...` : "[NOT_SET]",
      CLIENT_SECRET: "[REDACTED_SECRET]",
      WEBHOOK_ID_CONFIGURED: Boolean(config.PAYPAL_WEBHOOK_ID),
    },
    AI: {
      PROVIDER: config.AI_PROVIDER,
      MODEL: config.AI_MODEL,
      API_KEY_CONFIGURED: Boolean(config.AI_API_KEY && config.AI_API_KEY !== "mock_key_for_local_testing"),
    },
    SEARCH: {
      PROVIDER: config.SEARCH_PROVIDER,
      ELASTICSEARCH_ENABLED: config.ELASTICSEARCH_ENABLED,
      INDEX: config.ELASTICSEARCH_INDEX,
      API_KEY_CONFIGURED: Boolean(config.ELASTICSEARCH_API_KEY),
      URL: config.ELASTICSEARCH_URL ? "[CONFIGURED]" : "[NOT_SET]",
    },
    APIMATIC: {
      ENABLED: config.APIMATIC_ENABLED,
      API_KEY_CONFIGURED: Boolean(config.APIMATIC_API_KEY),
      BASE_URL: config.APIMATIC_BASE_URL ? "[CONFIGURED]" : "[NOT_SET]",
    },
    BUSINESS_RULES: {
      MAX_TRANSACTION_AMOUNT: config.MAX_TRANSACTION_AMOUNT,
      ALLOWED_CURRENCIES: config.ALLOWED_CURRENCIES,
    },
  };
}
