import { NextRequest, NextResponse } from "next/server";
import { generateRequestId } from "../observability/correlation";
import { apiRateLimiter, sensitiveActionRateLimiter } from "../security/rate-limiter";
import { createErrorResponse } from "./response";

export const MAX_REQUEST_BODY_BYTES = 1_048_576; // 1 MB payload limit

export class PayloadTooLargeError extends Error {
  constructor(message: string = "Request body exceeds maximum allowed size (1 MB).") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

export class MalformedJsonError extends Error {
  constructor(message: string = "Invalid JSON format in request body.") {
    super(message);
    this.name = "MalformedJsonError";
  }
}

export function getRequestIdFromHeader(req: NextRequest | Request): string {
  const headerId = req.headers.get("x-request-id");
  if (headerId && typeof headerId === "string" && headerId.length > 0) {
    return headerId;
  }
  return generateRequestId();
}

export async function safeParseJson<T>(req: Request, maxBytes: number = MAX_REQUEST_BODY_BYTES): Promise<T> {
  const text = await req.text();
  if (!text || text.trim().length === 0) {
    throw new Error("Request body is empty.");
  }
  if (text.length > maxBytes) {
    throw new PayloadTooLargeError(`Request body of ${text.length} bytes exceeds ${maxBytes} bytes limit.`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new MalformedJsonError();
  }
}

export function extractClientIdentifier(req: NextRequest | Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim().length > 0) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export function enforceRateLimit(
  req: NextRequest | Request,
  requestId: string,
  routeKey: string,
  tier: "general" | "sensitive" = "general"
): NextResponse | null {
  const limiter = tier === "sensitive" ? sensitiveActionRateLimiter : apiRateLimiter;
  const clientId = extractClientIdentifier(req);
  const bucketKey = `${routeKey}:${clientId}`;
  const result = limiter.check(bucketKey);

  if (!result.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil(result.resetMs / 1000));
    const res = createErrorResponse(
      "RATE_LIMIT_EXCEEDED",
      "Too many requests. Please wait before trying again.",
      requestId,
      429
    );
    res.headers.set("Retry-After", String(retryAfterSec));
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", "0");
    return res;
  }

  return null;
}
