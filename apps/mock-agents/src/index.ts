// ─── Mock Agents for Demo & Testing ─────────────────────────────────────────
// These simple agents simulate candidate providers for TrustRouter to evaluate.
// Each mock agent responds with different quality levels to test scoring.

import "dotenv/config";

const logger = {
  info: (...args: any[]) => console.log("[mock-agents]", ...args),
  warn: (...args: any[]) => console.warn("[mock-agents]", ...args),
  error: (...args: any[]) => console.error("[mock-agents]", ...args),
};

// ─── Mock Agent Definitions ─────────────────────────────────────────────────

interface MockAgent {
  id: string;
  name: string;
  quality: "high" | "medium" | "low";
  delayMs: number;
  generateResponse: (intent: string) => any;
}

const mockAgents: MockAgent[] = [
  {
    id: "svc_research_alpha",
    name: "ResearchAlpha",
    quality: "high",
    delayMs: 3000,
    generateResponse: (intent: string) => ({
      content: `# Research Analysis: ${intent}\n\n## Executive Summary\nComprehensive analysis based on multiple verified sources.\n\n## Key Findings\n1. Market analysis shows significant growth potential\n2. Technical architecture is well-designed and scalable\n3. Competitive landscape favors early movers\n\n## Data Sources\n- CoinGecko API data (verified)\n- DeFiLlama TVL metrics\n- GitHub repository analysis\n- On-chain transaction analysis\n\n## Conclusion\nBased on thorough analysis across multiple dimensions, the subject shows strong fundamentals with verified data backing.`,
      sources: [
        "https://api.coingecko.com/v3/global",
        "https://defillama.com/protocol",
        "https://github.com/analysis",
        "https://etherscan.io/address/0x",
      ],
      confidence: 0.92,
      metadata: {
        model: "research-alpha-v2",
        processing_time_ms: 2800,
        sources_verified: 4,
      },
    }),
  },
  {
    id: "svc_verify_beta",
    name: "VerifyBeta",
    quality: "medium",
    delayMs: 4500,
    generateResponse: (intent: string) => ({
      content: `## Verification Report for: ${intent}\n\n### Source Validation\n- Primary sources checked: 2/3 verified\n- Secondary sources: 1/2 verified\n\n### Fact Check Results\n- Claim accuracy: 78%\n- Data freshness: Within 24h\n\n### Notes\nSome sources could not be independently verified due to API rate limits.`,
      sources: ["https://api.coingecko.com", "https://defillama.com"],
      confidence: 0.78,
      metadata: {
        model: "verify-beta-v1",
        processing_time_ms: 4200,
        sources_verified: 2,
      },
    }),
  },
  {
    id: "svc_format_gamma",
    name: "FormatGamma",
    quality: "low",
    delayMs: 8000,
    generateResponse: (intent: string) => ({
      content: `Formatted output for: ${intent}. Basic analysis completed.`,
      // No sources - tests scoring penalty
      confidence: 0.45,
    }),
  },
];

// ─── Mock Agent Runner ──────────────────────────────────────────────────────

async function startMockAgents() {
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  🤖 Mock Candidate Agents — Starting...");
  logger.info("═══════════════════════════════════════════════════════════════");

  const apiKey = process.env.CROO_SDK_KEY_PROVIDER;

  for (const agent of mockAgents) {
    logger.info(`  📦 ${agent.name} (${agent.id}) — Quality: ${agent.quality}, Delay: ${agent.delayMs}ms`);

    // Try to register with CROO SDK
    if (apiKey) {
      try {
        const SDK = await import("@croo-network/sdk");
        const AgentClient = SDK.AgentClient || SDK.default?.AgentClient || SDK.default;

        if (AgentClient) {
          // In production, each mock agent would have its own API key
          // For demo, we use the same key and differentiate by service ID
          logger.info(`  ✅ ${agent.name} would connect to CROO (shared key mode)`);
        }
      } catch {
        logger.warn(`  ⚠️ ${agent.name} running in standalone mode (SDK not available)`);
      }
    }
  }

  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  🤖 Mock agents are ready for trust evaluation");
  logger.info("  💡 These agents are called by the TrustRouter orchestrator");
  logger.info("═══════════════════════════════════════════════════════════════");

  // Keep process alive
  setInterval(() => {
    // Heartbeat
  }, 30000);
}

// Export for use by orchestrator
export { mockAgents };
export type { MockAgent };

// Run if called directly
startMockAgents().catch(console.error);
