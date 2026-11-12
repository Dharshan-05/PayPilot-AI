import { PayPalHttpClient } from "./client";
import { PayPalWebhookHeaders, PayPalWebhookEvent } from "./types";
import { DatabaseRepository, dbRepository } from "../db/repository";
import { getConfig } from "../config/env";
import { Logger } from "../observability/logger";

const log = new Logger("PayPalWebhookHandler");

export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  eventType: string;
  status: "PROCESSED" | "DUPLICATE" | "IGNORED" | "FAILED" | "INVALID_SIGNATURE";
  message?: string;
}

export type WebhookEventHandler = (event: PayPalWebhookEvent) => Promise<void>;

export class PayPalWebhookHandler {
  private client: PayPalHttpClient;
  private db: DatabaseRepository;
  private handlers: Map<string, WebhookEventHandler> = new Map();

  constructor(client?: PayPalHttpClient, db?: DatabaseRepository) {
    const config = getConfig();
    this.client =
      client ||
      new PayPalHttpClient({
        environment: config.PAYPAL_ENVIRONMENT,
        clientId: config.PAYPAL_CLIENT_ID,
        clientSecret: config.PAYPAL_CLIENT_SECRET,
        webhookId: config.PAYPAL_WEBHOOK_ID,
      });
    this.db = db || dbRepository;
    this.registerDefaultHandlers();
  }

  /**
   * Register a custom handler for a specific PayPal event type
   */
  public on(eventType: string, handler: WebhookEventHandler): void {
    this.handlers.set(eventType, handler);
  }

  public getClient(): PayPalHttpClient {
    return this.client;
  }

  private registerDefaultHandlers(): void {
    // 1. Payment Capture Completed
    this.on("PAYMENT.CAPTURE.COMPLETED", async (event) => {
      const captureId = event.resource?.id;
      const amount = event.resource?.amount?.value;
      const currency = event.resource?.amount?.currency_code;
      log.info("Webhook handled: PAYMENT.CAPTURE.COMPLETED", { captureId, amount, currency });

      // If there's a custom_id or invoice_id referencing internal order
      const customId = event.resource?.custom_id || event.resource?.supplementary_data?.related_ids?.order_id;
      if (customId) {
        await this.db.updateOrderCaptureSuccess(customId, captureId);
      }
    });

    // 2. Payment Capture Denied / Failed
    this.on("PAYMENT.CAPTURE.DENIED", async (event) => {
      const orderId =
        event.resource?.custom_id ||
        event.resource?.supplementary_data?.related_ids?.order_id;
      const captureId = event.resource?.id;
      log.warn("Webhook handled: PAYMENT.CAPTURE.DENIED", { orderId, captureId });
      if (orderId) {
        await this.db.updateOrderStatus(orderId, "FAILED", "Payment capture denied by processor");
      }
    });

    // 3. Checkout Order Approved
    this.on("CHECKOUT.ORDER.APPROVED", async (event) => {
      const orderId = event.resource?.id;
      log.info("Webhook handled: CHECKOUT.ORDER.APPROVED", { orderId });
      if (orderId) {
        await this.db.updateOrderStatus(orderId, "APPROVED");
      }
    });

    // 4. Payment Capture Refunded
    this.on("PAYMENT.CAPTURE.REFUNDED", async (event) => {
      const orderId =
        event.resource?.custom_id ||
        event.resource?.supplementary_data?.related_ids?.order_id;
      const refundId = event.resource?.id;
      log.info("Webhook handled: PAYMENT.CAPTURE.REFUNDED", { orderId, refundId });
      if (orderId) {
        await this.db.updateOrderStatus(orderId, "REFUNDED", "Payment refunded via processor");
      }
    });
  }

