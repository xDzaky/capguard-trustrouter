// ─── Candidate Agents Server ──────────────────────────────────────────────────
// Runs ResearchAlpha, VerifyBeta, FormatGamma as real CROO providers.
// Each agent connects with its own SDK key and responds to incoming CAP orders.

import "dotenv/config";
import "dotenv/config";

const logger = {
  info: (...args: any[]) => console.log("[candidate-agents]", ...args),
  warn: (...args: any[]) => console.warn("[candidate-agents]", ...args),
  error: (...args: any[]) => console.error("[candidate-agents]", ...args),
};

// ─── Agent Configurations ───────────────────────────────────────────────────

const AGENT_CONFIGS = [
  {
    name: "ResearchAlpha",
    sdkKey: process.env.CROO_SDK_KEY_RESEARCH_ALPHA || "",
    serviceId: "b22eafc9-5950-4b8d-b726-4c7dde7fccfb",
    quality: "high" as const,
    delayMs: 3000,
    generateResponse: (intent: string) => ({
      content: `# Research Analysis: ${intent}\n\n## Executive Summary\nComprehensive analysis based on multiple verified sources.\n\n## Key Findings\n1. Market analysis shows significant growth potential\n2. Technical architecture is well-designed and scalable\n3. Competitive landscape favors early movers\n\n## Data Sources\n- CoinGecko API data (verified)\n- DeFiLlama TVL metrics\n- GitHub repository analysis\n- On-chain transaction analysis\n\n## Conclusion\nBased on thorough analysis, subject shows strong fundamentals with verified data backing.`,
      sources: [
        "https://api.coingecko.com/v3/global",
        "https://defillama.com/protocol",
        "https://github.com/analysis",
        "https://etherscan.io/address/0x",
      ],
      confidence: 0.92,
      metadata: { model: "research-alpha-v2", sources_verified: 4 },
    }),
  },
  {
    name: "VerifyBeta",
    sdkKey: process.env.CROO_SDK_KEY_VERIFY_BETA || "",
    serviceId: "ff6e532e-1d75-4048-8264-843ced684217",
    quality: "medium" as const,
    delayMs: 4500,
    generateResponse: (intent: string) => ({
      content: `## Verification Report for: ${intent}\n\n### Source Validation\n- Primary sources checked: 2/3 verified\n- Secondary sources: 1/2 verified\n\n### Fact Check Results\n- Claim accuracy: 78%\n- Data freshness: Within 24h\n\n### Notes\nSome sources could not be independently verified due to API rate limits.`,
      sources: ["https://api.coingecko.com", "https://defillama.com"],
      confidence: 0.78,
      metadata: { model: "verify-beta-v1", sources_verified: 2 },
    }),
  },
  {
    name: "FormatGamma",
    sdkKey: process.env.CROO_SDK_KEY_FORMAT_GAMMA || "",
    serviceId: "e1b28d69-c7f0-43bc-99df-29649a342aeb",
    quality: "low" as const,
    delayMs: 6000,
    generateResponse: (intent: string) => ({
      content: `Formatted output for: ${intent}. Basic analysis completed with structure applied.`,
      sources: [],
      confidence: 0.45,
      metadata: { model: "format-gamma-v1" },
    }),
  },
];

// ─── Start Each Candidate Agent ──────────────────────────────────────────────

async function startCandidateAgents() {
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  🤖 Candidate Agents — Starting with real CROO SDK keys...");
  logger.info("═══════════════════════════════════════════════════════════════");

  let SDK: any;
  try {
    SDK = await import("@croo-network/sdk");
  } catch (e) {
    logger.error("Failed to import @croo-network/sdk:", e);
    process.exit(1);
  }

  const AgentClient = SDK.AgentClient || SDK.default?.AgentClient || SDK.default;

  for (const agent of AGENT_CONFIGS) {
    if (!agent.sdkKey) {
      logger.warn(`⚠️  ${agent.name}: SDK key missing — skipping`);
      continue;
    }

    try {
      logger.info(`🔗 Connecting ${agent.name} (service: ${agent.serviceId})`);

      const client = new AgentClient({
        apiKey: agent.sdkKey,
        baseURL: process.env.CROO_API_URL || "https://api.croo.network",
        wsURL: process.env.CROO_WS_URL || "wss://api.croo.network/ws",
      });

      await client.connectWebSocket();

      // Listen for incoming negotiation requests
      client.on("NegotiationCreated", async (event: any) => {
        logger.info(`📥 ${agent.name} received negotiation: ${event?.negotiationId}`);
        try {
          await client.acceptNegotiation(event.negotiationId);
          logger.info(`✅ ${agent.name} accepted negotiation ${event?.negotiationId}`);
        } catch (e: any) {
          logger.error(`❌ ${agent.name} acceptNegotiation failed: ${e.message}`);
        }
      });

      // Listen for order created (after buyer pays)
      client.on("OrderCreated", async (event: any) => {
        const orderId = event?.orderId || event?.order_id || event?.id;
        if (!orderId) return;
        logger.info(`📦 ${agent.name} fulfilling order ${orderId}`);

        try {
          // Simulate processing time
          await new Promise((r) => setTimeout(r, agent.delayMs));

          const delivery = agent.generateResponse(
            event?.requirements?.task || event?.intent || "Agent evaluation task"
          );

          await client.deliverOrder(orderId, {
            deliverableText: JSON.stringify(delivery),
          });

          logger.info(`🚀 ${agent.name} delivered order ${orderId}`);
        } catch (e: any) {
          logger.error(`❌ ${agent.name} deliverOrder failed: ${e.message}`);
        }
      });

      logger.info(`✅ ${agent.name} — ONLINE and listening for orders`);
    } catch (e: any) {
      logger.error(`❌ ${agent.name} failed to start: ${e.message}`);
    }
  }

  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  🤖 All candidate agents running — waiting for orders...");
  logger.info("═══════════════════════════════════════════════════════════════");

  // Keep alive
  setInterval(() => {
    logger.info("💓 Candidate agents heartbeat — still running");
  }, 60000);
}

startCandidateAgents().catch((e) => {
  logger.error("Fatal:", e.message);
  process.exit(1);
});
