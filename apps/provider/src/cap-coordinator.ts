// ─── CAP Order Coordinator ──────────────────────────────────────────────────
// Event-driven sub-order lifecycle manager for real CAP transactions.
// Handles: negotiate → pay → wait completion → get delivery with retry/timeout.

import logger from "./logger.js";

export interface CapOrderResult {
  negotiation_id: string;
  order_id: string;
  tx_hash: string | null;
  delivery: any;
  latency_ms: number;
  retries: number;
  raw_events: CapEvent[];
}

export interface CapEvent {
  timestamp: string;
  type: string;
  data: any;
}

interface CoordinatorConfig {
  maxRetries: number;
  pollIntervalMs: number;
}

const DEFAULT_CONFIG: CoordinatorConfig = {
  maxRetries: parseInt(process.env.CAP_SUBORDER_MAX_RETRIES || "2", 10),
  pollIntervalMs: 2000,
};

/**
 * Coordinates real CAP sub-order lifecycle:
 * negotiateOrder → payOrder → waitForCompletion → getDelivery
 */
export class CapOrderCoordinator {
  private client: any;
  private config: CoordinatorConfig;

  constructor(executorClient: any, config?: Partial<CoordinatorConfig>) {
    this.client = executorClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a full CAP order lifecycle with retry support.
   */
  async executeOrder(
    serviceId: string,
    requirements: string,
    slaTimeoutMs: number
  ): Promise<CapOrderResult> {
    const startTime = Date.now();
    const events: CapEvent[] = [];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        logger.warn({ serviceId, attempt, maxRetries: this.config.maxRetries },
          `🔄 Retrying sub-order (attempt ${attempt + 1})`);
        events.push({
          timestamp: new Date().toISOString(),
          type: "RetryAttempt",
          data: { attempt, reason: lastError?.message },
        });
      }

      try {
        const result = await this.executeSingleAttempt(
          serviceId, requirements, slaTimeoutMs, startTime, events
        );
        result.retries = attempt;
        return result;
      } catch (error: any) {
        lastError = error;
        logger.warn({ serviceId, attempt, error: error.message },
          "⚠️ Sub-order attempt failed");
        events.push({
          timestamp: new Date().toISOString(),
          type: "AttemptFailed",
          data: { attempt, error: error.message },
        });
      }
    }

    // All retries exhausted
    throw new Error(
      `CAP sub-order to ${serviceId} failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  private async executeSingleAttempt(
    serviceId: string,
    requirements: string,
    slaTimeoutMs: number,
    startTime: number,
    events: CapEvent[]
  ): Promise<CapOrderResult> {
    // Step 1: Negotiate
    logger.info({ serviceId }, "📝 Creating CAP negotiation");
    const neg = await this.client.negotiateOrder({ serviceId, requirements });
    const negId = neg.negotiationId || neg.negotiation_id || neg.id;

    events.push({
      timestamp: new Date().toISOString(),
      type: "NegotiationCreated",
      data: { negotiation_id: negId, service_id: serviceId },
    });

    // Step 2: Wait for order creation, then pay
    const orderId = await this.waitForOrderAndPay(negId, serviceId, slaTimeoutMs, events);

    // Step 3: Wait for completion
    await this.waitForCompletion(orderId, serviceId, slaTimeoutMs, events);

    // Step 4: Get delivery
    logger.info({ orderId, serviceId }, "📥 Fetching delivery");
    const deliveryResult = await this.client.getDelivery(orderId);
    const delivery = deliveryResult?.deliverableText || deliveryResult?.delivery || deliveryResult;

    events.push({
      timestamp: new Date().toISOString(),
      type: "DeliveryRetrieved",
      data: { order_id: orderId },
    });

    const latencyMs = Date.now() - startTime;

    return {
      negotiation_id: negId,
      order_id: orderId,
      tx_hash: deliveryResult?.txHash || deliveryResult?.tx_hash || null,
      delivery,
      latency_ms: latencyMs,
      retries: 0,
      raw_events: events,
    };
  }

  /**
   * Wait for order to be created from negotiation, then pay.
   * Uses polling with getOrder/listOrders as SDK may not expose direct event subscription.
   */
  private async waitForOrderAndPay(
    negId: string,
    serviceId: string,
    timeoutMs: number,
    events: CapEvent[]
  ): Promise<string> {
    const deadline = Date.now() + timeoutMs;

    // Try to find the order associated with this negotiation
    while (Date.now() < deadline) {
      try {
        // Some SDK versions return order info from negotiation
        const orders = await this.client.listOrders();
        const order = orders?.find?.((o: any) =>
          (o.negotiationId === negId || o.negotiation_id === negId) &&
          (o.status === "created" || o.status === "pending_payment" || o.status === "CREATED")
        );

        if (order) {
          const orderId = order.orderId || order.order_id || order.id;
          logger.info({ orderId, negId }, "💳 Paying order");

          events.push({
            timestamp: new Date().toISOString(),
            type: "OrderFound",
            data: { order_id: orderId, negotiation_id: negId },
          });

          await this.client.payOrder(orderId);

          events.push({
            timestamp: new Date().toISOString(),
            type: "OrderPaid",
            data: { order_id: orderId },
          });

          return orderId;
        }
      } catch (e: any) {
        // listOrders might fail transiently, keep polling
        logger.debug({ negId, error: e.message }, "Polling for order...");
      }

      await this.sleep(this.config.pollIntervalMs);
    }

    throw new Error(`Timeout waiting for order creation from negotiation ${negId}`);
  }

  /**
   * Wait for order completion after payment.
   */
  private async waitForCompletion(
    orderId: string,
    serviceId: string,
    timeoutMs: number,
    events: CapEvent[]
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        const order = await this.client.getOrder(orderId);
        const status = order?.status?.toLowerCase?.() || "";

        if (status === "completed" || status === "delivered") {
          events.push({
            timestamp: new Date().toISOString(),
            type: "OrderCompleted",
            data: { order_id: orderId, status },
          });
          return;
        }

        if (status === "failed" || status === "rejected" || status === "disputed") {
          throw new Error(`Order ${orderId} ended with status: ${status}`);
        }
      } catch (e: any) {
        if (e.message.includes("ended with status")) throw e;
        logger.debug({ orderId, error: e.message }, "Polling for completion...");
      }

      await this.sleep(this.config.pollIntervalMs);
    }

    throw new Error(`Timeout waiting for completion of order ${orderId}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default CapOrderCoordinator;
