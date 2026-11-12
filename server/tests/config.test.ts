import { describe, it, expect, beforeEach } from "vitest";
import { getConfig, resetConfigCache, getSafeConfigDiagnostics } from "../src/server/config/env";

describe("Configuration Foundation", () => {
  beforeEach(() => {
    resetConfigCache();
  });

  it("should load valid default configuration successfully", () => {
    const config = getConfig({
      NODE_ENV: "development",
      PAYPAL_ENVIRONMENT: "sandbox",
      PAYPAL_CLIENT_ID: "test_client_id",
      PAYPAL_CLIENT_SECRET: "test_client_secret",
      DATABASE_URL: "file:./test.db",
      AI_PROVIDER: "mock",
    });

    expect(config.NODE_ENV).toBe("development");
    expect(config.PAYPAL_ENVIRONMENT).toBe("sandbox");
    expect(config.AI_PROVIDER).toBe("mock");
    expect(config.MAX_TRANSACTION_AMOUNT).toBe(1000.0);
    expect(config.ALLOWED_CURRENCIES).toContain("USD");
  });

  it("should reject live PayPal environment in development mode", () => {
    expect(() => {
      getConfig({
        NODE_ENV: "development",
        PAYPAL_ENVIRONMENT: "live",
        PAYPAL_CLIENT_ID: "live_client_id",
        PAYPAL_CLIENT_SECRET: "live_secret",
        DATABASE_URL: "file:./test.db",
      });
    }).toThrow(/Live PayPal environment is strictly forbidden in non-production/);
  });

  it("should fail when DATABASE_URL is missing or empty", () => {
    expect(() => {
      getConfig({
        DATABASE_URL: "",
      });
    }).toThrow(/CONFIGURATION ERROR/);
  });

  it("should parse and normalize allowed currencies into uppercase array", () => {
    const config = getConfig({
      ALLOWED_CURRENCIES: "usd, eur, gbp",
      DATABASE_URL: "file:./test.db",
    });

    expect(config.ALLOWED_CURRENCIES).toEqual(["USD", "EUR", "GBP"]);
  });

  it("should produce safe diagnostics without exposing secrets", () => {
    const config = getConfig({
      PAYPAL_CLIENT_ID: "client_id_super_secret_value",
      PAYPAL_CLIENT_SECRET: "top_secret_paypal_key",
      AI_API_KEY: "secret_ai_token_12345",
      DATABASE_URL: "file:./dev.db",
    });

    const diagnostics = getSafeConfigDiagnostics(config);

    expect(diagnostics.PAYPAL.CLIENT_SECRET).toBe("[REDACTED_SECRET]");
    expect(diagnostics.AI.API_KEY_CONFIGURED).toBe(true);
    expect(JSON.stringify(diagnostics)).not.toContain("top_secret_paypal_key");
    expect(JSON.stringify(diagnostics)).not.toContain("secret_ai_token_12345");
  });
});
