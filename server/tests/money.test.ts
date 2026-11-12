import { describe, it, expect } from "vitest";
import { validateMoney } from "../src/server/paypal/money";

describe("Precise Money & Currency Integrity", () => {
  const allowedCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
  const maxLimit = 1000.0;

  it("should normalize valid amount and currency into minor units and formatted strings", () => {
    const result = validateMoney(49.99, "USD", maxLimit, allowedCurrencies);
    expect(result.amountMinor).toBe(4999);
    expect(result.amountFormatted).toBe("49.99");
    expect(result.currency).toBe("USD");

    const fromString = validateMoney("12.50", "eur", maxLimit, allowedCurrencies);
    expect(fromString.amountMinor).toBe(1250);
    expect(fromString.amountFormatted).toBe("12.50");
    expect(fromString.currency).toBe("EUR");
  });

  it("should strictly reject amounts with more than 2 decimal places (precision abuse)", () => {
    expect(() => {
      validateMoney(49.999, "USD", maxLimit, allowedCurrencies);
    }).toThrow(/cannot have more than 2 decimal places/);

    expect(() => {
      validateMoney("10.1234", "USD", maxLimit, allowedCurrencies);
    }).toThrow(/cannot have more than 2 decimal places/);
  });

  it("should reject negative or zero amounts", () => {
    expect(() => {
      validateMoney(0, "USD", maxLimit, allowedCurrencies);
    }).toThrow(/positive number/);

    expect(() => {
      validateMoney(-15.0, "USD", maxLimit, allowedCurrencies);
    }).toThrow(/positive number/);
  });

  it("should reject NaN, Infinity, and malformed numeric strings", () => {
    expect(() => {
      validateMoney(NaN, "USD", maxLimit, allowedCurrencies);
    }).toThrow(/cannot be NaN or Infinite/);

    expect(() => {
      validateMoney(Infinity, "USD", maxLimit, allowedCurrencies);
    }).toThrow(/cannot be NaN or Infinite/);

    expect(() => {
      validateMoney("not-a-number", "USD", maxLimit, allowedCurrencies);
    }).toThrow(/valid numeric string/);
  });

  it("should reject amounts exceeding maximum transaction limit", () => {
    expect(() => {
      validateMoney(1000.01, "USD", maxLimit, allowedCurrencies);
    }).toThrow(/exceeds the maximum authorized limit/);
  });

  it("should reject unsupported currencies", () => {
    expect(() => {
      validateMoney(50.0, "XYZ", maxLimit, allowedCurrencies);
    }).toThrow(/Currency 'XYZ' is not supported/);

    expect(() => {
      validateMoney(50.0, "BTC", maxLimit, allowedCurrencies);
    }).toThrow(/Currency 'BTC' is not supported/);
  });
});
