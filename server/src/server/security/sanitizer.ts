/**
 * Sanitizes input text to prevent control characters, script tags, and excessive length.
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== "string") {
    return "";
  }
  // Strip null bytes, control characters (except common whitespace), and HTML script tags
  let sanitized = input
    .replace(/\0/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates and normalizes numerical currency amounts (prevents negative, NaN, infinity).
 */
export function sanitizeAmount(amount: unknown): number | null {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    return null;
  }
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
}
