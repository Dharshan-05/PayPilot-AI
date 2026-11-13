export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "[INVALID_EMAIL]";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function maskId(id: string, visibleChars: number = 4): string {
  if (!id) return "";
  if (id.length <= visibleChars) return "***";
  return `${id.slice(0, visibleChars)}...${id.slice(-visibleChars)}`;
}

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

export function redactSensitiveData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (
    typeof obj === "object" &&
    ((obj as any)?._isDecimal ||
      (obj as any)?.constructor?.name === "Decimal" ||
      ((obj as any)?.d && (obj as any)?.s !== undefined))
  ) {
    return obj;
  }
  if (typeof obj === "string") {
    return obj.replace(
      /(?:bearer|token|secret|key|authorization)\s*[:=]\s*['"]?[a-zA-Z0-9_\-\.]{8,}['"]?/gi,
      "[REDACTED]"
    ) as unknown as T;
  }
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