  /**
   * Verifies webhook authenticity with PayPal API using verify-webhook-signature
   */
  async verifySignature(
    headers: PayPalWebhookHeaders,
    rawBody: string | Record<string, any>
  ): Promise<boolean> {
    const config = getConfig();
    const webhookId = config.PAYPAL_WEBHOOK_ID;

    if (!webhookId) {
      log.error("PAYPAL_WEBHOOK_ID is not configured. Rejecting webhook.");
      return false;
    }

    if (
      !headers.transmissionId ||
      !headers.transmissionTime ||
      !headers.certUrl ||
      !headers.authAlgo ||
      !headers.transmissionSig
    ) {
      log.warn("Missing required PayPal webhook headers for signature verification");
      return false;
    }

    const eventPayload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

    try {
      const verificationResponse = await this.client.request<{
        verification_status: "SUCCESS" | "FAILURE";
      }>("/v1/notifications/verify-webhook-signature", {
        method: "POST",
        body: {
          auth_algo: headers.authAlgo,
          cert_url: headers.certUrl,
          transmission_id: headers.transmissionId,
          transmission_sig: headers.transmissionSig,
          transmission_time: headers.transmissionTime,
          webhook_id: webhookId,
          webhook_event: eventPayload,
        },
      });

      return verificationResponse.verification_status === "SUCCESS";
    } catch (err) {
      log.error("Signature verification request to PayPal failed", err);
      return false;
    }
  }

  /**
   * Complete webhook intake pipeline:
   * 1. Validate structure
   * 2. Verify signature
   * 3. Deduplicate
   * 4. Dispatch handler
   * 5. Record result in DB
   */
  async processEvent(
    headers: PayPalWebhookHeaders,
    rawBody: string | Record<string, any>
  ): Promise<WebhookProcessingResult> {
    let event: PayPalWebhookEvent;
    try {
      event = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    } catch {
      return {
        success: false,
        eventId: "unknown",
        eventType: "unknown",
        status: "FAILED",
        message: "Malformed JSON payload in webhook body",
      };
    }

    if (!event.id || !event.event_type) {
      return {
        success: false,
        eventId: event.id || "unknown",
        eventType: event.event_type || "unknown",
        status: "FAILED",
        message: "Event payload missing required id or event_type",
      };
    }

    // 1. Signature verification
    const isVerified = await this.verifySignature(headers, rawBody);
    if (!isVerified) {
      await this.db.recordWebhookEvent({
        eventId: event.id,
        eventType: event.event_type,
        resourceType: event.resource_type,
        processingStatus: "INVALID_SIGNATURE",
        signatureVerified: false,
        payload: event,
        errorMessage: "Signature verification failed",
      });

      return {
        success: false,
        eventId: event.id,
        eventType: event.event_type,
        status: "INVALID_SIGNATURE",
        message: "Invalid webhook signature",
      };
    }

    // 2. Deduplication check
    const existing = await this.db.getWebhookEventByEventId(event.id);
    if (existing) {
      log.info("Duplicate webhook event received; skipping processing", { eventId: event.id });
      await this.db.recordWebhookEvent({
        eventId: `${event.id}_dup_${Date.now()}`,
        eventType: event.event_type,
        resourceType: event.resource_type,
        processingStatus: "DUPLICATE",
        signatureVerified: true,
        payload: event,
      });

      return {
        success: true,
        eventId: event.id,
        eventType: event.event_type,
        status: "DUPLICATE",
        message: "Event already processed",
      };
    }

    // 3. Persist initial receipt
    await this.db.recordWebhookEvent({
      eventId: event.id,
      eventType: event.event_type,
      resourceType: event.resource_type,
      processingStatus: "VERIFIED",
      signatureVerified: true,
      payload: event,
    });

    // 4. Dispatch handler
    const handler = this.handlers.get(event.event_type);
    if (!handler) {
      log.info("No handler registered for event type; marking IGNORED", { eventType: event.event_type });
      await this.db.updateWebhookEventStatus(event.id, "PROCESSED", "Ignored - no handler");
      return {
        success: true,
        eventId: event.id,
        eventType: event.event_type,
        status: "IGNORED",
        message: "Event acknowledged; no internal handler registered",
      };
    }

    try {
      await handler(event);
      await this.db.updateWebhookEventStatus(event.id, "PROCESSED");
      return {
        success: true,
        eventId: event.id,
        eventType: event.event_type,
        status: "PROCESSED",
      };
    } catch (err: any) {
      log.error("Webhook event handler threw error", err, { eventId: event.id });
      await this.db.updateWebhookEventStatus(event.id, "FAILED", err.message);
      return {
        success: false,
        eventId: event.id,
        eventType: event.event_type,
        status: "FAILED",
        message: err.message,
      };
    }
  }
}

export const payPalWebhookHandler = new PayPalWebhookHandler();
