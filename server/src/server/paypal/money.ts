import { PayPalApiError } from "./errors";

export interface ValidatedMoney {
  amountMinor: number; // Stored in integer cents to eliminate floating-point drift
  amountFormatted: string; // Standard "XX.YY" representation for PayPal REST API
  currency: string;
}

/**
 * Validates, sanitizes, and normalizes financial amounts and currencies.
 * Prevents precision abuse, NaN, Infinity, negative values, and floating point drift.
 */
export function validateMoney(
  rawAmount: unknown,
  rawCurrency: unknown,
  maxAmount: number,
  allowedCurrencies: string[]
): ValidatedMoney {
  // 1. Currency validation
  if (typeof rawCurrency !== "string" || rawCurrency.trim().length !== 3) {
    throw new PayPalApiError(
      400,
      "INVALID_CURRENCY",
      "Currency code must be a valid 3-letter ISO code."
    );
  }

  const currency = rawCurrency.trim().toUpperCase();
  if (!allowedCurrencies.includes(currency)) {
    throw new PayPalApiError(
      400,
      "UNSUPPORTED_CURRENCY",
      `Currency '${currency}' is not supported. Supported currencies: ${allowedCurrencies.join(", ")}`
    );
  }

  // 2. Numerical format and type validation
  let numVal: number;
  let strRepresentation = "";

  if (typeof rawAmount === "number") {
    numVal = rawAmount;
    strRepresentation = rawAmount.toString();
  } else if (typeof rawAmount === "string") {
    const trimmed = rawAmount.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new PayPalApiError(
        400,
        "INVALID_AMOUNT",
        "Payment amount must be a valid numeric string or number."
      );
    }
    numVal = parseFloat(trimmed);
    strRepresentation = trimmed;
  } else {
    throw new PayPalApiError(
      400,
      "INVALID_AMOUNT",
      "Payment amount must be a number or numeric string."
    );
  }

  // Check for NaN or Infinite values
  if (isNaN(numVal) || !isFinite(numVal)) {
    throw new PayPalApiError(
      400,
      "INVALID_AMOUNT",
      "Payment amount cannot be NaN or Infinite."
    );
  }

  // 3. Positive value check
  if (numVal <= 0) {
    throw new PayPalApiError(
      400,
      "INVALID_AMOUNT",
      "Payment amount must be a positive number."
    );
  }

  // 4. Decimal precision validation (enforce max 2 decimal places for standard fiat)
  if (strRepresentation.includes(".")) {
    const decimals = strRepresentation.split(".")[1];
    if (decimals && decimals.length > 2) {
      throw new PayPalApiError(
        400,
        "INVALID_PRECISION",
        "Payment amount cannot have more than 2 decimal places."
      );
    }
  }

  // Convert to integer minor units (cents)
  const amountMinor = Math.round(numVal * 100);
  const normalizedNum = amountMinor / 100;

  // 5. Maximum transaction limit check
  if (normalizedNum > maxAmount) {
    throw new PayPalApiError(
      400,
      "AMOUNT_LIMIT_EXCEEDED",
      `Payment amount of ${normalizedNum.toFixed(2)} ${currency} exceeds the maximum authorized limit of ${maxAmount.toFixed(2)} ${currency}.`
    );
  }

  return {
    amountMinor,
    amountFormatted: (amountMinor / 100).toFixed(2),
    currency,
  };
}
