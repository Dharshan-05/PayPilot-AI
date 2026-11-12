import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { PayPalApiError } from "../paypal/errors";
import { Logger } from "../observability/logger";

const log = new Logger("ApiResponse");

export interface ApiSuccessBody<T = any> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: any;
  };
}

export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  statusCode: number = 200
): NextResponse<ApiSuccessBody<T>> {
  const response = NextResponse.json(
    {
      success: true as const,
      data,
      requestId,
    },
    { status: statusCode }
  );

  response.headers.set("x-request-id", requestId);
  return response;
}

export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  statusCode: number = 400,
  details?: any
): NextResponse<ApiErrorBody> {
  const response = NextResponse.json(
    {
      error: {
        code,
        message,
        requestId,
        ...(details && { details }),
      },
    },
    { status: statusCode }
  );

  response.headers.set("x-request-id", requestId);
  return response;
}

/**
 * Strips sensitive server filesystem paths and credentials from error messages.
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg || typeof msg !== "string") return "An error occurred.";
  return msg
    .replace(/[A-Za-z]:\\[^ \t\r\n\(\)]+/g, "[REDACTED_PATH]")
    .replace(/\/(?:Users|home|var|usr|etc)\/[^ \t\r\n\(\)]+/g, "[REDACTED_PATH]")
    .replace(/file:\/\/[^ \t\r\n]+/g, "[REDACTED_URI]")
    .replace(/prisma(?::[a-z]+|\.[a-z]+)?/gi, "database")
    .trim();
}

export function handleApiError(error: unknown, requestId: string): NextResponse<ApiErrorBody> {
  // 1. Zod Validation Errors
  if (error instanceof ZodError) {
    const issues = error.issues || (error as any).errors || [];
    const formatted = issues.map((e: any) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    log.warn("Validation error in API request", { details: formatted, requestId });
    return createErrorResponse(
      "VALIDATION_ERROR",
      "The request body failed schema validation.",
      requestId,
      400,
      formatted
    );
  }

  // 2. PayPal API Errors
  if (error instanceof PayPalApiError) {
    log.warn("PayPal API error in request handler", {
      code: error.errorCode,
      safeMessage: error.safeMessage,
      requestId,
    });
    return createErrorResponse(
      error.errorCode,
      error.safeMessage,
      requestId,
      error.statusCode,
      error.details
    );
  }

  // 3. Known Domain & Security Errors
  if (error instanceof Error) {
    const errName = error.name;

    if (errName === "PayloadTooLargeError") {
      log.warn("Request payload too large", { requestId, message: error.message });
      return createErrorResponse("PAYLOAD_TOO_LARGE", error.message, requestId, 413);
    }

    if (errName === "MalformedJsonError" || error.message.includes("JSON format") || error.message.includes("body is empty")) {
      log.warn("Malformed JSON request", { requestId, message: error.message });
      return createErrorResponse("MALFORMED_REQUEST", error.message, requestId, 400);
    }

    if (errName === "ProposalExpiredError") {
      log.warn("Proposal expired error", { requestId, message: error.message });
      return createErrorResponse("PROPOSAL_EXPIRED", error.message, requestId, 410);
    }

    if (errName === "PriceMismatchError") {
      log.warn("Price mismatch error", { requestId, message: error.message });
      return createErrorResponse("PRICE_MISMATCH", error.message, requestId, 409);
    }

    if (errName === "InventoryUnavailableError") {
      log.warn("Inventory unavailable error", { requestId, message: error.message });
      return createErrorResponse("INVENTORY_UNAVAILABLE", error.message, requestId, 409);
    }

    if (errName === "ProposalInvalidStateError") {
      log.warn("Proposal invalid state error", { requestId, message: error.message });
      return createErrorResponse("INVALID_STATE", error.message, requestId, 400);
    }

    log.error("Internal API error", error, { requestId });
    const isDev = process.env.NODE_ENV !== "production";
    const sanitizedMsg = sanitizeErrorMessage(error.message);
    return createErrorResponse(
      "INTERNAL_ERROR",
      isDev ? sanitizedMsg : "An internal server error occurred.",
      requestId,
      500
    );
  }

  log.error("Unknown error in API handler", undefined, { rawError: String(error), requestId });
  return createErrorResponse(
    "UNKNOWN_ERROR",
    "An unexpected error occurred. Please try again.",
    requestId,
    500
  );
}
