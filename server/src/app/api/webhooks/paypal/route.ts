import { NextRequest } from "next/server";
import { payPalWebhookHandler } from "@/server/paypal/webhooks";
import { PayPalWebhookHeaders } from "@/server/paypal/types";
import {
  createSuccessResponse,
  createErrorResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
  MAX_REQUEST_BODY_BYTES,
  PayloadTooLargeError,
} from "@/server/api";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "webhooks_paypal", "sensitive");
  if (limited) return limited;

  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return createErrorResponse(
        "MALFORMED_REQUEST",
        "Webhook request body is empty.",
        requestId,
        400
      );
    }
    if (rawBody.length > MAX_REQUEST_BODY_BYTES) {
      throw new PayloadTooLargeError(
        `Webhook payload of ${rawBody.length} bytes exceeds ${MAX_REQUEST_BODY_BYTES} bytes limit.`
      );
    }

    const headers: PayPalWebhookHeaders = {
      transmissionId: req.headers.get("paypal-transmission-id") || "",
      transmissionTime: req.headers.get("paypal-transmission-time") || "",
      certUrl: req.headers.get("paypal-cert-url") || "",
      authAlgo: req.headers.get("paypal-auth-algo") || "",
      transmissionSig: req.headers.get("paypal-transmission-sig") || "",
    };

    const result = await payPalWebhookHandler.processEvent(headers, rawBody);

    if (result.status === "INVALID_SIGNATURE") {
      return createErrorResponse(
        "INVALID_SIGNATURE",
        "PayPal webhook signature verification failed.",
        requestId,
        401
      );
    }

    if (!result.success && result.status === "FAILED") {
      return createErrorResponse(
        "WEBHOOK_PROCESSING_FAILED",
        result.message || "Failed to process webhook event.",
        requestId,
        400
      );
    }

    return createSuccessResponse(result, requestId, 200);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
