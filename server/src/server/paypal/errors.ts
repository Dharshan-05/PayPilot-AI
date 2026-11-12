export interface PayPalErrorDetail {
  field?: string;
  value?: string;
  issue: string;
  description?: string;
}

export class PayPalApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly safeMessage: string;
  public readonly details?: PayPalErrorDetail[];

  constructor(
    statusCode: number,
    errorCode: string,
    safeMessage: string,
    rawMessage?: string,
    details?: PayPalErrorDetail[]
  ) {
    super(safeMessage);
    this.name = "PayPalApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.safeMessage = safeMessage;
    this.details = details;
  }
}

/**
 * Normalizes unknown PayPal API responses, network faults, or SDK exceptions into safe, structured errors.
 */
export function normalizePayPalError(error: unknown): PayPalApiError {
  if (error instanceof PayPalApiError) {
    return error;
  }

  if (error && typeof error === "object") {
    const anyErr = error as any;

    // PayPal API JSON error payload format: { name, message, details: [...] }
    if (anyErr.name && typeof anyErr.message === "string") {
      const code = anyErr.name.toUpperCase();
      let safeMsg = "A payment gateway communication error occurred.";

      if (code === "UNPROCESSABLE_ENTITY") {
        safeMsg = "The payment request contained unprocessable data.";
      } else if (code === "AUTHENTICATION_FAILURE") {
        safeMsg = "Payment gateway authentication failed.";
      } else if (code === "RESOURCE_NOT_FOUND") {
        safeMsg = "The requested PayPal resource was not found.";
      } else if (code === "ORDER_ALREADY_CAPTURED") {
        safeMsg = "This order has already been captured.";
      } else if (code === "PAYER_ACTION_REQUIRED") {
        safeMsg = "Customer approval is required before capturing this payment.";
      }

      return new PayPalApiError(
        anyErr.status || anyErr.statusCode || 400,
        code,
        safeMsg,
        anyErr.message,
        anyErr.details
      );
    }

    if (anyErr.code === "ECONNREFUSED" || anyErr.code === "ETIMEDOUT") {
      return new PayPalApiError(
        504,
        "PAYPAL_NETWORK_TIMEOUT",
        "Connection to PayPal payment gateway timed out. Please retry shortly.",
        anyErr.message
      );
    }
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  return new PayPalApiError(
    500,
    "PAYPAL_GATEWAY_ERROR",
    "An unexpected error occurred while communicating with the payment processor.",
    rawMessage
  );
}
