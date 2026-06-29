// ─── CAPGuard TrustRouter — Main Entry Point ────────────────────────────────
// Provider runtime that listens for CAP WebSocket events and orchestrates
// trust evaluation jobs.

import "dotenv/config";
import { TrustRouterOrchestrator } from "./orchestrator.js";
import { startApiServer } from "./api.js";
import { database } from "./database.js";
import logger from "./logger.js";

let orchestrator: TrustRouterOrchestrator | null = null;

export function getOrchestrator(): TrustRouterOrchestrator | null {
  return orchestrator;
}

async function main() {
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  🛡️  CAPGuard TrustRouter — Starting...");
  logger.info("═══════════════════════════════════════════════════════════════");

  const apiKey = process.env.CROO_SDK_KEY_PROVIDER;
  const apiUrl = process.env.CROO_API_URL || "https://api.croo.network";
  const wsUrl = process.env.CROO_WS_URL || "wss://api.croo.network/ws";
  const apiPort = parseInt(process.env.DASHBOARD_API_PORT || "3001", 10);

  // Start the Dashboard API server
  startApiServer(apiPort);

  // Try to connect to CROO SDK
  let providerClient: any = null;
  let executorClient: any = null;

  if (apiKey) {
    try {
      const SDK = await import("@croo-network/sdk");
      const AgentClient = SDK.AgentClient || SDK.default?.AgentClient || SDK.default;

      if (AgentClient) {
        const config = {
          baseURL: apiUrl,
          wsURL: wsUrl,
          rpcURL: process.env.BASE_RPC_URL || "https://mainnet.base.org",
        };

        providerClient = new AgentClient(config, apiKey);

        // ─── Executor Client ──────────────────────────────────────────────
        // The executor buys services from candidate agents on behalf of CAPGuard.
        // It MUST use the CAPGuard provider key (NOT a candidate agent key) so
        // that CROO does not reject it as "cannot negotiate own service".
        // Executor uses HTTP-only (no WebSocket) to avoid "duplicate key" error
        // since the provider already holds the WebSocket connection on this key.
        const executorKey = process.env.CROO_SDK_KEY_EXECUTOR || apiKey;
        // If executor key equals provider key, we can't open another WS.
        // We create the client the same way — SDK HTTP calls don't need WS open.
        executorClient = new AgentClient(config, executorKey);
        // NOTE: We intentionally do NOT call executorClient.connectWebSocket().
        // All executor operations (negotiate, pay, getOrder, getDelivery) are
        // REST HTTP calls and work without a WebSocket connection.

        logger.info("✅ Connected to CROO SDK");

        // Connect WebSocket for provider events
        try {
          const stream = await providerClient.connectWebSocket();

          // Listen for incoming negotiations
          const EventType = SDK.EventType || SDK.default?.EventType;

          if (EventType) {
            stream.on(EventType.NegotiationCreated, async (event: any) => {
              logger.info({ negotiation_id: event.negotiation_id }, "📨 New negotiation received");

              try {
                const result = await providerClient.acceptNegotiation(event.negotiation_id);
                const orderId = result?.order?.orderId || result?.orderId || result?.order_id;
                logger.info({ orderId }, "✅ Negotiation accepted → Order created");
              } catch (err: any) {
                logger.error({ error: err.message }, "Failed to accept negotiation");
              }
            });

            stream.on(EventType.OrderPaid, async (event: any) => {
              logger.info({ order_id: event.order_id }, "💰 Order paid — starting trust evaluation");

              try {
                const report = await orchestrator!.startTrustJob(
                  event.order_id,
                  "Trust evaluation request",
                  event.buyer_wallet || "unknown"
                );

                // Deliver the trust report via CAP
                const DeliverableType = SDK.DeliverableType || SDK.default?.DeliverableType;
                await providerClient.deliverOrder(event.order_id, {
                  deliverableType: DeliverableType?.Text || "text",
                  deliverableText: JSON.stringify(report),
                });

                logger.info({ order_id: event.order_id, reportHash: report.report_hash.slice(0, 18) },
                  "📦 Trust report delivered via CAP");
              } catch (err: any) {
                logger.error({ order_id: event.order_id, error: err.message },
                  "Failed to process paid order");
              }
            });
          }

          logger.info("🔌 WebSocket event listeners registered");
        } catch (wsErr: any) {
          logger.warn({ error: wsErr.message }, "⚠️ WebSocket connection failed — running in API-only mode");
        }
      }
    } catch (sdkErr: any) {
      logger.warn({ error: sdkErr.message },
        "⚠️ CROO SDK not available — running in simulation mode");
    }
  } else {
    logger.warn("⚠️ No CROO_SDK_KEY_PROVIDER set — running in simulation mode");
  }

  // Create orchestrator (works with or without real SDK)
  orchestrator = new TrustRouterOrchestrator(providerClient, executorClient);

  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  🛡️  CAPGuard TrustRouter is READY");
  logger.info(`  📊 Dashboard API: http://localhost:${apiPort}`);
  logger.info(`  🔑 SDK Mode: ${providerClient ? "LIVE" : "SIMULATION"}`);
  logger.info("═══════════════════════════════════════════════════════════════");

  // Graceful shutdown
  const cleanup = () => {
    logger.info("Shutting down...");
    database.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((err) => {
  logger.error({ error: err.message }, "Fatal error");
  process.exit(1);
});
